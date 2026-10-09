import {resolve} from 'node:path';
import {openDatabase} from './database.js';
import {seed} from './seed.js';
const db=openDatabase(process.env.CUIDACAO_DB_PATH??resolve('data/cuidacao.sqlite'));
try {
  if (process.argv[2]==='seed') {
    const accounts=await seed(db);
    console.log('Contas fictícias locais. Guarde estas senhas; não as envie ao Git.');
    for (const account of accounts) console.log(`${account.username} (${account.role}): ${account.password}`);
  } else console.log('Migrações aplicadas.');
} finally {db.close();}
