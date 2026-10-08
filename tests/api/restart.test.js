import test from 'node:test';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {openDatabase} from '../../server/db/connection.js';
import {migrate} from '../../server/db/migrate.js';
import {seed} from '../../server/db/seed.js';
import {nextOccurrenceId} from '../../server/db/sequence.js';
import {domainTransaction} from '../../server/services/domain-transaction.js';

async function readProcess(filename,urls,t){
 const child=fork(new URL('../helpers/read-server.js',import.meta.url),[filename],{execArgv:[],stdio:['ignore','ignore','ignore','ipc']});
 const exited=new Promise(resolve=>{child.once('exit',resolve);child.once('error',resolve);});
 const stop=async()=>{if(child.pid && child.exitCode===null && child.signalCode===null){child.kill('SIGTERM');await exited;}};
 t.after(stop);
 try {
  const {address}=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Servidor de teste não iniciou em 10 segundos.'));},10000);
   child.once('message',message=>{clearTimeout(timeout);resolve(message);});
   child.once('error',error=>{clearTimeout(timeout);reject(error);});
   child.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Servidor de teste encerrou antes da consulta (${code}).`));});
  });
  const responses=[];
  for(const url of urls){const response=await fetch(address+url,{signal:AbortSignal.timeout(5000)});responses.push({status:response.status,data:await response.json()});}
  return {pid:child.pid,responses};
 } finally {await stop();}
}

test('reiniciar processo HTTP preserva preparação controlada e projeção pública sem segredos', {timeout:30000},async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cuidacao-restart-')),filename=join(directory,'restart.sqlite');
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const db=openDatabase(filename);
 let credentials,secretValues,visibleId,hiddenId;
 try {
  migrate(db);credentials=await seed(db);
  const authorId=db.prepare('SELECT id FROM users WHERE role=? LIMIT 1').get('user').id;
  const adminId=db.prepare('SELECT id FROM users WHERE role=? LIMIT 1').get('admin').id;
  function create(title){return domainTransaction(db,{mutate(){
   const id=nextOccurrenceId(db),date='2026-10-03T12:00:00.000Z';
   db.prepare(`INSERT INTO occurrences (id,authorId,title,description,category,latitude,longitude,status,visibility,simulated,version,createdAt,updatedAt)
    VALUES (?,?,?,?,'residuos',-23.94,-46.18,'received','visible',1,1,?,?)`).run(id,authorId,title,`${title}: conteúdo fictício da preparação controlada.`,date,date);
   return {value:id,events:[{occurrenceId:id,entityType:'occurrence',entityId:id,actorId:authorId,action:'created',after:db.prepare('SELECT * FROM occurrences WHERE id=?').get(id)}]};
  },createdAt:'2026-10-03T12:00:00.000Z'}).value;}
  visibleId=create('Relato preparado fora da API');hiddenId=create('PRIVATE_HIDDEN_BODY');
  domainTransaction(db,{expectedVersions:{[hiddenId]:1},mutate(){
   const before=db.prepare('SELECT * FROM occurrences WHERE id=?').get(hiddenId);
   db.prepare("UPDATE occurrences SET visibility='hidden' WHERE id=?").run(hiddenId);
   return {events:[{occurrenceId:hiddenId,entityType:'occurrence',entityId:hiddenId,actorId:adminId,action:'hidden',reason:'Motivo público fictício de moderação.',before,after:{visibility:'hidden'}}]};
  }});
  const token=randomBytes(32).toString('hex'),tokenHash=createHash('sha256').update(token).digest('hex');
  db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(randomUUID(),authorId,tokenHash,'2026-10-03T20:00:00Z','2026-10-03T12:00:00Z','2026-10-03T12:00:00Z');
  secretValues=[token,tokenHash,...credentials.map(row=>row.password),...db.prepare('SELECT passwordHash,passwordSalt FROM users').all().flatMap(row=>[row.passwordHash,row.passwordSalt])];
 } finally {db.close();}
 const urls=['/api/v1/occurrences?pageSize=100',`/api/v1/occurrences/${visibleId}`,`/api/v1/occurrences/${visibleId}/history`,
  `/api/v1/occurrences/${hiddenId}`,`/api/v1/occurrences/${hiddenId}/history`,'/api/v1/occurrences/CA-001/history'];
 const before=await readProcess(filename,urls,t),after=await readProcess(filename,urls,t);
 assert.notEqual(before.pid,after.pid);assert.deepEqual(after.responses,before.responses);
 assert.equal(after.responses[0].data.total,5);assert.equal(after.responses[1].data.data.title,'Relato preparado fora da API');assert.equal(after.responses[2].data.data[0].action,'created');
 assert.equal(after.responses[3].status,404);assert.equal(after.responses[4].status,404);
 const body=JSON.stringify(after.responses);assert.ok(!/PRIVATE_HIDDEN_BODY|passwordHash|passwordSalt|passwordParams|tokenHash|beforeJson|afterJson|referencesJson/.test(body),'Projeção pública contém campos ou conteúdo privados.');
 for(const secret of secretValues)assert.equal(body.includes(secret),false,'Resposta pública contém segredo de teste.');
});
