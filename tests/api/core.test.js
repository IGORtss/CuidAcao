import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../../server/app.js';
import {seed} from '../../server/db/seed.js';
import {migrate} from '../../server/db/database.js';
const origin='http://127.0.0.1:3000',password='senha_ficticia_teste_123';
const payload={category:'residuos',description:'Relato fictício sobre descarte de resíduos no bairro.',latitude:-23.94,longitude:-46.18};
const decode=response=>response.json();
async function request(app,method,url,body,cookie='',headers={}) {
  return app.inject({method,url:`/api/v1${url}`,headers:Object.fromEntries(Object.entries({origin,'content-type':'application/json',...(cookie?{cookie}:{}),...headers}).filter(([,value])=>value!==undefined)),...(body!==undefined?{payload:body}:{})});
}
async function account(app,username) {
  const register=await request(app,'POST','/auth/register',{username,password});assert.equal(register.statusCode,201,register.body);
  const login=await request(app,'POST','/auth/login',{username,password});assert.equal(login.statusCode,200,login.body);
  return {user:decode(login).data,cookie:login.headers['set-cookie'].split(';')[0]};
}

test('Etapa 2 — banco real, identidade, permissões e integridade',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'cuidacao-api-')),dbPath=join(folder,'demo.sqlite');
  let clock=new Date('2026-10-09T12:00:00Z');
  let app=await createApp({dbPath,now:()=>clock});
  t.after(async()=>{await app.close();rmSync(folder,{recursive:true,force:true});});
  const first=await account(app,'Autor_demo'),second=await account(app,'vizinho');
  let item;
  await t.test('cadastro normaliza username, cria user sem sessão e protege campos',async()=>{
    assert.equal(first.user.username,'autor_demo');assert.equal(first.user.role,'user');
    const duplicate=await request(app,'POST','/auth/register',{username:'AUTOR_DEMO',password});assert.equal(duplicate.statusCode,409);
    const escalated=await request(app,'POST','/auth/register',{username:'admin_fake',password,role:'admin'});assert.equal(escalated.statusCode,422);
    assert.equal((await request(app,'GET','/auth/me')).statusCode,401);
    assert.ok(!JSON.stringify(first.user).includes('password'));
  });
  await t.test('origem e mídia são obrigatórias inclusive no login',async()=>{
    assert.equal((await request(app,'POST','/auth/login',{username:'autor_demo',password},'',{origin:undefined})).statusCode,403);
    assert.equal((await request(app,'POST','/auth/login',{username:'autor_demo',password},'',{origin:'https://externo.example'})).statusCode,403);
    assert.equal((await request(app,'POST','/auth/login','{}','',{'content-type':'text/plain'})).statusCode,415);
  });
  await t.test('escrita exige sessão e rejeita falsificação de autoria/estado',async()=>{
    assert.equal((await request(app,'POST','/occurrences',payload)).statusCode,401);
    for(const field of ['authorId','status','simulated'])assert.equal((await request(app,'POST','/occurrences',{...payload,[field]:'fake'},first.cookie)).statusCode,422);
  });
  await t.test('criação define estado, autor, ID e evento no servidor',async()=>{
    const response=await request(app,'POST','/occurrences',payload,first.cookie);assert.equal(response.statusCode,201,response.body);
    item=decode(response).data;assert.equal(item.status,'received');assert.equal(item.authorId,first.user.id);assert.equal(item.version,1);assert.equal(item.simulated,true);assert.equal(item.id,'CA-000005');
    const history=decode(await request(app,'GET',`/occurrences/${item.id}/history`));assert.equal(history.data.length,1);assert.equal(history.data[0].action,'created');assert.equal(history.data[0].before,undefined);
  });
  await t.test('validação territorial, texto após trim e tipos estritos',async()=>{
    for(const changes of [{latitude:-23.96},{longitude:-46.16},{latitude:null},{latitude:'-23.94'},{category:'vegetacao'},{description:' '.repeat(21)},{title:'     '}]) {
      const response=await request(app,'POST','/occurrences',{...payload,...changes},first.cookie);assert.equal(response.statusCode,422,response.body);
    }
    for(const [latitude,longitude] of [[-23.95,-46.195],[-23.925,-46.165]])assert.equal((await request(app,'POST','/occurrences',{...payload,latitude,longitude},first.cookie)).statusCode,201);
    const nan=await app.inject({method:'POST',url:'/api/v1/occurrences',headers:{origin,cookie:first.cookie,'content-type':'application/json'},payload:'{"category":"agua","description":"Uma descrição fictícia válida.","latitude":NaN,"longitude":-46.18}'});assert.equal(nan.statusCode,400);
  });
  await t.test('edição exige autoria e versão; concorrência permite somente uma',async()=>{
    const body={expectedVersion:1,changes:{description:'Descrição atualizada para o exemplo de teste.'}};
    assert.equal((await request(app,'PATCH',`/occurrences/${item.id}`,body,second.cookie)).statusCode,403);
    const responses=await Promise.all([request(app,'PATCH',`/occurrences/${item.id}`,body,first.cookie),request(app,'PATCH',`/occurrences/${item.id}`,body,first.cookie)]);
    assert.deepEqual(responses.map(r=>r.statusCode).sort(),[200,409]);
    assert.equal(decode(await request(app,'GET',`/occurrences/${item.id}`)).data.version,2);
    assert.equal(decode(await request(app,'GET',`/occurrences/${item.id}/history`)).total,2);
    assert.equal((await request(app,'PATCH',`/occurrences/${item.id}`,{changes:{title:'Sem versão'}},first.cookie)).statusCode,422);
  });
  await t.test('falha do evento desfaz edição, criação e sequência',async()=>{
    app.db.exec("CREATE TRIGGER fail_events BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT,'forced failure'); END;");
    assert.equal((await request(app,'PATCH',`/occurrences/${item.id}`,{expectedVersion:2,changes:{title:'Não deve persistir'}},first.cookie)).statusCode,500);
    const before=app.db.prepare('SELECT value FROM occurrence_sequence').get().value;
    assert.equal((await request(app,'POST','/occurrences',payload,first.cookie)).statusCode,500);
    assert.equal(app.db.prepare('SELECT value FROM occurrence_sequence').get().value,before);
    assert.equal(decode(await request(app,'GET',`/occurrences/${item.id}`)).data.version,2);
    app.db.exec('DROP TRIGGER fail_events');
    assert.throws(()=>app.db.prepare('UPDATE events SET action=?').run('fake'),/immutable event/);
  });
  await t.test('filtros categoria E estado, paginação e filtros inválidos',async()=>{
    const list=decode(await request(app,'GET','/occurrences?category=residuos&status=received&pageSize=1'));assert.equal(list.data.length,1);assert.equal(list.total,3);
    assert.equal(decode(await request(app,'GET','/occurrences?category=agua')).total,0);
    for(const q of ['category=vegetacao','status=confirmada','pageSize=101','page=0','includeHidden=true'])assert.ok([403,422].includes((await request(app,'GET',`/occurrences?${q}`)).statusCode));
  });
  await t.test('oculto bloqueia lista, detalhe e histórico; duplicata sai da lista',async()=>{
    app.db.prepare("UPDATE occurrences SET visibility='hidden' WHERE id=?").run(item.id);
    assert.equal((await request(app,'GET',`/occurrences/${item.id}`)).statusCode,404);
    assert.equal((await request(app,'GET',`/occurrences/${item.id}/history`)).statusCode,404);
    assert.equal(decode(await request(app,'GET','/occurrences')).total,2);
    app.db.prepare("UPDATE occurrences SET visibility='visible' WHERE id=?").run(item.id);
    app.db.prepare('UPDATE occurrences SET duplicateOfId=? WHERE id=?').run(item.id,'CA-000006');
    assert.equal(decode(await request(app,'GET','/occurrences')).total,2);assert.equal(decode(await request(app,'GET','/occurrences?includeDuplicates=true')).total,3);
  });
  await t.test('janela de edição inclui 24h; estados posteriores bloqueiam',async()=>{
    const body={expectedVersion:2,changes:{title:'Edição no prazo exato'}};
    clock=new Date('2026-10-10T12:00:00Z');
    const fresh=await request(app,'POST','/auth/login',{username:first.user.username,password});first.cookie=fresh.headers['set-cookie'].split(';')[0];
    assert.equal((await request(app,'PATCH',`/occurrences/${item.id}`,body,first.cookie)).statusCode,200);
    clock=new Date('2026-10-10T12:00:00.001Z');assert.equal((await request(app,'PATCH',`/occurrences/${item.id}`,{...body,expectedVersion:3},first.cookie)).statusCode,409);
    app.db.prepare("UPDATE occurrences SET status='community_review',createdAt=? WHERE id=?").run(clock.toISOString(),item.id);
    assert.equal((await request(app,'PATCH',`/occurrences/${item.id}`,{...body,expectedVersion:3},first.cookie)).statusCode,409);
  });
  await t.test('sessão, conta, registro e histórico persistem após reinício; migração idempotente',async()=>{
    const versions=app.db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n;migrate(app.db);assert.equal(app.db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n,versions);
    await app.close();app=await createApp({dbPath,now:()=>clock});
    assert.equal((await request(app,'GET','/auth/me',undefined,first.cookie)).statusCode,200);
    assert.equal(decode(await request(app,'GET',`/occurrences/${item.id}`)).data.title,'Edição no prazo exato');
    assert.equal(decode(await request(app,'GET',`/occurrences/${item.id}/history`)).total,3);
    assert.throws(()=>app.db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run('x','missing','hash','2099','2026'),/FOREIGN KEY/);
  });
  await t.test('logout revoga token, expiração de 8h e erros não expõem segredo',async()=>{
    const logout=await request(app,'POST','/auth/logout',{},first.cookie);assert.equal(logout.statusCode,204);
    assert.equal((await request(app,'GET','/auth/me',undefined,first.cookie)).statusCode,401);
    const login=await request(app,'POST','/auth/login',{username:first.user.username,password});const token=login.headers['set-cookie'];assert.match(token,/HttpOnly/);assert.match(token,/SameSite=Lax/);assert.ok(!login.body.includes('token'));
    const stored=app.db.prepare('SELECT tokenHash FROM sessions ORDER BY createdAt DESC LIMIT 1').get();assert.ok(!token.includes(stored.tokenHash));
    clock=new Date(clock.getTime()+8*3600000);assert.equal((await request(app,'GET','/auth/me',undefined,token.split(';')[0])).statusCode,401);
    const wrong=await request(app,'POST','/auth/login',{username:first.user.username,password:'senha_errada_teste'});
    const missing=await request(app,'POST','/auth/login',{username:'inexistente',password:'senha_errada_teste'});assert.equal(wrong.body,missing.body);
  });
  await t.test('limites de cadastro/login e recuperação após janela',async()=>{
    for(let i=0;i<5;i++)assert.equal((await request(app,'POST','/auth/register',{username:'aa',password})).statusCode,422);
    assert.equal((await request(app,'POST','/auth/register',{username:'aa',password})).statusCode,429);
    for(let i=0;i<10;i++)assert.equal((await request(app,'POST','/auth/login',{username:'rate',password:'curta'})).statusCode,422);
    assert.equal((await request(app,'POST','/auth/login',{username:'rate',password:'curta'})).statusCode,429);
    clock=new Date(clock.getTime()+60001);assert.equal((await request(app,'POST','/auth/login',{username:'rate',password:'curta'})).statusCode,422);
  });
});

