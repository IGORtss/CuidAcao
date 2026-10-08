import {randomBytes, randomUUID, scrypt} from 'node:crypto';
import {promisify} from 'node:util';
import {domainTransaction} from '../services/domain-transaction.js';

const derive = promisify(scrypt);
const passwordParams = {N: 131072, r: 8, p: 1, keyLength: 64, maxmem: 256 * 1024 * 1024};
const tables = ['users','sessions','occurrences','contributions','stances','attachments','occurrence_relations','reports','events'];
function assertEmpty(db) {
  const allowed = new Set([...tables, 'schema_migrations', 'occurrence_sequence']);
  const existing = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  if (existing.some(({name}) => !allowed.has(name))) throw new Error('Seed recusado: a base contém tabelas alheias à demonstração.');
  for (const table of tables) {
    // Table names are a fixed internal allowlist, never caller input.
    if (db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get()) throw new Error('Seed recusado: a base contém dados.');
  }
  if (db.prepare('SELECT nextValue FROM occurrence_sequence WHERE singleton=1').get()?.nextValue !== 1) {
    throw new Error('Seed recusado: a sequência já foi utilizada.');
  }
}

// Dedicated demonstration data, not fixture history or a public write API.
const examples = [
  {id:'CA-001', title:'Resíduos junto à faixa de areia', category:'residuos', latitude:-23.9406, longitude:-46.1834, locationLabel:'Trecho ilustrativo da praia', description:'Relato fictício de embalagens e sacolas acumuladas na faixa de areia. Localização ilustrativa, sem verificação no mundo real.', target:'community_review'},
  {id:'CA-002', title:'Alteração aparente na água', category:'agua', latitude:-23.9398, longitude:-46.1795, locationLabel:'Ponto ilustrativo próximo à orla', description:'Observação fictícia de coloração diferente na água. Não confirma contaminação nem informa condições de banho.', target:'received'},
  {id:'CA-003', title:'Descarte de resíduos em área aberta', category:'residuos', latitude:-23.9366, longitude:-46.1832, locationLabel:'Área ilustrativa no bairro', description:'Relato fictício de resíduos acumulados em área aberta. A revisão e as atualizações fazem parte da simulação acadêmica.', target:'monitoring'},
  {id:'CA-004', title:'Limpeza acompanhada pela comunidade', category:'residuos', latitude:-23.9381, longitude:-46.1862, locationLabel:'Trecho ilustrativo de acesso à praia', description:'Relato fictício de resíduos num acesso à praia, seguido de atualização simulada sobre sua retirada. Não representa ação real.', target:'closed'}
];

