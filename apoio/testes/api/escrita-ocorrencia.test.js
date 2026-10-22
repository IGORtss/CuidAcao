import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../../../servidor/http/aplicacao.js';
import {openDatabase} from '../../../servidor/dados/banco-de-dados.js';
import {migrate} from '../../../servidor/dados/banco-de-dados.js';
import {validateOccurrenceInput} from '../../../servidor/dominio/indice.js';
const origin='http://localhost:5173',body={category:'residuos',description:'  Relato fictício com descrição suficiente.  ',latitude:-23.94,longitude:-46.18};
async function setup(t){
  const directory=mkdtempSync(join(tmpdir(),'cuidacao-write-')),filename=join(directory,'test.sqlite'),db=openDatabase(filename);migrate(db);
  let clock=Date.now();const app=createApp({db,now:()=>clock});
  t.after(async()=>{await app.close();if(db.open)db.close();rmSync(directory,{recursive:true,force:true});});
  const auth=async username=>{
    const payload={username,password:'Senha fictícia teste 123'};
    assert.equal((await app.inject({method:'POST',url:'/api/v1/auth/register',headers:{origin},payload})).statusCode,201);
    const result=await app.inject({method:'POST',url:'/api/v1/auth/login',headers:{origin},payload});assert.equal(result.statusCode,200);
    return {cookie:result.headers['set-cookie'].split(';')[0],id:result.json().data.id};
  };
  const user=await auth('autor_demo'),other=await auth('outro_demo');
  const post=(payload=body,headers={origin,cookie:user.cookie})=>app.inject({method:'POST',url:'/api/v1/occurrences',headers,payload});
  const patch=(id,payload,headers={origin,cookie:user.cookie})=>app.inject({method:'PATCH',url:'/api/v1/occurrences/'+id,headers,payload});
  return {app,db,filename,user,other,post,patch,clock:()=>clock,setClock:value=>{clock=value;}};
}
test('criação gera campos, snapshot e histórico; edição persiste ao reabrir aplicação',async t=>{
  const {app,db,filename,user,post,patch}=await setup(t);const response=await post();assert.equal(response.statusCode,201);const row=response.json().data;
  assert.equal(row.id,'CA-000001');assert.equal(row.title,'Resíduos — CA-000001');assert.equal(row.status,'received');assert.equal(row.authorId,user.id);assert.equal(row.simulated,true);assert.equal(row.version,1);assert.equal(row.description,body.description.trim());assert.equal(response.json().occurrenceVersion,1);
  const event=db.prepare('SELECT * FROM events').get();assert.equal(event.action,'created');assert.equal(event.actorId,user.id);assert.equal(event.beforeJson,null);assert.equal(JSON.parse(event.afterJson).version,1);
  const edited=await patch(row.id,{expectedVersion:1,changes:{title:'Título fictício editado',locationLabel:'  Referência fictícia  '}});assert.equal(edited.statusCode,200);assert.equal(edited.json().data.version,2);assert.equal(edited.json().data.locationLabel,'Referência fictícia');
  const editing=db.prepare("SELECT * FROM events WHERE action='edited'").get();assert.equal(JSON.parse(editing.beforeJson).title,row.title);assert.equal(JSON.parse(editing.afterJson).version,2);
  const history=await app.inject('/api/v1/occurrences/'+row.id+'/history');assert.equal(history.json().total,2);assert.ok(!/beforeJson|afterJson|password|tokenHash/.test(history.body));
  await app.close();db.close();const restarted=createApp({databasePath:filename});try{assert.deepEqual((await restarted.inject('/api/v1/occurrences/'+row.id)).json(),{data:edited.json().data});assert.equal((await restarted.inject({url:'/api/v1/auth/me',headers:{cookie:user.cookie}})).statusCode,200);}finally{await restarted.close();}
});
test('sessão/origem/JSON e campos protegidos sem bypass de headers ou admin',async t=>{
  const {db,user,other,post,patch}=await setup(t);
  assert.equal((await post(body,{origin,'x-role':'admin','x-user-id':user.id})).statusCode,401);
  for(const headers of [{cookie:user.cookie},{origin:'https://external.invalid',cookie:user.cookie}])assert.equal((await post(body,headers)).statusCode,403);
  assert.equal((await post('texto',{origin,cookie:user.cookie,'content-type':'text/plain'})).statusCode,415);
  for(const key of ['authorId','role','status','simulated','version','id','createdAt'])assert.equal((await post({...body,[key]:'forged'})).statusCode,422);
  const created=(await post()).json().data;
  assert.equal((await patch(created.id,{expectedVersion:1,changes:{description:'Outro relato fictício longo.'}},{origin,cookie:other.cookie,'x-role':'admin'})).statusCode,403);
  db.prepare("UPDATE users SET role='admin' WHERE id=?").run(other.id);
  assert.equal((await patch(created.id,{expectedVersion:1,changes:{title:'Título fictício'}},{origin,cookie:other.cookie})).statusCode,403);
  for(const data of [{changes:{title:'Outro título'}},{expectedVersion:1,changes:{}},{expectedVersion:1,changes:{status:'confirmed'}},{expectedVersion:1,changes:{authorId:other.id}},{expectedVersion:1,changes:{title:'Outro título'},role:'admin'}])assert.equal((await patch(created.id,data)).statusCode,422);
  assert.equal(db.prepare('SELECT count(*) n FROM events').get().n,1);
});
test('validação trim, limites, coordenadas finitas e bordas inclusivas',async t=>{
  const {post}=await setup(t);
  for(const changes of [{description:'curto'},{description:' '.repeat(30)},{description:'x'.repeat(3001)},{category:'outros'},{latitude:null},{latitude:'-23.94'},{latitude:-23.950001},{latitude:-23.924999},{longitude:-46.195001},{longitude:-46.164999},{title:''},{title:'abcd'},{title:'x'.repeat(101)},{locationLabel:'x'.repeat(121)}]){
    const response=await post({...body,...changes});assert.equal(response.statusCode,422);assert.ok(response.json().error.fields);
  }
  for(const value of [NaN,Infinity,-Infinity])assert.throws(()=>validateOccurrenceInput({...body,latitude:value}),error=>error.statusCode===422);
  assert.equal((await post({...body,description:' '.repeat(4000)+'a'.repeat(20),title:' '.repeat(200)+'Título fictício'})).statusCode,201);
  for(const [latitude,longitude] of [[-23.95,-46.195],[-23.925,-46.165]])assert.equal((await post({...body,latitude,longitude,title:'  Título fictício  ',description:'a'.repeat(20)})).statusCode,201);
});
test('prazo exato de 24h, estado, duplicata e visibilidade são validados no servidor',async t=>{
  const {db,clock,setClock,post,patch}=await setup(t),start=clock(),row=(await post()).json().data;
  db.prepare('UPDATE sessions SET expiresAt=?').run(new Date(start+2*86400000).toISOString());
  const edit=()=>patch(row.id,{expectedVersion:db.prepare('SELECT version FROM occurrences WHERE id=?').get(row.id).version,changes:{title:'Título fictício editado'}});
  setClock(start+86400000);assert.equal((await edit()).statusCode,200);setClock(start+86400001);assert.equal((await edit()).statusCode,403);setClock(start);
  for(const status of ['community_review','confirmed','monitoring','closed','discarded']){
    db.prepare('UPDATE occurrences SET status=?,closureReason=?,discardReason=? WHERE id=?').run(status,status==='closed'?'resolved':null,status==='discarded'?'invalid':null,row.id);assert.equal((await edit()).statusCode,409);
  }
  db.prepare("UPDATE occurrences SET status='received',discardReason=NULL WHERE id=?").run(row.id);const main=(await post()).json().data;
  db.prepare('UPDATE occurrences SET duplicateOfId=? WHERE id=?').run(main.id,row.id);assert.equal((await edit()).statusCode,409);
  db.prepare("UPDATE occurrences SET visibility='hidden' WHERE id=?").run(row.id);assert.equal((await edit()).statusCode,404);assert.equal((await patch('CA-999999',{expectedVersion:1,changes:{title:'Título fictício'}})).statusCode,404);
});
test('falha de evento desfaz criação/sequência e edição; conflito permite só uma escrita',async t=>{
  const {db,post,patch}=await setup(t);
  db.exec("CREATE TRIGGER reject_event BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT,'PRIVATE_EVENT_ERROR'); END");
  const failed=await post();assert.equal(failed.statusCode,500);assert.ok(!failed.body.includes('PRIVATE_EVENT_ERROR'));assert.equal(db.prepare('SELECT count(*) n FROM occurrences').get().n,0);assert.equal(db.prepare('SELECT nextValue FROM occurrence_sequence').get().nextValue,1);
  db.exec('DROP TRIGGER reject_event');const row=(await post()).json().data;
  db.exec("CREATE TRIGGER reject_event BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT,'PRIVATE_EVENT_ERROR'); END");
  assert.equal((await patch(row.id,{expectedVersion:1,changes:{title:'Título que deve reverter'}})).statusCode,500);assert.equal(db.prepare('SELECT title,version FROM occurrences').get().title,row.title);assert.equal(db.prepare('SELECT version FROM occurrences').get().version,1);assert.equal(db.prepare('SELECT count(*) n FROM events').get().n,1);
  db.exec('DROP TRIGGER reject_event');const results=await Promise.all(['Título concorrente um','Título concorrente dois'].map(title=>patch(row.id,{expectedVersion:1,changes:{title}})));assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,409]);assert.equal(db.prepare('SELECT version FROM occurrences').get().version,2);assert.equal(db.prepare('SELECT count(*) n FROM events').get().n,2);
});
