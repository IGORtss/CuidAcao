import sharp from 'sharp';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {openDatabase} from '../../../servidor/dados/banco-de-dados.js';
import {migrate} from '../../../servidor/dados/banco-de-dados.js';
import {seed} from '../../../servidor/linha-comando/indice.js';
import {nextOccurrenceId} from '../../../servidor/dados/banco-de-dados.js';
import {domainTransaction} from '../../../servidor/dominio/indice.js';

async function readProcess(filename,urls,t,headers={},prepare){
 const child=fork(new URL('../auxiliares/servidor-leitura.js',import.meta.url),[filename],{execArgv:[],stdio:['ignore','ignore','ignore','ipc']});
 const exited=new Promise(resolve=>{child.once('exit',resolve);child.once('error',resolve);});
 const stop=async()=>{if(child.pid && child.exitCode===null && child.signalCode===null){child.kill('SIGTERM');await exited;}};
 t.after(stop);
 try {
  const {address}=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Servidor de teste não iniciou em 10 segundos.'));},10000);
   child.once('message',message=>{clearTimeout(timeout);if(message.startupError)reject(new Error(`Servidor de teste não iniciou: ${message.startupError}.`));else resolve(message);});
   child.once('error',error=>{clearTimeout(timeout);reject(error);});
   child.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Servidor de teste encerrou antes da consulta (${code}).`));});
  });
  if(prepare)await prepare(address);
  if(typeof urls==='function')urls=urls();
  if(typeof headers==='function')headers=headers();
  const responses=[];
  for(const url of urls){const response=await fetch(address+url,{headers,signal:AbortSignal.timeout(5000)});responses.push({status:response.status,data:response.headers.get('content-type')?.startsWith('image/')?Buffer.from(await response.arrayBuffer()).toString('base64'):await response.json()});}
  return {pid:child.pid,responses};
 } finally {await stop();}
}

test('reiniciar processo HTTP preserva preparação controlada e projeção pública sem segredos', {timeout:30000},async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cuidacao-restart-')),filename=join(directory,'restart.sqlite');
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const db=openDatabase(filename);
 let credentials,secretValues,visibleId,hiddenId,cookieHeader;
 try {
  migrate(db);credentials=await seed(db);
  const authorId=db.prepare('SELECT id FROM users WHERE role=? LIMIT 1').get('user').id;
  const adminId=db.prepare('SELECT id FROM users WHERE role=? LIMIT 1').get('admin').id;
  function create(title){return domainTransaction(db,{mutate(){
   const id=nextOccurrenceId(db),date='2026-10-03T12:00:00.000Z';
   db.prepare(`INSERT INTO occurrences (id,authorId,title,description,category,latitude,longitude,status,visibility,simulated,version,createdAt,updatedAt)
    VALUES (?,?,?,?,'residuos',-23.94,-46.18,'received','visible',1,1,?,?)`).run(id,authorId,title,`${title}: conteúdo fictício da preparação controlada.`,date,date);
   return {value:id,events:[{occurrenceId:id,entityType:'occurrence',entityId:id,actorId:authorId,action:'created',after:db.prepare('SELECT * FROM occurrences WHERE id=?').get(id)}]};
  },createdAt:'2026-10-03T12:00:00.000Z'}).value;}
  visibleId=create('Relato preparado fora da API');hiddenId=create('PRIVATE_HIDDEN_BODY');
  domainTransaction(db,{expectedVersions:{[hiddenId]:1},mutate(){
   const before=db.prepare('SELECT * FROM occurrences WHERE id=?').get(hiddenId);
   db.prepare("UPDATE occurrences SET visibility='hidden' WHERE id=?").run(hiddenId);
   return {events:[{occurrenceId:hiddenId,entityType:'occurrence',entityId:hiddenId,actorId:adminId,action:'hidden',reason:'Motivo público fictício de moderação.',before,after:{visibility:'hidden'}}]};
  }});
  const date=new Date().toISOString(),expiresAt=new Date(Date.now()+8*60*60*1000).toISOString();
  // An actual 32-byte opaque session token, only its hash is stored.
  const sessionToken=randomBytes(32).toString('base64url');
  const sessionHash=createHash('sha256').update(sessionToken).digest('hex');
  cookieHeader='cuidacao_session='+sessionToken;
  db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(randomUUID(),authorId,sessionHash,expiresAt,date,date);
  secretValues=[sessionToken,sessionHash,...credentials.map(row=>row.password),...db.prepare('SELECT passwordHash,passwordSalt FROM users').all().flatMap(row=>[row.passwordHash,row.passwordSalt])];
 } finally {db.close();}
 const urls=['/api/v1/occurrences?pageSize=100',`/api/v1/occurrences/${visibleId}`,`/api/v1/occurrences/${visibleId}/history`,
  `/api/v1/occurrences/${hiddenId}`,`/api/v1/occurrences/${hiddenId}/history`,'/api/v1/occurrences/CA-001/history','/api/v1/auth/me'];
 const before=await readProcess(filename,urls,t,{cookie:cookieHeader}),after=await readProcess(filename,urls,t,{cookie:cookieHeader});
 assert.notEqual(before.pid,after.pid);assert.deepEqual(after.responses,before.responses);
 assert.equal(after.responses[0].data.total,5);assert.equal(after.responses[1].data.data.title,'Relato preparado fora da API');assert.equal(after.responses[2].data.data[0].action,'created');
 assert.equal(after.responses.at(-1).status,200);assert.equal(after.responses.at(-1).data.data.role,'user');
 assert.equal(after.responses[3].status,404);assert.equal(after.responses[4].status,404);
 const body=JSON.stringify(after.responses);assert.ok(!/PRIVATE_HIDDEN_BODY|passwordHash|passwordSalt|passwordParams|tokenHash|beforeJson|afterJson|referencesJson/.test(body),'Projeção pública contém campos ou conteúdo privados.');
 for(const secret of secretValues)assert.equal(body.includes(secret),false,'Resposta pública contém segredo de teste.');
});


test('cadastro/login/criação/edição HTTP persistem entre processos independentes', {timeout:30000},async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cuidacao-http-write-')),filename=join(directory,'test.sqlite');
 t.after(()=>rmSync(directory,{recursive:true,force:true}));const db=openDatabase(filename);migrate(db);db.close();
 let id,cookie,fileUrl;const origin='http://localhost:5173';
 const urls=()=>['/api/v1/occurrences/'+id,'/api/v1/occurrences/'+id+'/history','/api/v1/auth/me','/api/v1/occurrences/'+id+'/attachments',fileUrl];
 const before=await readProcess(filename,urls,t,()=>({cookie}),async address=>{
  const send=async(method,path,payload)=>fetch(address+'/api/v1/'+path,{method,headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});
  const account={username:'http_autor_demo',password:'Senha fictícia processo 123'};
  assert.equal((await send('POST','auth/register',account)).status,201);const login=await send('POST','auth/login',account);assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
  const created=await send('POST','occurrences',{category:'agua',description:'Relato fictício criado pela API HTTP.',latitude:-23.94,longitude:-46.18});assert.equal(created.status,201);id=(await created.json()).data.id;
  assert.equal((await send('PATCH','occurrences/'+id,{expectedVersion:1,changes:{title:'Relato fictício editado por HTTP'}})).status,200);
  const form=new FormData();form.append('expectedVersion','2');form.append('caption','Imagem fictícia persistente após reinício');form.append('file',new Blob([await sharp({create:{width:16,height:16,channels:3,background:'#40574D'}}).png().toBuffer()],{type:'image/png'}),'ficticia.png');const uploaded=await fetch(address+'/api/v1/occurrences/'+id+'/attachments',{method:'POST',headers:{origin,cookie},body:form,signal:AbortSignal.timeout(5000)});assert.equal(uploaded.status,201);fileUrl=(await uploaded.json()).data.fileUrl;
 });
 const after=await readProcess(filename,urls,t,()=>({cookie}));assert.notEqual(before.pid,after.pid);assert.deepEqual(after.responses,before.responses);assert.equal(after.responses[0].data.data.version,3);assert.equal(after.responses[1].data.total,3);assert.equal(after.responses[2].status,200);assert.equal(after.responses[3].data.total,1);assert.equal(after.responses[4].status,200);assert.ok(after.responses[4].data.length>0);
});

test('comentário, complemento editado e imagem persistem após reinício HTTP sem alterar estado', {timeout:30000},async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cuidacao-http-contribution-')),filename=join(directory,'test.sqlite');t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const db=openDatabase(filename);migrate(db);await seed(db);db.close();let cookie,commentId,supplementId,fileUrl;
 const origin='http://localhost:5173',urls=()=>['/api/v1/occurrences/CA-001','/api/v1/occurrences/CA-001/contributions','/api/v1/occurrences/CA-001/history',fileUrl];
 const before=await readProcess(filename,urls,t,{},async address=>{
  const send=(method,path,payload)=>fetch(address+'/api/v1/'+path,{method,headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});
  const account={username:'http_contribution_demo',password:'Senha fictícia processo 123'};assert.equal((await send('POST','auth/register',account)).status,201);const login=await send('POST','auth/login',account);assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
  let version=(await (await fetch(address+'/api/v1/occurrences/CA-001')).json()).data.version;
  for(const type of ['comment','supplement']){const result=await send('POST','occurrences/CA-001/contributions',{expectedVersion:version,type,text:'Texto fictício persistente entre processos.',...(type==='supplement'?{kind:'resolution'}:{})});assert.equal(result.status,201);const data=await result.json();version=data.occurrenceVersion;if(type==='comment')commentId=data.data.id;else supplementId=data.data.id;}
  const edited=await send('PATCH','contributions/'+supplementId,{expectedVersion:version,text:'Texto fictício editado antes do reinício.'});assert.equal(edited.status,200);version=(await edited.json()).occurrenceVersion;
  const form=new FormData();form.append('expectedVersion',String(version));form.append('caption','Imagem fictícia persistente de complemento');form.append('contributionId',supplementId);form.append('file',new Blob([await sharp({create:{width:16,height:16,channels:3,background:'#40574D'}}).png().toBuffer()]),'image.png');const uploaded=await fetch(address+'/api/v1/occurrences/CA-001/attachments',{method:'POST',headers:{origin,cookie},body:form,signal:AbortSignal.timeout(5000)});assert.equal(uploaded.status,201);fileUrl=(await uploaded.json()).data.fileUrl;
 });
 const after=await readProcess(filename,urls,t);assert.notEqual(before.pid,after.pid);assert.deepEqual(after.responses,before.responses);assert.equal(after.responses[0].data.data.status,'community_review');assert.equal(after.responses[1].data.total,2);
 assert.equal(after.responses[1].data.data.find(row=>row.id===commentId).type,'comment');const supplement=after.responses[1].data.data.find(row=>row.id===supplementId);assert.equal(supplement.kind,'resolution');assert.equal(supplement.text,'Texto fictício editado antes do reinício.');assert.equal(supplement.attachments.length,1);assert.equal(after.responses[3].status,200);assert.ok(after.responses[3].data.length>0);
});

test('apoio/contestação HTTP persistem após reinício, com concorrência, retirada e histórico', {timeout:30000},async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cuidacao-http-stance-')),filename=join(directory,'test.sqlite');t.after(()=>rmSync(directory,{recursive:true,force:true}));const db=openDatabase(filename);migrate(db);await seed(db);db.close();let cookie,stanceId;
 const origin='http://localhost:5173',urls=['/api/v1/occurrences/CA-001','/api/v1/occurrences/CA-001/stances','/api/v1/occurrences/CA-001/history','/api/v1/occurrences/CA-003/stances'];
 const before=await readProcess(filename,urls,t,{},async address=>{
  const send=(method,path,payload)=>fetch(address+'/api/v1/'+path,{method,headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});
  const account={username:'http_stance_demo',password:'Senha fictícia processo 123'};assert.equal((await send('POST','auth/register',account)).status,201);const login=await send('POST','auth/login',account);assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
  let version=(await (await fetch(address+'/api/v1/occurrences/CA-001')).json()).data.version;
  const concurrent=await Promise.all(['support','contest'].map(type=>send('PUT','occurrences/CA-001/stance',{expectedVersion:version,type,reason:'Justificativa fictícia de requisição concorrente.'})));assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);const written=await concurrent.find(r=>r.status===200).json();stanceId=written.data.id;version=written.occurrenceVersion;
  const changed=await send('PUT','occurrences/CA-001/stance',{expectedVersion:version,type:'contest',reason:'Contestação fictícia que deve permanecer após reinício.'});assert.equal(changed.status,200);assert.equal((await changed.json()).data.id,stanceId);
  const otherVersion=(await (await fetch(address+'/api/v1/occurrences/CA-003')).json()).data.version;const other=await send('PUT','occurrences/CA-003/stance',{expectedVersion:otherVersion,type:'support',reason:'Apoio fictício que será retirado antes do reinício.'});assert.equal(other.status,200);const withdrawn=await send('DELETE','occurrences/CA-003/stance',{expectedVersion:(await other.json()).occurrenceVersion});assert.equal(withdrawn.status,200);
 });
 const after=await readProcess(filename,urls,t,{},async address=>{
  const version=before.responses[0].data.data.version;const stale=await fetch(address+'/api/v1/occurrences/CA-001/stance',{method:'PUT',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify({expectedVersion:version-1,type:'support',reason:'Justificativa fictícia com versão desatualizada.'})});assert.equal(stale.status,409);
 });assert.notEqual(before.pid,after.pid);assert.deepEqual(after.responses,before.responses);assert.equal(after.responses[0].data.data.status,'community_review');assert.ok(after.responses[1].data.data.some(row=>row.id===stanceId&&row.type==='contest'));assert.ok(after.responses[2].data.data.some(row=>row.action==='stance_replaced'));assert.ok(!after.responses[3].data.data.some(row=>row.username==='http_stance_demo'));
 const persisted=openDatabase(filename);try{assert.equal(persisted.prepare('SELECT count(*) n FROM stances WHERE id=?').get(stanceId).n,1);assert.equal(persisted.prepare("SELECT active FROM stances WHERE occurrenceId='CA-003' AND userId=(SELECT id FROM users WHERE username='http_stance_demo')").get().active,0);}finally{persisted.close();}
});

test('ciclo integrado por HTTP preserva imagens, vínculos, auditoria e decisões distintas após reinícios', {timeout:30000},async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cuidacao-http-transitions-')),filename=join(directory,'test.sqlite');t.after(()=>rmSync(directory,{recursive:true,force:true}));const db=openDatabase(filename);migrate(db);const accounts=await seed(db);db.close();let id,adminCookie,imageUrl,supplementImageUrl,relatedId,duplicateId,rejectedId,registeredAuthor;
 const origin='http://localhost:5173',urls=()=>[`/api/v1/occurrences/${id}`,`/api/v1/occurrences/${id}/history?pageSize=100`,`/api/v1/occurrences/${id}/contributions`,`/api/v1/occurrences/${id}/relations`,`/api/v1/occurrences/${id}/duplicates`,`/api/v1/occurrences/${relatedId}`,`/api/v1/occurrences/${duplicateId}`,`/api/v1/occurrences/${id}/attachments`,imageUrl,supplementImageUrl,'/api/v1/occurrences/CA-004','/api/v1/occurrences/CA-004/contributions'];
 const before=await readProcess(filename,urls,t,{},async address=>{
  const send=(cookie,method,path,payload)=>fetch(address+'/api/v1/'+path,{method,headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});
  const login=async username=>{const account=accounts.find(row=>row.username===username),response=await send(null,'POST','auth/login',{username,password:account.password});assert.equal(response.status,200);return response.headers.get('set-cookie').split(';')[0];};
  const username='integrado_'+randomUUID().replaceAll('-','').slice(0,16),password=randomBytes(24).toString('base64url');
  const registered=await send(null,'POST','auth/register',{username,password});assert.equal(registered.status,201);registeredAuthor=(await registered.json()).data.id;
  const signedIn=await send(null,'POST','auth/login',{username,password});assert.equal(signedIn.status,200);const author=signedIn.headers.get('set-cookie').split(';')[0],observer=await login('morador_demo_2'),challenger=await login('morador_demo_3');adminCookie=await login('admin_demo_1');const reviewer=await login('admin_demo_2');const created=await send(author,'POST','occurrences',{category:'agua',description:'Registro fictício para acompanhar o ciclo HTTP persistente.',latitude:-23.94,longitude:-46.18});assert.equal(created.status,201);id=(await created.json()).data.id;let version=1;
  const png=await sharp({create:{width:16,height:12,channels:3,background:'#40574d'}}).png().toBuffer();
  const upload=async(cookie,contributionId)=>{const form=new FormData();form.append('expectedVersion',String(version));form.append('caption','Imagem fictícia preservada no ciclo HTTP');if(contributionId)form.append('contributionId',contributionId);form.append('file',new Blob([png],{type:'image/png'}),'demo.png');const response=await fetch(address+`/api/v1/occurrences/${id}/attachments`,{method:'POST',headers:{origin,cookie},body:form});assert.equal(response.status,201);const result=await response.json();version=result.occurrenceVersion;return result.data.fileUrl;};
  imageUrl=await upload(author);
  const createOther=async description=>{const response=await send(author,'POST','occurrences',{category:'agua',description,latitude:-23.94,longitude:-46.18});assert.equal(response.status,201);return (await response.json()).data.id;};
  relatedId=await createOther('Problema distinto fictício relacionado ao ciclo integrado.');duplicateId=await createOther('Mesmo problema fictício relatado novamente no ciclo integrado.');
  for(const [method,path,input,other] of [['POST',`occurrences/${id}/relations`,{relatedId},relatedId],['PUT',`occurrences/${duplicateId}/duplicate`,{principalId:id},duplicateId]]){const response=await send(adminCookie,method,path,{expectedVersions:{[id]:version,[other]:1},reason:'Vínculo fictício independente para verificar preservação integrada.',...input});assert.equal(response.status,200);version++;}

  const move=async input=>{const response=await send(adminCookie,'POST',`occurrences/${id}/transitions`,{expectedVersion:version,reason:'Justificativa fictícia de revisão administrativa HTTP.',...input});assert.equal(response.status,200);const result=await response.json();version=result.occurrenceVersion;return result;};
  const concurrent=await Promise.all([1,2].map(()=>send(adminCookie,'POST',`occurrences/${id}/transitions`,{expectedVersion:version,to:'community_review',reason:'Triagem fictícia independente por HTTP.'})));assert.deepEqual(concurrent.map(row=>row.status).sort(),[200,409]);version++;
  const support=await send(observer,'PUT',`occurrences/${id}/stance`,{expectedVersion:version,type:'support',reason:'Apoio fictício independente do criador por HTTP.'});assert.equal(support.status,200);const supported=await support.json();version=supported.occurrenceVersion;const comment=await send(observer,'POST',`occurrences/${id}/contributions`,{expectedVersion:version,type:'comment',text:'Comentário fictício independente no ciclo integrado HTTP.'});assert.equal(comment.status,201);version=(await comment.json()).occurrenceVersion;
  const contest=await send(challenger,'PUT',`occurrences/${id}/stance`,{expectedVersion:version,type:'contest',reason:'Contestação fictícia independente exige parecer individual.'});assert.equal(contest.status,200);const contested=await contest.json();version=contested.occurrenceVersion;
  await move({to:'confirmed',supportRefs:[{type:'stance',id:supported.data.id}],contestAssessments:[{stanceId:contested.data.id,assessment:'Parecer fictício individual após comparar os relatos independentes.'}]});
  const supplement=async(kind,text)=>{const response=await send(observer,'POST',`occurrences/${id}/contributions`,{expectedVersion:version,type:'supplement',kind,text});assert.equal(response.status,201);const result=await response.json();version=result.occurrenceVersion;return result.data;};
  const update=await supplement('observation','Atualização fictícia do local para acompanhamento.');supplementImageUrl=await upload(observer,update.id);await move({to:'monitoring',updateId:update.id});const resolution=await supplement('resolution','Resolução fictícia descrita após acompanhamento.');await move({to:'closed',updateId:resolution.id,closureReason:'resolved'});
  const request=await send(observer,'POST',`occurrences/${id}/contributions`,{expectedVersion:version,type:'reopen_request',text:'Fato novo fictício que exige reabertura e nova revisão.'});assert.equal(request.status,201);
  const other=await (await fetch(address+'/api/v1/occurrences/CA-004')).json();const rejected=await send(challenger,'POST','occurrences/CA-004/contributions',{expectedVersion:other.data.version,type:'reopen_request',text:'Fato novo fictício em cenário separado de rejeição HTTP.'});assert.equal(rejected.status,201);const pending=await rejected.json();rejectedId=pending.data.id;const decision=await send(reviewer,'POST',`contributions/${rejectedId}/reopen-decision`,{expectedVersion:pending.occurrenceVersion,decision:'rejected',reason:'Rejeição fictícia independente após revisar o fato novo.'});assert.equal(decision.status,200);
 });
 const after=await readProcess(filename,urls,t);assert.notEqual(before.pid,after.pid);assert.deepEqual(after.responses,before.responses);assert.equal(after.responses[0].data.data.status,'closed');assert.equal(after.responses[0].data.data.closureReason,'resolved');assert.equal(after.responses[0].data.data.closure.resolution.text,'Resolução fictícia descrita após acompanhamento.');assert.equal(after.responses[0].data.data.closure.username,'admin_demo_1');assert.ok(after.responses[1].data.data.some(row=>row.fromStatus==='confirmed'&&row.toStatus==='monitoring'));assert.equal(after.responses[0].data.data.authorId,registeredAuthor);assert.equal(after.responses[3].data.data[0].id,relatedId);assert.equal(after.responses[4].data.data[0].id,duplicateId);assert.equal(after.responses[6].data.data.duplicateOfId,id);assert.equal(after.responses[7].data.data.length,1);assert.equal(after.responses[8].status,200);assert.equal(after.responses[9].status,200);assert.equal(after.responses[10].data.data.status,'closed');assert.equal(after.responses[11].data.data.find(row=>row.id===rejectedId).requestStatus,'rejected');
 const request=after.responses[2].data.data.find(row=>row.type==='reopen_request');assert.equal(request.requestStatus,'pending');
 const reopened=await readProcess(filename,urls,t,{},async address=>{const response=await fetch(address+`/api/v1/occurrences/${id}/transitions`,{method:'POST',headers:{origin,cookie:adminCookie,'content-type':'application/json'},body:JSON.stringify({expectedVersion:after.responses[0].data.data.version,to:'community_review',reason:'Justificativa fictícia após examinar o fato novo.',reopenRequestId:request.id})});assert.equal(response.status,200);});const restored=await readProcess(filename,urls,t);assert.deepEqual(restored.responses,reopened.responses);assert.equal(restored.responses[0].data.data.status,'community_review');assert.equal(restored.responses[0].data.data.closureReason,null);assert.equal(restored.responses[0].data.data.closure,null);assert.equal(restored.responses[2].data.data.find(row=>row.id===request.id).requestStatus,'accepted');
});

test('correção, denúncia, moderação e auditoria persistem entre processos HTTP independentes', {timeout:30000},async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cuidacao-http-admin-')),filename=join(directory,'test.sqlite');t.after(()=>rmSync(directory,{recursive:true,force:true}));const db=openDatabase(filename);migrate(db);const accounts=await seed(db);db.close();let id,adminCookie,imageUrl,reportId;
 const origin='http://localhost:5173',urls=()=>[`/api/v1/occurrences/${id}?includeHidden=true`,`/api/v1/occurrences/${id}/history?includeHidden=true&pageSize=100`,`/api/v1/occurrences/${id}/attachments?includeHidden=true`,'/api/v1/reports?status=upheld',imageUrl+'?includeHidden=true'];
 const before=await readProcess(filename,urls,t,()=>({cookie:adminCookie}),async address=>{
  const send=(cookie,path,input)=>fetch(address+'/api/v1/'+path,{method:'POST',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(input)});
  const login=async username=>{const row=accounts.find(row=>row.username===username),response=await send(null,'auth/login',{username,password:row.password});assert.equal(response.status,200);return response.headers.get('set-cookie').split(';')[0];};const author=await login('morador_demo_1'),reporter=await login('morador_demo_2');adminCookie=await login('admin_demo_1');const created=await send(author,'occurrences',{category:'agua',description:'Relato fictício persistente na revisão administrativa.',latitude:-23.94,longitude:-46.18});assert.equal(created.status,201);id=(await created.json()).data.id;
  const form=new FormData();form.append('expectedVersion','1');form.append('caption','Imagem fictícia auditável depois de ocultada');form.append('file',new Blob([await sharp({create:{width:8,height:8,channels:3,background:'#40574d'}}).png().toBuffer()],{type:'image/png'}),'demo.png');const uploaded=await fetch(address+'/api/v1/occurrences/'+id+'/attachments',{method:'POST',headers:{origin,cookie:author},body:form});assert.equal(uploaded.status,201);imageUrl=(await uploaded.json()).data.fileUrl;
  const corrected=await send(adminCookie,`occurrences/${id}/corrections`,{expectedVersion:2,changes:{title:'Título fictício corrigido por revisão'},reason:'Correção fictícia justificada para o teste HTTP.'});assert.equal(corrected.status,200);const reported=await send(reporter,'reports',{expectedVersion:3,targetType:'occurrence',targetId:id,reason:'Motivo privado fictício para revisão de conteúdo.'});assert.equal(reported.status,201);reportId=(await reported.json()).data.id;const decision=await send(adminCookie,`reports/${reportId}/decision`,{expectedVersion:4,decision:'upheld',reason:'Motivo público fictício após revisão independente.'});assert.equal(decision.status,200);assert.equal((await fetch(address+'/api/v1/occurrences/'+id)).status,404);assert.equal((await fetch(address+imageUrl)).status,404);
 });
 const after=await readProcess(filename,urls,t,()=>({cookie:adminCookie}));assert.notEqual(after.pid,before.pid);assert.deepEqual(after.responses,before.responses);assert.equal(after.responses[0].data.data.version,5);assert.equal(after.responses[0].data.data.visibility,'hidden');assert.equal(after.responses[0].data.data.status,'received');assert.ok(after.responses[1].data.data.some(e=>e.action==='corrected'&&e.before.title!==e.after.title));assert.equal(after.responses[3].data.data.find(r=>r.id===reportId).status,'upheld');assert.equal(after.responses[4].status,200);
 const restored=await readProcess(filename,()=>[`/api/v1/occurrences/${id}`,imageUrl],t,{},async address=>{const response=await fetch(address+'/api/v1/moderation',{method:'POST',headers:{origin,cookie:adminCookie,'content-type':'application/json'},body:JSON.stringify({expectedVersion:5,targetType:'occurrence',targetId:id,action:'restore',reason:'Restauração fictícia independente após novo processo.'})});assert.equal(response.status,200);});const final=await readProcess(filename,()=>[`/api/v1/occurrences/${id}`,imageUrl],t);assert.deepEqual(final.responses,restored.responses);assert.equal(final.responses[0].data.data.version,6);assert.equal(final.responses[0].data.data.status,'received');assert.equal(final.responses[1].status,200);
});

test('vínculos por HTTP, auditoria dupla e sessões persistem em processos reiniciados', {timeout:30000},async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cuidacao-link-restart-')),filename=join(directory,'test.sqlite');t.after(()=>rmSync(directory,{recursive:true,force:true}));const db=openDatabase(filename);migrate(db);const accounts=await seed(db);db.close();const origin='http://localhost:5173',reason='Mesmo fato fictício no mesmo local e contexto temporal.';let cookie,principal,duplicate,related;
 const urls=()=>[...['duplicates','relations','history'].map(kind=>`/api/v1/occurrences/${principal}/${kind}`),`/api/v1/occurrences/${duplicate}`,`/api/v1/occurrences/${related}/history`,'/api/v1/auth/me'];
 const first=await readProcess(filename,urls,t,()=>({cookie}),async address=>{const call=async(path,input,method='POST')=>{const response=await fetch(address+'/api/v1'+path,{method,headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(input)});assert.equal(response.status,method==='POST'&&path==='/occurrences'?201:200);return response;};const login=async username=>{const account=accounts.find(row=>row.username===username);const response=await call('/auth/login',{username,password:account.password});cookie=response.headers.get('set-cookie').split(';')[0];};await login('morador_demo_1');const create=async()=> (await (await call('/occurrences',{category:'agua',description:reason,latitude:-23.94,longitude:-46.18})).json()).data.id;principal=await create();duplicate=await create();related=await create();await login('admin_demo_1');await call(`/occurrences/${duplicate}/duplicate`,{expectedVersions:{[principal]:1,[duplicate]:1},principalId:principal,reason},'PUT');await call(`/occurrences/${principal}/relations`,{expectedVersions:{[principal]:2,[related]:1},relatedId:related,reason});});
 const second=await readProcess(filename,urls,t,{cookie});assert.notEqual(first.pid,second.pid);assert.deepEqual(second.responses,first.responses);assert.equal(second.responses[0].data.data[0].id,duplicate);assert.equal(second.responses[1].data.data[0].id,related);assert.equal(second.responses[3].data.data.duplicateOfId,principal);
 const removed=await readProcess(filename,urls,t,{cookie},async address=>{for(const [path,expectedVersions] of [[`/occurrences/${duplicate}/duplicate`,{[principal]:3,[duplicate]:2}],[`/occurrences/${principal}/relations/${related}`,{[principal]:4,[related]:2}]]){const response=await fetch(address+'/api/v1'+path,{method:'DELETE',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify({expectedVersions,reason})});assert.equal(response.status,200);}});const final=await readProcess(filename,urls,t,{cookie});assert.deepEqual(final.responses,removed.responses);assert.equal(final.responses[0].data.total,0);assert.equal(final.responses[1].data.total,0);assert.equal(final.responses[3].data.data.duplicateOfId,null);
});
