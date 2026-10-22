import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createApp} from '../../../servidor/http/aplicacao.js';
import {openDatabase} from '../../../servidor/dados/banco-de-dados.js';
import {migrate,migrations} from '../../../servidor/dados/banco-de-dados.js';
import {controlledGoogle,googleClientId} from '../auxiliares/provedor-google.js';
const origin='http://localhost:5173';
const cookies=response=>(Array.isArray(response.headers['set-cookie'])?response.headers['set-cookie']:[response.headers['set-cookie']]).filter(Boolean).map(value=>value.split(';')[0]).join('; ');
const session=response=>cookies(response).split('; ').find(value=>value.startsWith('cuidacao_session='));
async function setup(t,{enabled=true,now=Date.now,logger=false}={}){
 const directory=mkdtempSync(join(tmpdir(),'cuidacao-google-')),filename=join(directory,'db.sqlite'),db=openDatabase(filename);migrate(db);const provider=controlledGoogle();
 const options={webOrigin:origin,now,logger,google:{clientId:enabled?googleClientId:'',client:provider.client}};
 const app=createApp({db,...options});t.after(async()=>{await app.close();if(db.open)db.close();rmSync(directory,{recursive:true,force:true});});
 const post=(name,payload={},cookie,extra={})=>app.inject({method:'POST',url:'/api/v1/auth/google/'+name,headers:{origin,...(cookie?{cookie}:{})},payload,...extra});
 const begin=async()=>{const challenge=await post('challenge');assert.equal(challenge.statusCode,200);return {cookie:cookies(challenge),nonce:challenge.json().data.nonce};};
 const verify=async claims=>{const flow=await begin();const credential=provider.token(flow.nonce,claims);const result=await post('verify',{credential},flow.cookie);return {...flow,result,credential};};
 return {app,db,filename,options,provider,post,begin,verify};
}
test('Google inicial escolhe username, cria user sem senha, sessão local e mesmas permissões',async t=>{
 const {app,db,post,verify}=await setup(t);const flow=await verify({role:'admin',name:'Nome Google ignorado',email:'same@example.invalid'});assert.deepEqual(flow.result.json(),{data:{needsUsername:true}});assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,0);
 assert.equal((await post('complete',{username:'Google_User',role:'admin'},flow.cookie)).statusCode,422);
 const completed=await post('complete',{username:'Google_User'},flow.cookie);assert.equal(completed.statusCode,200);const user=completed.json().data.user;assert.equal(user.username,'google_user');assert.equal(user.role,'user');const row=db.prepare('SELECT * FROM users').get();assert.equal(row.passwordHash,null);assert.equal(row.passwordSalt,null);assert.equal(row.passwordParams,null);assert.ok(!completed.body.includes('stable_test_subject'));assert.ok(!completed.body.includes('same@example.invalid'));
 const cookie=session(completed);assert.match(completed.headers['set-cookie'][0],/HttpOnly.*SameSite=Lax/);assert.equal((await app.inject({url:'/api/v1/auth/me',headers:{cookie}})).json().data.id,user.id);
 assert.equal((await app.inject({url:'/api/v1/occurrences?includeHidden=true',headers:{cookie}})).statusCode,403);
 const created=await app.inject({method:'POST',url:'/api/v1/occurrences',headers:{origin,cookie},payload:{category:'agua',description:'Registro fictício por conta Google verificada.',latitude:-23.94,longitude:-46.18}});assert.equal(created.statusCode,201);assert.equal(db.prepare('SELECT authorId FROM occurrences').get().authorId,user.id);
 const passwordLogin=await app.inject({method:'POST',url:'/api/v1/auth/login',headers:{origin},payload:{username:user.username,password:'senha ficticia qualquer'}});assert.equal(passwordLogin.statusCode,401);
 assert.equal((await post('complete',{username:'other_name'},flow.cookie)).statusCode,401);
});
test('Google recorrente usa sub, não e-mail; rotação, expiração e logout das sessões existentes',async t=>{
 let clock=Date.now();const {app,db,post,verify,provider}=await setup(t,{now:()=>clock});const first=await verify({email:'same@example.invalid'}),registered=await post('complete',{username:'google_first'},first.cookie),original=session(registered);
 const challenge=await post('challenge',{},original);
 const recurrent=await post('verify',{credential:provider.token(challenge.json().data.nonce,{email:'changed@example.invalid',role:'admin'})},cookies(challenge)+'; '+original);
 assert.equal(recurrent.statusCode,200);assert.equal(recurrent.json().data.user.id,registered.json().data.user.id);assert.equal(recurrent.json().data.user.role,'user');assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,1);
 assert.equal((await app.inject({url:'/api/v1/auth/me',headers:{cookie:original}})).statusCode,401);
 const another=await post('challenge',{},session(recurrent));const stale=await post('verify',{credential:first.credential},cookies(another)+'; '+session(recurrent));assert.equal(stale.statusCode,401);assert.equal((await app.inject({url:'/api/v1/auth/me',headers:{cookie:session(recurrent)}})).statusCode,200);
 const third=await verify({sub:'other_subject',email:'same@example.invalid'}),other=await post('complete',{username:'google_second'},third.cookie);assert.notEqual(other.json().data.user.id,registered.json().data.user.id);
 assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,2);
 const logout=await app.inject({method:'POST',url:'/api/v1/auth/logout',headers:{origin,cookie:session(recurrent)},payload:{}});assert.equal(logout.statusCode,204);assert.equal((await app.inject({url:'/api/v1/auth/me',headers:{cookie:original}})).statusCode,401);
 clock+=8*3600000;assert.equal((await app.inject({url:'/api/v1/auth/me',headers:{cookie:session(other)}})).statusCode,401);
});
test('Google verifica assinatura, destinatário, emissor, expiração, nonce e contexto; sem efeitos parciais',async t=>{
 const {db,provider,post,begin}=await setup(t);
 for(const claims of [{aud:'wrong.apps.googleusercontent.com'},{iss:'https://evil.invalid'},{exp:Math.floor(Date.now()/1000)-3600},{iat:Math.floor(Date.now()/1000)+3600},{sub:''},{nonce:'wrong_nonce'}]){const flow=await begin(),result=await post('verify',{credential:provider.token(flow.nonce,claims)},flow.cookie);assert.equal(result.statusCode,401);}
 const flow=await begin(),token=provider.token(flow.nonce),tampered=token.split('.');tampered[1]=Buffer.from(JSON.stringify({sub:'forged'})).toString('base64url');assert.equal((await post('verify',{credential:tampered.join('.')},flow.cookie)).statusCode,401);
 assert.equal((await post('verify',{credential:token})).statusCode,401);assert.equal((await post('verify',{credential:token},flow.cookie+'; '+flow.cookie)).statusCode,401);
 assert.equal((await post('verify',{credential:token},flow.cookie,{headers:{origin:'https://evil.invalid',cookie:flow.cookie}})).statusCode,403);assert.equal((await post('verify',{credential:token,role:'admin'},flow.cookie)).statusCode,422);
 assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,0);assert.equal(db.prepare('SELECT count(*) n FROM sessions').get().n,0);
});
test('Google colisão preserva conta local e pending; não vincula e permite escolher outro username',async t=>{
 const {app,db,post,verify}=await setup(t);const local=await app.inject({method:'POST',url:'/api/v1/auth/register',headers:{origin},payload:{username:'existing_user',password:'Senha ficticia local 123'}});const flow=await verify();const collision=await post('complete',{username:'EXISTING_USER'},flow.cookie);assert.equal(collision.statusCode,409);assert.match(collision.json().error.message,/Vinculação/);assert.equal(db.prepare('SELECT count(*) n FROM google_identities').get().n,0);
 const complete=await post('complete',{username:'another_user'},flow.cookie);assert.equal(complete.statusCode,200);assert.notEqual(complete.json().data.user.id,local.json().data.id);assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,2);
 const login=await app.inject({method:'POST',url:'/api/v1/auth/login',headers:{origin},payload:{username:'existing_user',password:'Senha ficticia local 123'}});assert.equal(login.statusCode,200);
});
test('Google ausente, falha de rede, cancelamento, expiração e limitação não autenticam',async t=>{
 const disabled=await setup(t,{enabled:false});assert.deepEqual((await disabled.app.inject('/api/v1/auth/google/config')).json(),{data:{enabled:false}});assert.equal((await disabled.post('challenge')).statusCode,503);
 let clock=Date.now();const {provider,post,begin}=await setup(t,{now:()=>clock});const flow=await begin();provider.offline();assert.equal((await post('verify',{credential:provider.token(flow.nonce)},flow.cookie)).statusCode,503);
 assert.equal((await post('cancel',{},flow.cookie)).statusCode,204);assert.equal((await post('verify',{credential:provider.token(flow.nonce)},flow.cookie)).statusCode,401);const expired=await begin();clock+=600000;assert.equal((await post('verify',{credential:provider.token(expired.nonce)},expired.cookie)).statusCode,401);
 for(let i=0;i<10;i++)assert.equal((await post('challenge')).statusCode,200);assert.equal((await post('challenge')).statusCode,429);
});
test('Google concorrência e rollback preservam unicidade, pending, conta e sessão anterior',async t=>{
 const {app,db,post,verify}=await setup(t);const a=await verify(),b=await verify();const results=await Promise.all([post('complete',{username:'google_a'},a.cookie),post('complete',{username:'google_b'},b.cookie)]);assert.deepEqual(results.map(r=>r.statusCode),[200,200]);assert.equal(results[0].json().data.user.id,results[1].json().data.user.id);assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,1);assert.equal(db.prepare('SELECT count(*) n FROM google_identities').get().n,1);
 const pending=await verify({sub:'rollback_subject'}),before=db.prepare('SELECT count(*) n FROM sessions').get().n;db.exec("CREATE TRIGGER reject_google_session BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT,'private rollback'); END");const fail=await post('complete',{username:'rollback_user'},pending.cookie+'; '+session(results[0]));assert.equal(fail.statusCode,500);assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,1);assert.equal(db.prepare('SELECT count(*) n FROM sessions').get().n,before);assert.ok(db.prepare('SELECT subject FROM google_flows WHERE subject=?').get('rollback_subject'));
 assert.equal((await app.inject({url:'/api/v1/auth/me',headers:{cookie:session(results[0])}})).statusCode,200);db.exec('DROP TRIGGER reject_google_session');assert.equal((await post('complete',{username:'rollback_user'},pending.cookie)).statusCode,200);
});
test('Google identidade, pending e sessão persistem ao reabrir SQLite; não duplica a conta',async t=>{
 const {app,db,filename,options,post,verify,provider}=await setup(t);const flow=await verify(),registered=await post('complete',{username:'persisted_google'},flow.cookie),pending=await verify({sub:'pending_persisted'});await app.close();db.close();const restarted=createApp({databasePath:filename,...options});try{
  assert.equal((await restarted.inject({url:'/api/v1/auth/me',headers:{cookie:session(registered)}})).statusCode,200);
  const finished=await restarted.inject({method:'POST',url:'/api/v1/auth/google/complete',headers:{origin,cookie:pending.cookie},payload:{username:'pending_google'}});assert.equal(finished.statusCode,200);
  const challenge=await restarted.inject({method:'POST',url:'/api/v1/auth/google/challenge',headers:{origin},payload:{}}),recurrent=await restarted.inject({method:'POST',url:'/api/v1/auth/google/verify',headers:{origin,cookie:cookies(challenge)},payload:{credential:provider.token(challenge.json().data.nonce)}});assert.equal(recurrent.json().data.user.id,registered.json().data.user.id);
 }finally{await restarted.close();}
});
test('migração 003 preserva usuários, hashes, sessões e FKs; rollback e reativação de FK',async t=>{
 const db=openDatabase(':memory:');t.after(()=>db.close());for(const file of ['001_initial.sql','002_relations_reverse_index.sql'])db.exec(migrations.find(entry=>entry.name===file).sql);db.exec("CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,appliedAt TEXT NOT NULL);INSERT INTO schema_migrations VALUES(1,'date'),(2,'date');INSERT INTO users VALUES ('kept','kept_user','hash','salt','{}','admin','date','date');INSERT INTO sessions VALUES('session','kept','token','date','date','date')");
 const before=createHash('sha256').update(JSON.stringify([db.prepare('SELECT id,username,passwordHash,passwordSalt,passwordParams,role,createdAt,updatedAt FROM users').all(),db.prepare('SELECT * FROM sessions').all()])).digest('hex');assert.deepEqual(migrate(db),[3,4,5,6,7]);assert.equal(createHash('sha256').update(JSON.stringify([db.prepare('SELECT id,username,passwordHash,passwordSalt,passwordParams,role,createdAt,updatedAt FROM users').all(),db.prepare('SELECT * FROM sessions').all()])).digest('hex'),before);assert.equal(db.pragma('foreign_keys',{simple:true}),1);assert.deepEqual(db.pragma('foreign_key_check'),[]);assert.deepEqual(migrate(db),[]);
 const broken=openDatabase(':memory:');try{
  for(const file of ['001_initial.sql','002_relations_reverse_index.sql'])broken.exec(migrations.find(entry=>entry.name===file).sql);
  broken.exec("CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,appliedAt TEXT NOT NULL);INSERT INTO schema_migrations VALUES(1,'date'),(2,'date');PRAGMA foreign_keys=OFF;INSERT INTO sessions VALUES('bad','missing','bad-token','date','date','date');PRAGMA foreign_keys=ON");
  assert.throws(()=>migrate(broken),/referências inconsistentes/);assert.equal(broken.pragma('foreign_keys',{simple:true}),1);
  assert.deepEqual(broken.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map(row=>row.version),[1,2]);
  assert.equal(broken.prepare("SELECT 1 FROM sqlite_master WHERE name='google_identities'").get(),undefined);
  assert.equal(broken.pragma('table_info(users)').find(row=>row.name==='passwordHash').notnull,1);
 }finally{broken.close();}

});


