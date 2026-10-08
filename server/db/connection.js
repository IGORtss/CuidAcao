import Database from 'better-sqlite3';
import {mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

export const defaultDatabasePath = resolve(import.meta.dirname, '../../data/cuidacao.sqlite');

export function openDatabase(filename = defaultDatabasePath) {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), {recursive: true, mode: 0o700});
  const db = new Database(filename);
  try {
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
