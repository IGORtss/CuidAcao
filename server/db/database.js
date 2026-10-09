import Database from 'better-sqlite3';
import {mkdirSync, readFileSync, readdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export function migrate(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY, appliedAt TEXT NOT NULL)');
  const folder = fileURLToPath(new URL('./migrations/', import.meta.url));
  for (const file of readdirSync(folder).filter(x => x.endsWith('.sql')).sort()) {
    db.transaction(() => {
      if (db.prepare('SELECT 1 FROM schema_migrations WHERE version=?').get(file)) return;
      db.exec(readFileSync(`${folder}/${file}`, 'utf8'));
      db.prepare('INSERT INTO schema_migrations VALUES(?,?)').run(file, new Date().toISOString());
    }).immediate();
  }
}
export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), {recursive: true, mode: 0o700});
  const db = new Database(path);
  try {
    db.pragma('foreign_keys=ON'); db.pragma('journal_mode=WAL'); db.pragma('busy_timeout=5000');
    migrate(db);
    db.prepare('DELETE FROM sessions WHERE expiresAt<=?').run(new Date().toISOString());
    return db;
  } catch (error) { db.close(); throw error; }
}
