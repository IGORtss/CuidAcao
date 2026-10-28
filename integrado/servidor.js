
import {createIntegratedApp} from './aplicacao.js';
const port=Number(process.env.PORT||4180),origin=process.env.CUIDACAO_WEB_ORIGIN||`http://127.0.0.1:${port}`;
const app=createIntegratedApp({databasePath:process.env.CUIDACAO_DB_PATH||process.env.CUIDACAO_DATABASE_PATH,webOrigin:origin});
await app.listen({host:process.env.HOST||'127.0.0.1',port});
console.log(`cuidAÇÃO integrado: ${origin}`);
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>app.close().then(()=>process.exit(0)));
