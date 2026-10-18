import test from 'node:test';
import assert from 'node:assert/strict';
import {createOccurrenceClient,createRequestScope} from '../../../codigo-fonte/servicos/api.js';
import {adaptOccurrence} from '../../../codigo-fonte/servicos/api.js';
import {formatDate} from '../../../codigo-fonte/servicos/api.js';
const row=id=>({id,title:'Registro fictício',description:'Descrição fictícia',category:'agua',status:'received',latitude:-23.94,longitude:-46.18,locationLabel:null,createdAt:'2026-10-01T01:00:00Z',updatedAt:'2026-10-01T01:00:00Z',simulated:true,version:1,duplicateOfId:null});
const ok=data=>({ok:true,json:async()=>data});
test('consulta reúne todas as páginas com filtros em códigos',async()=>{
 const calls=[];const rows=Array.from({length:101},(_,i)=>row(`CA-${String(i+1).padStart(6,'0')}`));
 const client=createOccurrenceClient(async(path)=>{calls.push(path);const page=Number(new URL(path,'http://local').searchParams.get('page'));return ok({data:rows.slice((page-1)*100,page*100),page,pageSize:100,total:101});});
 const result=await client.list({category:'agua',status:'received'});assert.equal(result.length,101);assert.equal(calls.length,2);assert.match(calls[1],/category=agua&status=received&page=2/);assert.equal(result[0].category,'Água');
});
test('página incompleta, repetida ou total alterado causa erro sem resultado parcial',async()=>{
 for(const mode of ['incomplete','duplicate','changed']){
 let calls=0;const rows=Array.from({length:100},(_,i)=>row(String(i)));
 const client=createOccurrenceClient(async()=>{calls++;return ok({data:calls===1?rows:mode==='incomplete'?[]:[row(mode==='duplicate'?'0':'100')],page:calls,pageSize:100,total:mode==='changed'&&calls===2?102:101});});
 await assert.rejects(client.list(),/consulta/i);
 }
});
test('detalhe consulta diretamente o ID e histórico percorre páginas',async()=>{
 const paths=[];const detail={...row('CA-001'),counts:{support:0,contest:0},flags:{referencesUnavailable:false,referencesChanged:false,relationsRemoved:false,duplicateTargetUnavailable:false}};
 const client=createOccurrenceClient(async path=>{paths.push(path);return ok(path.includes('/history')?{data:[{id:'evento',action:'created',createdAt:detail.createdAt,username:'ficticio',reason:null}],page:1,pageSize:100,total:1}:{data:detail});});
 assert.equal((await client.detail('CA-001')).id,'CA-001');assert.equal((await client.history('CA-001')).length,1);assert.equal(paths[0],'/api/v1/occurrences/CA-001');
});
test('erros HTTP e de rede não expõem servidor nem recorrem a fixtures',async()=>{
 const client=createOccurrenceClient(async()=>({ok:false,status:500,json:async()=>({error:'SQL /private/path'})}));await assert.rejects(client.list(),e=>e.status===500&&!/SQL|private/.test(e.message));
 await assert.rejects(createOccurrenceClient(async()=>{throw Error('stack interna');}).list(),/conectar à API/);
});
test('adaptador só projeta campos explícitos, rejeita códigos e usa São Paulo',()=>{
 const item=adaptOccurrence({...row('CA-001'),password:'secret'});assert.equal(item.password,undefined);assert.equal(item.status,'Recebida');assert.equal(formatDate(item.createdAt),'30/09/2026');assert.throws(()=>adaptOccurrence({...row('CA-001'),category:'extra'}));
});
test('troca de consulta aborta e invalida respostas antigas mesmo se ignorarem cancelamento',()=>{
 const scope=createRequestScope();const old=scope.begin();const next=scope.begin();assert.equal(old.signal.aborted,true);assert.equal(old.isCurrent(),false);assert.equal(next.isCurrent(),true);scope.cancel();assert.equal(next.isCurrent(),false);
});
test('histórico carrega todas as páginas sem inventar transições',async()=>{
 let calls=0;const events=Array.from({length:101},(_,i)=>({id:String(i),action:'created',createdAt:'2026-10-01T12:00:00Z',username:null,reason:null}));
 const client=createOccurrenceClient(async()=>{const page=++calls;return ok({data:events.slice((page-1)*100,page*100),page,pageSize:100,total:101});});
 const history=await client.history('CA-001');assert.equal(history.length,101);assert.equal(calls,2);assert.equal(history[0].text,'Registro criado · Sistema');
});

test('detalhe de encerramento projeta apenas fundamento permitido e rejeita marcadores com conteúdo',async()=>{
 const data={...row('CA-001'),counts:{support:0,contest:0},flags:{referencesUnavailable:false,referencesChanged:false,relationsRemoved:false,duplicateTargetUnavailable:false},status:'closed',closure:{eventId:'evento',reason:'Motivo fictício de encerramento.',username:'admin_ficticio',createdAt:row('CA-001').createdAt,resolution:{id:'resolucao',available:true,username:'morador',text:'<b>Resolução fictícia literal</b>',createdAt:row('CA-001').createdAt},beforeJson:'PRIVATE_SNAPSHOT'}};
 const client=createOccurrenceClient(async()=>ok({data})),result=await client.detail('CA-001');assert.equal(result.closure.resolution.text,'<b>Resolução fictícia literal</b>');assert.equal(Object.hasOwn(result.closure,'beforeJson'),false);data.closure.resolution={id:null,available:false,username:null,text:null,createdAt:null};assert.equal((await client.detail('CA-001')).closure.resolution.available,false);data.closure.resolution.text='PRIVATE_HIDDEN';await assert.rejects(client.detail('CA-001'));
});
