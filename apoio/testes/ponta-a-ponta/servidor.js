import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'vite';
import {openDatabase} from '../../../servidor/dados/banco-de-dados.js';
import {migrate} from '../../../servidor/dados/banco-de-dados.js';
import {seed} from '../../../servidor/linha-comando/indice.js';
import {nextOccurrenceId} from '../../../servidor/dados/banco-de-dados.js';
import {domainTransaction} from '../../../servidor/dominio/indice.js';
import {createApp} from '../../../servidor/http/aplicacao.js';
const webPort=Number(process.env.CUIDACAO_E2E_PORT??5180),apiPort=Number(process.env.CUIDACAO_E2E_API_PORT??3100);
const directory=mkdtempSync(join(tmpdir(),'cuidacao-e2e-'));
let db,api,vite,closing,credentialFile;
async function close(){return closing??=(async()=>{await vite?.close();await api?.close();if(db?.open)db.close();if(credentialFile)rmSync(credentialFile,{force:true});rmSync(directory,{recursive:true,force:true});})();}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{close().then(()=>process.exit(0));});
try {
 db=openDatabase(join(directory,'test.sqlite'));migrate(db);const accounts=await seed(db);
 if([5184,5185,5186,5187,5188].includes(webPort)){const file=webPort===5187?process.env.CUIDACAO_E2E_INTEGRATED_DESKTOP_CREDENTIALS:webPort===5188?process.env.CUIDACAO_E2E_INTEGRATED_MOBILE_CREDENTIALS:webPort===5186?process.env.CUIDACAO_E2E_LINK_CREDENTIALS:webPort===5185?process.env.CUIDACAO_E2E_ADMIN_CREDENTIALS:process.env.CUIDACAO_E2E_TRANSITION_CREDENTIALS;if(!file||!file.startsWith(join(tmpdir(),'cuidacao-e2e-accounts-')))throw new Error('Arquivo privado de contas temporárias não configurado.');writeFileSync(file,JSON.stringify(accounts),{flag:'wx',mode:0o600});credentialFile=file;}
 const authorId=db.prepare('SELECT id FROM users WHERE role=? LIMIT 1').get('user').id;
 for(let i=0;i<(webPort>=5187?0:101);i++) {
  const createdAt=new Date(Date.parse('2026-10-02T12:00:00Z')+i*60000).toISOString();
  domainTransaction(db,{createdAt,mutate(){const id=nextOccurrenceId(db);
   db.prepare(`INSERT INTO occurrences (id,authorId,title,description,category,latitude,longitude,locationLabel,status,visibility,simulated,version,createdAt,updatedAt)
    VALUES (?,?,?,?,'residuos',-23.9388,-46.183,'Localização de teste','received','visible',1,1,?,?)`).run(id,authorId,`Registro adicional fictício ${i+1}`,'Registro fictício exclusivo da base temporária dos testes.',createdAt,createdAt);
   return {events:[{occurrenceId:id,entityType:'occurrence',entityId:id,actorId:authorId,action:'created',after:db.prepare('SELECT * FROM occurrences WHERE id=?').get(id)}]};
  }});
 }
 api=createApp({google:{clientId:''},db,uploadDirectory:join(directory,'uploads'),webOrigin:`http://127.0.0.1:${webPort}`});await api.listen({host:'127.0.0.1',port:apiPort});
 vite=await createServer({configFile:'configuracao/vite.configuracao.js',server:{host:'127.0.0.1',port:webPort,strictPort:true,proxy:{'/api':{target:`http://127.0.0.1:${apiPort}`,changeOrigin:false}}}});await vite.listen();
} catch(error){await close();throw error;}
