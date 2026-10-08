import {readFileSync, readdirSync} from 'node:fs';

const directory = new URL('./migrations/', import.meta.url);

export function migrate(db) {
  // Read trusted, versioned SQL only; values in application queries are bound.
  const files = readdirSync(directory).filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  const versions = files.map(name => Number(name.slice(0, 3)));
  if (new Set(versions).size !== versions.length) throw new Error('Versões de migração repetidas.');
  return db.transaction(() => {
    db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, appliedAt TEXT NOT NULL) STRICT');
    const applied = new Set(db.prepare('SELECT version FROM schema_migrations').all().map(row => row.version));
    if ([...applied].some(version => !versions.includes(version))) throw new Error('Banco tem migração desconhecida; nenhuma alteração aplicada.');
    const added = [];
    for (const [index, file] of files.entries()) {
      const version = versions[index];
      if (applied.has(version)) continue;
      if ([...applied].some(previous => previous > version)) throw new Error('Migração fora de ordem.');
      db.exec(readFileSync(new URL(file, directory), 'utf8'));
      db.prepare('INSERT INTO schema_migrations (version,appliedAt) VALUES (?,?)').run(version, new Date().toISOString());
      added.push(version);
    }
    return added;
  }).immediate();
}
