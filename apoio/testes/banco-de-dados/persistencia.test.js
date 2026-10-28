import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, lstatSync, mkdtempSync, readFileSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {scryptSync} from 'node:crypto';
import {openDatabase} from '../../../servidor/dados/banco-de-dados.js';
import {migrate,migrations} from '../../../servidor/dados/banco-de-dados.js';
import {seed} from '../../../servidor/linha-comando/indice.js';
import {nextOccurrenceId} from '../../../servidor/dados/banco-de-dados.js';
import {domainTransaction, VersionConflict} from '../../../servidor/dominio/indice.js';

function temporary(t) {
  const directory = mkdtempSync(join(tmpdir(), 'cuidacao-db-'));
  const filename = join(directory, 'test.sqlite');
  let db = openDatabase(filename);
  t.after(() => { if (db.open) db.close(); rmSync(directory, {recursive:true, force:true}); });
  return {get db() {return db;}, filename, reopen() {db.close(); db=openDatabase(filename); return db;}};
}

test('openDatabase repara diretório de dados quebrado antes de criar o SQLite', t => {
  const directory = mkdtempSync(join(tmpdir(), 'cuidacao-broken-link-'));
  const brokenDir = join(directory, 'data');
  symlinkSync(join(directory,'extras','private','data'), brokenDir, process.platform==='win32'?'junction':'dir');
  const db = openDatabase(join(brokenDir, 'test.sqlite'));
  t.after(() => {
    db.close();
    rmSync(directory, {recursive: true, force: true});
  });
  assert.equal(existsSync(brokenDir), true);
  assert.equal(lstatSync(brokenDir).isDirectory(), true);
  assert.equal(db.pragma('journal_mode', {simple: true}), 'wal');
});

test('schema, migrações e persistência entre conexões', async t => {
  const storage = temporary(t);
  const db = storage.db;
  assert.equal(db.pragma('foreign_keys', {simple:true}), 1);
  assert.equal(db.pragma('journal_mode', {simple:true}), 'wal');
  assert.deepEqual(migrate(db), [1,2,3,4,5,6,7]);
  assert.deepEqual(migrate(db), []);
  for (const table of ['users','sessions','occurrences','contributions','stances','attachments','occurrence_relations','reports','subscriptions','saved_queries','notification_reads','events','schema_migrations']) {
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table));
  }
  const credentials = await seed(db);
  assert.equal(credentials.length, 5);
  assert.equal(db.prepare("SELECT count(*) n FROM users WHERE role='user'").get().n, 3);
  assert.equal(db.prepare("SELECT count(*) n FROM users WHERE role='admin'").get().n, 2);
  for (const credential of credentials) {
    const user = db.prepare('SELECT * FROM users WHERE username=?').get(credential.username);
    const {keyLength,...params} = JSON.parse(user.passwordParams);
    assert.equal(scryptSync(credential.password, Buffer.from(user.passwordSalt,'hex'), keyLength,params).toString('hex'), user.passwordHash);
    assert.notEqual(user.passwordHash, credential.password);
  }
  const before = db.prepare('SELECT * FROM occurrences ORDER BY id').all();
  const events = db.prepare('SELECT * FROM events ORDER BY createdAt,id').all();
  const applied = db.prepare('SELECT * FROM schema_migrations').all();
  assert.deepEqual(before.map(row=>[row.id,row.status]), [['CA-001','community_review'],['CA-002','received'],['CA-003','monitoring'],['CA-004','closed']]);
  assert.deepEqual(migrate(db), []);
  assert.deepEqual(db.prepare('SELECT * FROM schema_migrations').all(),applied);
  await assert.rejects(seed(db), /base contém dados/);
  assert.deepEqual(db.prepare('SELECT * FROM occurrences ORDER BY id').all(),before);
  assert.deepEqual(db.prepare('SELECT * FROM events ORDER BY createdAt,id').all(),events);
  const reopened = storage.reopen();
  assert.equal(reopened.pragma('foreign_keys',{simple:true}),1);
  assert.deepEqual(reopened.prepare('SELECT * FROM occurrences ORDER BY id').all(),before);
  assert.deepEqual(reopened.prepare('PRAGMA foreign_key_check').all(),[]);

});

