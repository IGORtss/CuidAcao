import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createIntegratedApp} from '../../../integrado/aplicacao.js';
const origin='http://127.0.0.1:4180';

test('site integrado preserva conta, sessão e ocorrência após fechar e reabrir SQLite', {timeout:30000}, async()=>{
  const dir=mkdtempSync(join(tmpdir(),'cuidacao-site-db-')),databasePath=join(dir,'site.sqlite');
  let app=createIntegratedApp({databasePath,webOrigin:origin});
  const post=(url,payload,cookie='')=>app.inject({method:'POST',url,headers:{origin,cookie},payload});
  try {
    const account={username:'Auditoria_Banco',password:'Senha ficticia teste 2026'};
    assert.equal((await post('/api/v1/auth/register',account)).statusCode,201);
    const login=await post('/api/v1/auth/login',account);assert.equal(login.statusCode,200);
    const cookie=login.headers['set-cookie'].split(';')[0];
    const created=await post('/api/v1/occurrences',{category:'residuos',description:'Registro fictício para testar a persistência do banco integrado.',latitude:-23.94,longitude:-46.18},cookie);
    assert.equal(created.statusCode,201,created.body);const id=created.json().data.id;
    await app.close();app=createIntegratedApp({databasePath,webOrigin:origin});
    const session=await app.inject({url:'/api/v1/auth/me',headers:{cookie}});assert.equal(session.statusCode,200);assert.equal(session.json().data.username,account.username.toLowerCase());
    const occurrence=await app.inject('/api/v1/occurrences/'+id);assert.equal(occurrence.statusCode,200);assert.match(occurrence.json().data.description,/persistência/);
    const history=await app.inject('/api/v1/occurrences/'+id+'/history');assert.equal(history.statusCode,200);assert.ok(history.json().data.length);
    assert.equal((await app.inject('/')).statusCode,200);
    assert.equal((await app.inject('/territorio/index.html')).statusCode,200);
    assert.equal((await app.inject('/api/v1/rota-inexistente')).statusCode,404);
  } finally { await app.close();rmSync(dir,{recursive:true,force:true}); }
});

test('servidor integrado serve somente o site, sem expor banco ou arquivos de código',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'cuidacao-site-static-')),siteDirectory=join(dir,'site');mkdirSync(siteDirectory);
  writeFileSync(join(siteDirectory,'index.html'),'<h1>Site de teste</h1>');writeFileSync(join(dir,'segredo.txt'),'privado');
  const app=createIntegratedApp({databasePath:join(dir,'private.sqlite'),siteDirectory,webOrigin:origin});
  try {
    const home=await app.inject('/');assert.equal(home.statusCode,200);assert.match(home.headers['content-type'],/text\/html/);assert.equal(home.headers['x-content-type-options'],'nosniff');
    for(const path of ['/package.json','/data/private.sqlite','/servidor/dominio/indice.js','/%2e%2e/segredo.txt','/%2e%2e%5csegredo.txt']) {
      const response=await app.inject(path);assert.ok([400,404].includes(response.statusCode));assert.ok(!response.body.includes('privado'));
    }
  } finally {await app.close();rmSync(dir,{recursive:true,force:true});}
});
