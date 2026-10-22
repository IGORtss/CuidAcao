import test from 'node:test';
import assert from 'node:assert/strict';
import {createAttachmentClient} from '../../../codigo-fonte/servicos/api.js';
const id='CA-000001',attachmentId='00000000-0000-4000-8000-000000000001';
const image={id:attachmentId,occurrenceId:id,createdAt:'2026-10-09T12:00:00Z',available:true,caption:'<b>Imagem fictícia</b>',mediaType:'image/png',byteSize:100,width:10,height:10,fileUrl:`/api/v1/attachments/${attachmentId}/file`};
const response=data=>({ok:true,status:200,json:async()=>data});
test('upload multipart conserva legenda como texto, sessão e versão; retirada projeta só campos públicos',async()=>{
  const requests=[],client=createAttachmentClient(async(path,options)=>{requests.push({path,options});return response({data:options.method==='DELETE'?{...image,available:false,caption:null,mediaType:null,byteSize:null,width:null,height:null,fileUrl:null,storageKey:'PRIVATE_KEY'}:{...image,storageKey:'PRIVATE_KEY'},occurrenceVersion:options.method==='DELETE'?3:2});});
  const file=new File([new Uint8Array([1,2])],'ficticia.png',{type:'image/png'}),sent=await client.upload(id,1,file,image.caption);
  assert.equal(requests[0].options.credentials,'same-origin');assert.equal(requests[0].options.headers,undefined);assert.ok(requests[0].options.body instanceof FormData);assert.equal(requests[0].options.body.get('expectedVersion'),'1');assert.equal(requests[0].options.body.get('caption'),image.caption);assert.equal(sent.occurrenceVersion,2);assert.equal(sent.data.storageKey,undefined);
  const removed=await client.withdraw(attachmentId,2);assert.equal(requests[1].options.method,'DELETE');assert.deepEqual(JSON.parse(requests[1].options.body),{expectedVersion:2});assert.equal(removed.data.caption,null);assert.equal(removed.data.storageKey,undefined);
});
test('consulta recusa páginas e anexos inválidos; falhas de upload preservam status e não repetem envio',async()=>{
  const list={data:[image],page:1,pageSize:100,total:1,occurrenceVersion:2};
  for(const result of [{...list,occurrenceVersion:0},{...list,total:2},{...list,data:[{...image,occurrenceId:'CA-000002'}]},{...list,data:[{...image,available:false}]}])await assert.rejects(createAttachmentClient(async()=>response(result)).list(id));
  let requests=0;const client=createAttachmentClient(async()=>{requests++;return {ok:false,status:409,json:async()=>({error:{message:'A ocorrência mudou.'}})};});await assert.rejects(client.upload(id,1,new File(['x'],'x.png'),'Legenda fictícia'),error=>error.status===409);assert.equal(requests,1);
  const network=createAttachmentClient(async()=>{throw new Error('PRIVATE_INTERNAL_ERROR');});await assert.rejects(network.upload(id,1,new File(['x'],'x.png'),'Legenda fictícia'),error=>!error.message.includes('PRIVATE_INTERNAL_ERROR')&&error.message.includes('confira'));
});
