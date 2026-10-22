import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase,migrate} from '../../../servidor/dados/banco-de-dados.js';
import {createApp} from '../../../servidor/http/aplicacao.js';
const origin='http://localhost:5173',password='Senha ficticia 123456';
async function setup(t,options={}) {
 const db=openDatabase(':memory:');migrate(db);const mail=[];
 const app=createApp({db,webOrigin:origin,accountMail:async message=>mail.push(message),...options});
 t.after(async()=>{await app.close();db.close();});
 const post=(path,payload,headers={})=>app.inject({method:'POST',url:'/api/v1/auth/'+path,headers:{origin,...headers},payload});
 return {db,app,post,mail};
}
const cookie = response=>response.headers['set-cookie'].split(';')[0];
const linkToken=message=>message.url.split('=').at(-1);
test('e-mail privado normalizado, unicidade e login sem alterar a autoria pública',async t=>{
 const {post,db,app}=await setup(t);
 const created=await post('register',{username:'email_demo',email:' TESTE@example.invalid ',password});assert.equal(created.statusCode,201);
 assert.equal(db.prepare('SELECT email FROM users').get().email,'teste@example.invalid');assert.equal(Object.hasOwn(created.json().data,'email'),false);
 assert.equal((await post('register',{username:'email_outro',email:'TESTE@example.invalid',password})).statusCode,409);
 assert.equal((await post('register',{username:'EMAIL_DEMO',email:'outro@example.invalid',password})).statusCode,409);
 const logged=await post('login',{username:'TESTE@example.invalid',password});assert.equal(logged.statusCode,200);
 const me=await app.inject({url:'/api/v1/auth/me',headers:{cookie:cookie(logged)}});assert.equal(me.json().data.username,'email_demo');assert.deepEqual(Object.keys(me.json().data).sort(),['id','role','username']);
 const status=await app.inject({url:'/api/v1/auth/account',headers:{cookie:cookie(logged)}});assert.equal(status.headers['cache-control'],'no-store');assert.equal(status.json().data.verified,false);
 assert.equal((await app.inject('/api/v1/auth/account')).statusCode,401);
});
test('verificação e recuperação: uso único, finalidade, expiração e revogação de sessões',async t=>{
 let now=Date.now();const {post,db,app,mail}=await setup(t,{now:()=>now});
 await post('register',{username:'reset_demo',email:'reset@example.invalid',password});
 const logged=await post('login',{username:'reset_demo',password}),headers={cookie:cookie(logged)};
 assert.equal((await post('email/request',{},headers)).statusCode,204);assert.equal(mail.length,1);const verify=linkToken(mail[0]);
 assert.ok(!JSON.stringify(db.prepare('SELECT * FROM account_tokens').all()).includes(verify));
 assert.equal((await post('password/reset',{token:verify,password})).statusCode,422);
 assert.equal((await post('email/verify',{token:verify})).statusCode,204);
 assert.equal((await post('email/verify',{token:verify})).statusCode,422);
 assert.ok(db.prepare('SELECT emailVerifiedAt FROM users').get().emailVerifiedAt);
 assert.equal((await post('password/request',{email:'reset@example.invalid'})).statusCode,204);const reset=linkToken(mail.at(-1));
 assert.equal((await post('password/reset',{token:reset,password:'Nova senha ficticia 123'})).statusCode,204);
 assert.equal((await app.inject({url:'/api/v1/auth/me',headers})).statusCode,401);
 assert.equal((await post('password/reset',{token:reset,password})).statusCode,422);
 assert.equal((await post('login',{username:'reset@example.invalid',password})).statusCode,401);
 assert.equal((await post('login',{username:'reset@example.invalid',password:'Nova senha ficticia 123'})).statusCode,200);
 await post('password/request',{email:'reset@example.invalid'});now+=30*60*1000;
 assert.equal((await post('password/reset',{token:linkToken(mail.at(-1)),password})).statusCode,422);
 assert.equal((await post('password/request',{email:'ausente@example.invalid'})).statusCode,204);assert.equal(mail.length,3);
});
test('transporte ausente ou com falha não finge envio; Origin, JSON e limites são aplicados',async t=>{
 const {post,app}=await setup(t,{accountMail:null});
 assert.equal((await post('password/request',{email:'teste@example.invalid'})).statusCode,503);
 assert.equal((await post('password/request',{email:'teste@example.invalid'},{origin:'https://outro.invalid'})).statusCode,403);
 assert.equal((await app.inject({method:'POST',url:'/api/v1/auth/password/request',headers:{origin,'content-type':'text/plain'},payload:'teste'})).statusCode,415);
 for(let i=0;i<4;i++)await post('password/request',{email:'teste@example.invalid'});
 assert.equal((await post('password/request',{email:'teste@example.invalid'})).statusCode,429);
});
test('falha de envio remove token e mantém conta e sessão utilizáveis',async t=>{
 const {post,db}=await setup(t,{accountMail:async()=>{throw Error('segredo interno');}});
 await post('register',{username:'mail_falha',email:'falha@example.invalid',password});
 const response=await post('password/request',{email:'falha@example.invalid'});assert.equal(response.statusCode,503);assert.ok(!response.body.includes('segredo'));
 assert.equal(db.prepare('SELECT count(*) n FROM account_tokens').get().n,0);
 assert.equal((await post('login',{username:'falha@example.invalid',password})).statusCode,200);
});
test('cadastros simultâneos não compartilham e-mail; falha na redefinição desfaz senha e preserva token',async t=>{
 const {post,db,mail}=await setup(t);
 const results=await Promise.all(['conta_um','conta_dois'].map(username=>post('register',{username,email:'unico@example.invalid',password})));
 assert.deepEqual(results.map(row=>row.statusCode).sort(),[201,409]);
 const logged=await post('login',{username:'unico@example.invalid',password});assert.equal(logged.statusCode,200);
 await post('password/request',{email:'unico@example.invalid'});const token=linkToken(mail[0]);
 const before=db.prepare('SELECT passwordHash FROM users').get().passwordHash;
 db.exec("CREATE TRIGGER session_failure BEFORE DELETE ON sessions BEGIN SELECT RAISE(ABORT,'falha controlada'); END");
 assert.equal((await post('password/reset',{token,password:'Outra senha ficticia 123'})).statusCode,500);
 assert.equal(db.prepare('SELECT passwordHash FROM users').get().passwordHash,before);
 assert.equal(db.prepare('SELECT count(*) n FROM account_tokens').get().n,1);
 assert.equal(db.prepare('SELECT count(*) n FROM sessions').get().n,1);
 db.exec('DROP TRIGGER session_failure');
 assert.equal((await post('password/reset',{token,password:'Outra senha ficticia 123'})).statusCode,204);
});