test('Seed atômico, contas fictícias e histórico coerente sem sobrescrever base',async t=>{
  const app=await createApp({dbPath:':memory:'});t.after(()=>app.close());
  const accounts=await seed(app.db);assert.equal(accounts.length,5);assert.equal(accounts.filter(a=>a.role==='admin').length,2);
  const before=app.db.prepare('SELECT count(*) AS n FROM events').get().n;
  await assert.rejects(()=>seed(app.db),/base já contém/);assert.equal(app.db.prepare('SELECT count(*) AS n FROM events').get().n,before);
  const login=await request(app,'POST','/auth/login',{username:accounts[3].username,password:accounts[3].password});assert.equal(login.statusCode,200);const cookie=login.headers['set-cookie'].split(';')[0];
  const history=decode(await request(app,'GET','/occurrences/CA-004/history?includeHidden=true',undefined,cookie));
  const closure=history.data.find(e=>e.action==='transition:closed');assert.ok(closure.references[0].id);assert.equal(closure.after.status,'closed');
  assert.equal(decode(await request(app,'GET','/occurrences')).total,4);
  const nonAdmin=await request(app,'POST','/auth/login',{username:accounts[0].username,password:accounts[0].password});assert.equal((await request(app,'GET','/occurrences/CA-004/history?includeHidden=true',undefined,nonAdmin.headers['set-cookie'].split(';')[0])).statusCode,403);
});