test('seed coerente, integridade, eventos imutáveis e sequência transacional', async t => {
  const {db} = temporary(t);
  migrate(db);
  await seed(db);
  for (const row of db.prepare('SELECT * FROM occurrences').all()) {
    const events = db.prepare('SELECT * FROM events WHERE occurrenceId=? ORDER BY createdAt,id').all(row.id);
    assert.equal(events.length,row.version);
    assert.equal(JSON.parse(events[0].afterJson).status,'received');
    let previous = 'received';
    for (const event of events) {
      assert.doesNotMatch(JSON.stringify(event),/password|token|Estado demonstrativo/);
      if (event.action!=='transition') continue;
      const before = JSON.parse(event.beforeJson), after = JSON.parse(event.afterJson);
      assert.equal(before.status,previous);
      assert.notEqual(event.actorId,row.authorId);
      assert.equal(db.prepare('SELECT role FROM users WHERE id=?').get(event.actorId).role,'admin');
      const refs = JSON.parse(event.referencesJson);
      if (after.status==='confirmed') {
        assert.equal(refs[0].type,'stance');
        assert.notEqual(refs[0].snapshot.userId,row.authorId);
        assert.equal(refs[0].snapshot.type,'support');
        assert.equal(refs[0].snapshot.visibility,'visible');
      }
      if (after.status==='monitoring'||after.status==='closed') {
        assert.equal(refs[0].snapshot.type,'supplement');
        assert.equal(refs[0].snapshot.occurrenceId,row.id);
        if(after.status==='closed') assert.equal(refs[0].snapshot.kind,'resolution');
      }
      previous = after.status;
    }
    assert.equal(previous,row.status);
  }
  assert.throws(()=>db.prepare('UPDATE occurrences SET authorId=? WHERE id=?').run('missing','CA-001'),/FOREIGN KEY/);
  assert.throws(()=>db.prepare('DELETE FROM users WHERE id=(SELECT authorId FROM occurrences LIMIT 1)').run(),/FOREIGN KEY/);
  assert.throws(()=>db.prepare('UPDATE occurrences SET latitude=? WHERE id=?').run(-24,'CA-001'),/CHECK/);
  assert.throws(()=>db.prepare('UPDATE occurrences SET category=? WHERE id=?').run('extra','CA-001'),/CHECK/);
  assert.throws(()=>db.prepare('UPDATE events SET action=?').run('changed'),/imutáveis/);
  assert.throws(()=>db.prepare('DELETE FROM events').run(),/imutáveis/);
  assert.throws(()=>nextOccurrenceId(db),/transação/);
  assert.throws(()=>db.transaction(()=>{assert.equal(nextOccurrenceId(db),'CA-000005');throw new Error('rollback');}).immediate(),/rollback/);
  assert.equal(db.transaction(()=>nextOccurrenceId(db)).immediate(),'CA-000005');
  assert.equal(db.transaction(()=>nextOccurrenceId(db)).immediate(),'CA-000006');
  const contribution = db.prepare('SELECT * FROM contributions LIMIT 1').get();
  const authorId = db.prepare('SELECT id FROM users LIMIT 1').get().id;
  assert.throws(()=>db.prepare(`INSERT INTO attachments
    (id,occurrenceId,contributionId,uploaderId,storageKey,mediaType,byteSize,width,height,caption,visibility,createdAt,updatedAt)
    VALUES ('test','CA-002',?,?,'test','image/png',100,10,10,'Imagem fictícia','visible','date','date')`).run(contribution.id,authorId),/FOREIGN KEY/);
});