export async function seed(db) {
  assertEmpty(db);
  const credentials = [];
  const users = [];
  // Sequential derivation keeps memory bounded (one scrypt at a time).
  for (const [username, role] of [['morador_demo_1','user'],['morador_demo_2','user'],['morador_demo_3','user'],['admin_demo_1','admin'],['admin_demo_2','admin']]) {
    const password = randomBytes(24).toString('base64url');
    const salt = randomBytes(16).toString('hex');
    const hash = await derive(password, Buffer.from(salt, 'hex'), passwordParams.keyLength, passwordParams);
    users.push({id:randomUUID(), username, role, passwordHash:hash.toString('hex'), passwordSalt:salt});
    credentials.push({username, role, password});
  }
  db.transaction(() => {
    // Recheck under write lock after asynchronous hashing, before any insert.
    assertEmpty(db);
    const userDate = '2026-10-01T10:00:00.000Z';
    for (const user of users) db.prepare(`INSERT INTO users
      (id,username,role,passwordHash,passwordSalt,passwordParams,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?)`)
      .run(user.id,user.username,user.role,user.passwordHash,user.passwordSalt,JSON.stringify(passwordParams),userDate,userDate);
    let clock = Date.parse('2026-10-01T12:00:00.000Z');
    const time = () => new Date(clock += 60_000).toISOString();
    const snapshot = id => db.prepare('SELECT * FROM occurrences WHERE id=?').get(id);
    const apply = (id, mutate) => domainTransaction(db, {
      expectedVersions: {[id]:snapshot(id).version}, createdAt:time(), mutate
    });
    for (const [index, example] of examples.entries()) {
      const authorId = users[index % 3].id;
      const adminId = users[3 + index % 2].id;
      const observerId = users[(index + 1) % 3].id;
      const createdAt = time();
      domainTransaction(db, {createdAt, mutate() {
        db.prepare(`INSERT INTO occurrences
          (id,authorId,title,description,category,latitude,longitude,locationLabel,status,simulated,visibility,version,createdAt,updatedAt)
          VALUES (?,?,?,?,?,?,?,?,'received',1,'visible',1,?,?)`).run(example.id,authorId,example.title,example.description,
          example.category,example.latitude,example.longitude,example.locationLabel,createdAt,createdAt);
        return {events:[{occurrenceId:example.id,entityType:'occurrence',entityId:example.id,actorId:authorId,action:'created',after:snapshot(example.id)}]};
      }});
      const transition = (to, reason, references = []) => apply(example.id, () => {
        const before = snapshot(example.id);
        db.prepare('UPDATE occurrences SET status=?,closureReason=? WHERE id=?').run(to,to==='closed'?'resolved':null,example.id);
        const after = {...snapshot(example.id), version:before.version+1, updatedAt:new Date(clock).toISOString()};
        return {events:[{occurrenceId:example.id,entityType:'occurrence',entityId:example.id,actorId:adminId,action:'transition',reason,before,after,references}]};
      });
      if (example.target === 'received') continue;
      transition('community_review','Triagem fictícia: categoria, localização e descrição conferidas; conteúdo adequado para a demonstração.');
      if (example.target === 'community_review') continue;
      const supportId = randomUUID();
      apply(example.id, () => {
        const createdAt = new Date(clock).toISOString();
        db.prepare(`INSERT INTO stances (id,occurrenceId,userId,type,reason,active,visibility,createdAt,updatedAt)
          VALUES (?,?,?,'support',?,1,'visible',?,?)`).run(supportId,example.id,observerId,
          'Observação fictícia independente: resíduos visíveis no ponto ilustrativo descrito pelo relato.',createdAt,createdAt);
        const after = db.prepare('SELECT * FROM stances WHERE id=?').get(supportId);
        return {events:[{occurrenceId:example.id,entityType:'stance',entityId:supportId,actorId:observerId,action:'created',after}]};
      });
      transition('confirmed','O apoio independente relata observação do mesmo problema; não existem contestações ativas nesta simulação.',
        [{type:'stance',id:supportId,occurrenceVersion:snapshot(example.id).version,snapshot:db.prepare('SELECT * FROM stances WHERE id=?').get(supportId)}]);
      const kind = example.target === 'closed' ? 'resolution' : 'observation';
      const contributionId = randomUUID();
      apply(example.id, () => {
        const createdAt = new Date(clock).toISOString();
        db.prepare(`INSERT INTO contributions (id,occurrenceId,authorId,type,kind,text,visibility,createdAt,updatedAt)
          VALUES (?,?,?,'supplement',?,?,'visible',?,?)`).run(contributionId,example.id,observerId,kind,
          kind==='resolution' ? 'Atualização fictícia: os resíduos foram retirados e o acesso está livre nesta simulação.' :
            'Atualização fictícia: ainda existem resíduos no local ilustrativo; a situação segue em acompanhamento.',createdAt,createdAt);
        return {events:[{occurrenceId:example.id,entityType:'contribution',entityId:contributionId,actorId:observerId,action:'created',after:db.prepare('SELECT * FROM contributions WHERE id=?').get(contributionId)}]};
      });
      transition(example.target, kind==='resolution' ? 'Encerramento fictício por resolução relatada no complemento independente referenciado.' :
        'Acompanhamento fictício baseado no complemento que atualiza a permanência do problema.',
        [{type:'contribution',id:contributionId,occurrenceVersion:snapshot(example.id).version,snapshot:db.prepare('SELECT * FROM contributions WHERE id=?').get(contributionId)}]);
    }
    db.prepare('UPDATE occurrence_sequence SET nextValue=? WHERE singleton=1').run(5);
  }).immediate();
  // Only the local CLI displays plaintext, after successful commit. Never saved.
  return credentials;
}
