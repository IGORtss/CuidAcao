import {createApp} from './app.js';

const app = createApp({databasePath:process.env.CUIDACAO_DB_PATH,logger:true});
const shutdown = async () => { await app.close(); };
process.once('SIGINT',shutdown);
process.once('SIGTERM',shutdown);
try {
  // Local API only. Database preparation is explicit via db:migrate/db:seed.
  await app.listen({host:'127.0.0.1',port:3000});
} catch {
  console.error('Não foi possível iniciar a API local em 127.0.0.1:3000.');
  await app.close();
  process.exitCode=1;
}
