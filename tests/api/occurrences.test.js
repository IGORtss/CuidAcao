import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createApp} from '../../server/app.js';
import {openDatabase} from '../../server/db/connection.js';
import {migrate} from '../../server/db/migrate.js';
import {appendEvent} from '../../server/services/domain-transaction.js';

// Controlled database arrangements for read-only HTTP tests; no web write route.
async function setup(t) {
  const directory = mkdtempSync(join(tmpdir(),'cuidacao-api-'));
  const db = openDatabase(join(directory,'api.sqlite'));
  const app = createApp({db});
  t.after(async () => {await app.close();if(db.open)db.close();rmSync(directory,{recursive:true,force:true});});
  migrate(db);
  const userId = randomUUID();
  const observerId = randomUUID();
  for (const [id,username] of [[userId,'autor_ficticio'],[observerId,'observador_ficticio']]) db.prepare(`INSERT INTO users
    VALUES (?,?, 'PRIVATE_HASH','PRIVATE_SALT','{}','user','2026-10-01T12:00:00.000Z','2026-10-01T12:00:00.000Z')`).run(id,username);
  const occurrence = (id,{category='residuos',status='received',visibility='visible',duplicateOfId=null,createdAt='2026-10-01T12:00:00.000Z'}={}) => {
    db.prepare(`INSERT INTO occurrences
      (id,authorId,title,description,category,latitude,longitude,status,simulated,visibility,version,duplicateOfId,closureReason,discardReason,createdAt,updatedAt)
      VALUES (?,?,'Relato fictício',?,?,-23.94,-46.18,?,1,?,1,?,?,?,?,?)`).run(id,userId,
      visibility==='hidden'?'PRIVATE_HIDDEN_BODY sem dados reais para teste':'Descrição fictícia suficiente para a consulta pública.',category,status,visibility,duplicateOfId,
      status==='closed'?'resolved':null,status==='discarded'?'invalid':null,createdAt,createdAt);
  };
  db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(randomUUID(),userId,'PRIVATE_SESSION_HASH','2026-10-01T20:00:00Z','2026-10-01T12:00:00Z','2026-10-01T12:00:00Z');
  occurrence('CA-001');
  occurrence('CA-002',{category:'agua',status:'community_review',createdAt:'2026-10-02T12:00:00.000Z'});
  occurrence('CA-003',{status:'closed',createdAt:'2026-10-02T12:00:00.000Z'});
  occurrence('CA-004',{visibility:'hidden'});
  occurrence('CA-000005',{duplicateOfId:'CA-001'});
  occurrence('CA-000006',{status:'discarded'});
  const event = (occurrenceId,extras={}) => db.transaction(()=>appendEvent(db,{
    occurrenceId,entityType:'occurrence',entityId:occurrenceId,actorId:userId,action:'created',
    before:{description:'PRIVATE_OLD_BODY'},after:{passwordHash:'PRIVATE_HASH'},createdAt:'2026-10-01T12:00:00.000Z',...extras
  }))();
  event('CA-001');event('CA-004');
  await app.ready();
  return {app,db,userId,observerId,event,occurrence};
}

function noPrivate(response) {
  assert.doesNotMatch(response.body,/PRIVATE_|passwordHash|passwordSalt|passwordParams|tokenHash|storageKey|beforeJson|afterJson|referencesJson|reporterId|visibility/);
}

test('lista: defaults, páginas, ordenação por data/id, filtros E e vazio',async t => {
  const {app} = await setup(t);
  const response = await app.inject('/api/v1/occurrences');
  assert.equal(response.statusCode,200);
  assert.match(response.headers['content-type'],/application\/json/);
  assert.deepEqual(response.json().data.map(row=>row.id),['CA-003','CA-002','CA-001','CA-000006']);
  assert.deepEqual({...response.json(),data:undefined},{data:undefined,page:1,pageSize:20,total:4});
  assert.equal(response.json().data[0].simulated,true);
  noPrivate(response);
  const page1 = (await app.inject('/api/v1/occurrences?page=1&pageSize=2')).json();
  const page2 = (await app.inject('/api/v1/occurrences?page=2&pageSize=2')).json();
  assert.deepEqual([...page1.data,...page2.data].map(row=>row.id),response.json().data.map(row=>row.id));
  assert.equal(page2.total,4);
  const filtered = (await app.inject('/api/v1/occurrences?category=agua&status=community_review')).json();
  assert.deepEqual(filtered.data.map(row=>row.id),['CA-002']);
  assert.equal(filtered.total,1);
  for (const url of ['?category=agua&status=closed','?page=30','?pageSize=100']) {
    const result = await app.inject('/api/v1/occurrences'+url);
    assert.equal(result.statusCode,200);
    if(url!=='?pageSize=100') assert.deepEqual(result.json().data,[]);
  }
});

