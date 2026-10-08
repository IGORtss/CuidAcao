import {openDatabase} from './connection.js';
import {migrate} from './migrate.js';
import {seed} from './seed.js';

const operation = process.argv[2];
if (!['migrate','seed'].includes(operation) || process.argv.length !== 3) {
  console.error('Use npm run db:migrate ou npm run db:seed.');
  process.exitCode = 1;
} else {
  let db;
  try {
    db = openDatabase(process.env.CUIDACAO_DB_PATH || undefined);
    if (operation === 'migrate') {
      const versions = migrate(db);
      console.log(versions.length ? `Migrações aplicadas: ${versions.join(', ')}.` : 'Migrações já aplicadas; dados preservados.');
    } else {
      // Seed requires a previously migrated schema; it never resets a database.
      const credentials = await seed(db);
      console.log('Seed fictício concluído. Credenciais locais (não salve no repositório):');
      for (const {username, role, password} of credentials) console.log(`${username} (${role}): ${password}`);
    }
  } catch (error) {
    console.error(`Operação não concluída: ${error.message}`);
    process.exitCode = 1;
  } finally {
    db?.close();
  }
}
