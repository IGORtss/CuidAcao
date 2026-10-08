import {categoryLabels,statusLabels} from '../domain.js';
import {ApiError} from './http.js';

const invalid = () => {throw new ApiError('Os dados da API não correspondem ao contrato de consulta. Tente novamente.');};
const isDate = value => typeof value==='string' && Number.isFinite(Date.parse(value));

export function adaptOccurrence(row) {
  if(!row || typeof row.id!=='string' || typeof row.title!=='string' || typeof row.description!=='string' ||
    !Object.hasOwn(categoryLabels,row.category) || !Object.hasOwn(statusLabels,row.status) ||
    !Number.isFinite(row.latitude) || !Number.isFinite(row.longitude) || !isDate(row.createdAt) || !isDate(row.updatedAt) ||
    (row.locationLabel!==null && typeof row.locationLabel!=='string') || row.simulated!==true ||
    !Number.isInteger(row.version) || row.version<1 || (row.duplicateOfId!==null && typeof row.duplicateOfId!=='string')) invalid();
  // Explicit presentation DTO: no private/extra API fields copied into the UI.
  return {id:row.id,title:row.title,description:row.description,categoryCode:row.category,statusCode:row.status,
    category:categoryLabels[row.category],status:statusLabels[row.status],latitude:row.latitude,longitude:row.longitude,
    locationLabel:row.locationLabel,createdAt:row.createdAt,updatedAt:row.updatedAt,version:row.version,
    simulated:row.simulated,duplicateOfId:row.duplicateOfId};
}

export function adaptDetail(row) {
  const item=adaptOccurrence(row);
  const flagNames=['referencesUnavailable','referencesChanged','relationsRemoved','duplicateTargetUnavailable'];
  if(!row.counts || !['support','contest'].every(key=>Number.isSafeInteger(row.counts[key]) && row.counts[key]>=0) ||
    !row.flags || !flagNames.every(key=>typeof row.flags[key]==='boolean')) invalid();
  return {...item,counts:{support:row.counts.support,contest:row.counts.contest},
    flags:Object.fromEntries(flagNames.map(key=>[key,row.flags[key]]))};
}

const actions={created:'Registro criado',edited:'Registro editado',transition:'Estado alterado',moderated:'Moderação registrada',
  hidden:'Conteúdo ocultado',restored:'Conteúdo restaurado',withdrawn:'Conteúdo retirado'};

export function adaptHistoryEvent(row) {
  if(!row || typeof row.id!=='string' || typeof row.action!=='string' || !isDate(row.createdAt) ||
    (row.username!==null && typeof row.username!=='string') || (row.reason!==null && typeof row.reason!=='string')) invalid();
  const action=Object.hasOwn(actions,row.action)?actions[row.action]:`Ação registrada: ${row.action}`;
  return {id:row.id,date:row.createdAt,text:`${action} · ${row.username??'Sistema'}${row.reason ? ` — ${row.reason}` : ''}`};
}
