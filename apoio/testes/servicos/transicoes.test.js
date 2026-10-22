import test from 'node:test';
import assert from 'node:assert/strict';
import {createTransitionClient} from '../../../codigo-fonte/servicos/api.js';
import {adaptHistoryEvent} from '../../../codigo-fonte/servicos/api.js';
const row={id:'CA-001',authorId:'autor',title:'Registro fictício',description:'Descrição inteiramente fictícia.',category:'agua',latitude:-23.94,longitude:-46.18,locationLabel:null,status:'community_review',simulated:true,version:2,duplicateOfId:null,createdAt:'2026-10-09T10:00:00Z',updatedAt:'2026-10-09T11:00:00Z',counts:{support:0,contest:0},flags:{referencesUnavailable:false,referencesChanged:false,relationsRemoved:false,duplicateTargetUnavailable:false}};
test('cliente de transição envia versão e justificativa literal, valida estado e apresenta histórico de origem/destino',async()=>{
 let request;const input={expectedVersion:1,to:'community_review',reason:'<b>Justificativa fictícia literal</b>'};const result=await createTransitionClient(async(path,options)=>{request={path,options};return new Response(JSON.stringify({data:{...row,private:'secret'},occurrenceVersion:2}));}).transition('CA-001',input);assert.equal(result.data.private,undefined);assert.equal(request.options.credentials,'same-origin');assert.deepEqual(JSON.parse(request.options.body),input);
 const event=adaptHistoryEvent({id:'evento',action:'transition',createdAt:row.updatedAt,username:'admin_ficticio',reason:input.reason,fromStatus:'received',toStatus:'community_review'});assert.equal(event.text,'Recebida → Verificação comunitária · admin_ficticio — '+input.reason);
});
test('cliente não confirma estado/versão/identificador inválidos nem repete falhas recuperáveis',async()=>{
 for(const value of [{data:{...row,status:'confirmed'},occurrenceVersion:2},{data:row,occurrenceVersion:3},{data:{...row,id:'CA-002'},occurrenceVersion:2}])await assert.rejects(createTransitionClient(async()=>new Response(JSON.stringify(value))).transition('CA-001',{to:'community_review'}));
 let attempts=0;const client=createTransitionClient(async()=>{attempts++;return new Response(JSON.stringify({error:{message:'A ocorrência mudou.',fields:{reason:'Revise o motivo.'}}}),{status:409});});await assert.rejects(client.transition('CA-001',{}),error=>error.status===409&&error.fields.reason==='Revise o motivo.');assert.equal(attempts,1);await assert.rejects(createTransitionClient(async()=>{throw new Error('offline');}).transition('CA-001',{}),/Consulte o estado/);
});