test('evento falho desfaz dados e versões; conflito e operação em duas ocorrências', async t => {
  const {db,filename} = temporary(t);
  migrate(db);
  await seed(db);
  const before = db.prepare('SELECT * FROM occurrences WHERE id=?').get('CA-002');
  const count = db.prepare('SELECT count(*) n FROM events').get().n;
  const mutation = (actorId = before.authorId) => ({
    expectedVersions:{'CA-002':before.version},
    mutate() {
      db.prepare('UPDATE occurrences SET title=? WHERE id=?').run('Texto alterado na simulação','CA-002');
      return {events:[{occurrenceId:'CA-002',entityType:'occurrence',entityId:'CA-002',actorId,action:'edited',before,after:{title:'Texto alterado na simulação'}}]};
    }
  });
  assert.throws(()=>domainTransaction(db,mutation('nonexistent-user')),/FOREIGN KEY/);
  assert.deepEqual(db.prepare('SELECT * FROM occurrences WHERE id=?').get('CA-002'),before);
  assert.equal(db.prepare('SELECT count(*) n FROM events').get().n,count);
  assert.equal(domainTransaction(db,mutation()).versions['CA-002'],before.version+1);
  assert.throws(()=>domainTransaction(db,mutation()),VersionConflict);
  const independent = openDatabase(filename);
  try {
    assert.throws(()=>domainTransaction(independent,mutation()),VersionConflict);
    assert.equal(independent.prepare('SELECT version FROM occurrences WHERE id=?').get('CA-002').version,before.version+1);
  } finally { independent.close(); }
  const expectedVersions = Object.fromEntries(db.prepare("SELECT id,version FROM occurrences WHERE id IN ('CA-001','CA-002')").all().map(row=>[row.id,row.version]));
  const values = db.prepare('SELECT * FROM occurrences ORDER BY id').all();
  assert.throws(()=>domainTransaction(db,{expectedVersions,mutate(){
    db.prepare("UPDATE occurrences SET locationLabel='Mudança simulada' WHERE id IN ('CA-001','CA-002')").run();
    return {events:Object.keys(expectedVersions).map((id,i)=>({occurrenceId:id,entityType:'occurrence',entityId:id,actorId:i?'missing':before.authorId,action:'edited'}))};
  }}),/FOREIGN KEY/);
  assert.deepEqual(db.prepare('SELECT * FROM occurrences ORDER BY id').all(),values);
  domainTransaction(db,{expectedVersions,mutate(){return {events:Object.keys(expectedVersions).map(id=>({occurrenceId:id,entityType:'occurrence',entityId:id,actorId:before.authorId,action:'test',after:{simulated:true}}))};}});
  const latest = db.prepare('SELECT correlationId FROM events ORDER BY createdAt DESC LIMIT 2').all();
  assert.ok(latest[0].correlationId);
  assert.equal(latest[0].correlationId,latest[1].correlationId);
});

test('falha durante seed desfaz usuários, ocorrências, eventos e sequência', async t => {
  const {db} = temporary(t);
  migrate(db);
  db.exec("CREATE TRIGGER reject_seed_event BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT,'Evento rejeitado no teste'); END");
  await assert.rejects(seed(db),/Evento rejeitado/);
  for (const table of ['users','occurrences','events']) assert.equal(db.prepare(`SELECT count(*) n FROM ${table}`).get().n,0);
  assert.equal(db.prepare('SELECT nextValue FROM occurrence_sequence').get().nextValue,1);
});

test('seed recusa base parcialmente preenchida ou alheia; migração falha atomicamente', async t => {
  const {db} = temporary(t);
  db.exec('CREATE TABLE users (id TEXT PRIMARY KEY); INSERT INTO users VALUES (\'preservar\')');
  assert.throws(()=>migrate(db),/already exists/);
  assert.equal(db.prepare('SELECT id FROM users').get().id,'preservar');
  assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='schema_migrations'").get(),undefined);
  const other = temporary(t).db;
  migrate(other);
  other.exec("INSERT INTO users (id,username,passwordHash,passwordSalt,passwordParams,role,createdAt,updatedAt) VALUES ('test','teste_ficticio','hash','salt','{}','user','date','date')");
  await assert.rejects(seed(other),/base contém dados/);
  const foreign = temporary(t).db;
  migrate(foreign);
  foreign.exec('CREATE TABLE foreign_data (value TEXT)');
  await assert.rejects(seed(foreign),/tabelas alheias/);
});


test('migrações 002/003/004/005 sobre base 001 preenchida preservam vínculos, filhos e auditoria',async t=>{
 const storage=temporary(t),db=storage.db;db.exec(migrations.find(entry=>entry.version===1).sql);db.exec("CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,appliedAt TEXT NOT NULL) STRICT");db.prepare('INSERT INTO schema_migrations VALUES (?,?)').run(1,new Date().toISOString());await seed(db);
 const tables=['users','sessions','occurrences','contributions','stances','attachments','occurrence_relations','reports','events','occurrence_sequence'],snapshot=()=>JSON.stringify(tables.map(table=>db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())),before=snapshot();assert.deepEqual(migrate(db),[2,3,4,5,6,7]);assert.ok(snapshot()!==before);assert.equal(db.prepare("SELECT count(*) total FROM occurrences WHERE environmentalRepresentationJson IS NOT NULL").get().total,0);assert.deepEqual(migrate(db),[]);assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE name='occurrence_relations_reverse'").get());
});
