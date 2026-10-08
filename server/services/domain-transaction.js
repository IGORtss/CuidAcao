import {randomUUID} from 'node:crypto';

export class VersionConflict extends Error {
  constructor() { super('Versão da ocorrência alterada.'); this.code = 'VERSION_CONFLICT'; }
}

export function appendEvent(db, event) {
  if (!db.inTransaction) throw new Error('Evento exige transação.');
  const {occurrenceId, entityType, entityId, actorId = null, action, reason = null,
    before = null, after = null, references = [], correlationId = null, createdAt = new Date().toISOString()} = event;
  db.prepare(`INSERT INTO events
    (id,occurrenceId,entityType,entityId,actorId,action,reason,beforeJson,afterJson,referencesJson,correlationId,createdAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(randomUUID(), occurrenceId, entityType, entityId, actorId, action, reason,
    before === null ? null : JSON.stringify(before), after === null ? null : JSON.stringify(after), JSON.stringify(references), correlationId, createdAt);
}

// Synchronous callbacks only. Authorization and entity-specific invariants belong
// to future use cases; this primitive provides atomicity and version comparison.
export function domainTransaction(db, {expectedVersions = {}, mutate, createdAt = new Date().toISOString()}) {
  if (mutate?.constructor.name === 'AsyncFunction') throw new Error('Mutação deve ser síncrona.');
  return db.transaction(() => {
    const ids = Object.keys(expectedVersions);
    for (const id of ids) {
      const expected = expectedVersions[id];
      if (!Number.isSafeInteger(expected) || expected < 1) throw new Error('Versão esperada inválida.');
      const row = db.prepare('SELECT version FROM occurrences WHERE id=?').get(id);
      if (!row || row.version !== expected) throw new VersionConflict();
    }
    const result = mutate();
    if (result?.then) throw new Error('Mutação deve ser síncrona.');
    if (!Array.isArray(result?.events) || result.events.length === 0) throw new Error('Mutação exige evento.');
    const eventIds = new Set(result.events.map(event => event.occurrenceId));
    if (ids.some(id => !eventIds.has(id))) throw new Error('Cada ocorrência alterada exige evento.');
    // Extra ids are permitted only for creation at version 1.
    for (const id of eventIds) {
      if (!ids.includes(id)) {
        const row = db.prepare('SELECT version FROM occurrences WHERE id=?').get(id);
        if (!row || row.version !== 1 || db.prepare('SELECT 1 FROM events WHERE occurrenceId=?').get(id)) {
          throw new Error('Alteração de ocorrência existente exige versão esperada.');
        }
      }
    }
    const versions = {};
    for (const id of ids) {
      const update = db.prepare('UPDATE occurrences SET version=version+1,updatedAt=? WHERE id=? AND version=?').run(createdAt, id, expectedVersions[id]);
      if (update.changes !== 1) throw new VersionConflict();
      versions[id] = expectedVersions[id] + 1;
    }
    const correlationId = eventIds.size > 1 ? randomUUID() : null;
    for (const event of result.events) appendEvent(db, {...event, createdAt, correlationId});
    return {value: result.value, versions};
  }).immediate();
}