test('parâmetros inválidos e desconhecidos retornam 422 em todas as consultas',async t => {
  const {app} = await setup(t);
  const invalid = ['category=Resíduos','category=extra','status=Recebida','status=extra','page=0','page=-1','page=1.5','page=1e2','page=','page=NaN',
    'page=99999999999999999999','pageSize=101','pageSize=0','pageSize=20.5','pageSize=','includeDuplicates=1','includeHidden=yes',
    'role=admin','category=agua&category=residuos','page=1&page=2','includeHidden=false&includeHidden=true'];
  for(const query of invalid) {
    const response = await app.inject('/api/v1/occurrences?'+query);
    assert.equal(response.statusCode,422,query);
    assert.equal(response.json().error.code,'VALIDATION_ERROR');
    assert.ok(response.json().error.fields);
  }
  for(const url of ['/api/v1/occurrences/invalid','/api/v1/occurrences/CA-12','/api/v1/occurrences/CA-001?page=1',
    '/api/v1/occurrences/CA-001?includeDuplicates=true','/api/v1/occurrences/CA-001/history?category=agua',
    '/api/v1/occurrences/CA-001/history?pageSize=101']) assert.equal((await app.inject(url)).statusCode,422,url);
  const malformed = await app.inject('/api/v1/occurrences/%ZZ');
  assert.equal(malformed.statusCode,400);
  assert.equal(malformed.json().error.code,'INVALID_REQUEST');
});

test('ocultos/inexistentes indistinguíveis; includeHidden recusado sem bypass',async t => {
  const {app} = await setup(t);
  for (const suffix of ['','/history']) {
    const hidden = await app.inject('/api/v1/occurrences/CA-004'+suffix);
    const missing = await app.inject('/api/v1/occurrences/CA-999'+suffix);
    assert.equal(hidden.statusCode,404);
    assert.deepEqual(hidden.json(),missing.json());
    noPrivate(hidden);
  }
  for(const route of ['/api/v1/occurrences','/api/v1/occurrences/CA-001','/api/v1/occurrences/CA-004/history']) {
    const denied = await app.inject({url:route+'?includeHidden=true',headers:{cookie:'role=admin','authorization':'Bearer ficticio','x-role':'admin'}});
    assert.equal(denied.statusCode,403);
    assert.equal(denied.json().error.code,'FORBIDDEN');
    assert.equal((await app.inject(route+'?includeHidden=false')).statusCode,route.endsWith('history')?404:200);
  }
});

test('duplicatas: default/false omitem; true inclui; detalhe mantém origem e destino indisponível',async t => {
  const {app,db} = await setup(t);
  for(const query of ['', '?includeDuplicates=false']) assert.equal((await app.inject('/api/v1/occurrences'+query)).json().total,4);
  const included = await app.inject('/api/v1/occurrences?includeDuplicates=true');
  assert.equal(included.json().total,5);
  assert.ok(included.json().data.some(row=>row.id==='CA-000005'));
  const detail = (await app.inject('/api/v1/occurrences/CA-000005')).json().data;
  assert.equal(detail.duplicateOfId,'CA-001');
  assert.equal(detail.flags.duplicateTargetUnavailable,false);
  db.prepare("UPDATE occurrences SET visibility='hidden' WHERE id=?").run('CA-001');
  const after = await app.inject('/api/v1/occurrences/CA-000005');
  assert.equal(after.statusCode,200);
  assert.equal(after.json().data.flags.duplicateTargetUnavailable,true);
  noPrivate(after);
});

