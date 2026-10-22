/**
 * Persistência: conexão, migrações SQL, consultas e armazenamento privado de imagens.
 * Edite este arquivo diretamente. Guia: apoio/documentacao/ESTRUTURA.md.
 *
 * 1. Conexão SQLite
 * 2. Migrações numeradas do banco
 * 3. Identificadores sequenciais
 * 4. SQL: Administração e denúncias
 * 5. SQL: Imagens e anexos
 * 6. SQL: Cadastro e sessão
 * 7. SQL: Comentários, complementos e pedidos
 * 8. SQL: Autenticação Google
 * 9. SQL: Duplicatas e relações
 * 10. SQL: Criação e edição de ocorrências
 * 11. SQL: Consulta de ocorrências
 * 12. SQL: Apoios e contestações
 * 13. SQL: Mudanças de estado
 * 14. Arquivos privados das imagens
 */
import Database from "better-sqlite3";
import { closeSync, constants, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, readlinkSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

// ── Conexão SQLite ──
export const defaultDatabasePath = resolve(import.meta.dirname, "../../data/cuidacao.sqlite");
function ensureDatabaseDirectory(filename) {
	const directory = dirname(resolve(filename));
	try {
		const stats = lstatSync(directory);
		if (stats.isSymbolicLink()) {
			const target = resolve(dirname(directory), readlinkSync(directory));
			if (!existsSync(target)) {
				unlinkSync(directory);
			} else {
				return;
			}
		}
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	mkdirSync(directory, {
		recursive: true,
		mode: 0o700
	});
}
export function openDatabase(filename = defaultDatabasePath) {
	if (filename !== ":memory:") ensureDatabaseDirectory(filename);
	const db = new Database(filename);
	try {
		db.pragma("foreign_keys = ON");
		db.pragma("journal_mode = WAL");
		return db;
	} catch (error) {
		db.close();
		throw error;
	}
}

// ── Migrações numeradas do banco ──
/** Migrações imutáveis: não editar SQL de uma versão já aplicada. */
export const migrations = [
	{
		name: "001_initial.sql",
		version: 1,
		sql: `CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL UNIQUE CHECK(length(username) BETWEEN 3 AND 30 AND username NOT GLOB '*[^a-z0-9_]*'),
  passwordHash TEXT NOT NULL, passwordSalt TEXT NOT NULL,
  passwordParams TEXT NOT NULL CHECK(json_valid(passwordParams)),
  role TEXT NOT NULL CHECK(role IN ('user','admin')),
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
) STRICT;
CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL, userId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  tokenHash TEXT NOT NULL UNIQUE, expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
) STRICT;
CREATE INDEX sessions_expiry ON sessions(expiresAt);
CREATE TABLE occurrence_sequence (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1), nextValue INTEGER NOT NULL CHECK(nextValue>=1)
) STRICT;
INSERT INTO occurrence_sequence VALUES (1,1);
CREATE TABLE occurrences (
  id TEXT PRIMARY KEY NOT NULL,
  authorId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 5 AND 100),
  description TEXT NOT NULL CHECK(length(trim(description)) BETWEEN 20 AND 3000),
  category TEXT NOT NULL CHECK(category IN ('residuos','agua')),
  latitude REAL NOT NULL CHECK(latitude BETWEEN -23.9500 AND -23.9250),
  longitude REAL NOT NULL CHECK(longitude BETWEEN -46.1950 AND -46.1650),
  locationLabel TEXT CHECK(locationLabel IS NULL OR length(locationLabel)<=120),
  status TEXT NOT NULL CHECK(status IN ('received','community_review','confirmed','monitoring','closed','discarded')),
  simulated INTEGER NOT NULL CHECK(simulated=1),
  visibility TEXT NOT NULL CHECK(visibility IN ('visible','hidden')),
  version INTEGER NOT NULL CHECK(version>=1),
  duplicateOfId TEXT REFERENCES occurrences(id) ON DELETE RESTRICT CHECK(duplicateOfId IS NULL OR duplicateOfId<>id),
  closureReason TEXT, discardReason TEXT,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
  CHECK((status='closed' AND closureReason IS 'resolved') OR (status<>'closed' AND closureReason IS NULL)),
  CHECK((status='discarded' AND discardReason IS NOT NULL AND discardReason IN ('invalid','out_of_scope')) OR (status<>'discarded' AND discardReason IS NULL))
) STRICT;
CREATE INDEX occurrences_filter ON occurrences(status,category,createdAt,id);
CREATE INDEX occurrences_duplicate ON occurrences(duplicateOfId);
CREATE TABLE contributions (
  id TEXT PRIMARY KEY NOT NULL, occurrenceId TEXT NOT NULL REFERENCES occurrences(id) ON DELETE RESTRICT,
  authorId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK(type IN ('comment','supplement','reopen_request')),
  kind TEXT, text TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK(visibility IN ('visible','hidden')), requestStatus TEXT,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
  UNIQUE(id,occurrenceId),
  CHECK((type='supplement' AND kind IS NOT NULL AND kind IN ('observation','resolution')) OR (type<>'supplement' AND kind IS NULL)),
  CHECK((type='reopen_request' AND requestStatus IS NOT NULL AND requestStatus IN ('pending','accepted','rejected','superseded')) OR (type<>'reopen_request' AND requestStatus IS NULL)),
  CHECK((type='comment' AND length(trim(text)) BETWEEN 1 AND 2000) OR (type<>'comment' AND length(trim(text)) BETWEEN 20 AND 3000))
) STRICT;
CREATE INDEX contributions_timeline ON contributions(occurrenceId,createdAt,id);
CREATE UNIQUE INDEX contributions_pending ON contributions(occurrenceId,authorId) WHERE type='reopen_request' AND requestStatus='pending';
CREATE TABLE stances (
  id TEXT PRIMARY KEY NOT NULL, occurrenceId TEXT NOT NULL REFERENCES occurrences(id) ON DELETE RESTRICT,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK(type IN ('support','contest')),
  reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 20 AND 1000),
  active INTEGER NOT NULL CHECK(active IN (0,1)),
  visibility TEXT NOT NULL CHECK(visibility IN ('visible','hidden')),
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, UNIQUE(occurrenceId,userId)
) STRICT;
CREATE TABLE attachments (
  id TEXT PRIMARY KEY NOT NULL, occurrenceId TEXT NOT NULL REFERENCES occurrences(id) ON DELETE RESTRICT,
  contributionId TEXT, uploaderId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  storageKey TEXT NOT NULL UNIQUE, mediaType TEXT NOT NULL CHECK(mediaType IN ('image/jpeg','image/png','image/webp')),
  byteSize INTEGER NOT NULL CHECK(byteSize BETWEEN 1 AND 5242880),
  width INTEGER NOT NULL CHECK(width>0), height INTEGER NOT NULL CHECK(height>0),
  caption TEXT NOT NULL CHECK(length(trim(caption)) BETWEEN 5 AND 200),
  visibility TEXT NOT NULL CHECK(visibility IN ('visible','hidden')), withdrawnAt TEXT,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
  CHECK(width*height<=20000000),
  FOREIGN KEY(contributionId,occurrenceId) REFERENCES contributions(id,occurrenceId) ON DELETE RESTRICT
) STRICT;
CREATE TABLE occurrence_relations (
  leftId TEXT NOT NULL REFERENCES occurrences(id) ON DELETE RESTRICT,
  rightId TEXT NOT NULL REFERENCES occurrences(id) ON DELETE RESTRICT,
  createdBy TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 20 AND 1000),
  createdAt TEXT NOT NULL, PRIMARY KEY(leftId,rightId), CHECK(leftId<rightId)
) STRICT;
CREATE TABLE reports (
  id TEXT PRIMARY KEY NOT NULL, occurrenceId TEXT NOT NULL REFERENCES occurrences(id) ON DELETE RESTRICT,
  reporterId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  targetType TEXT NOT NULL CHECK(targetType IN ('occurrence','contribution','attachment','stance')), targetId TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 20 AND 1000),
  status TEXT NOT NULL CHECK(status IN ('pending','dismissed','upheld')),
  reviewerId TEXT REFERENCES users(id) ON DELETE RESTRICT,
  decisionReason TEXT, decidedAt TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
  CHECK((status='pending' AND reviewerId IS NULL AND decisionReason IS NULL AND decidedAt IS NULL) OR
    (status<>'pending' AND reviewerId IS NOT NULL AND decisionReason IS NOT NULL AND length(trim(decisionReason)) BETWEEN 20 AND 1000 AND decidedAt IS NOT NULL))
) STRICT;
CREATE UNIQUE INDEX reports_pending ON reports(reporterId,targetType,targetId) WHERE status='pending';
CREATE INDEX reports_queue ON reports(status,createdAt);
CREATE TABLE events (
  id TEXT PRIMARY KEY NOT NULL, occurrenceId TEXT NOT NULL REFERENCES occurrences(id) ON DELETE RESTRICT,
  entityType TEXT NOT NULL CHECK(entityType IN ('occurrence','contribution','stance','attachment','report','relation')),
  entityId TEXT NOT NULL, actorId TEXT REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL, reason TEXT,
  beforeJson TEXT CHECK(beforeJson IS NULL OR json_valid(beforeJson)),
  afterJson TEXT CHECK(afterJson IS NULL OR json_valid(afterJson)),
  referencesJson TEXT NOT NULL CHECK(json_valid(referencesJson)), correlationId TEXT,
  createdAt TEXT NOT NULL
) STRICT;
CREATE INDEX events_timeline ON events(occurrenceId,createdAt,id);
CREATE TRIGGER events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'Eventos são imutáveis'); END;
CREATE TRIGGER events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'Eventos são imutáveis'); END;
`
	},
	{
		name: "002_relations_reverse_index.sql",
		version: 2,
		sql: `-- Symmetric relation lookup also traverses the right endpoint.
CREATE INDEX occurrence_relations_reverse ON occurrence_relations(rightId,leftId);
`
	},
	{
		name: "003_google_identity.sql",
		version: 3,
		sql: `-- Rebuild only users to allow genuinely absent password credentials.
-- migrate() disables FK enforcement outside this atomic transaction and checks
-- all retained references before committing; no existing values are changed.
CREATE TABLE users_google_migration (
 id TEXT PRIMARY KEY NOT NULL,
 username TEXT NOT NULL UNIQUE CHECK(length(username) BETWEEN 3 AND 30 AND username NOT GLOB '*[^a-z0-9_]*'),
 passwordHash TEXT, passwordSalt TEXT,
 passwordParams TEXT CHECK(passwordParams IS NULL OR json_valid(passwordParams)),
 role TEXT NOT NULL CHECK(role IN ('user','admin')),
 createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
 CHECK((passwordHash IS NULL AND passwordSalt IS NULL AND passwordParams IS NULL) OR
       (passwordHash IS NOT NULL AND passwordSalt IS NOT NULL AND passwordParams IS NOT NULL))
) STRICT;
INSERT INTO users_google_migration SELECT * FROM users;
DROP TABLE users;
ALTER TABLE users_google_migration RENAME TO users;
CREATE TABLE google_identities (
 provider TEXT NOT NULL CHECK(provider='google'), subject TEXT NOT NULL CHECK(length(subject) BETWEEN 1 AND 255),
 userId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, createdAt TEXT NOT NULL,
 PRIMARY KEY(provider,subject), UNIQUE(userId,provider)
) STRICT;
CREATE TABLE google_flows (
 tokenHash TEXT PRIMARY KEY NOT NULL, nonce TEXT NOT NULL, subject TEXT,
 expiresAt TEXT NOT NULL
) STRICT;
CREATE INDEX google_flows_expiry ON google_flows(expiresAt);
`
	},
	{
		name: "004_environmental_representation.sql",
		version: 4,
		sql: `-- Optional, validated GeoJSON presentation metadata; null keeps the pin-only fallback.
ALTER TABLE occurrences ADD COLUMN environmentalRepresentationJson TEXT
  CHECK(environmentalRepresentationJson IS NULL OR json_valid(environmentalRepresentationJson));
`
	},
	{
		name: "005_exploration_preferences.sql",
		version: 5,
		sql: `-- Private map subscriptions, saved public queries and notification read state.
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK(kind IN ('occurrence','place','area')),
  occurrenceId TEXT REFERENCES occurrences(id) ON DELETE RESTRICT,
  label TEXT NOT NULL CHECK(length(trim(label)) BETWEEN 3 AND 120),
  geometryJson TEXT CHECK(geometryJson IS NULL OR json_valid(geometryJson)),
  radiusMeters INTEGER CHECK(radiusMeters IS NULL OR radiusMeters=500),
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
  CHECK((kind='occurrence' AND occurrenceId IS NOT NULL AND geometryJson IS NULL AND radiusMeters IS NULL) OR
        (kind='place' AND occurrenceId IS NULL AND geometryJson IS NOT NULL AND radiusMeters=500) OR
        (kind='area' AND occurrenceId IS NULL AND geometryJson IS NOT NULL AND radiusMeters IS NULL))
) STRICT;
CREATE INDEX subscriptions_user ON subscriptions(userId,createdAt,id);
CREATE TABLE saved_queries (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 3 AND 60),
  queryJson TEXT NOT NULL CHECK(json_valid(queryJson)),
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
) STRICT;
CREATE INDEX saved_queries_user ON saved_queries(userId,createdAt,id);
CREATE TABLE notification_reads (
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  eventId TEXT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  readAt TEXT NOT NULL,
  PRIMARY KEY(userId,eventId)
) STRICT;
`
	},
	{
		name: "006_firebase_identity.sql",
		version: 6,
		sql: `-- Firebase Auth is an identity provider; the local session remains authoritative.
CREATE TABLE firebase_identities (
 uid TEXT PRIMARY KEY NOT NULL CHECK(length(uid) BETWEEN 1 AND 128),
 userId TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
 createdAt TEXT NOT NULL
) STRICT;
CREATE TABLE firebase_flows (
 tokenHash TEXT PRIMARY KEY NOT NULL,
 uid TEXT CHECK(uid IS NULL OR length(uid) BETWEEN 1 AND 128),
 expiresAt TEXT NOT NULL
) STRICT;
CREATE INDEX firebase_flows_expiry ON firebase_flows(expiresAt);
`
	},
	{
		name: "007_account_email.sql", version: 7,
		sql: `ALTER TABLE users ADD COLUMN email TEXT;
CREATE UNIQUE INDEX users_email_unique ON users(email) WHERE email IS NOT NULL;
ALTER TABLE users ADD COLUMN emailVerifiedAt TEXT;
CREATE TABLE account_tokens (
 tokenHash TEXT PRIMARY KEY NOT NULL,
 userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose TEXT NOT NULL CHECK(purpose IN ('reset','verify')),
 expiresAt TEXT NOT NULL
) STRICT;
CREATE INDEX account_tokens_expiry ON account_tokens(expiresAt);`
	}
];
export function migrate(db) {
	/** Read trusted, versioned SQL only; values in application queries are bound. */
	const files = migrations.map((entry) => entry.name);
	const versions = files.map((name) => Number(name.slice(0, 3)));
	if (new Set(versions).size !== versions.length) throw new Error("Versões de migração repetidas.");
	if (db.inTransaction) throw new Error("Migração exige conexão fora de transação.");
	const foreignKeys = db.pragma("foreign_keys", { simple: true });
	db.pragma("foreign_keys = OFF");
	try {
		return db.transaction(() => {
			db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, appliedAt TEXT NOT NULL) STRICT");
			const applied = new Set(db.prepare("SELECT version FROM schema_migrations").all().map((row) => row.version));
			if ([...applied].some((version) => !versions.includes(version))) throw new Error("Banco tem migração desconhecida; nenhuma alteração aplicada.");
			const added = [];
			for (const [index, file] of files.entries()) {
				const version = versions[index];
				if (applied.has(version)) continue;
				if ([...applied].some((previous) => previous > version)) throw new Error("Migração fora de ordem.");
				db.exec(migrations[index].sql);
				db.prepare("INSERT INTO schema_migrations (version,appliedAt) VALUES (?,?)").run(version, new Date().toISOString());
				added.push(version);
			}
			if (db.pragma("foreign_key_check").length) throw new Error("Migração rejeitada: referências inconsistentes.");
			return added;
		}).immediate();
	} finally {
		db.pragma(`foreign_keys = ${foreignKeys ? "ON" : "OFF"}`);
	}
}

// ── Identificadores sequenciais ──
export function nextOccurrenceId(db) {
	if (!db.inTransaction) throw new Error("A sequência exige transação.");
	const { nextValue } = db.prepare("UPDATE occurrence_sequence SET nextValue=nextValue+1 WHERE singleton=1 RETURNING nextValue-1 AS nextValue").get();
	return `CA-${String(nextValue).padStart(6, "0")}`;
}

// ── SQL: Administração e denúncias ──
const tables = {
	occurrence: "occurrences",
	contribution: "contributions",
	attachment: "attachments",
	stance: "stances"
};
export function administrationRepository(db) {
	const target = (type, id) => Object.hasOwn(tables, type) ? db.prepare(`SELECT * FROM ${tables[type]} WHERE id=?`).get(id) : undefined;
	return {
		stances(id, page, pageSize) {
			return {
				total: db.prepare("SELECT count(*) n FROM stances WHERE occurrenceId=?").get(id).n,
				rows: db.prepare("SELECT s.*,u.username FROM stances s JOIN users u ON u.id=s.userId WHERE occurrenceId=? ORDER BY createdAt,id LIMIT ? OFFSET ?").all(id, pageSize, (page - 1) * pageSize)
			};
		},
		target,
		occurrence: (id) => target("occurrence", id),
		role: (id) => db.prepare("SELECT role FROM users WHERE id=?").get(id)?.role,
		setVisibility(type, id, visibility, date) {
			db.prepare(`UPDATE ${tables[type]} SET visibility=?,updatedAt=? WHERE id=?`).run(visibility, date, id);
		},
		correct(id, values) {
			db.prepare("UPDATE occurrences SET title=@title,description=@description,category=@category,latitude=@latitude,longitude=@longitude,locationLabel=@locationLabel,environmentalRepresentationJson=@environmentalRepresentationJson WHERE id=@id").run({
				environmentalRepresentationJson: null,
				...values,
				id
			});
		},
		report: (id) => db.prepare("SELECT * FROM reports WHERE id=?").get(id),
		pending: (user, type, id) => db.prepare("SELECT 1 FROM reports WHERE reporterId=? AND targetType=? AND targetId=? AND status='pending'").get(user, type, id),
		insertReport(row) {
			db.prepare("INSERT INTO reports(id,occurrenceId,reporterId,targetType,targetId,reason,status,createdAt,updatedAt) VALUES (@id,@occurrenceId,@reporterId,@targetType,@targetId,@reason,'pending',@createdAt,@updatedAt)").run(row);
		},
		decide(id, user, decision, reason, date) {
			db.prepare("UPDATE reports SET status=?,reviewerId=?,decisionReason=?,decidedAt=?,updatedAt=? WHERE id=?").run(decision, user, reason, date, date, id);
		},
		reject(id, date) {
			db.prepare("UPDATE contributions SET requestStatus='rejected',updatedAt=? WHERE id=?").run(date, id);
		},
		reports(user, { status, page, pageSize }) {
			const clauses = [], args = [];
			if (user.role !== "admin") {
				clauses.push("reporterId=?");
				args.push(user.id);
			}
			if (status) {
				clauses.push("status=?");
				args.push(status);
			}
			const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
			return {
				total: db.prepare(`SELECT count(*) n FROM reports ${where}`).get(...args).n,
				rows: db.prepare(`SELECT * FROM reports ${where} ORDER BY createdAt,id LIMIT ? OFFSET ?`).all(...args, pageSize, (page - 1) * pageSize)
			};
		},
		reopenRequests({ page, pageSize }) {
			return {
				total: db.prepare("SELECT count(*) n FROM contributions WHERE type='reopen_request' AND requestStatus='pending'").get().n,
				rows: db.prepare("SELECT c.id,c.occurrenceId,c.authorId,u.username,c.text,c.visibility,c.requestStatus,c.createdAt,c.updatedAt,o.version AS occurrenceVersion,o.visibility AS occurrenceVisibility,o.status AS occurrenceStatus,o.duplicateOfId FROM contributions c JOIN users u ON u.id=c.authorId JOIN occurrences o ON o.id=c.occurrenceId WHERE c.type='reopen_request' AND c.requestStatus='pending' ORDER BY c.createdAt,c.id LIMIT ? OFFSET ?").all(pageSize, (page - 1) * pageSize)
			};
		}
	};
}

// ── SQL: Preferências privadas de exploração ──
export function preferenceRepository(db) {
	const subscriptionColumns = "id,userId,kind,occurrenceId,label,geometryJson,radiusMeters,createdAt,updatedAt";
	return {
		occurrence: (id) => db.prepare("SELECT id,title,latitude,longitude,visibility FROM occurrences WHERE id=?").get(id),
		listSubscriptions(userId) {
			return db.prepare(`SELECT ${subscriptionColumns} FROM subscriptions WHERE userId=? ORDER BY createdAt,id`).all(userId);
		},
		insertSubscription(row) {
			db.prepare(`INSERT INTO subscriptions (${subscriptionColumns}) VALUES (@id,@userId,@kind,@occurrenceId,@label,@geometryJson,@radiusMeters,@createdAt,@updatedAt)`).run(row);
		},
		deleteSubscription(userId, id) {
			return db.prepare("DELETE FROM subscriptions WHERE id=? AND userId=?").run(id, userId).changes;
		},
		countQueries(userId) {
			return db.prepare("SELECT count(*) AS total FROM saved_queries WHERE userId=?").get(userId).total;
		},
		listQueries(userId) {
			return db.prepare("SELECT id,userId,name,queryJson,createdAt,updatedAt FROM saved_queries WHERE userId=? ORDER BY createdAt,id").all(userId);
		},
		insertQuery(row) {
			db.prepare("INSERT INTO saved_queries(id,userId,name,queryJson,createdAt,updatedAt) VALUES (@id,@userId,@name,@queryJson,@createdAt,@updatedAt)").run(row);
		},
		deleteQuery(userId, id) {
			return db.prepare("DELETE FROM saved_queries WHERE id=? AND userId=?").run(id, userId).changes;
		},
		notificationCandidates(userId) {
			return db.prepare(`SELECT s.id AS subscriptionId,s.kind,s.label,s.geometryJson,s.radiusMeters,s.createdAt AS subscribedAt,
			  e.id AS eventId,e.occurrenceId,e.action,e.reason,e.createdAt,o.title,o.latitude,o.longitude,o.environmentalRepresentationJson,
			  CASE WHEN nr.eventId IS NULL THEN 0 ELSE 1 END AS isRead
			FROM subscriptions s
			JOIN events e ON e.createdAt>s.createdAt AND e.entityType<>'report'
			JOIN occurrences o ON o.id=e.occurrenceId AND o.visibility='visible'
			LEFT JOIN notification_reads nr ON nr.userId=s.userId AND nr.eventId=e.id
			WHERE s.userId=? AND (s.occurrenceId IS NULL OR s.occurrenceId=e.occurrenceId)
			ORDER BY e.createdAt DESC,e.id DESC,s.id`).all(userId);
		},
		markRead(userId, eventId, readAt) {
			db.prepare("INSERT INTO notification_reads(userId,eventId,readAt) VALUES (?,?,?) ON CONFLICT(userId,eventId) DO UPDATE SET readAt=excluded.readAt").run(userId, eventId, readAt);
		}
	};
}

// ── SQL: Imagens e anexos ──
export function attachmentRepository(db) {
	return {
		occurrence: (id) => db.prepare("SELECT * FROM occurrences WHERE id=?").get(id),
		get: (id) => db.prepare("SELECT * FROM attachments WHERE id=?").get(id),
		count: (id, contributionId = null) => db.prepare("SELECT count(*) n FROM attachments WHERE occurrenceId=? AND contributionId IS ? AND withdrawnAt IS NULL").get(id, contributionId).n,
		contribution: (id) => db.prepare("SELECT * FROM contributions WHERE id=?").get(id),
		forContribution: (id) => db.prepare("SELECT * FROM attachments WHERE contributionId=? ORDER BY createdAt,id").all(id),
		list(id, page, pageSize) {
			return {
				rows: db.prepare("SELECT * FROM attachments WHERE occurrenceId=? AND contributionId IS NULL ORDER BY createdAt,id LIMIT ? OFFSET ?").all(id, pageSize, (page - 1) * pageSize),
				total: db.prepare("SELECT count(*) n FROM attachments WHERE occurrenceId=? AND contributionId IS NULL").get(id).n
			};
		},
		insert(row) {
			db.prepare(`INSERT INTO attachments (id,occurrenceId,contributionId,uploaderId,storageKey,mediaType,byteSize,width,height,caption,visibility,withdrawnAt,createdAt,updatedAt)
      VALUES (@id,@occurrenceId,@contributionId,@uploaderId,@storageKey,@mediaType,@byteSize,@width,@height,@caption,'visible',NULL,@createdAt,@updatedAt)`).run({
				...row,
				contributionId: row.contributionId ?? null
			});
		},
		withdraw(id, date) {
			db.prepare("UPDATE attachments SET withdrawnAt=?,updatedAt=? WHERE id=?").run(date, date, id);
		},
		storageKeys: () => new Set(db.prepare("SELECT storageKey FROM attachments").all().map((row) => row.storageKey))
	};
}

// ── SQL: Cadastro e sessão ──
export function authRepository(db) {
	return {
		userByUsername(username) {
			return db.prepare("SELECT id,username,role,passwordHash,passwordSalt,passwordParams FROM users WHERE username=? OR email=?").get(username, username);
		},
		createUser(user) {
			db.prepare(`INSERT INTO users (id,username,role,passwordHash,passwordSalt,passwordParams,createdAt,updatedAt,email)
  VALUES (?,?,'user',?,?,?,?,?,?)`).run(user.id, user.username, user.passwordHash, user.passwordSalt, user.passwordParams, user.createdAt, user.createdAt, user.email ?? null);
		},
		createSession(session, previousHash) {
			return db.transaction(() => {
				if (previousHash) db.prepare("DELETE FROM sessions WHERE tokenHash=?").run(previousHash);
				db.prepare("INSERT INTO sessions (id,userId,tokenHash,expiresAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?)").run(session.id, session.userId, session.tokenHash, session.expiresAt, session.createdAt, session.createdAt);
			}).immediate();
		},
		sessionUser(hash, now) {
			return db.prepare(`SELECT u.id,u.username,u.role FROM sessions s JOIN users u ON u.id=s.userId
  WHERE s.tokenHash=? AND s.expiresAt>?`).get(hash, now);
		},
		revoke(hash) {
			db.prepare("DELETE FROM sessions WHERE tokenHash=?").run(hash);
		}
	};
}

// ── SQL: Comentários, complementos e pedidos ──
export function contributionRepository(db) {
	const get = (id) => db.prepare("SELECT c.*,u.username FROM contributions c JOIN users u ON u.id=c.authorId WHERE c.id=?").get(id);
	return {
		get,
		pending: (occurrenceId, authorId) => db.prepare("SELECT 1 FROM contributions WHERE occurrenceId=? AND authorId=? AND type='reopen_request' AND requestStatus='pending'").get(occurrenceId, authorId),
		occurrence: (id) => db.prepare("SELECT * FROM occurrences WHERE id=?").get(id),
		list(id, page, pageSize) {
			return {
				rows: db.prepare("SELECT c.*,u.username FROM contributions c JOIN users u ON u.id=c.authorId WHERE c.occurrenceId=? AND c.type IN ('comment','supplement','reopen_request') ORDER BY c.createdAt,c.id LIMIT ? OFFSET ?").all(id, pageSize, (page - 1) * pageSize),
				total: db.prepare("SELECT count(*) n FROM contributions WHERE occurrenceId=? AND type IN ('comment','supplement','reopen_request')").get(id).n
			};
		},
		insert(row) {
			db.prepare(`INSERT INTO contributions(id,occurrenceId,authorId,type,kind,text,visibility,requestStatus,createdAt,updatedAt)
      VALUES (@id,@occurrenceId,@authorId,@type,@kind,@text,'visible',@requestStatus,@createdAt,@updatedAt)`).run(row);
		},
		edit(id, text, date) {
			db.prepare("UPDATE contributions SET text=?,updatedAt=? WHERE id=?").run(text, date, id);
		}
	};
}

// ── SQL: Autenticação Google ──
export function googleRepository(db) {
	return {
		user(subject) {
			return db.prepare("SELECT u.id,u.username,u.role FROM google_identities i JOIN users u ON u.id=i.userId WHERE i.provider='google' AND i.subject=?").get(subject);
		},
		flow(hash) {
			return db.prepare("SELECT * FROM google_flows WHERE tokenHash=?").get(hash);
		},
		remove(hash) {
			db.prepare("DELETE FROM google_flows WHERE tokenHash=?").run(hash);
		},
		prune(now) {
			db.prepare("DELETE FROM google_flows WHERE expiresAt<=?").run(now);
		},
		begin(flow, previous) {
			if (previous) this.remove(previous);
			db.prepare("INSERT INTO google_flows (tokenHash,nonce,subject,expiresAt) VALUES (?,?,NULL,?)").run(flow.tokenHash, flow.nonce, flow.expiresAt);
		},
		verified(hash, subject) {
			db.prepare("UPDATE google_flows SET subject=? WHERE tokenHash=?").run(subject, hash);
		},
		create(user, subject, date) {
			db.prepare("INSERT INTO users (id,username,role,createdAt,updatedAt) VALUES (?,?,'user',?,?)").run(user.id, user.username, date, date);
			db.prepare("INSERT INTO google_identities VALUES ('google',?,?,?)").run(subject, user.id, date);
		},
		transaction(operation) {
			return db.transaction(operation).immediate();
		}
	};
}

// ── SQL: Autenticação Firebase ──
export function firebaseIdentityRepository(db) {
	return {
		user(uid) {
			return db.prepare("SELECT u.id,u.username,u.role FROM firebase_identities i JOIN users u ON u.id=i.userId WHERE i.uid=?").get(uid);
		},
		flow(hash) {
			return db.prepare("SELECT * FROM firebase_flows WHERE tokenHash=?").get(hash);
		},
		remove(hash) {
			db.prepare("DELETE FROM firebase_flows WHERE tokenHash=?").run(hash);
		},
		prune(now) {
			db.prepare("DELETE FROM firebase_flows WHERE expiresAt<=?").run(now);
		},
		verified(flow, previous) {
			if (previous) this.remove(previous);
			db.prepare("INSERT INTO firebase_flows(tokenHash,uid,expiresAt) VALUES (?,?,?)").run(flow.tokenHash, flow.uid, flow.expiresAt);
		},
		create(user, uid, date) {
			db.prepare("INSERT INTO users (id,username,role,createdAt,updatedAt) VALUES (?,?,'user',?,?)").run(user.id, user.username, date, date);
			db.prepare("INSERT INTO firebase_identities(uid,userId,createdAt) VALUES (?,?,?)").run(uid, user.id, date);
		},
		transaction(operation) {
			return db.transaction(operation).immediate();
		}
	};
}

// ── SQL: Duplicatas e relações ──
export function linkRepository(db) {
	const pair = (a, b) => [a, b].sort();
	return {
		occurrence: (id) => db.prepare("SELECT * FROM occurrences WHERE id=?").get(id),
		admin: (id) => db.prepare("SELECT 1 FROM users WHERE id=? AND role='admin'").get(id),
		duplicates: (id) => db.prepare("SELECT * FROM occurrences WHERE duplicateOfId=? ORDER BY createdAt,id").all(id),
		relations: (id) => db.prepare("SELECT o.* FROM occurrence_relations r JOIN occurrences o ON o.id=CASE WHEN r.leftId=? THEN r.rightId ELSE r.leftId END WHERE r.leftId=? OR r.rightId=? ORDER BY o.createdAt,o.id").all(id, id, id),
		related: (a, b) => db.prepare("SELECT * FROM occurrence_relations WHERE leftId=? AND rightId=?").get(...pair(a, b)),
		duplicate: (id, principal) => db.prepare("UPDATE occurrences SET duplicateOfId=? WHERE id=?").run(principal, id),
		addRelation: (a, b, actor, reason, date) => db.prepare("INSERT INTO occurrence_relations VALUES (?,?,?,?,?)").run(...pair(a, b), actor, reason, date),
		removeRelation: (a, b) => db.prepare("DELETE FROM occurrence_relations WHERE leftId=? AND rightId=?").run(...pair(a, b))
	};
}

// ── SQL: Criação e edição de ocorrências ──
export function occurrenceWriteRepository(db) {
	return {
		get: (id) => db.prepare("SELECT * FROM occurrences WHERE id=?").get(id),
		insert(row) {
			db.prepare(`INSERT INTO occurrences (id,authorId,title,description,category,latitude,longitude,locationLabel,environmentalRepresentationJson,status,simulated,visibility,version,createdAt,updatedAt)
			VALUES (@id,@authorId,@title,@description,@category,@latitude,@longitude,@locationLabel,@environmentalRepresentationJson,'received',1,'visible',1,@createdAt,@updatedAt)`).run(row);
		},
		update(id, row) {
			db.prepare(`UPDATE occurrences SET title=@title,description=@description,category=@category,latitude=@latitude,longitude=@longitude,locationLabel=@locationLabel WHERE id=@id`).run({
				...row,
				id
			});
		}
	};
}

// ── SQL: Consulta de ocorrências ──
/** Seleciona somente colunas públicas. Filtros e paginação usam parâmetros vinculados. */
const columns = `id,authorId,title,description,category,latitude,longitude,locationLabel,environmentalRepresentationJson,
  status,simulated,version,duplicateOfId,closureReason,discardReason,createdAt,updatedAt`;
export function occurrenceRepository(db) {
	return {
		list({ category, status, includeDuplicates, includeHidden, visibility, page, pageSize }) {
			const clauses = includeHidden ? [] : ["visibility='visible'"];
			const values = [];
			if (includeHidden && visibility) {
				clauses.push("visibility=?");
				values.push(visibility);
			}
			if (!includeDuplicates) clauses.push("duplicateOfId IS NULL");
			if (category !== undefined) {
				clauses.push("category=?");
				values.push(category);
			}
			if (status !== undefined) {
				clauses.push("status=?");
				values.push(status);
			}
			const where = clauses.length ? clauses.join(" AND ") : "1=1";
			const total = db.prepare(`SELECT count(*) AS total FROM occurrences WHERE ${where}`).get(...values).total;
			const rows = db.prepare(`SELECT ${columns}${includeHidden ? ",visibility" : ""} FROM occurrences WHERE ${where}
        ORDER BY createdAt DESC,id DESC LIMIT ? OFFSET ?`).all(...values, pageSize, (page - 1) * pageSize);
			return {
				rows,
				total
			};
		},
		visible(id) {
			return db.prepare(`SELECT ${columns} FROM occurrences WHERE id=? AND visibility='visible'`).get(id);
		},
		counts(id) {
			const counts = {
				support: 0,
				contest: 0
			};
			for (const row of db.prepare(`SELECT type,count(*) AS total FROM stances
        WHERE occurrenceId=? AND active=1 AND visibility='visible' GROUP BY type`).all(id)) counts[row.type] = row.total;
			return counts;
		},
		decisionReferences(id) {
			return db.prepare(`SELECT referencesJson FROM events WHERE occurrenceId=?
        AND entityType='occurrence' AND action='transition' ORDER BY createdAt,id`).all(id);
		},
		reference(type, id) {
			const tables = {
				stance: "stances",
				contribution: "contributions",
				occurrence: "occurrences",
				attachment: "attachments"
			};
			if (!Object.hasOwn(tables, type)) return undefined;
			/** Table names are a fixed internal allowlist, never interpolated caller input. */
			const row = db.prepare(`SELECT * FROM ${tables[type]} WHERE id=?`).get(id);
			if (!row) return undefined;
			if (type !== "occurrence") {
				row.parentVisible = Boolean(db.prepare("SELECT 1 FROM occurrences WHERE id=? AND visibility='visible'").get(row.occurrenceId));
			}
			if (type === "attachment" && row.contributionId) {
				row.parentVisible &&= Boolean(db.prepare("SELECT 1 FROM contributions WHERE id=? AND visibility='visible'").get(row.contributionId));
			}
			return row;
		},
		latestClosure(id) {
			return db.prepare(`SELECT e.id,e.reason,e.createdAt,e.referencesJson,u.username FROM events e
        LEFT JOIN users u ON u.id=e.actorId WHERE e.occurrenceId=? AND e.entityType='occurrence'
        AND e.action='transition' AND json_extract(e.afterJson,'$.status')='closed'
        ORDER BY json_extract(e.afterJson,'$.version') DESC,e.createdAt DESC,e.id DESC LIMIT 1`).get(id);
		},
		resolution(id, occurrenceId) {
			return db.prepare(`SELECT c.id,c.type,c.kind,c.visibility,c.text,c.createdAt,u.username FROM contributions c
        JOIN users u ON u.id=c.authorId WHERE c.id=? AND c.occurrenceId=?`).get(id, occurrenceId);
		},
		related(leftId, rightId) {
			const pair = [leftId, rightId].sort();
			return Boolean(db.prepare("SELECT 1 FROM occurrence_relations WHERE leftId=? AND rightId=?").get(...pair));
		},
		history(id, page, pageSize, audit = false) {
			const total = db.prepare("SELECT count(*) AS total FROM events WHERE occurrenceId=? AND entityType<>'report'").get(id).total;
			const rows = db.prepare(`SELECT e.id,e.action,e.createdAt,u.username,e.reason,${audit ? "e.entityType,e.entityId,e.actorId,e.beforeJson,e.afterJson,e.referencesJson,e.correlationId," : ""}
        CASE WHEN e.entityType='occurrence' AND e.action='transition' THEN json_extract(e.beforeJson,'$.status') END AS fromStatus,
        CASE WHEN e.entityType='occurrence' AND e.action='transition' THEN json_extract(e.afterJson,'$.status') END AS toStatus FROM events e
        LEFT JOIN users u ON u.id=e.actorId WHERE e.occurrenceId=? AND e.entityType<>'report'
        ORDER BY e.createdAt ASC,e.id ASC LIMIT ? OFFSET ?`).all(id, pageSize, (page - 1) * pageSize);
			return {
				rows,
				total
			};
		}
	};
}

// ── SQL: Apoios e contestações ──
export function stanceRepository(db) {
	const joined = "SELECT s.*,u.username FROM stances s JOIN users u ON u.id=s.userId";
	return {
		occurrence: (id) => db.prepare("SELECT * FROM occurrences WHERE id=?").get(id),
		own: (id, userId) => db.prepare(joined + " WHERE s.occurrenceId=? AND s.userId=?").get(id, userId),
		list(id, page, pageSize) {
			return {
				total: db.prepare("SELECT count(*) n FROM stances WHERE occurrenceId=? AND active=1").get(id).n,
				rows: db.prepare(joined + " WHERE s.occurrenceId=? AND s.active=1 ORDER BY s.createdAt,s.id LIMIT ? OFFSET ?").all(id, pageSize, (page - 1) * pageSize)
			};
		},
		insert(row) {
			db.prepare(`INSERT INTO stances(id,occurrenceId,userId,type,reason,active,visibility,createdAt,updatedAt) VALUES (@id,@occurrenceId,@userId,@type,@reason,1,'visible',@createdAt,@updatedAt)`).run(row);
		},
		replace(id, type, reason, date) {
			db.prepare("UPDATE stances SET type=?,reason=?,active=1,updatedAt=? WHERE id=?").run(type, reason, date, id);
		},
		withdraw(id, date) {
			db.prepare("UPDATE stances SET active=0,updatedAt=? WHERE id=?").run(date, id);
		}
	};
}

// ── SQL: Mudanças de estado ──
export function transitionRepository(db) {
	return {
		occurrence: (id) => db.prepare("SELECT * FROM occurrences WHERE id=?").get(id),
		role: (id) => db.prepare("SELECT role FROM users WHERE id=?").get(id)?.role,
		stance: (id) => db.prepare("SELECT * FROM stances WHERE id=?").get(id),
		contribution: (id) => db.prepare("SELECT * FROM contributions WHERE id=?").get(id),
		contests: (id) => db.prepare("SELECT * FROM stances WHERE occurrenceId=? AND type='contest' AND active=1 AND visibility='visible' ORDER BY createdAt,id").all(id),
		related(a, b) {
			const [left, right] = [a, b].sort();
			return !!db.prepare("SELECT 1 FROM occurrence_relations WHERE leftId=? AND rightId=?").get(left, right);
		},
		pending: (id) => db.prepare("SELECT * FROM contributions WHERE occurrenceId=? AND type='reopen_request' AND requestStatus='pending' ORDER BY createdAt,id").all(id),
		requestStatus(id, status, date) {
			db.prepare("UPDATE contributions SET requestStatus=?,updatedAt=? WHERE id=?").run(status, date, id);
		},
		update(id, to, closureReason, discardReason) {
			db.prepare("UPDATE occurrences SET status=?,closureReason=?,discardReason=? WHERE id=?").run(to, closureReason, discardReason, id);
		}
	};
}

// ── Arquivos privados das imagens ──
const namePattern = /^[0-9a-f-]{36}\.(?:jpeg|png|webp)$/;
export function attachmentStorage(directory) {
	const root = resolve(directory), staging = join(root, ".staging");
	function directorySync(path) {
		const fd = openSync(path, "r");
		try {
			fsyncSync(fd);
		} finally {
			closeSync(fd);
		}
	}
	function remove(path) {
		try {
			unlinkSync(path);
		} catch (error) {
			if (error.code !== "ENOENT") throw error;
		}
	}
	const keyPath = (key) => {
		if (!namePattern.test(key)) throw new Error("Chave de arquivo inválida.");
		return join(root, key);
	};
	return {
		initialize(references, now = Date.now()) {
			mkdirSync(staging, {
				recursive: true,
				mode: 0o700
			});
			/** Remove somente arquivos gerados pelo projeto com mais de 24h. Não altere arquivos */
			/** referenciados, inclusive anexos retirados ou ocultos reservados para auditoria. */
			for (const [folder, pattern] of [[staging, /^[0-9a-f-]{36}\.tmp$/], [root, namePattern]]) for (const name of readdirSync(folder)) {
				if (!pattern.test(name) || folder === root && references.has(name)) continue;
				const path = join(folder, name), stat = lstatSync(path);
				if (stat.isFile() && now - stat.mtimeMs >= 864e5) remove(path);
			}
		},
		stage(buffer, format) {
			const key = `${randomUUID()}.${format}`, path = join(staging, `${randomUUID()}.tmp`);
			const fd = openSync(path, "wx", 384);
			try {
				writeFileSync(fd, buffer);
				fsyncSync(fd);
			} catch (error) {
				closeSync(fd);
				remove(path);
				throw error;
			}
			closeSync(fd);
			return {
				key,
				path
			};
		},
		publish(staged) {
			renameSync(staged.path, keyPath(staged.key));
			directorySync(root);
			directorySync(staging);
		},
		discard(staged) {
			remove(staged.path);
			remove(keyPath(staged.key));
			directorySync(root);
		},
		read(key, expectedSize) {
			const fd = openSync(keyPath(key), constants.O_RDONLY | constants.O_NOFOLLOW);
			try {
				const stat = fstatSync(fd);
				if (!stat.isFile() || stat.size !== expectedSize) throw new Error("Arquivo inconsistente.");
				return readFileSync(fd);
			} finally {
				closeSync(fd);
			}
		}
	};
}