test('Google logger não expõe ID token, nonce, cookie, sub ou perfil',async t=>{
 let logs='';const {post,verify}=await setup(t,{logger:{stream:{write(chunk){logs+=chunk;}}}});const flow=await verify({sub:'private_subject',email:'private@example.invalid',name:'Private Google Name'});const response=await post('complete',{username:'logged_google'},flow.cookie);
 for(const secret of [flow.credential,flow.nonce,flow.cookie.split('=')[1],'private_subject','private@example.invalid','Private Google Name'])assert.ok(!logs.includes(secret));assert.equal(response.statusCode,200);
});

test('Google por processos HTTP independentes conserva identidade, cookie e permissões após reinício',async t=>{
 const {spawn}=await import('node:child_process'),{once}=await import('node:events'),{createPublicKey}=await import('node:crypto');
 const {app,db,filename,post,verify,provider}=await setup(t);const flow=await verify(),registered=await post('complete',{username:'http_google'},flow.cookie);const old=session(registered),id=registered.json().data.user.id;await app.close();db.close();
 const certificate=createPublicKey(provider.privateKey).export({format:'pem',type:'spki'});
 async function start(){const child=spawn(process.execPath,['apoio/testes/auxiliares/servidor-http-google.js'],{env:{...process.env,CUIDACAO_TEST_GOOGLE_DB:filename,CUIDACAO_TEST_GOOGLE_CERT:certificate},stdio:['ignore','pipe','pipe']});
  t.after(()=>{if(child.exitCode===null)child.kill('SIGTERM');});
  const port=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>{child.kill('SIGTERM');reject(Error('Servidor de teste não iniciou.'));},10000);child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',()=>{clearTimeout(timer);reject(Error('Servidor de teste encerrou antes de iniciar.'));});child.stdout.on('data',chunk=>{text+=chunk;if(text.includes('\n')){clearTimeout(timer);resolve(JSON.parse(text.split('\n')[0]).port);}});});
  return {base:'http://127.0.0.1:'+port,async stop(){const ended=once(child,'exit');child.kill('SIGTERM');await ended;}};
 }
 const first=await start();assert.equal((await (await fetch(first.base+'/api/v1/auth/me',{headers:{cookie:old}})).json()).data.id,id);await first.stop();
 const second=await start();try{
  assert.equal((await fetch(second.base+'/api/v1/occurrences?includeHidden=true',{headers:{cookie:old}})).status,403);
  const challenge=await fetch(second.base+'/api/v1/auth/google/challenge',{method:'POST',headers:{origin,'content-type':'application/json',cookie:old},body:'{}'}),nonce=(await challenge.json()).data.nonce;
  const googleCookie=challenge.headers.get('set-cookie').split(';')[0];const login=await fetch(second.base+'/api/v1/auth/google/verify',{method:'POST',headers:{origin,'content-type':'application/json',cookie:googleCookie+'; '+old},body:JSON.stringify({credential:provider.token(nonce)})});assert.equal(login.status,200);assert.equal((await login.json()).data.user.id,id);
  assert.equal((await fetch(second.base+'/api/v1/auth/me',{headers:{cookie:old}})).status,401);
 }finally{await second.stop();}
});