test('detalhe: campos reais, contagens próprias e flags derivadas de snapshots',async t => {
  const {app,db,observerId,event} = await setup(t);
  const stanceId = randomUUID();
  db.prepare(`INSERT INTO stances VALUES (?, 'CA-001',?,'support','Observação fictícia independente no local.',1,'visible',
    '2026-10-01T13:00:00.000Z','2026-10-01T13:00:00.000Z')`).run(stanceId,observerId);
  const snapshot = db.prepare('SELECT * FROM stances WHERE id=?').get(stanceId);
  event('CA-001',{action:'transition',references:[{type:'stance',id:stanceId,occurrenceVersion:1,snapshot}]});
  const detail = await app.inject('/api/v1/occurrences/CA-001');
  const data = detail.json().data;
  assert.deepEqual(data.counts,{support:1,contest:0});
  assert.equal(data.locationLabel,null);
  assert.equal(data.closureReason,null);
  assert.deepEqual(data.flags,{referencesUnavailable:false,referencesChanged:false,relationsRemoved:false,duplicateTargetUnavailable:false});
  assert.equal(data.authorId,db.prepare('SELECT authorId FROM occurrences WHERE id=?').get('CA-001').authorId);
  noPrivate(detail);
  db.prepare('UPDATE stances SET reason=? WHERE id=?').run('Observação fictícia alterada para testar snapshot.',stanceId);
  assert.equal((await app.inject('/api/v1/occurrences/CA-001')).json().data.flags.referencesChanged,true);
  db.prepare("UPDATE stances SET visibility='hidden' WHERE id=?").run(stanceId);
  const hidden = (await app.inject('/api/v1/occurrences/CA-001')).json().data;
  assert.deepEqual(hidden.counts,{support:0,contest:0});
  assert.equal(hidden.flags.referencesUnavailable,true);
  db.prepare("UPDATE stances SET visibility='visible',active=0 WHERE id=?").run(stanceId);
  assert.equal((await app.inject('/api/v1/occurrences/CA-001')).json().data.counts.support,0);
  assert.equal((await app.inject('/api/v1/occurrences/CA-000005')).json().data.counts.support,0);
});

test('relação removida e pai oculto sinalizam indisponibilidade sem snapshots públicos',async t => {
  const {app,db,userId,event} = await setup(t);
  const snapshot = db.prepare('SELECT * FROM occurrences WHERE id=?').get('CA-002');
  db.prepare('INSERT INTO occurrence_relations VALUES (?,?,?,?,?)').run('CA-001','CA-002',userId,'Relação fictícia para teste de referência.','2026-10-01T12:00:00.000Z');
  event('CA-001',{action:'transition',references:[{type:'occurrence',id:'CA-002',snapshot}]});
  assert.equal((await app.inject('/api/v1/occurrences/CA-001')).json().data.flags.relationsRemoved,false);
  db.prepare('DELETE FROM occurrence_relations WHERE leftId=? AND rightId=?').run('CA-001','CA-002');
  assert.equal((await app.inject('/api/v1/occurrences/CA-001')).json().data.flags.relationsRemoved,true);
  db.prepare("UPDATE occurrences SET visibility='hidden' WHERE id=?").run('CA-002');
  assert.equal((await app.inject('/api/v1/occurrences/CA-001')).json().data.flags.referencesUnavailable,true);
});

