import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'vite';
import {openDatabase} from '../../../servidor/dados/banco-de-dados.js';
import {migrate} from '../../../servidor/dados/banco-de-dados.js';
import {seed} from '../../../servidor/linha-comando/indice.js';
import {createApp} from '../../../servidor/http/aplicacao.js';
import {controlledGoogle,googleClientId} from '../auxiliares/provedor-google.js';
const root=mkdtempSync(join(tmpdir(),'cuidacao-google-browser-')),keyFile=process.env.CUIDACAO_E2E_GOOGLE_KEY;
if(!keyFile?.startsWith(join(tmpdir(),'cuidacao-e2e-google-')))throw Error('Chave de teste deve ser privada e temporária.');
let db,api,vite,closing;
async function close(){return closing??=(async()=>{await vite?.close();await api?.close();if(db?.open)db.close();rmSync(keyFile,{force:true});rmSync(root,{recursive:true,force:true});})();}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{close().then(()=>process.exit(0));});
try{
 db=openDatabase(join(root,'db.sqlite'));migrate(db);await seed(db);const provider=controlledGoogle();writeFileSync(keyFile,provider.privateKey,{mode:0o600,flag:'wx'});
 api=createApp({db,uploadDirectory:join(root,'uploads'),webOrigin:'http://127.0.0.1:5191',google:{clientId:googleClientId,client:provider.client}});await api.listen({host:'127.0.0.1',port:3111});
 vite=await createServer({configFile:'configuracao/vite.configuracao.js',server:{host:'127.0.0.1',port:5191,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:3111',changeOrigin:false}}}});await vite.listen();
}catch(error){await close();throw error;}
