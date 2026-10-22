import {existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'vite';
import {demoWebOptions} from '../../../configuracao/vite.configuracao.js';
import {createApp} from '../../../servidor/http/aplicacao.js';
import {prepareDemo,currentDemo,acquireDemoLock} from '../../../servidor/linha-comando/indice.js';
const root=process.env.CUIDACAO_E2E_DEMO_DIRECTORY;
if(!root?.startsWith(join(tmpdir(),'cuidacao-demo-e2e-'))||existsSync(root))throw new Error('Pasta temporária demonstrativa deve ser nova e exclusiva.');
let api,vite,release,closing;
async function close(){return closing??=(async()=>{try{await vite?.close();await api?.close();}finally{release?.();rmSync(root,{recursive:true,force:true});}})();}
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{close().then(()=>process.exit(0));});
try{await prepareDemo(root);const configuration=currentDemo(root);release=acquireDemoLock(root);api=createApp({google:{clientId:''},...configuration,webOrigin:'http://127.0.0.1:5190'});await api.listen({host:'127.0.0.1',port:3110});vite=await createServer(demoWebOptions(configuration.root,5190,3110));await vite.listen();}catch(error){await close();throw error;}
