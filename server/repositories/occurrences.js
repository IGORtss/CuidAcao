// Only public columns are selected. Filter values and pagination are always bound.
const columns = `id,authorId,title,description,category,latitude,longitude,locationLabel,
  status,simulated,version,duplicateOfId,closureReason,discardReason,createdAt,updatedAt`;

export function occurrenceRepository(db) {
  return {
    list({category, status, includeDuplicates, page, pageSize}) {
      const clauses = ["visibility='visible'"];
      const values = [];
      if (!includeDuplicates) clauses.push('duplicateOfId IS NULL');
      if (category !== undefined) { clauses.push('category=?'); values.push(category); }
      if (status !== undefined) { clauses.push('status=?'); values.push(status); }
      const where = clauses.join(' AND ');
      const total = db.prepare(`SELECT count(*) AS total FROM occurrences WHERE ${where}`).get(...values).total;
      const rows = db.prepare(`SELECT ${columns} FROM occurrences WHERE ${where}
        ORDER BY createdAt DESC,id DESC LIMIT ? OFFSET ?`).all(...values, pageSize, (page - 1) * pageSize);
      return {rows, total};
    },
    visible(id) {
      return db.prepare(`SELECT ${columns} FROM occurrences WHERE id=? AND visibility='visible'`).get(id);
    },
    counts(id) {
      const counts = {support:0, contest:0};
      for (const row of db.prepare(`SELECT type,count(*) AS total FROM stances
        WHERE occurrenceId=? AND active=1 AND visibility='visible' GROUP BY type`).all(id)) counts[row.type] = row.total;
      return counts;
    },
    decisionReferences(id) {
      return db.prepare(`SELECT referencesJson FROM events WHERE occurrenceId=?
        AND entityType='occurrence' AND action='transition' ORDER BY createdAt,id`).all(id);
    },
    reference(type, id) {
      const tables = {stance:'stances', contribution:'contributions', occurrence:'occurrences', attachment:'attachments'};
      if (!Object.hasOwn(tables,type)) return undefined;
      // Table names are a fixed internal allowlist, never interpolated caller input.
      const row = db.prepare(`SELECT * FROM ${tables[type]} WHERE id=?`).get(id);
      if (!row) return undefined;
      if (type !== 'occurrence') {
        row.parentVisible = Boolean(db.prepare("SELECT 1 FROM occurrences WHERE id=? AND visibility='visible'").get(row.occurrenceId));
      }
      if (type === 'attachment' && row.contributionId) {
        row.parentVisible &&= Boolean(db.prepare("SELECT 1 FROM contributions WHERE id=? AND visibility='visible'").get(row.contributionId));
      }
      return row;
    },
    related(leftId,rightId) {
      const pair = [leftId,rightId].sort();
      return Boolean(db.prepare('SELECT 1 FROM occurrence_relations WHERE leftId=? AND rightId=?').get(...pair));
    },
    history(id, page, pageSize) {
      const total = db.prepare("SELECT count(*) AS total FROM events WHERE occurrenceId=? AND entityType<>'report'").get(id).total;
      const rows = db.prepare(`SELECT e.id,e.action,e.createdAt,u.username,e.reason FROM events e
        LEFT JOIN users u ON u.id=e.actorId WHERE e.occurrenceId=? AND e.entityType<>'report'
        ORDER BY e.createdAt ASC,e.id ASC LIMIT ? OFFSET ?`).all(id,pageSize,(page - 1) * pageSize);
      return {rows,total};
    }
  };
}
