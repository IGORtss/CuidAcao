import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,readdirSync,writeFileSync,symlinkSync,unlinkSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createServer} from 'vite';
import {demoWebOptions} from '../../../configuracao/vite.configuracao.js';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {openDatabase} from '../../../servidor/dados/banco-de-dados.js';
import {prepareDemo,backupDemo,restoreDemo,resetDemo,acquireDemoLock,demoDirectory,validateSnapshot} from '../../../servidor/linha-comando/indice.js';
import {createApp} from '../../../servidor/http/aplicacao.js';
const execute=promisify(execFile),origin='http://localhost:5173';
const hash=value=>createHash('sha256').update(value).digest('hex');
function workspace(t){const parent=mkdtempSync(join(tmpdir(),'cuidacao-demo-tests-'));t.after(()=>rmSync(parent,{recursive:true,force:true}));return join(parent,'cuidacao-demo');}
function state(root){const db=openDatabase(join(root,'current','db.sqlite'));try{return hash(JSON.stringify(['users','occurrences','contributions','stances','attachments','occurrence_relations','reports','subscriptions','saved_queries','notification_reads','events','occurrence_sequence','schema_migrations'].map(table=>db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())));}finally{db.close();}}
function index(root){return JSON.parse(readFileSync(join(root,'current','scenarios.json'),'utf8'));}
async function appFor(t,root){const app=createApp({databasePath:join(root,'current','db.sqlite'),uploadDirectory:join(root,'current','uploads')});await app.ready();t.after(()=>app.close());return app;}
async function login(app,root,username){const credentials=JSON.parse(readFileSync(join(root,'current','credentials.json'),'utf8')).find(row=>row.username===username);const response=await app.inject({method:'POST',url:'/api/v1/auth/login',headers:{origin},payload:{username,password:credentials.password}});assert.equal(response.statusCode,200);return response.headers['set-cookie'].split(';')[0];}

test('apresentação vazia usa serviços, quatorze cenários, camadas, imagens locais e privacidade', {timeout:30000},async t=>{
 const root=workspace(t);await prepareDemo(root);const initial=state(root);await assert.rejects(prepareDemo(root),/preenchido/);assert.equal(state(root),initial);
 const scenarios=index(root).scenarios;assert.equal(scenarios.length,14);assert.deepEqual(new Set(scenarios.map(row=>row.status)),new Set(['received','community_review','confirmed','monitoring','closed','discarded']));
 assert.equal(scenarios.filter(row=>row.visibility==='hidden').length,1);const app=await appFor(t,root),list=await app.inject('/api/v1/occurrences?pageSize=100');assert.equal(list.json().total,12);assert.equal(list.json().data.filter(row=>row.environmentalRepresentation).length,6);
 const db=openDatabase(join(root,'current','db.sqlite'));try{
  assert.equal(db.pragma('integrity_check',{simple:true}),'ok');assert.deepEqual(db.pragma('foreign_key_check'),[]);assert.deepEqual(db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map(row=>row.version),[1,2,3,4,5,6]);assert.equal(db.prepare('SELECT count(*) AS total FROM users').get().total,5);
  for(const row of db.prepare('SELECT * FROM occurrences').all()){assert.ok(row.description.includes('não descreve fatos reais'));assert.ok(row.simulated);const events=db.prepare('SELECT * FROM events WHERE occurrenceId=? ORDER BY createdAt,id').all(row.id);assert.equal(events[0].action,'created');assert.ok(events.length>=row.version);for(const event of events){assert.ok(event.actorId);assert.ok(Date.parse(event.createdAt));}}
  for(const image of db.prepare('SELECT * FROM attachments').all()){assert.equal(statSync(join(root,'current','uploads',image.storageKey)).size,image.byteSize);assert.ok(image.caption.includes('fictícia'));assert.ok(readFileSync(join(root,'current','uploads',image.storageKey)).subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));}
 }finally{db.close();}
 const review=scenarios.find(row=>row.key==='community_review'),closed=scenarios.find(row=>row.key==='closed'),hidden=scenarios.find(row=>row.key==='hidden');
 assert.deepEqual((await app.inject('/api/v1/occurrences/'+review.id)).json().data.counts,{support:1,contest:1});const closing=(await app.inject('/api/v1/occurrences/'+closed.id)).json().data;assert.equal(closing.closureReason,'resolved');assert.ok(closing.closure.resolution.available);assert.equal(closing.closure.username,'admin_demo_1');
 assert.equal((await app.inject('/api/v1/occurrences/'+hidden.id)).statusCode,404);const admin=await login(app,root,'admin_demo_2');assert.equal((await app.inject({url:'/api/v1/occurrences/'+hidden.id+'?includeHidden=true',headers:{cookie:admin}})).statusCode,200);
 assert.equal(statSync(join(root,'current','credentials.json')).mode&0o777,0o600);validateSnapshot(join(root,'initial'));
});

