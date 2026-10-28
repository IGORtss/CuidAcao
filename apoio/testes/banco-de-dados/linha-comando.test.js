import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {openDatabase} from '../../../servidor/dados/banco-de-dados.js';
const execute=promisify(execFile);
test('scripts declarados migram, fazem seed e recusam segunda execução sem alterar dados', {timeout:30000},async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cuidacao-cli-')),filename=join(directory,'cli.sqlite');
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const env={...process.env,CUIDACAO_DB_PATH:filename};
 const scripts=JSON.parse(readFileSync(new URL('../../../package.json',import.meta.url),'utf8')).scripts;
 const run=script=>{assert.ok(scripts[script].startsWith('node servidor/linha-comando/indice.js '));return execute(process.execPath,scripts[script].slice(5).split(/\s+/),{cwd:new URL('../../../',import.meta.url),env,timeout:20000});};
 assert.ok((await run('db:migrate')).stdout.includes('Migrações aplicadas: 1, 2, 3, 4, 5, 6, 7.'));
 // Plaintext remains in memory only; never attach seed stdout to an assertion/log.
 const seeded=await run('db:seed');assert.ok(seeded.stdout.includes('Seed fictício concluído.'));
 function snapshot(){const db=openDatabase(filename);try{return Object.fromEntries(['users','sessions','occurrences','contributions','stances','attachments','occurrence_relations','reports','subscriptions','saved_queries','notification_reads','events','schema_migrations','occurrence_sequence'].map(table=>[table,(()=>{const rows=db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();return {count:rows.length,digest:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};})()]));}finally{db.close();}}
 const before=snapshot();assert.equal(before.users.count,5);assert.equal(before.occurrences.count,4);
 assert.ok((await run('db:migrate')).stdout.includes('Migrações já aplicadas; dados preservados.'));
 assert.deepEqual(snapshot(),before);
 await assert.rejects(run('db:seed'),error=>error.code===1 && error.stderr.includes('Seed recusado: a base contém dados.'));
 assert.deepEqual(snapshot(),before);
});
