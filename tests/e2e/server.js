import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'vite';
import {openDatabase} from '../../server/db/connection.js';
import {migrate} from '../../server/db/migrate.js';
import {seed} from '../../server/db/seed.js';
import {nextOccurrenceId} from '../../server/db/sequence.js';
import {domainTransaction} from '../../server/services/domain-transaction.js';
import {createApp} from '../../server/app.js';
const directory=mkdtempSync(join(tmpdir(),'cuidacao-e2e-'));
let db,api,vite,closing;
async function close(){return closing??=(async()=>{await vite?.close();await api?.close();if(db?.open)db.close();rmSync(directory,{recursive:true,force:true});})();}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{close().then(()=>process.exit(0));});
try {
 db=openDatabase(join(directory,'test.sqlite'));migrate(db);await seed(db);
 const authorId=db.prepare('SELECT id FROM users WHERE role=? LIMIT 1').get('user').id;
 for(let i=0;i<101;i++) {
  const createdAt=new Date(Date.parse('2026-10-02T12:00:00Z')+i*60000).toISOString();
  domainTransaction(db,{createdAt,mutate(){const id=nextOccurrenceId(db);
   db.prepare(`INSERT INTO occurrences (id,authorId,title,description,category,latitude,longitude,locationLabel,status,visibility,simulated,version,createdAt,updatedAt)
    VALUES (?,?,?,?,'residuos',-23.9388,-46.183,'Localização de teste','received','visible',1,1,?,?)`).run(id,authorId,`Registro adicional fictício ${i+1}`,'Registro fictício exclusivo da base temporária dos testes.',createdAt,createdAt);
   return {events:[{occurrenceId:id,entityType:'occurrence',entityId:id,actorId:authorId,action:'created',after:db.prepare('SELECT * FROM occurrences WHERE id=?').get(id)}]};
  }});
 }
 api=createApp({db});await api.listen({host:'127.0.0.1',port:3100});
 vite=await createServer({server:{host:'127.0.0.1',port:5180,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:3100',changeOrigin:false}}}});await vite.listen();
} catch(error){await close();throw error;}