test('backup e restauração separada preservam dados/auditoria/imagens, autenticam e não expõem ocultos', {timeout:30000},async t=>{
 const root=workspace(t);await prepareDemo(root);const before=state(root),backup=await backupDemo(root),restored=root+'-restored';await restoreDemo(backup,restored);assert.equal(state(restored),before);await assert.rejects(restoreDemo(backup,restored),/preenchido/);assert.equal(state(root),before);
 const sourceIndex=index(root),app=await appFor(t,restored),admin=await login(app,restored,'admin_demo_1');await login(app,restored,'morador_demo_1');
 for(const scenario of sourceIndex.scenarios){const response=await app.inject({url:`/api/v1/occurrences/${scenario.id}?includeHidden=true`,headers:{cookie:admin}});assert.equal(response.statusCode,200);assert.equal(response.json().data.version,scenario.version);const history=await app.inject({url:`/api/v1/occurrences/${scenario.id}/history?includeHidden=true&pageSize=100`,headers:{cookie:admin}});assert.equal(history.statusCode,200);assert.ok(history.json().data.length);}
 const db=openDatabase(join(restored,'current','db.sqlite'));try{for(const image of db.prepare('SELECT * FROM attachments').all()){
  const response=await app.inject({url:`/api/v1/attachments/${image.id}/file?includeHidden=true`,headers:{cookie:admin}});assert.equal(response.statusCode,200);assert.equal(hash(response.rawPayload),hash(readFileSync(join(root,'current','uploads',image.storageKey))));
  const parent=db.prepare('SELECT visibility FROM occurrences WHERE id=?').get(image.occurrenceId);assert.equal((await app.inject(`/api/v1/attachments/${image.id}/file`)).statusCode,parent.visibility==='hidden'?404:200);
 }}finally{db.close();}
 const reports=await app.inject({url:'/api/v1/reports?pageSize=100',headers:{cookie:admin}});assert.deepEqual(new Set(reports.json().data.map(row=>row.status)),new Set(['pending','upheld']));
});

test('reset exige ambiente, confirmação, identificação, parada e backup; falhas preservam cenário', {timeout:30000},async t=>{
 const root=workspace(t);await prepareDemo(root);const before=state(root);
 await assert.rejects(resetDemo(root,{environment:'development',confirmed:true}),/CUIDACAO_ENV/);await assert.rejects(resetDemo(root,{environment:'demo'}),/confirm-demo-reset/);
 const release=acquireDemoLock(root);try{await assert.rejects(resetDemo(root,{environment:'demo',confirmed:true}),/em uso/);await assert.rejects(backupDemo(root),/em uso/);}finally{release();}
 const env={...process.env,CUIDACAO_DEMO_DIR:root,CUIDACAO_ENV:'demo'};await assert.rejects(execute(process.execPath,['servidor/linha-comando/indice.js','demo:reset'],{env}),error=>error.code===1&&error.stderr.includes('confirm-demo-reset'));
 symlinkSync(join(root,'current','credentials.json'),join(root,'current','forbidden'));await assert.rejects(backupDemo(root),/simbólico/);unlinkSync(join(root,'current','forbidden'));
 writeFileSync(join(root,'backups'),'backup bloqueado');await assert.rejects(resetDemo(root,{environment:'demo',confirmed:true}));assert.equal(state(root),before);unlinkSync(join(root,'backups'));
 writeFileSync(join(root,'initial','examples','ilustracao.png'),'arquivo alterado');await assert.rejects(resetDemo(root,{environment:'demo',confirmed:true}),/alterado/);assert.equal(state(root),before);
 assert.throws(()=>demoDirectory(join(root,'..','data')),/dedicada/);
 const symlink=root+'-link';symlinkSync(root,symlink);assert.throws(()=>demoDirectory(symlink),/simbólicos/);unlinkSync(symlink);
});

