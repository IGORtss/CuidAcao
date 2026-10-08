export function nextOccurrenceId(db) {
  if (!db.inTransaction) throw new Error('A sequência exige transação.');
  const {nextValue} = db.prepare('UPDATE occurrence_sequence SET nextValue=nextValue+1 WHERE singleton=1 RETURNING nextValue-1 AS nextValue').get();
  return `CA-${String(nextValue).padStart(6, '0')}`;
}
