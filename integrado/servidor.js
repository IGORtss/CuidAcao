
import {createApp} from '../servidor/http/aplicacao.js';
import {openDatabase,migrate} from '../servidor/dados/banco-de-dados.js';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../site/',import.meta.url));
const port=Number(process.env.PORT||4180),origin=process.env.CUIDACAO_WEB_ORIGIN||`http://127.0.0.1:${port}`;
const db=openDatabase();migrate(db);
const app=createApp({db,webOrigin:origin});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon'};
app.get('/*',async(req,reply)=>{
 if(req.url.startsWith('/api/'))return reply.code(404).send({error:{message:'Rota não encontrada.'}});
 let path;try{path=decodeURIComponent(new URL(req.url,origin).pathname)}catch{return reply.code(400).send('Endereço inválido')}
 const file=resolve(root,'.'+path+(path.endsWith('/')?'index.html':''));
 if(!file.startsWith(resolve(root)+sep)||!existsSync(file)||!statSync(file).isFile())return reply.code(404).send('Página não encontrada');
 return reply.type(types[extname(file)]||'application/octet-stream').send(readFileSync(file));
});
app.addHook('onClose',()=>db.close());
await app.listen({host:process.env.HOST||'127.0.0.1',port});
console.log(`cuidAÇÃO integrado: ${origin}`);
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>app.close().then(()=>process.exit(0)));
