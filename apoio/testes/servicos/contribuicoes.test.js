import test from 'node:test';
import assert from 'node:assert/strict';
import {createContributionClient} from '../../../codigo-fonte/servicos/api.js';
const id='CA-001',cid='00000000-0000-4000-8000-000000000001';
const row={id:cid,occurrenceId:id,available:true,createdAt:'2026-10-09T12:00:00Z',updatedAt:'2026-10-09T12:00:00Z',authorId:'fictional-id',username:'user_demo',type:'comment',kind:null,text:'<b>texto fictício</b>',attachments:[]};
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});
test('cliente de contribuição projeta campos públicos, preserva texto e envia sessão/versão sem repetir',async()=>{
 const sent=[],client=createContributionClient(async(path,options)=>{sent.push({path,options});return response({data:{...row,passwordHash:'PRIVATE'},occurrenceVersion:2});});
 const created=await client.create(id,{expectedVersion:1,type:'comment',text:row.text});assert.equal(created.data.passwordHash,undefined);assert.equal(created.data.text,row.text);assert.equal(sent[0].options.credentials,'same-origin');assert.equal(JSON.parse(sent[0].options.body).expectedVersion,1);
 await client.edit(cid,2,'Texto novo');assert.equal(sent[1].options.method,'PATCH');assert.deepEqual(JSON.parse(sent[1].options.body),{expectedVersion:2,text:'Texto novo'});
 let calls=0;await assert.rejects(createContributionClient(async()=>{calls++;return response({error:{message:'Conflito',fields:{text:'Revise'}}},409);}).create(id,{}),error=>error.status===409&&error.fields.text==='Revise');assert.equal(calls,1);
 await assert.rejects(createContributionClient(async()=>{throw Error('PRIVATE_NETWORK');}).create(id,{}),error=>!error.message.includes('PRIVATE_NETWORK')&&error.message.includes('consulte'));
});
test('cliente recusa página inconsistente, conteúdo oculto ou vínculos inválidos, sem fallback',async()=>{
 const list={data:[row],page:1,pageSize:100,total:1,occurrenceVersion:2};
 const result=await createContributionClient(async()=>response(list)).list(id);assert.equal(result.data.length,1);
 for(const invalid of [{...list,total:2},{...list,occurrenceVersion:0},{...list,data:[{...row,available:false}]},{...list,data:[{...row,type:'reopen_request'}]},{...list,data:[{...row,occurrenceId:'CA-002'}]},{...list,data:[{...row,kind:'resolution'}]}])await assert.rejects(createContributionClient(async()=>response(invalid)).list(id));
 const hidden={...row,available:false,authorId:null,username:null,type:null,kind:null,text:null};assert.equal((await createContributionClient(async()=>response({...list,data:[hidden]})).list(id)).data[0].text,null);
});