test('reset restaura cenário inicial com backup do trabalho anterior e sessões invalidadas', {timeout:30000},async t=>{
 const root=workspace(t);await prepareDemo(root);const initial=state(root),id=index(root).scenarios.find(row=>row.key==='received').id;
 const app=await appFor(t,root),cookie=await login(app,root,'morador_demo_1');const edited=await app.inject({method:'PATCH',url:'/api/v1/occurrences/'+id,headers:{origin,cookie},payload:{expectedVersion:2,changes:{title:'Relato fictício modificado durante apresentação'}}});assert.equal(edited.statusCode,200);await app.close();const changed=state(root);assert.notEqual(changed,initial);
 const env={...process.env,CUIDACAO_DEMO_DIR:root,CUIDACAO_ENV:'demo'};const result=await execute('npm',['run','demo:reset','--','--confirm-demo-reset'],{env,timeout:20000});assert.ok(result.stdout.includes('Cenário inicial restaurado'));assert.equal(state(root),initial);
 const db=openDatabase(join(root,'current','db.sqlite'));try{assert.equal(db.prepare('SELECT count(*) AS total FROM sessions').get().total,0);}finally{db.close();}
 const backup=join(root,'backups',readdirSync(join(root,'backups'))[0]),restored=root+'-session';await restoreDemo(backup,restored);assert.equal(state(restored),changed);
 const finalApp=await appFor(t,root);assert.equal((await finalApp.inject({url:'/api/v1/auth/me',headers:{cookie}})).statusCode,401);await login(finalApp,root,'morador_demo_1');
});


test('servidor web da apresentação bloqueia banco, contas e imagens em URLs diretas e @fs', {timeout:30000},async t=>{
 const parent=mkdtempSync(join(tmpdir(),'cuidacao-web-private-'));t.after(()=>rmSync(parent,{recursive:true,force:true}));
 const root=join(parent,'cuidacao-demo');await prepareDemo(root);
 const options=demoWebOptions(root,0,3001);options.root=parent;
 // Make the parent explicitly readable: a 403 must come from deny, not allow.
 options.server.fs.allow=[process.cwd(),dirname(root)];options.configFile=false;
 const vite=await createServer(options);await vite.listen();t.after(()=>vite.close());
 const base='http://127.0.0.1:'+vite.httpServer.address().port;
 writeFileSync(join(dirname(root),'readable-control.txt'),'controle público de teste');
 assert.equal((await fetch(base+'/@fs'+join(dirname(root),'readable-control.txt'))).status,200);
 const current=join(root,'current'),db=openDatabase(join(current,'db.sqlite'));
 const image=db.prepare("SELECT storageKey FROM attachments JOIN occurrences ON occurrences.id=attachments.occurrenceId WHERE occurrences.visibility='hidden'").get().storageKey;db.close();
 for(const path of ['credentials.json','db.sqlite','uploads/'+image])assert.equal((await fetch(base+'/@fs'+current+'/'+path)).status,403);
 // Block the dedicated in-project path even when Vite's root could serve it.
 for(const path of ['credentials.json','db.sqlite','uploads/'+image])assert.equal((await fetch(base+'/cuidacao-demo/current/'+path)).status,403);
});
