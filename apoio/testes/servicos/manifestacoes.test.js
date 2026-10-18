import test from 'node:test';
import assert from 'node:assert/strict';
import {createStanceClient} from '../../../codigo-fonte/servicos/api.js';
const row={id:'00000000-0000-4000-8000-000000000001',occurrenceId:'CA-001',userId:'ficticio',username:'ficticio',type:'support',reason:'<b>Justificativa fictícia literal</b>',active:true,available:true,createdAt:'2026-10-09T12:00:00.000Z',updatedAt:'2026-10-09T12:00:00.000Z'};
const page=(data=[row])=>({data,page:1,pageSize:100,total:data.length,counts:{support:1,contest:0},occurrenceVersion:2});
const response=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
test('cliente projeta campos públicos, preserva texto, envia sessão/versão e retira sem repetir',async()=>{
 const requests=[],client=createStanceClient(async(path,options)=>{requests.push({path,options});return response(options.method?{data:{...row,active:options.method!=='DELETE',secret:'private'},occurrenceVersion:3}:page());});
 assert.equal((await client.list('CA-001')).data[0].reason,row.reason);const set=await client.set('CA-001',{expectedVersion:2,type:'support',reason:row.reason});assert.equal(set.data.secret,undefined);assert.equal(requests[1].options.credentials,'same-origin');assert.deepEqual(JSON.parse(requests[1].options.body),{expectedVersion:2,type:'support',reason:row.reason});assert.equal((await client.withdraw('CA-001',3)).data.active,false);assert.equal(requests.length,3);assert.equal(requests[2].options.method,'DELETE');
});
test('cliente recusa páginas, contagens, repetição e conteúdo oculto inconsistentes',async()=>{
 for(const value of [page([{...row,available:false}]),page([{...row,active:false}]),page([{...row,occurrenceId:'CA-002'}]),{...page(),counts:{support:0,contest:0}},{...page(),total:2},page([row,row]),{...page(),occurrenceVersion:0},{...page(),page:2}])await assert.rejects(createStanceClient(async()=>response(value)).list('CA-001'));
 const marker={...row,available:false,userId:null,username:null,type:null,reason:null};const visible=await createStanceClient(async()=>response({...page([marker]),counts:{support:0,contest:0}})).list('CA-001');assert.equal(visible.data[0].reason,null);
 let calls=0;const client=createStanceClient(async()=>{calls++;return new Response(JSON.stringify({error:{message:'Sessão expirada.'}}),{status:401});});await assert.rejects(client.set('CA-001',{expectedVersion:2}),error=>error.status===401&&error.message==='Sessão expirada.');assert.equal(calls,1);
 await assert.rejects(createStanceClient(async()=>{throw new Error('offline');}).set('CA-001',{}),/Consulte sua posição/);
});
