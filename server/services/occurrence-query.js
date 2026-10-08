import {occurrenceRepository} from '../repositories/occurrences.js';

export class QueryError extends Error {
  constructor(statusCode, code, message) { super(message); this.statusCode=statusCode; this.code=code; }
}

const publicOccurrence = row => ({...row,simulated:row.simulated===1});
const comparedFields = {
  stance:['type','reason'], contribution:['type','kind','text','requestStatus'],
  occurrence:['title','description','category','latitude','longitude','locationLabel'],
  attachment:['caption','mediaType','byteSize','width','height','storageKey']
};

function referenceFlags(repository, occurrence) {
  const flags = {referencesUnavailable:false,referencesChanged:false,relationsRemoved:false,duplicateTargetUnavailable:false};
  if (occurrence.duplicateOfId) flags.duplicateTargetUnavailable = !repository.visible(occurrence.duplicateOfId);
  for (const event of repository.decisionReferences(occurrence.id)) {
    const references = JSON.parse(event.referencesJson);
    if (!Array.isArray(references)) throw new Error('Referências de decisão inválidas.');
    for (const ref of references) {
      const current = repository.reference(ref.type,ref.id);
      if (!current || current.visibility!=='visible' || current.parentVisible===false || current.active===0 || current.withdrawnAt) {
        flags.referencesUnavailable = true;
      }
      if (ref.type==='occurrence' && !repository.related(occurrence.id,ref.id)) flags.relationsRemoved = true;
      if (current && ref.snapshot) {
        // Parent version changes on unrelated child writes; compare the referenced
        // content itself, not the whole occurrence version or timestamps.
        if ((comparedFields[ref.type] || []).some(field => Object.hasOwn(ref.snapshot,field) && ref.snapshot[field]!==current[field])) {
          flags.referencesChanged = true;
        }
      }
    }
  }
  return flags;
}

export function occurrenceQueries(db) {
  const repository = occurrenceRepository(db);
  const guard = query => {
    if (query.includeHidden==='true') throw new QueryError(403,'FORBIDDEN','Consulta de conteúdo oculto não permitida.');
  };
  const requireVisible = id => {
    const row = repository.visible(id);
    if (!row) throw new QueryError(404,'NOT_FOUND','Ocorrência indisponível.');
    return row;
  };
  // A short read transaction keeps counts/pages/visibility in one SQLite snapshot.
  return {
    list(query) {
      guard(query);
      return db.transaction(() => {
        const {rows,total} = repository.list({...query,includeDuplicates:query.includeDuplicates==='true'});
        return {data:rows.map(publicOccurrence),page:query.page,pageSize:query.pageSize,total};
      })();
    },
    detail(id,query) {
      guard(query);
      return db.transaction(() => {
        const row = requireVisible(id);
        return {data:{...publicOccurrence(row),counts:repository.counts(id),flags:referenceFlags(repository,row)}};
      })();
    },
    history(id,query) {
      guard(query);
      return db.transaction(() => {
        requireVisible(id);
        const {rows,total} = repository.history(id,query.page,query.pageSize);
        return {data:rows,page:query.page,pageSize:query.pageSize,total};
      })();
    }
  };
}
