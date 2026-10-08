export const statusLabels = Object.freeze({received:'Recebida',community_review:'Verificação comunitária',confirmed:'Confirmada',monitoring:'Acompanhamento',closed:'Encerrada',discarded:'Descartada'});
export const categoryLabels = Object.freeze({residuos:'Resíduos',agua:'Água'});
export const statuses = Object.values(statusLabels);
export const categories = Object.values(categoryLabels);
export function filterOccurrences(items, category = '', status = '') {
  return items.filter(item => (!category || item.category === category) && (!status || item.status === status));
}
export function selectedId(hash) {
  const match = /^#ocorrencia=([a-zA-Z0-9-]+)$/.exec(hash);
  return match?.[1] ?? null;
}
export function findOccurrence(items, id) { return items.find(item => item.id === id) ?? null; }
export function formatDate(value) { return new Intl.DateTimeFormat('pt-BR', {timeZone: 'America/Sao_Paulo'}).format(new Date(value)); }
