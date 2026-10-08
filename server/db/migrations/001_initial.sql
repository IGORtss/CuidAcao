CREATE TABLE users (
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