test('histórico: paginação pública, ordenação ASC e nenhum dado privado',async t => {
  const {app,db,event,observerId} = await setup(t);
  const reportId = randomUUID();
  db.prepare(`INSERT INTO reports (id,occurrenceId,reporterId,targetType,targetId,reason,status,createdAt,updatedAt)
    VALUES (?, 'CA-001',?,'occurrence','CA-001','PRIVATE_REPORT_REASON fictício para teste','pending','2026-10-01T12:00:00.000Z','2026-10-01T12:00:00.000Z')`).run(reportId,observerId);
  event('CA-001',{entityType:'report',entityId:reportId,actorId:observerId,action:'created',reason:'PRIVATE_REPORT_REASON'});
  event('CA-001',{actorId:null,action:'simulation_prepared',createdAt:'2026-10-02T12:00:00.000Z'});
  event('CA-001',{action:'moderated',reason:'Motivo público fictício de moderação.',createdAt:'2026-10-03T12:00:00.000Z'});
  const response = await app.inject('/api/v1/occurrences/CA-001/history?pageSize=2');
  assert.equal(response.statusCode,200);
  assert.equal(response.json().total,3);
  assert.equal(response.json().data[0].action,'created');
  assert.equal(response.json().data[0].username,'autor_ficticio');
  assert.equal(response.json().data[1].username,null);
  assert.deepEqual(Object.keys(response.json().data[0]).sort(),['action','createdAt','id','reason','username']);
  noPrivate(response);
  const page2 = await app.inject('/api/v1/occurrences/CA-001/history?page=2&pageSize=2');
  assert.equal(page2.json().data[0].reason,'Motivo público fictício de moderação.');
  assert.deepEqual((await app.inject('/api/v1/occurrences/CA-001/history?page=20')).json().data,[]);
  noPrivate(page2);
});

test('falhas internas genéricas não revelam SQL, stack, caminho nem header requestId',async t => {
  const {app,db} = await setup(t);
  db.close();
  for(const url of ['/api/v1/occurrences','/api/v1/occurrences/CA-001','/api/v1/occurrences/CA-001/history']) {
    const response = await app.inject({url,headers:{'request-id':'PRIVATE_CLIENT_ID'}});
    assert.equal(response.statusCode,500);
    assert.deepEqual(Object.keys(response.json().error).sort(),['code','message','requestId']);
    assert.equal(response.json().error.code,'INTERNAL_ERROR');
    assert.match(response.json().error.requestId,/^[a-f0-9-]{36}$/);
    assert.doesNotMatch(response.body,/PRIVATE_|SELECT|sqlite|SQL|stack|\/home|\/tmp|closed/i);
  }
});

test('erro SQL e JSON de referência inválido não vazam detalhes internos',async t => {
  const {app,db,event} = await setup(t);
  // SQLite's real missing-table error exercises the error handler without a mock.
  db.exec('ALTER TABLE stances RENAME TO missing_stances');
  const sqlError = await app.inject('/api/v1/occurrences/CA-001');
  assert.equal(sqlError.statusCode,500);
  assert.doesNotMatch(sqlError.body,/no such table|stances|sqlite|SQL|stack|\/home|\/tmp/);
  db.exec('ALTER TABLE missing_stances RENAME TO stances');
  event('CA-001',{action:'transition',references:{invalid:'PRIVATE_REFERENCE_DATA'}});
  const invalid = await app.inject('/api/v1/occurrences/CA-001');
  assert.equal(invalid.statusCode,500);
  assert.doesNotMatch(invalid.body,/PRIVATE|Referências|stack|\/home|\/tmp/);
});

test('base migrada vazia retorna vazio, sem fixtures/seed implícito',async t => {
  const directory=mkdtempSync(join(tmpdir(),'cuidacao-empty-api-'));
  const db=openDatabase(join(directory,'empty.sqlite'));
  migrate(db);
  const app=createApp({db});
  t.after(async()=>{await app.close();db.close();rmSync(directory,{recursive:true,force:true});});
  const response=await app.inject('/api/v1/occurrences');
  assert.equal(response.statusCode,200);
  assert.deepEqual(response.json(),{data:[],page:1,pageSize:20,total:0});
  assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,0);
  assert.equal(db.prepare('SELECT count(*) n FROM events').get().n,0);
});

test('aplicação não escuta porta, sem seed/rotas futuras/HEAD implícito',async t => {
  const {app,db} = await setup(t);
  assert.equal(app.server.listening,false);
  const before = db.prepare('SELECT count(*) n FROM users').get().n;
  for(const [method,url] of [['POST','/api/v1/occurrences'],['PATCH','/api/v1/occurrences/CA-001'],['POST','/api/v1/auth/login'],['GET','/api/v1/occurrences/CA-001/contributions'],['HEAD','/api/v1/occurrences']]) {
    const response = await app.inject({method,url});
    assert.equal(response.statusCode,404);
    if(method!=='HEAD') assert.equal(response.json().error.code,'NOT_FOUND');
  }
  assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,before);
});
