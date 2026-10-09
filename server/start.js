import {createApp} from './app.js';
const port=Number(process.env.PORT??3000);
const origin=process.env.CUIDACAO_ORIGIN??`http://127.0.0.1:${port}`;
const app=await createApp({dbPath:process.env.CUIDACAO_DB_PATH,origin,serveStatic:!process.argv.includes('--api-only')});
try {
  await app.listen({host:'127.0.0.1',port});
  console.log(`CuidAção: ${origin} — demonstração acadêmica local`);
} catch (error) {await app.close();throw error;}
for (const signal of ['SIGINT','SIGTERM']) process.once(signal,async()=>{await app.close();process.exit(0);});
