import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../../../servidor/dados/banco-de-dados.js';
import {migrate} from '../../../servidor/dados/banco-de-dados.js';
import {createApp} from '../../../servidor/http/aplicacao.js';
const origin='http://localhost:5173';
async function setup(t){const dir=mkdtempSync(join(tmpdir(),'cuidacao-contributions-')),filename=join(dir,'test.sqlite'),uploads=join(dir,'uploads'),db=openDatabase(filename);migrate(db);let clock=Date.now();const app=createApp({db,uploadDirectory:uploads,now:()=>clock});
 t.after(async()=>{await app.close();db.close();rmSync(dir,{recursive:true,force:true});});
 async function account(username){const payload={username,password:'Senha fictícia teste 123'};assert.equal((await app.inject({method:'POST',url:'/api/v1/auth/register',headers:{origin},payload})).statusCode,201);const response=await app.inject({method:'POST',url:'/api/v1/auth/login',headers:{origin},payload});assert.equal(response.statusCode,200);return {id:response.json().data.id,cookie:response.headers['set-cookie'].split(';')[0]};}
 const author=await account('autor_relato'),user=await account('autor_complemento');
 const created=await app.inject({method:'POST',url:'/api/v1/occurrences',headers:{origin,cookie:author.cookie},payload:{category:'residuos',description:'Relato fictício para contribuições.',latitude:-23.94,longitude:-46.18}});assert.equal(created.statusCode,201);const occurrence=created.json().data;
 // Controlled preparation: no public transition endpoint is introduced.
 db.prepare("UPDATE occurrences SET status='community_review' WHERE id=?").run(occurrence.id);
 const version=()=>db.prepare('SELECT version FROM occurrences WHERE id=?').get(occurrence.id).version;
 const set=(input={},headers={},id=occurrence.id)=>app.inject({method:'PUT',url:`/api/v1/occurrences/${id}/stance`,headers:{origin,cookie:user.cookie,...headers},payload:{expectedVersion:version(),type:'support',reason:'Justificativa inteiramente fictícia de apoio.',...input}});
 const withdraw=(input={},headers={})=>app.inject({method:'DELETE',url:`/api/v1/occurrences/${occurrence.id}/stance`,headers:{origin,cookie:user.cookie,...headers},payload:{expectedVersion:version(),...input}});
 const list=()=>app.inject(`/api/v1/occurrences/${occurrence.id}/stances`);
 return {app,db,filename,user,author,occurrence,set,withdraw,list,version,setClock:value=>{clock=value;},clock:()=>clock};
}
test('consulta pública, apoio/contestação/substituição/retirada/reativação e histórico sem transição',async t=>{
 const {app,db,occurrence,set,withdraw,list,version,user}=await setup(t);
 assert.deepEqual((await list()).json().counts,{support:0,contest:0});const first=await set({reason:'  <b>Justificativa fictícia literal</b>  '});assert.equal(first.statusCode,200);const initial=first.json().data;assert.equal(initial.userId,user.id);assert.equal(initial.active,true);assert.equal(initial.reason,'<b>Justificativa fictícia literal</b>');assert.equal(version(),2);
 const changed=await set({type:'contest',reason:'Outra justificativa fictícia para contestação.'});assert.equal(changed.statusCode,200);assert.equal(changed.json().data.id,initial.id);assert.equal(changed.json().data.createdAt,initial.createdAt);assert.deepEqual((await list()).json().counts,{support:0,contest:1});assert.equal((await list()).json().total,1);
 assert.equal((await withdraw()).statusCode,200);assert.equal(version(),4);assert.equal((await list()).json().total,0);assert.deepEqual((await list()).json().counts,{support:0,contest:0});assert.equal((await withdraw()).statusCode,200);assert.equal(version(),4);assert.equal((await withdraw({expectedVersion:3})).statusCode,409);
 const reactivated=await set();assert.equal(reactivated.statusCode,200);assert.equal(reactivated.json().data.id,initial.id);assert.equal(db.prepare('SELECT count(*) n FROM stances').get().n,1);assert.equal(version(),5);
 const parent=db.prepare('SELECT * FROM occurrences WHERE id=?').get(occurrence.id);assert.equal(parent.status,'community_review');assert.equal(parent.closureReason,null);assert.equal(parent.discardReason,null);assert.equal(parent.updatedAt,reactivated.json().data.updatedAt);
 const events=db.prepare("SELECT * FROM events WHERE entityType='stance' ORDER BY rowid").all();assert.deepEqual(events.map(e=>e.action),['stance_created','stance_replaced','stance_withdrawn','stance_replaced']);assert.equal(JSON.parse(events[1].beforeJson).reason,initial.reason);assert.equal(JSON.parse(events[2].afterJson).active,0);assert.equal(JSON.parse(events[3].beforeJson).active,0);assert.ok(events.every(e=>e.actorId===user.id&&e.reason===null));
 const history=await app.inject(`/api/v1/occurrences/${occurrence.id}/history`);assert.equal(history.json().total,5);assert.doesNotMatch(history.body,/Justificativa|beforeJson|afterJson|token|password/);const detail=(await app.inject(`/api/v1/occurrences/${occurrence.id}`)).json().data;assert.deepEqual(detail.counts,(await list()).json().counts);
});
test('validação trim/Unicode/limites/tipo/versão/campos e paginação sem escrita parcial',async t=>{
 const {app,set,withdraw,list,version,occurrence}=await setup(t);
 for(const input of [{reason:''},{reason:' '},{reason:'x'.repeat(19)},{reason:'x'.repeat(1001)},{reason:12},{reason:null},{type:'invalid'},{expectedVersion:undefined},{expectedVersion:0},{expectedVersion:1.1},{userId:'forged'},{active:false},{visibility:'visible'},{status:'confirmed'}])assert.equal((await set(input)).statusCode,422,JSON.stringify(input).slice(0,100));
 assert.equal(version(),1);assert.equal((await withdraw()).statusCode,404);
 for(const reason of [' x'.repeat(20)+'  ','😀'.repeat(20),'😀'.repeat(1000)])assert.equal((await set({reason})).statusCode,200);
 assert.equal((await withdraw({reason:'forged'})).statusCode,422);
 for(const query of ['page=0','page=1e0','page=1&page=2','pageSize=101','unknown=x','includeHidden=1'])assert.equal((await app.inject(`/api/v1/occurrences/${occurrence.id}/stances?${query}`)).statusCode,422);
 assert.equal((await app.inject(`/api/v1/occurrences/${occurrence.id}/stances?includeHidden=true`)).statusCode,401);assert.equal((await app.inject('/api/v1/occurrences/invalid/stances')).statusCode,422);assert.equal((await set({}, {},'CA-999999')).statusCode,404);assert.equal((await list()).json().total,1);
});
test('sessão, origem, autoria, papel, identidade forjada e ausência de prazo inventado',async t=>{
 const {app,db,set,withdraw,user,author,setClock,clock,occurrence}=await setup(t);
 assert.equal((await set({}, {cookie:''})).statusCode,401);assert.equal((await withdraw({}, {cookie:''})).statusCode,401);assert.equal((await set({}, {origin:''})).statusCode,403);assert.equal((await set({}, {origin:'https://invalid.test'})).statusCode,403);
 for(const method of ['PUT','DELETE']){const response=await app.inject({method,url:`/api/v1/occurrences/${occurrence.id}/stance`,headers:{origin,cookie:user.cookie,'content-type':'text/plain'},payload:'x'});assert.equal(response.statusCode,415);assert.equal((await app.inject({method,url:`/api/v1/occurrences/${occurrence.id}/stance`,headers:{origin,cookie:user.cookie,'content-type':'application/json'},payload:'{'})).statusCode,400);}
 assert.equal((await set({}, {cookie:author.cookie,'x-user-id':user.id,'x-role':'admin'})).statusCode,403);db.prepare("UPDATE users SET role='admin' WHERE id=?").run(author.id);assert.equal((await set({}, {cookie:author.cookie})).statusCode,403);assert.equal((await withdraw({}, {cookie:author.cookie})).statusCode,403);
 assert.equal((await set()).statusCode,200);db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);assert.equal((await app.inject({url:`/api/v1/occurrences/${occurrence.id}/stances?includeHidden=true`,headers:{cookie:user.cookie}})).statusCode,200);
 db.prepare('UPDATE sessions SET expiresAt=?').run(new Date(clock()+4*86400000).toISOString());setClock(clock()+3*86400000);assert.equal((await set({type:'contest'})).statusCode,200);assert.equal((await withdraw()).statusCode,200);db.prepare('DELETE FROM sessions').run();assert.equal((await set()).statusCode,401);
});
test('estados, visibilidade, duplicata e moderação da própria posição bloqueiam todas as mutações',async t=>{
 const {db,set,withdraw,list,occurrence}=await setup(t);const position=(await set()).json().data;
 for(const status of ['community_review','confirmed','monitoring']){db.prepare('UPDATE occurrences SET status=? WHERE id=?').run(status,occurrence.id);assert.equal((await set()).statusCode,200);assert.equal((await withdraw()).statusCode,200);assert.equal((await set({type:'contest'})).statusCode,200);}
 for(const status of ['received','closed','discarded']){db.prepare('UPDATE occurrences SET status=?,closureReason=?,discardReason=? WHERE id=?').run(status,status==='closed'?'resolved':null,status==='discarded'?'invalid':null,occurrence.id);assert.equal((await set()).statusCode,409);assert.equal((await withdraw()).statusCode,409);assert.equal((await list()).statusCode,200);}
 db.prepare("UPDATE occurrences SET status='monitoring',closureReason=NULL,discardReason=NULL WHERE id=?").run(occurrence.id);
 const parent={...db.prepare('SELECT * FROM occurrences WHERE id=?').get(occurrence.id),id:'CA-999998'};db.prepare(`INSERT INTO occurrences(${Object.keys(parent).join(',')}) VALUES (${Object.keys(parent).map(k=>'@'+k).join(',')})`).run(parent);db.prepare('UPDATE occurrences SET duplicateOfId=? WHERE id=?').run(parent.id,occurrence.id);assert.equal((await set()).statusCode,409);assert.equal((await withdraw()).statusCode,409);assert.equal((await list()).statusCode,200);
 db.prepare('UPDATE occurrences SET duplicateOfId=NULL WHERE id=?').run(occurrence.id);db.prepare("UPDATE stances SET visibility='hidden' WHERE id=?").run(position.id);const hidden=(await list()).json();assert.equal(hidden.data[0].available,false);for(const key of ['userId','username','type','reason'])assert.equal(hidden.data[0][key],null);assert.deepEqual(hidden.counts,{support:0,contest:0});assert.equal(hidden.total,1);assert.equal((await set()).statusCode,404);assert.equal((await withdraw()).statusCode,404);db.prepare('UPDATE stances SET active=0 WHERE id=?').run(position.id);assert.equal((await set()).statusCode,404);assert.equal((await list()).json().total,0);
 db.prepare("UPDATE occurrences SET visibility='hidden' WHERE id=?").run(occurrence.id);assert.equal((await list()).statusCode,404);assert.equal((await set()).statusCode,404);assert.equal((await withdraw()).statusCode,404);
});
test('falha de evento desfaz criação/substituição/retirada e versão; concorrência mantém posição única',async t=>{
 const {db,set,withdraw,list,version}=await setup(t);
 const block=()=>db.exec("CREATE TRIGGER fail_stance BEFORE INSERT ON events WHEN NEW.entityType='stance' BEGIN SELECT RAISE(ABORT,'PRIVATE_STANCE_ERROR'); END");block();const failed=await set();assert.equal(failed.statusCode,500);assert.doesNotMatch(failed.body,/PRIVATE_STANCE_ERROR|SQL|\/tmp/);assert.equal(version(),1);assert.equal(db.prepare('SELECT count(*) n FROM stances').get().n,0);db.exec('DROP TRIGGER fail_stance');
 const responses=await Promise.all([set({expectedVersion:1}),set({expectedVersion:1,type:'contest'})]);assert.deepEqual(responses.map(r=>r.statusCode).sort(),[200,409]);assert.equal(db.prepare('SELECT count(*) n FROM stances WHERE active=1').get().n,1);assert.equal(version(),2);
 const original=db.prepare('SELECT * FROM stances').get();block();assert.equal((await set({type:original.type==='support'?'contest':'support'})).statusCode,500);assert.equal((await withdraw()).statusCode,500);assert.deepEqual(db.prepare('SELECT * FROM stances').get(),original);assert.equal(version(),2);assert.equal(db.prepare("SELECT count(*) n FROM events WHERE entityType='stance'").get().n,1);db.exec('DROP TRIGGER fail_stance');
 const writes=await Promise.all([set({expectedVersion:2,type:'support'}),withdraw({expectedVersion:2})]);assert.deepEqual(writes.map(r=>r.statusCode).sort(),[200,409]);assert.equal(version(),3);assert.equal(db.prepare('SELECT count(*) n FROM stances').get().n,1);assert.equal((await list()).json().counts.support,1);
});
test('contagens independentes de duplicatas, paginação e conteúdo oculto/retirado',async t=>{
 const {app,db,user,author,occurrence,set,list}=await setup(t);await set();
 const other={...db.prepare('SELECT * FROM occurrences WHERE id=?').get(occurrence.id),id:'CA-999997',duplicateOfId:occurrence.id};db.prepare(`INSERT INTO occurrences(${Object.keys(other).join(',')}) VALUES (${Object.keys(other).map(k=>'@'+k).join(',')})`).run(other);
 const date=new Date().toISOString();db.prepare("INSERT INTO stances VALUES ('00000000-0000-4000-8000-000000000001',?,?,'contest','Contestação fictícia da duplicata',1,'visible',?,?)").run(other.id,user.id,date,date);
 assert.deepEqual((await list()).json().counts,{support:1,contest:0});assert.deepEqual((await app.inject(`/api/v1/occurrences/${other.id}/stances`)).json().counts,{support:0,contest:1});assert.deepEqual((await app.inject(`/api/v1/occurrences/${occurrence.id}`)).json().data.counts,{support:1,contest:0});
 // Controlled hidden marker from another account, not an authorized self-position.
 db.prepare("INSERT INTO stances VALUES ('00000000-0000-4000-8000-000000000002',?,?,'contest','PRIVATE_HIDDEN_REASON',1,'hidden',?,?)").run(occurrence.id,author.id,date,date);
 const first=await app.inject(`/api/v1/occurrences/${occurrence.id}/stances?pageSize=1`),second=await app.inject(`/api/v1/occurrences/${occurrence.id}/stances?page=2&pageSize=1`);assert.equal(first.json().total,2);assert.equal(second.json().data.length,1);assert.notEqual(first.json().data[0].id,second.json().data[0].id);assert.doesNotMatch(first.body+second.body,/PRIVATE_HIDDEN_REASON/);assert.deepEqual(first.json().counts,{support:1,contest:0});
});
