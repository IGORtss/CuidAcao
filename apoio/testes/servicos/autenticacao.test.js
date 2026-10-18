import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthClient} from '../../../codigo-fonte/servicos/api.js';
const user={id:'ficticio',username:'demo_user',role:'user'};
test('cliente envia credenciais somente em JSON e projeta usuário público',async()=>{
 const calls=[];const client=createAuthClient(async(path,options)=>{calls.push({path,options});return {ok:true,status:200,json:async()=>({data:{...user,passwordHash:'PRIVATE_HASH'}})};});
 const result=await client.login({username:'demo_user',password:'senha ficticia 123'});assert.deepEqual(result,user);assert.equal(calls[0].path,'/api/v1/auth/login');assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.method,'POST');assert.equal(calls[0].options.headers['Content-Type'],'application/json');assert.equal(JSON.parse(calls[0].options.body).password,'senha ficticia 123');assert.ok(!calls[0].path.includes('senha'));
});
test('sessão ausente é visitante; login inválido e erros de rede permanecem explícitos',async()=>{
 const client=createAuthClient(async()=>({ok:false,status:401}));assert.equal(await client.me(),null);await assert.rejects(client.login({}),error=>error.status===401 && error.message==='Usuário ou senha inválidos.');
 await assert.rejects(createAuthClient(async()=>{throw Error('PRIVATE_STACK');}).me(),/conectar à API/);
});
test('logout aceita 204 e identidade inválida é rejeitada sem fallback',async()=>{
 const client=createAuthClient(async()=>({ok:true,status:204}));assert.equal(await client.logout(),undefined);
 await assert.rejects(createAuthClient(async()=>({ok:true,status:200,json:async()=>({data:{...user,role:'superadmin'}})})).me(),/dados de sessão inválidos/);
});