test('senha de oito letras é aceita no cadastro e na redefinição; sete são recusadas',async t=>{
 const {post,mail}=await setup(t);
 assert.equal((await post('register',{username:'senha_curta',email:'curta@example.invalid',password:'abcdefg'})).statusCode,422);
 assert.equal((await post('register',{username:'senha_simples',email:'simples@example.invalid',password:'abcdefgh'})).statusCode,201);
 assert.equal((await post('login',{username:'simples@example.invalid',password:'abcdefgh'})).statusCode,200);
 await post('password/request',{email:'simples@example.invalid'});const token=linkToken(mail[0]);
 assert.equal((await post('password/reset',{token,password:'abcdefg'})).statusCode,422);
 assert.equal((await post('password/reset',{token,password:'ijklmnop'})).statusCode,204);
 assert.equal((await post('login',{username:'simples@example.invalid',password:'ijklmnop'})).statusCode,200);
});
test('cadastro simples com apelido e senha de oito letras mantém sessão e logout sem e-mail',async t=>{
 const {post,app,db}=await setup(t,{accountMail:null});
 const account={username:'simples_sem_email',password:'abcdefgh'};
 assert.equal((await post('register',account)).statusCode,201);
 assert.equal(db.prepare('SELECT email FROM users WHERE username=?').get(account.username).email,null);
 const logged=await post('login',account);assert.equal(logged.statusCode,200);
 const headers={cookie:cookie(logged)};
 assert.equal((await app.inject({url:'/api/v1/auth/me',headers})).json().data.username,account.username);
 assert.equal((await post('logout',{},headers)).statusCode,204);
 assert.equal((await app.inject({url:'/api/v1/auth/me',headers})).statusCode,401);
});
