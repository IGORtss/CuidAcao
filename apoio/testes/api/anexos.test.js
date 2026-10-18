import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {mkdtempSync,rmSync,readdirSync,writeFileSync,utimesSync,existsSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createApp} from '../../../servidor/http/aplicacao.js';
import {openDatabase} from '../../../servidor/dados/banco-de-dados.js';
import {migrate} from '../../../servidor/dados/banco-de-dados.js';
import {attachmentService,maxImageBytes} from '../../../servidor/dominio/indice.js';
import {attachmentStorage} from '../../../servidor/dados/banco-de-dados.js';
const origin='http://localhost:5173';
const image=async(format='png',width=24,height=16)=>sharp({create:{width,height,channels:3,background:'#40574D'}}).toFormat(format).toBuffer();
function multipart(fields,files=[]){
  const boundary='cuidacao-'+randomUUID(),chunks=[];
  for(const [key,value] of fields)chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  for(const file of files)chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${file.field??'file'}"; filename="${file.filename??'ficticia.png'}"\r\nContent-Type: ${file.type??'image/png'}\r\n\r\n`),file.buffer,Buffer.from('\r\n'));
  chunks.push(Buffer.from(`--${boundary}--\r\n`));return {payload:Buffer.concat(chunks),type:'multipart/form-data; boundary='+boundary};
}
async function setup(t){
  const directory=mkdtempSync(join(tmpdir(),'cuidacao-images-')),filename=join(directory,'test.sqlite'),uploads=join(directory,'uploads'),db=openDatabase(filename);migrate(db);let clock=Date.now();
  const app=createApp({db,uploadDirectory:uploads,now:()=>clock});t.after(async()=>{await app.close();if(db.open)db.close();rmSync(directory,{recursive:true,force:true});});
  async function account(username){const payload={username,password:'Senha fictícia teste 123'};assert.equal((await app.inject({method:'POST',url:'/api/v1/auth/register',headers:{origin},payload})).statusCode,201);const response=await app.inject({method:'POST',url:'/api/v1/auth/login',headers:{origin},payload});assert.equal(response.statusCode,200);return {cookie:response.headers['set-cookie'].split(';')[0],id:response.json().data.id};}
  const user=await account('autor_imagens'),other=await account('outro_imagens');
  const created=await app.inject({method:'POST',url:'/api/v1/occurrences',headers:{origin,cookie:user.cookie},payload:{category:'agua',description:'Descrição fictícia para teste de imagens.',latitude:-23.94,longitude:-46.18}});assert.equal(created.statusCode,201);const occurrence=created.json().data;
  const upload=async(buffer,version=1,caption='Imagem inteiramente fictícia',extra={})=>{
    const form=multipart(extra.fields??[['caption',caption],['expectedVersion',version]],[{buffer,...extra.file},...(extra.moreFiles??[])]);
    return app.inject({method:'POST',url:'/api/v1/occurrences/'+(extra.id??occurrence.id)+'/attachments',headers:{origin,cookie:user.cookie,'content-type':form.type,...extra.headers},payload:form.payload});
  };
  const remove=(id,version,headers={})=>app.inject({method:'DELETE',url:'/api/v1/attachments/'+id,headers:{origin,cookie:user.cookie,...headers},payload:{expectedVersion:version}});
  const version=()=>db.prepare('SELECT version FROM occurrences WHERE id=?').get(occurrence.id).version;
  const files=()=>readdirSync(uploads).filter(value=>value!=='.staging');
  return {app,db,filename,uploads,user,other,occurrence,upload,remove,version,files,clock:()=>clock,setClock:value=>{clock=value;}};
}
test('JPEG/PNG/WebP por assinatura, decodificação, metadados removidos, legenda e leitura privada',async t=>{
  const {app,db,occurrence,upload,version,files}=await setup(t);
  for(const format of ['jpeg','png','webp']){
    const buffer=await sharp(await image(format)).withExif({IFD0:{Artist:'PRIVATE_METADATA',ImageDescription:'Metadado fictício'}}).toFormat(format).toBuffer();assert.ok((await sharp(buffer).metadata()).exif);
    const response=await upload(buffer,version(),'  <img src=x onerror=alert(1)> Imagem fictícia  ',{file:{filename:'../../arquivo.exe',type:'application/octet-stream'}});assert.equal(response.statusCode,201);const result=response.json();assert.equal(result.occurrenceVersion,version());assert.equal(result.data.caption,'<img src=x onerror=alert(1)> Imagem fictícia');assert.equal(result.data.available,true);assert.ok(!/storageKey|uploaderId|PRIVATE_METADATA/.test(response.body));
    const file=await app.inject(result.data.fileUrl);assert.equal(file.statusCode,200);assert.equal(file.headers['content-type'],`image/${format}`);assert.equal(file.headers['cache-control'],'no-store');assert.equal(file.headers['x-content-type-options'],'nosniff');const metadata=await sharp(file.rawPayload).metadata();assert.equal(metadata.width,24);assert.equal(metadata.height,16);assert.equal(metadata.exif,undefined);assert.equal(metadata.icc,undefined);assert.equal(metadata.xmp,undefined);assert.equal(file.rawPayload.length,result.data.byteSize);
  }
  assert.equal(version(),4);assert.equal(files().length,3);assert.equal(readdirSync(join(db.name.replace('test.sqlite','uploads'),'.staging')).length,0);
  const list=await app.inject('/api/v1/occurrences/'+occurrence.id+'/attachments');assert.equal(list.json().total,3);assert.equal(list.json().occurrenceVersion,4);
  const history=await app.inject('/api/v1/occurrences/'+occurrence.id+'/history');assert.equal(history.json().total,4);assert.equal(history.json().data.filter(e=>e.action==='attachment_added').length,3);assert.ok(!/storageKey|afterJson|beforeJson/.test(history.body));
});
test('tipo falso, arquivo truncado, URL/SVG/documento e legenda/campos inválidos não deixam rastros',async t=>{
  const {app,db,user,occurrence,upload,files,version}=await setup(t),valid=await image();
  for(const buffer of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),Buffer.from('%PDF-1.7 fake'),Buffer.from('MZ executable'),Buffer.from('https://example.invalid/image.png')])assert.equal((await upload(buffer)).statusCode,415);
  for(const buffer of [valid.subarray(0,32),Buffer.from([255,216,255,224,0,0]),Buffer.alloc(0)])assert.equal((await upload(buffer)).statusCode,422);
  for(const caption of ['abcd',' '.repeat(50),'a'.repeat(201)])assert.equal((await upload(valid,1,caption)).statusCode,422);
  for(const fields of [[['caption','Legenda fictícia']],[['caption','Legenda fictícia'],['expectedVersion','1e0']],[['caption','Legenda fictícia'],['expectedVersion',1],['authorId','forged']],[['caption','Legenda fictícia'],['caption','Outra legenda'],['expectedVersion',1]]])assert.equal((await upload(valid,1,'', {fields})).statusCode,422);
  assert.equal((await upload(valid,1,'',{fields:[['caption','Legenda fictícia'],['expectedVersion',1],['contributionId','invalid']]})).statusCode,422);
  assert.equal((await upload(valid,1,'Legenda fictícia',{file:{field:'remoteUrl'}})).statusCode,422);
  assert.equal((await upload(valid,1,'Legenda fictícia',{moreFiles:[{buffer:valid}]})).statusCode,422);
  const malformed=await app.inject({method:'POST',url:'/api/v1/occurrences/'+occurrence.id+'/attachments',headers:{origin,cookie:user.cookie, 'content-type':'multipart/form-data; boundary=broken'},payload:'--broken\r\nbad'});assert.equal(malformed.statusCode,400);
  assert.equal(version(),1);assert.equal(files().length,0);assert.equal(db.prepare('SELECT count(*) n FROM attachments').get().n,0);assert.equal(db.prepare('SELECT count(*) n FROM events').get().n,1);
});
test('limites de bytes, megapixels e quantidade, incluindo borda e retirada que libera vaga',async t=>{
  const {app,occurrence,upload,remove,version,files}=await setup(t),valid=await image();
  assert.equal((await upload(Buffer.concat([valid,Buffer.alloc(maxImageBytes-valid.length+1)]))).statusCode,413);
  const large=await image('png',5000,4001);assert.equal((await upload(large)).statusCode,422);
  const boundary=await image('png',5000,4000);assert.equal((await upload(boundary)).statusCode,201);
  // Decoder verifies pixels; ignored trailing bytes disappear in re-encoding.
  assert.equal((await upload(Buffer.concat([valid,Buffer.alloc(maxImageBytes-valid.length)]),version())).statusCode,201);
  for(let i=0;i<3;i++)assert.equal((await upload(valid,version())).statusCode,201);
  assert.equal((await upload(valid,version())).statusCode,409);assert.equal(files().length,5);
  const listed=(await app.inject('/api/v1/occurrences/'+occurrence.id+'/attachments')).json(),first=listed.data[0];const removed=await remove(first.id,version());assert.equal(removed.statusCode,200);assert.equal(removed.json().data.available,false);assert.equal(removed.json().data.caption,null);assert.equal((await app.inject(first.fileUrl)).statusCode,404);assert.equal(files().length,5);
  assert.equal((await upload(valid,version())).statusCode,201);assert.equal(files().length,6);assert.equal((await remove(first.id,version())).statusCode,409);
});
test('autenticação, autoria/admin, prazo exato, estados e vínculo limitam upload e retirada',async t=>{
  const {app,db,user,other,occurrence,upload,remove,version,clock,setClock}=await setup(t),valid=await image(),start=clock();
  assert.equal((await upload(valid,1,'Legenda fictícia',{headers:{cookie:'', 'x-role':'admin','x-user-id':user.id}})).statusCode,401);
  for(const headers of [{origin:''},{origin:'https://external.invalid'}])assert.equal((await upload(valid,1,'Legenda fictícia',{headers})).statusCode,403);
  assert.equal((await upload(valid,1,'Legenda fictícia',{headers:{cookie:other.cookie}})).statusCode,403);db.prepare("UPDATE users SET role='admin' WHERE id=?").run(other.id);assert.equal((await upload(valid,1,'Legenda fictícia',{headers:{cookie:other.cookie}})).statusCode,403);
  const added=(await upload(valid)).json().data;assert.equal((await remove(added.id,version(),{cookie:other.cookie})).statusCode,403);
  db.prepare('UPDATE sessions SET expiresAt=?').run(new Date(start+2*86400000).toISOString());setClock(start+86400000);assert.equal((await upload(valid,version())).statusCode,201);setClock(start+86400001);assert.equal((await upload(valid,version())).statusCode,403);assert.equal((await remove(added.id,version())).statusCode,403);setClock(start);
  for(const status of ['community_review','confirmed','monitoring','closed','discarded']){db.prepare('UPDATE occurrences SET status=?,closureReason=?,discardReason=? WHERE id=?').run(status,status==='closed'?'resolved':null,status==='discarded'?'invalid':null,occurrence.id);assert.equal((await upload(valid,version())).statusCode,409);assert.equal((await remove(added.id,version())).statusCode,409);}
  db.prepare("UPDATE occurrences SET status='received',discardReason=NULL WHERE id=?").run(occurrence.id);
  const otherOccurrence=await app.inject({method:'POST',url:'/api/v1/occurrences',headers:{origin,cookie:user.cookie},payload:{category:'residuos',description:'Outra descrição fictícia suficientemente longa.',latitude:-23.94,longitude:-46.18}});
  db.prepare('UPDATE occurrences SET duplicateOfId=? WHERE id=?').run(otherOccurrence.json().data.id,occurrence.id);assert.equal((await upload(valid,version())).statusCode,409);assert.equal((await remove(added.id,version())).statusCode,409);
});
test('ocultação de pai ou imagem prevalece na API pública, sem legenda ou arquivo',async t=>{
  const {app,db,user,occurrence,upload,remove,version}=await setup(t),added=(await upload(await image())).json().data;
  db.prepare("UPDATE attachments SET visibility='hidden' WHERE id=?").run(added.id);assert.equal((await app.inject(added.fileUrl)).statusCode,404);const list=await app.inject('/api/v1/occurrences/'+occurrence.id+'/attachments');assert.equal(list.json().data[0].caption,null);assert.equal(list.json().data[0].fileUrl,null);assert.equal((await remove(added.id,version())).statusCode,404);
  db.prepare("UPDATE attachments SET visibility='visible' WHERE id=?").run(added.id);db.prepare("UPDATE occurrences SET visibility='hidden' WHERE id=?").run(occurrence.id);
  for(const path of [added.fileUrl,'/api/v1/occurrences/'+occurrence.id+'/attachments'])assert.equal((await app.inject(path)).statusCode,404);
  assert.equal((await upload(await image(),version())).statusCode,404);assert.equal((await remove(added.id,version())).statusCode,404);
  assert.equal((await app.inject({url:added.fileUrl+'?includeHidden=true',headers:{cookie:user.cookie,'x-role':'admin'}})).statusCode,403);
});
test('evento falho desfaz upload/retirada e arquivo; concorrência de versão confirma só um',async t=>{
  const {db,occurrence,upload,remove,files,version,uploads,user}=await setup(t),valid=await image();
  db.exec("CREATE TRIGGER reject_image_event BEFORE INSERT ON events WHEN NEW.entityType='attachment' BEGIN SELECT RAISE(ABORT,'PRIVATE_IMAGE_ERROR'); END");
  const response=await upload(valid);assert.equal(response.statusCode,500);assert.ok(!response.body.includes('PRIVATE_IMAGE_ERROR'));assert.equal(files().length,0);assert.equal(readdirSync(join(uploads,'.staging')).length,0);assert.equal(version(),1);assert.equal(db.prepare('SELECT count(*) n FROM attachments').get().n,0);
  db.exec('DROP TRIGGER reject_image_event');const responses=await Promise.all([upload(valid),upload(valid)]);assert.deepEqual(responses.map(r=>r.statusCode).sort(),[201,409]);assert.equal(version(),2);assert.equal(files().length,1);assert.equal(db.prepare('SELECT count(*) n FROM events').get().n,2);
  const added=responses.find(r=>r.statusCode===201).json().data;
  db.exec("CREATE TRIGGER reject_image_event BEFORE INSERT ON events WHEN NEW.entityType='attachment' BEGIN SELECT RAISE(ABORT,'PRIVATE_IMAGE_ERROR'); END");assert.equal((await remove(added.id,2)).statusCode,500);assert.equal(version(),2);assert.equal(db.prepare('SELECT withdrawnAt FROM attachments').get().withdrawnAt,null);assert.equal(files().length,1);db.exec('DROP TRIGGER reject_image_event');
  const storage=attachmentStorage(uploads),broken={...storage,publish(staged){storage.publish(staged);throw new Error('Falha controlada após renomear.');}};
  await assert.rejects(attachmentService(db,broken).upload(user,occurrence.id,{buffer:valid,caption:'Legenda fictícia',expectedVersion:2}));assert.equal(files().length,1);assert.equal(version(),2);assert.equal(db.prepare('SELECT count(*) n FROM events').get().n,2);
});
test('limpeza no boot preserva arquivos referenciados e recentes, remove somente órfãos antigos',async t=>{
  const {app,db,uploads,upload,clock}=await setup(t),added=(await upload(await image())).json().data;
  const oldKey=randomUUID()+'.png',freshKey=randomUUID()+'.webp',oldTemp=randomUUID()+'.tmp';writeFileSync(join(uploads,oldKey),'old');writeFileSync(join(uploads,freshKey),'fresh');writeFileSync(join(uploads,'.staging',oldTemp),'old temp');writeFileSync(join(uploads,'foreign.txt'),'foreign');
  const oldDate=new Date(clock()-86400001);utimesSync(join(uploads,oldKey),oldDate,oldDate);utimesSync(join(uploads,'.staging',oldTemp),oldDate,oldDate);
  const referenced=db.prepare('SELECT storageKey FROM attachments WHERE id=?').get(added.id).storageKey;utimesSync(join(uploads,referenced),oldDate,oldDate);db.prepare('UPDATE attachments SET withdrawnAt=?').run(new Date(clock()).toISOString());
  await app.close();const restarted=createApp({db,uploadDirectory:uploads});try{await restarted.ready();assert.equal(existsSync(join(uploads,oldKey)),false);assert.equal(existsSync(join(uploads,'.staging',oldTemp)),false);assert.ok(existsSync(join(uploads,freshKey)));assert.ok(existsSync(join(uploads,referenced)));assert.ok(existsSync(join(uploads,'foreign.txt')));}finally{await restarted.close();}
});
test('falha do armazenamento e sessão revogada durante decodificação não publicam anexo',async t=>{
  const {db,uploads,user,occurrence,version,files}=await setup(t),storage=attachmentStorage(uploads),valid=await image();
  const service=attachmentService(db,storage);
  await assert.rejects(service.upload(user,occurrence.id,{buffer:valid,caption:'Legenda fictícia',expectedVersion:1,recheckSession:async()=>{throw Object.assign(new Error('Sessão expirada.'),{statusCode:401});}}));assert.equal(files().length,0);assert.equal(version(),1);
  rmdirSync(join(uploads,'.staging'));
  await assert.rejects(service.upload(user,occurrence.id,{buffer:valid,caption:'Legenda fictícia',expectedVersion:1}));assert.equal(version(),1);assert.equal(db.prepare('SELECT count(*) n FROM attachments').get().n,0);assert.equal(db.prepare('SELECT count(*) n FROM events').get().n,1);
});


test('armazenamento padrão separa bancos no mesmo diretório e não usa variável ambiente em app injetado',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cuidacao-storage-isolation-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const first=openDatabase(join(directory,'first.sqlite')),second=openDatabase(join(directory,'second.sqlite'));migrate(first);migrate(second);
 const appA=createApp({db:first}),appB=createApp({db:second});t.after(async()=>{await appA.close();await appB.close();first.close();second.close();});
 await appA.ready();const key=randomUUID()+'.png',path=join(directory,'uploads','first.sqlite.files',key);writeFileSync(path,'arquivo sem referência de outra base');const old=new Date(Date.now()-2*86400000);utimesSync(path,old,old);
 await appB.ready();assert.ok(existsSync(path));assert.ok(existsSync(join(directory,'uploads','second.sqlite.files','.staging')));
});
