export const statuses = ['Recebida', 'Verificação comunitária', 'Confirmada', 'Acompanhamento', 'Encerrada', 'Descartada'];
export const categories = ['Resíduos', 'Água'];
export function filterOccurrences(items, category = '', status = '') {
  return items.filter(item => (!category || item.category === category) && (!status || item.status === status));
}
export function selectedId(hash) {
  const match = /^#ocorrencia=([a-zA-Z0-9-]+)$/.exec(hash);
  return match?.[1] ?? null;
}
export function findOccurrence(items, id) { return items.find(item => item.id === id) ?? null; }
export function formatDate(value) { return new Intl.DateTimeFormat('pt-BR', {timeZone: 'UTC'}).format(new Date(value)); }
