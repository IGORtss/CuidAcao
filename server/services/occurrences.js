import {randomUUID} from 'node:crypto';
import {fail} from './errors.js';
export const categoryLabels = {residuos:'Resíduos',agua:'Água'};
export const statusLabels = {received:'Recebida',community_review:'Verificação comunitária',confirmed:'Confirmada',monitoring:'Acompanhamento',closed:'Encerrada',discarded:'Descartada'};
const countText = text => [...text].length;
export function cleanOccurrence(input, partial=false) {
  const data = {...input};
  for (const [field,min,max] of [['description',20,3000],['title',5,100],['locationLabel',0,120]]) {
    if (data[field]===undefined) continue;
    data[field]=data[field].trim();
    if (countText(data[field])<min || countText(data[field])>max) fail(422,'INVALID_FIELD','Revise os campos informados.',{[field]:`Use de ${min} a ${max} caracteres.`});
  }
  if (!partial && !data.description) fail(422,'INVALID_FIELD','Descrição obrigatória.');
  return data;
}
export function occurrenceService(db, now=()=>new Date()) {
  function get(id, includeHidden=false) {
    const row=db.prepare('SELECT o.*,u.username AS author FROM occurrences o JOIN users u ON u.id=o.authorId WHERE o.id=?').get(id);
    if (!row || (row.visibility==='hidden' && !includeHidden)) fail(404,'NOT_FOUND','Ocorrência indisponível.');
    return {...row,simulated:true};
  }
  function event({occurrenceId,actorId,action,before=null,after=null,reason=null,references=[],entityType='occurrence',entityId=occurrenceId,date=now().toISOString()}) {
    db.prepare('INSERT INTO events(id,occurrenceId,entityType,entityId,actorId,action,reason,beforeJson,afterJson,referencesJson,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
      .run(randomUUID(),occurrenceId,entityType,entityId,actorId,action,reason,before ? JSON.stringify(before):null,after ? JSON.stringify(after):null,JSON.stringify(references),date);
  }
  function create(input, user) {
    const data=cleanOccurrence(input);
    return db.transaction(() => {
      const {value}=db.prepare('UPDATE occurrence_sequence SET value=value+1 WHERE singleton=1 RETURNING value').get();
      const id=`CA-${String(value).padStart(6,'0')}`, date=now().toISOString();
      const item={id,authorId:user.id,title:data.title??`${categoryLabels[data.category]} — ${id}`,description:data.description,category:data.category,latitude:data.latitude,longitude:data.longitude,locationLabel:data.locationLabel??'',createdAt:date,updatedAt:date};
      db.prepare("INSERT INTO occurrences(id,authorId,title,description,category,latitude,longitude,locationLabel,status,version,createdAt,updatedAt) VALUES(@id,@authorId,@title,@description,@category,@latitude,@longitude,@locationLabel,'received',1,@createdAt,@updatedAt)").run(item);
      const after=get(id); event({occurrenceId:id,actorId:user.id,action:'created',after}); return after;
    }).immediate();
  }
  function edit(id,input,user) {
    const changes=cleanOccurrence(input.changes,true);
    return db.transaction(() => {
      const before=get(id);
      if (before.authorId!==user.id) fail(403,'FORBIDDEN','Somente o autor pode editar este relato.');
      if (before.status!=='received' || before.duplicateOfId || now().getTime()-Date.parse(before.createdAt)>24*60*60*1000) fail(409,'EDIT_UNAVAILABLE','Edição disponível apenas em Recebida, nas primeiras 24 horas.');
      if (before.version!==input.expectedVersion) fail(409,'VERSION_CONFLICT','O registro mudou. Recarregue e revise antes de enviar.');
      const after={...before,...changes,version:before.version+1,updatedAt:now().toISOString()};
      db.prepare('UPDATE occurrences SET title=@title,description=@description,category=@category,latitude=@latitude,longitude=@longitude,locationLabel=@locationLabel,version=@version,updatedAt=@updatedAt WHERE id=@id').run(after);
      event({occurrenceId:id,actorId:user.id,action:'edited',before,after}); return get(id);
    }).immediate();
  }
  function list(query, includeHidden=false) {
    const clauses=[],args=[];
    if (!includeHidden) clauses.push("visibility='visible'");
    if (query.includeDuplicates!=='true') clauses.push('duplicateOfId IS NULL');
    for (const field of ['category','status']) if (query[field]) {clauses.push(`${field}=?`);args.push(query[field]);}
    const where=clauses.length ? `WHERE ${clauses.join(' AND ')}`:'';
    const page=Number(query.page??1),pageSize=Number(query.pageSize??20);
    const {total}=db.prepare(`SELECT count(*) AS total FROM occurrences ${where}`).get(...args);
    const rows=db.prepare(`SELECT id FROM occurrences ${where} ORDER BY createdAt DESC,id DESC LIMIT ? OFFSET ?`).all(...args,pageSize,(page-1)*pageSize);
    return {data:rows.map(row=>get(row.id,includeHidden)),page,pageSize,total};
  }
  function history(id,query, includeHidden=false) {
    get(id,includeHidden);
    const page=Number(query.page??1),pageSize=Number(query.pageSize??20);
    const rows=db.prepare('SELECT e.*,u.username AS actor FROM events e JOIN users u ON u.id=e.actorId WHERE occurrenceId=? ORDER BY e.createdAt,e.id').all(id);
    // Public history never exposes previous/hidden bodies or private reports.
    const visible=rows.filter(row=>includeHidden || !row.action.startsWith('report'));
    const project=row=>({id:row.id,occurrenceId:row.occurrenceId,entityType:row.entityType,entityId:row.entityId,actor:row.actor,action:row.action,reason:row.reason,createdAt:row.createdAt,...(includeHidden ? {before:JSON.parse(row.beforeJson),after:JSON.parse(row.afterJson),references:JSON.parse(row.referencesJson)}:{})});
    return {data:visible.slice((page-1)*pageSize,page*pageSize).map(project),page,pageSize,total:visible.length};
  }
  return {get,event,create,edit,list,history};
}
