CREATE TABLE users (
 id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
 passwordHash TEXT NOT NULL, passwordSalt TEXT NOT NULL, passwordParams TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('user','admin')), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE TABLE sessions (
 id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 tokenHash TEXT NOT NULL UNIQUE, expiresAt TEXT NOT NULL, createdAt TEXT NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expiresAt);
CREATE TABLE occurrence_sequence (singleton INTEGER PRIMARY KEY CHECK(singleton=1), value INTEGER NOT NULL);
INSERT INTO occurrence_sequence VALUES(1,4);
CREATE TABLE occurrences (
 id TEXT PRIMARY KEY, authorId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('residuos','agua')),
 latitude REAL NOT NULL CHECK(latitude BETWEEN -23.95 AND -23.925),
 longitude REAL NOT NULL CHECK(longitude BETWEEN -46.195 AND -46.165), locationLabel TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL CHECK(status IN ('received','community_review','confirmed','monitoring','closed','discarded')),
 simulated INTEGER NOT NULL DEFAULT 1 CHECK(simulated=1),
 visibility TEXT NOT NULL DEFAULT 'visible' CHECK(visibility IN ('visible','hidden')),
 version INTEGER NOT NULL CHECK(version>=1), duplicateOfId TEXT REFERENCES occurrences(id) ON DELETE RESTRICT,
 closureReason TEXT, discardReason TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
 CHECK(duplicateOfId IS NULL OR duplicateOfId!=id)
);
CREATE INDEX occurrences_filter ON occurrences(status,category,createdAt,id);
CREATE INDEX occurrences_duplicate ON occurrences(duplicateOfId);
CREATE TABLE contributions (
 id TEXT PRIMARY KEY, occurrenceId TEXT NOT NULL REFERENCES occurrences(id) ON DELETE RESTRICT,
 authorId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 type TEXT NOT NULL CHECK(type IN ('comment','supplement','reopen_request')),
 kind TEXT CHECK(kind IN ('observation','resolution')), text TEXT NOT NULL,
 visibility TEXT NOT NULL DEFAULT 'visible' CHECK(visibility IN ('visible','hidden')),
 requestStatus TEXT CHECK(requestStatus IN ('pending','accepted','rejected','superseded')),
 createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
 CHECK((type='supplement' AND kind IS NOT NULL) OR (type!='supplement' AND kind IS NULL)),
 CHECK((type='reopen_request' AND requestStatus IS NOT NULL) OR (type!='reopen_request' AND requestStatus IS NULL))
);
CREATE INDEX contributions_order ON contributions(occurrenceId,createdAt,id);
CREATE UNIQUE INDEX contributions_pending ON contributions(occurrenceId,authorId) WHERE requestStatus='pending';
CREATE TABLE events (
 id TEXT PRIMARY KEY, occurrenceId TEXT NOT NULL REFERENCES occurrences(id) ON DELETE RESTRICT,
 entityType TEXT NOT NULL, entityId TEXT NOT NULL, actorId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 action TEXT NOT NULL, reason TEXT, beforeJson TEXT, afterJson TEXT,
 referencesJson TEXT NOT NULL DEFAULT '[]', correlationId TEXT, createdAt TEXT NOT NULL
);
CREATE INDEX events_order ON events(occurrenceId,createdAt,id);
CREATE TRIGGER events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'immutable event'); END;
CREATE TRIGGER events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'immutable event'); END;
