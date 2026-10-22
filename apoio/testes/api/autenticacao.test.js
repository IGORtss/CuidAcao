import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,scryptSync} from 'node:crypto';
import {createApp} from '../../../servidor/http/aplicacao.js';
import {openDatabase} from '../../../servidor/dados/banco-de-dados.js';
import {migrate} from '../../../servidor/dados/banco-de-dados.js';
import {passwordParams} from '../../../servidor/dominio/indice.js';
import {configuredOrigin} from '../../../servidor/dominio/indice.js';
const origin='http://localhost:5173',password='Senha fictícia 123456',payload={username:'Morador_Ficticio',password};
async function setup(t,options={}){
 const directory=mkdtempSync(join(tmpdir(),'cuidacao-auth-')),filename=join(directory,'auth.sqlite'),db=openDatabase(filename);migrate(db);
 const app=createApp({db,webOrigin:origin,...options});
 t.after(async()=>{await app.close();if(db.open)db.close();rmSync(directory,{recursive:true,force:true});});
 const post=(route,body,extra={})=>app.inject({method:'POST',url:'/api/v1/auth/'+route,headers:{origin,...extra.headers},payload:body===undefined&&route!=='logout'?payload:body,...extra});
 return {app,db,filename,post};
}
const cookie=response=>response.headers['set-cookie'].split(';')[0];
function publicOnly(response){assert.ok(!/passwordHash|passwordSalt|passwordParams|tokenHash|stack|sqlite|\/home|\/tmp/i.test(response.body),'Resposta deve conter somente dados públicos.');}
test('cadastro normaliza, cria user sem sessão, scrypt exato e duplicado=409',async t=>{
 const {app,db,post}=await setup(t);const registered=await post('register');assert.equal(registered.statusCode,201);assert.deepEqual(Object.keys(registered.json().data).sort(),['id','role','username']);assert.equal(registered.json().data.username,'morador_ficticio');assert.equal(registered.json().data.role,'user');assert.equal(registered.headers['set-cookie'],undefined);publicOnly(registered);
 assert.equal(db.prepare('SELECT count(*) n FROM sessions').get().n,0);const anonymous=await app.inject('/api/v1/auth/me');assert.equal(anonymous.statusCode,401);assert.equal(anonymous.headers['set-cookie'],undefined);
 const row=db.prepare('SELECT * FROM users').get();assert.deepEqual(JSON.parse(row.passwordParams),passwordParams);assert.equal(row.passwordSalt.length,32);
 const {keyLength,...params}=passwordParams;assert.ok(scryptSync(password,Buffer.from(row.passwordSalt,'hex'),keyLength,params).equals(Buffer.from(row.passwordHash,'hex')));
 assert.equal((await post('register',{...payload,username:'MORADOR_FICTICIO'})).statusCode,409);assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,1);assert.equal(db.prepare('SELECT count(*) n FROM events').get().n,0);
});
test('validação rejeita role, campos desconhecidos, espaços, limites e tipos sem criar contas',async t=>{
 const {db,post}=await setup(t);let i=0;
 for(const body of [{...payload,role:'admin'},{...payload,email:'invalido'},{...payload,username:'ab'},{...payload,username:'a'.repeat(31)},{...payload,username:' nome'},{...payload,username:'José'},{...payload,password:'curta'},{...payload,password:'x'.repeat(129)},{...payload,password:123456789123},{username:payload.username},null]){
  const result=await post('register',body,{remoteAddress:`127.0.1.${++i}`,headers:{origin,'content-type':'application/json'},...(body===null?{payload:'null'}:{})});assert.equal(result.statusCode,422);publicOnly(result);
 }
 assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,0);
});
test('login, cookie e sessão; incorreto e inexistente iguais; não remover espaços da senha',async t=>{
 const {app,db,post}=await setup(t);const spaced={username:'demo_spaces',password:'  senha ficticia 123  '};await post('register',spaced);
 const bad=await post('login',{...spaced,password:spaced.password.trim()}),missing=await post('login',{username:'nao_existe',password:spaced.password});assert.equal(bad.statusCode,401);assert.deepEqual(bad.json(),missing.json());publicOnly(bad);
 const logged=await post('login',spaced);assert.equal(logged.statusCode,200);publicOnly(logged);const header=logged.headers['set-cookie'];assert.match(header,/HttpOnly/);assert.match(header,/SameSite=Lax/);assert.match(header,/Path=\//);assert.match(header,/Max-Age=28800/);assert.doesNotMatch(header,/Secure|Domain=/);
 const token=cookie(logged).split('=')[1];assert.equal(Buffer.from(token,'base64url').length,32);const stored=db.prepare('SELECT * FROM sessions').get();assert.ok(stored.tokenHash===createHash('sha256').update(token).digest('hex'));assert.ok(!JSON.stringify(stored).includes(token));assert.equal(Date.parse(stored.expiresAt)-Date.parse(stored.createdAt),8*60*60*1000);
 const me=await app.inject({url:'/api/v1/auth/me',headers:{cookie:cookie(logged)}});assert.equal(me.statusCode,200);assert.deepEqual(me.json().data,logged.json().data);assert.equal(me.headers['cache-control'],'no-store');publicOnly(me);
});
test('logout idempotente, revogação e rotação da sessão no novo login',async t=>{
 const {app,db,post}=await setup(t);await post('register');const first=await post('login'),second=await post('login',payload,{headers:{origin,cookie:cookie(first)}});assert.notEqual(cookie(first),cookie(second));assert.equal((await app.inject({url:'/api/v1/auth/me',headers:{cookie:cookie(first)}})).statusCode,401);
 const out=await post('logout',undefined,{headers:{origin,cookie:cookie(second)}});assert.equal(out.statusCode,204);assert.equal(out.body,'');assert.match(out.headers['set-cookie'],/Max-Age=0/);assert.match(out.headers['set-cookie'],/HttpOnly/);assert.equal(db.prepare('SELECT count(*) n FROM sessions').get().n,0);
 assert.equal((await app.inject({url:'/api/v1/auth/me',headers:{cookie:cookie(second)}})).statusCode,401);assert.equal((await post('logout',undefined)).statusCode,204);
});
test('expiração absoluta no instante exato, cookies inválidos e identidade forjada não autenticam',async t=>{
 let clock=Date.parse('2026-10-07T12:00:00Z');const {app,post}=await setup(t,{now:()=>clock});await post('register');const logged=await post('login');clock+=8*60*60*1000-1;assert.equal((await app.inject({url:'/api/v1/auth/me',headers:{cookie:cookie(logged)}})).statusCode,200);clock++;
 for(const header of [cookie(logged),'cuidacao_session=invalid','role=admin',cookie(logged)+'; '+cookie(logged)]){const result=await app.inject({url:'/api/v1/auth/me',headers:{cookie:header,'x-role':'admin','x-user-id':'forged'}});assert.equal(result.statusCode,401);publicOnly(result);}
 assert.equal((await app.inject('/api/v1/occurrences')).statusCode,200);
});
test('Origin ausente/divergente, JSON inválido e tipo incorreto são recusados',async t=>{
 const {post}=await setup(t);
 for(const route of ['register','login','logout'])for(const headers of [{},{origin:'http://127.0.0.1:5173'},{origin:'null'},{origin:'http://localhost:5173.evil.invalid'}])assert.equal((await post(route,{}, {headers})).statusCode,403);
 assert.equal((await post('register','{',{headers:{origin,'content-type':'application/json'}})).statusCode,400);
 assert.equal((await post('login','username=demo&password=ficticio',{headers:{origin,'content-type':'application/x-www-form-urlencoded'}})).statusCode,415);
 assert.equal((await post('logout',{unexpected:true})).statusCode,422);
});
test('limites cadastro por IP e login por IP+username, sem confiar em headers; janela libera após 60s',async t=>{
 let clock=Date.now();const {post}=await setup(t,{now:()=>clock});
 for(let i=0;i<5;i++)assert.equal((await post('register',{username:'a',password})).statusCode,422);
 const limited=await post('register',payload,{headers:{origin,'x-forwarded-for':'different'}});assert.equal(limited.statusCode,429);assert.equal(limited.headers['retry-after'],'60');
 for(let i=0;i<10;i++)assert.equal((await post('login',{username:'missing_user',password})).statusCode,401);
 assert.equal((await post('login',{username:'MISSING_USER',password})).statusCode,429);assert.equal((await post('login',{username:'another_user',password})).statusCode,401);
 clock+=60000;assert.equal((await post('register')).statusCode,201);assert.equal((await post('login',{username:'missing_user',password})).statusCode,401);
});
test('guardas exigem sessão e papel vindo do banco; somente admin libera includeHidden',async t=>{
 const {app,db,post}=await setup(t);await post('register');const logged=await post('login');
 await assert.rejects(app.requireSession({headers:{},user:{role:'admin'}}),error=>error.statusCode===401);
 const request={headers:{cookie:cookie(logged)},user:{role:'admin'}};await assert.rejects(app.requireAdmin(request),error=>error.statusCode===403);assert.equal(request.user.role,'user');
 // Controlled role assignment only in the temporary database, not a web route.
 db.prepare("UPDATE users SET role='admin' WHERE id=?").run(logged.json().data.id);await app.requireAdmin(request);assert.equal(request.user.role,'admin');
 assert.equal((await app.inject({url:'/api/v1/occurrences?includeHidden=true',headers:request.headers})).statusCode,200);
 db.prepare('DELETE FROM sessions').run();await assert.rejects(app.requireAdmin(request),error=>error.statusCode===401);
});
test('sessão persiste ao recriar aplicação e conexão SQLite',async t=>{
 const {app,db,filename,post}=await setup(t);await post('register');const logged=await post('login');await app.close();db.close();
 const restarted=createApp({databasePath:filename,webOrigin:origin});try{const response=await restarted.inject({url:'/api/v1/auth/me',headers:{cookie:cookie(logged)}});assert.equal(response.statusCode,200);assert.deepEqual(response.json().data,logged.json().data);}finally{await restarted.close();}
});
test('HTTPS exige Secure; HTTP externo e configuração com caminho são recusados',async t=>{
 assert.throws(()=>configuredOrigin('http://external.invalid'));assert.throws(()=>configuredOrigin(origin+'/path'));const {post}=await setup(t,{webOrigin:'https://cuidacao.example.invalid'});
 await post('register',payload,{headers:{origin:'https://cuidacao.example.invalid'}});const response=await post('login',payload,{headers:{origin:'https://cuidacao.example.invalid'}});assert.match(response.headers['set-cookie'],/Secure/);
});
test('logger e respostas não expõem senha, token, cookie, hashes ou corpo de autenticação',async t=>{
 let logs='';const {app,db,post}=await setup(t,{logger:{stream:{write(chunk){logs+=chunk;}}}});await post('register');const logged=await post('login');const token=cookie(logged).split('=')[1];const stored=db.prepare('SELECT * FROM users').get();
 await app.inject({url:'/api/v1/auth/me?unknown=PRIVATE_QUERY_VALUE',headers:{cookie:cookie(logged),authorization:'PRIVATE_AUTHORIZATION'}});
 await post('login',{...payload,password:'PRIVATE_WRONG_PASSWORD'});await post('logout',{}, {headers:{origin,cookie:cookie(logged)}});
 for(const value of [password,token,stored.passwordHash,stored.passwordSalt,'PRIVATE_QUERY_VALUE','PRIVATE_AUTHORIZATION','PRIVATE_WRONG_PASSWORD'])assert.ok(!logs.includes(value),'Logger expôs segredo de teste.');publicOnly(logged);
});
test('cadastro concorrente respeita unicidade; falha ao inserir sessão desfaz revogação anterior',async t=>{
 const {db,post}=await setup(t);const results=await Promise.all([post('register'),post('register')]);assert.deepEqual(results.map(result=>result.statusCode).sort(),[201,409]);assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,1);
 const logged=await post('login');const hash=db.prepare('SELECT tokenHash FROM sessions').get().tokenHash;
 db.exec("CREATE TRIGGER reject_auth_session BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT,'PRIVATE_SESSION_ERROR'); END");
 const failed=await post('login',payload,{headers:{origin,cookie:cookie(logged)}});assert.equal(failed.statusCode,500);assert.ok(!failed.body.includes('PRIVATE_SESSION_ERROR'));assert.ok(db.prepare('SELECT tokenHash FROM sessions').get().tokenHash===hash);
});
