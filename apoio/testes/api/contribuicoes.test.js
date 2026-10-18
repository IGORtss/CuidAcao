import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
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
 const create=(input={},headers={},id=occurrence.id)=>app.inject({method:'POST',url:`/api/v1/occurrences/${id}/contributions`,headers:{origin,cookie:user.cookie,...headers},payload:{expectedVersion:version(),type:'comment',text:'Comentário fictício',...input}});
 const edit=(id,text='Texto fictício alterado',extra={})=>app.inject({method:'PATCH',url:`/api/v1/contributions/${id}`,headers:{origin,cookie:user.cookie,...extra.headers},payload:{expectedVersion:version(),text,...extra.payload}});
 const upload=async(contributionId,{buffer,caption='Imagem fictícia do complemento',expectedVersion=version(),headers={},id=occurrence.id}={})=>{buffer??=await sharp({create:{width:10,height:10,channels:3,background:'#40574D'}}).png().toBuffer();const boundary='cuidacao-'+randomUUID();const fields=[['caption',caption],['expectedVersion',expectedVersion],['contributionId',contributionId]];const payload=Buffer.concat([...fields.map(([key,value])=>Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`)),Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n`),buffer,Buffer.from(`\r\n--${boundary}--\r\n`)]);return app.inject({method:'POST',url:`/api/v1/occurrences/${id}/attachments`,headers:{origin,cookie:user.cookie,'content-type':`multipart/form-data; boundary=${boundary}`,...headers},payload});};
 return {app,db,dir,filename,uploads,author,user,occurrence,create,edit,upload,version,setClock:value=>{clock=value;},clock:()=>clock};
}
test('consulta pública, publicação, autor/data/tipo, edição e resolução sem transição',async t=>{
 const {app,db,user,occurrence,create,edit,version}=await setup(t);
 assert.equal((await app.inject(`/api/v1/occurrences/${occurrence.id}/contributions`)).json().total,0);
 const comment=await create({text:'  <b>Comentário fictício</b>  '});assert.equal(comment.statusCode,201);const row=comment.json().data;assert.equal(row.authorId,user.id);assert.equal(row.username,'autor_complemento');assert.equal(row.text,'<b>Comentário fictício</b>');assert.equal(row.kind,null);assert.deepEqual(row.attachments,[]);assert.equal(comment.json().occurrenceVersion,2);
 for(const kind of ['observation','resolution'])assert.equal((await create({type:'supplement',kind,text:'Informação fictícia sobre a situação ambiental.'})).statusCode,201);
 assert.equal((await edit(row.id)).statusCode,200);assert.equal(version(),5);
 const list=(await app.inject(`/api/v1/occurrences/${occurrence.id}/contributions?pageSize=2`)).json();assert.equal(list.total,3);assert.equal(list.data.length,2);assert.equal(list.occurrenceVersion,5);assert.equal((await app.inject(`/api/v1/occurrences/${occurrence.id}/contributions`)).json().data.find(x=>x.id===row.id).text,'Texto fictício alterado');
 const page2=(await app.inject(`/api/v1/occurrences/${occurrence.id}/contributions?page=2&pageSize=2`)).json();assert.equal(page2.data.length,1);
 const stored=db.prepare('SELECT * FROM occurrences WHERE id=?').get(occurrence.id);assert.equal(stored.status,'community_review');assert.equal(stored.closureReason,null);
 const events=db.prepare('SELECT * FROM events WHERE occurrenceId=?').all(occurrence.id);assert.equal(events.length,5);assert.equal(JSON.parse(events.find(e=>e.action==='contribution_edited').beforeJson).text,'<b>Comentário fictício</b>');
 const history=await app.inject(`/api/v1/occurrences/${occurrence.id}/history`);assert.equal(history.json().total,5);assert.doesNotMatch(history.body,/beforeJson|afterJson|password|token/);
});
test('limites após trim, caracteres Unicode, tipos imutáveis e campos desconhecidos',async t=>{
 const {app,occurrence,create,edit,version}=await setup(t);
 for(const input of [{text:''},{text:'   '},{text:'x'.repeat(2001)},{text:null},{text:12},{type:'supplement',kind:'observation',text:'x'.repeat(19)},{type:'supplement',kind:'resolution',text:'x'.repeat(3001)},{type:'supplement',text:'x'.repeat(20)},{type:'supplement',kind:'invalid',text:'x'.repeat(20)},{type:'future_request',text:'x'.repeat(20)},{kind:'observation'},{kind:null},{authorId:'forged'},{status:'closed'},{expectedVersion:undefined},{expectedVersion:1.1},{expectedVersion:0},{file:'remote'}])assert.equal((await create(input)).statusCode,422,JSON.stringify(input).slice(0,100));
 assert.equal(version(),1);
 for(const input of [{text:' x '},{text:'😀'.repeat(2000)},{type:'supplement',kind:'observation',text:'😀'.repeat(20)},{type:'supplement',kind:'resolution',text:'x'.repeat(3000)}])assert.equal((await create(input)).statusCode,201);
 const created=(await create()).json().data;
 for(const payload of [{kind:'resolution'},{type:'supplement'},{authorId:'forged'},{text:' '},{expectedVersion:null}])assert.equal((await edit(created.id,'Texto editado',{payload})).statusCode,422);
 for(const query of ['page=0','page=1e0','pageSize=101','page=1&page=2','unknown=x','includeHidden=1'])assert.equal((await app.inject(`/api/v1/occurrences/${occurrence.id}/contributions?${query}`)).statusCode,422);
 assert.equal((await app.inject(`/api/v1/occurrences/${occurrence.id}/contributions?includeHidden=true`)).statusCode,401);
 assert.equal((await app.inject('/api/v1/occurrences/invalid/contributions')).statusCode,422);
 assert.equal((await create({}, {},'CA-999999')).statusCode,404);
});
test('sessão, Origin, autoria/admin e prazo exato; retirada textual não é exposta',async t=>{
 const {app,db,user,author,occurrence,create,edit,setClock,clock}=await setup(t);
 assert.equal((await create({}, {cookie:''})).statusCode,401);assert.equal((await create({}, {origin:''})).statusCode,403);assert.equal((await create({}, {origin:'https://example.invalid'})).statusCode,403);
 const malformed=await app.inject({method:'POST',url:`/api/v1/occurrences/${occurrence.id}/contributions`,headers:{origin,cookie:user.cookie,'content-type':'application/json'},payload:'{'});assert.equal(malformed.statusCode,400);
 const wrongType=await app.inject({method:'POST',url:`/api/v1/occurrences/${occurrence.id}/contributions`,headers:{origin,cookie:user.cookie,'content-type':'text/plain'},payload:'x'});assert.equal(wrongType.statusCode,415);
 const row=(await create()).json().data;assert.equal((await edit(row.id,'Alteração indevida',{headers:{cookie:author.cookie,'x-user-id':user.id,'x-role':'admin'}})).statusCode,403);
 db.prepare("UPDATE users SET role='admin' WHERE id=?").run(author.id);assert.equal((await edit(row.id,'Correção indevida',{headers:{cookie:author.cookie}})).statusCode,403);
 const start=clock();db.prepare('UPDATE sessions SET expiresAt=?').run(new Date(start+2*86400000).toISOString());setClock(start+86400000);assert.equal((await edit(row.id)).statusCode,200);setClock(start+86400001);assert.equal((await edit(row.id)).statusCode,403);
 assert.equal((await create({type:'supplement',kind:'observation',text:'Novo complemento após o prazo do anterior.'})).statusCode,201);
 assert.equal((await app.inject({method:'DELETE',url:`/api/v1/contributions/${row.id}`,headers:{origin,cookie:user.cookie},payload:{expectedVersion:4}})).statusCode,404);
 db.prepare('DELETE FROM sessions').run();assert.equal((await create()).statusCode,401);
});
test('estados, duplicata e ocultação bloqueiam criação/edição; leitura pública não vaza conteúdo',async t=>{
 const {app,db,occurrence,create,edit}=await setup(t);const row=(await create()).json().data;
 for(const state of ['community_review','confirmed','monitoring']){db.prepare('UPDATE occurrences SET status=? WHERE id=?').run(state,occurrence.id);assert.equal((await create()).statusCode,201);assert.equal((await edit(row.id)).statusCode,200);}
 for(const state of ['received','closed','discarded']){db.prepare("UPDATE occurrences SET status=?,closureReason=?,discardReason=? WHERE id=?").run(state,state==='closed'?'resolved':null,state==='discarded'?'invalid':null,occurrence.id);assert.equal((await create()).statusCode,409);assert.equal((await edit(row.id)).statusCode,409);assert.equal((await app.inject(`/api/v1/occurrences/${occurrence.id}/contributions`)).statusCode,200);}
 db.prepare("UPDATE occurrences SET status='monitoring',closureReason=NULL,discardReason=NULL WHERE id=?").run(occurrence.id);
 // A second persistent parent is controlled preparation, never a new public transition.
 const parent={...db.prepare('SELECT * FROM occurrences WHERE id=?').get(occurrence.id),id:'CA-999998'};db.prepare(`INSERT INTO occurrences(${Object.keys(parent).join(',')}) VALUES (${Object.keys(parent).map(k=>'@'+k).join(',')})`).run(parent);
 db.prepare('UPDATE occurrences SET duplicateOfId=? WHERE id=?').run(parent.id,occurrence.id);assert.equal((await create()).statusCode,409);assert.equal((await edit(row.id)).statusCode,409);
 db.prepare('UPDATE occurrences SET duplicateOfId=NULL WHERE id=?').run(occurrence.id);db.prepare("UPDATE contributions SET visibility='hidden' WHERE id=?").run(row.id);
 const list=(await app.inject(`/api/v1/occurrences/${occurrence.id}/contributions`)).json();const hidden=list.data.find(x=>x.id===row.id);assert.equal(hidden.available,false);for(const field of ['text','type','kind','username','authorId'])assert.equal(hidden[field],null);assert.deepEqual(hidden.attachments,[]);assert.equal((await edit(row.id)).statusCode,404);
 db.prepare("UPDATE occurrences SET visibility='hidden' WHERE id=?").run(occurrence.id);assert.equal((await create()).statusCode,404);assert.equal((await app.inject(`/api/v1/occurrences/${occurrence.id}/contributions`)).statusCode,404);
});
test('evento falho reverte contribuição/edição/versão; escritas concorrentes não sobrescrevem',async t=>{
 const {app,db,create,edit,version,occurrence}=await setup(t);
 db.exec("CREATE TRIGGER fail_contribution BEFORE INSERT ON events WHEN NEW.entityType='contribution' BEGIN SELECT RAISE(ABORT,'PRIVATE_FAILURE'); END");const failed=await create();assert.equal(failed.statusCode,500);assert.doesNotMatch(failed.body,/PRIVATE_FAILURE|SQL|\/tmp/);assert.equal(version(),1);assert.equal(db.prepare('SELECT count(*) n FROM contributions').get().n,0);db.exec('DROP TRIGGER fail_contribution');
 const responses=await Promise.all([create({expectedVersion:1}),create({expectedVersion:1})]);assert.deepEqual(responses.map(r=>r.statusCode).sort(),[201,409]);assert.equal(version(),2);const row=responses.find(r=>r.statusCode===201).json().data;
 db.exec("CREATE TRIGGER fail_edit BEFORE INSERT ON events WHEN NEW.entityType='contribution' BEGIN SELECT RAISE(ABORT,'PRIVATE_FAILURE'); END");assert.equal((await edit(row.id)).statusCode,500);assert.equal(db.prepare('SELECT text FROM contributions WHERE id=?').get(row.id).text,row.text);assert.equal(version(),2);assert.equal((await app.inject(`/api/v1/occurrences/${occurrence.id}/history`)).json().total,2);
});
test('imagens de complemento: autoria, pais, limite independente, falha preserva texto e rollback limpa disco',async t=>{
 const {app,db,uploads,user,author,occurrence,create,upload,version}=await setup(t);
 db.prepare('UPDATE occurrences SET createdAt=? WHERE id=?').run(new Date(Date.now()-3*86400000).toISOString(),occurrence.id);
 const comment=(await create()).json().data,first=(await create({type:'supplement',kind:'observation',text:'Complemento fictício com imagens opcionais.'})).json().data,second=(await create({type:'supplement',kind:'resolution',text:'Outra informação fictícia de resolução.'})).json().data;
 assert.equal((await upload(comment.id)).statusCode,422);assert.equal((await upload(first.id,{headers:{cookie:author.cookie}})).statusCode,403);assert.equal((await upload(first.id,{id:'CA-999999'})).statusCode,404);
 assert.equal((await upload(first.id,{buffer:Buffer.from('<svg/>')})).statusCode,415);assert.equal(db.prepare('SELECT text FROM contributions WHERE id=?').get(first.id).text,first.text);
 for(let i=0;i<5;i++)assert.equal((await upload(first.id)).statusCode,201);assert.equal((await upload(first.id)).statusCode,409);assert.equal((await upload(second.id)).statusCode,201);
 const list=(await app.inject(`/api/v1/occurrences/${occurrence.id}/contributions`)).json();assert.equal(list.data.find(x=>x.id===first.id).attachments.length,5);assert.equal((await app.inject(`/api/v1/occurrences/${occurrence.id}/attachments`)).json().total,0);
 const image=list.data.find(x=>x.id===first.id).attachments[0];assert.equal((await app.inject(image.fileUrl)).statusCode,200);
 assert.equal((await app.inject({method:'DELETE',url:`/api/v1/attachments/${image.id}`,headers:{origin,cookie:author.cookie},payload:{expectedVersion:version()}})).statusCode,403);
 assert.equal((await app.inject({method:'DELETE',url:`/api/v1/attachments/${image.id}`,headers:{origin,cookie:user.cookie},payload:{expectedVersion:version()}})).statusCode,200);assert.equal((await app.inject(image.fileUrl)).statusCode,404);
 const priorVersion=version(),priorFiles=readdirSync(uploads).length;db.exec("CREATE TRIGGER fail_image BEFORE INSERT ON events WHEN NEW.entityType='attachment' BEGIN SELECT RAISE(ABORT,'PRIVATE_FILE_ERROR'); END");assert.equal((await upload(first.id)).statusCode,500);assert.equal(version(),priorVersion);assert.equal(readdirSync(uploads).length,priorFiles);assert.equal(readdirSync(join(uploads,'.staging')).length,0);db.exec('DROP TRIGGER fail_image');
 assert.equal((await upload(first.id)).statusCode,201);
 db.prepare("UPDATE contributions SET visibility='hidden' WHERE id=?").run(first.id);for(const file of list.data.find(x=>x.id===first.id).attachments)assert.equal((await app.inject(file.fileUrl)).statusCode,404);assert.equal((await upload(first.id)).statusCode,404);
 const hidden=(await app.inject(`/api/v1/occurrences/${occurrence.id}/contributions`)).json().data.find(x=>x.id===first.id);assert.equal(hidden.text,null);assert.deepEqual(hidden.attachments,[]);
 const secondFile=list.data.find(x=>x.id===second.id).attachments[0];db.prepare("UPDATE occurrences SET visibility='hidden' WHERE id=?").run(occurrence.id);assert.equal((await app.inject(secondFile.fileUrl)).statusCode,404);
});
test('imagens obedecem janela da contribuição e estados/duplicata, inclusive retirada',async t=>{
 const {app,db,user,occurrence,create,upload,setClock,clock,version}=await setup(t);const row=(await create({type:'supplement',kind:'observation',text:'Complemento fictício com imagens opcionais.'})).json().data;
 const image=(await upload(row.id)).json().data;
 const other={...db.prepare('SELECT * FROM occurrences WHERE id=?').get(occurrence.id),id:'CA-999997'};db.prepare(`INSERT INTO occurrences(${Object.keys(other).join(',')}) VALUES (${Object.keys(other).map(k=>'@'+k).join(',')})`).run(other);assert.equal((await upload(row.id,{id:other.id})).statusCode,404);
 const remove=()=>app.inject({method:'DELETE',url:`/api/v1/attachments/${image.id}`,headers:{origin,cookie:user.cookie},payload:{expectedVersion:version()}});
 for(const status of ['received','closed','discarded']){db.prepare('UPDATE occurrences SET status=?,closureReason=?,discardReason=? WHERE id=?').run(status,status==='closed'?'resolved':null,status==='discarded'?'invalid':null,occurrence.id);assert.equal((await upload(row.id)).statusCode,409);assert.equal((await remove()).statusCode,409);}
 db.prepare("UPDATE occurrences SET status='monitoring',closureReason=NULL,discardReason=NULL,duplicateOfId=? WHERE id=?").run(other.id,occurrence.id);assert.equal((await upload(row.id)).statusCode,409);assert.equal((await remove()).statusCode,409);db.prepare('UPDATE occurrences SET duplicateOfId=NULL WHERE id=?').run(occurrence.id);const initial=clock();db.prepare('UPDATE sessions SET expiresAt=?').run(new Date(initial+2*86400000).toISOString());setClock(initial+86400000);assert.equal((await upload(row.id)).statusCode,201);setClock(initial+86400001);assert.equal((await upload(row.id)).statusCode,403);assert.equal((await remove()).statusCode,403);
});
