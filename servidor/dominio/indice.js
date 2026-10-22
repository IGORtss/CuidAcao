/**
 * Regras do servidor: permissões, validação, autenticação e escritas auditadas.
 * Edite este arquivo diretamente. Guia: apoio/documentacao/ESTRUTURA.md.
 *
 * 1. Transações, versões e histórico
 * 2. Criação e edição de ocorrências
 * 3. Administração e denúncias
 * 4. Permissões de participação
 * 5. Imagens e anexos
 * 6. Erros de autenticação
 * 7. Permissões HTTP
 * 8. Limites de tentativas
 * 9. Proteção das senhas
 * 10. Cadastro e sessão
 * 11. Comentários, complementos e pedidos
 * 12. Verificação de identidade Google
 * 13. Autenticação Google
 * 14. Duplicatas e relações
 * 15. Consulta pública de ocorrências
 * 16. Apoios e contestações
 * 17. Mudanças de estado
 */
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { administrationRepository, attachmentRepository, authRepository, contributionRepository, firebaseIdentityRepository, googleRepository, linkRepository, nextOccurrenceId, occurrenceRepository, occurrenceWriteRepository, preferenceRepository, stanceRepository, transitionRepository } from "../dados/banco-de-dados.js";
import sharp from "sharp";
import { parseCookie, stringifySetCookie } from "cookie";
import { promisify } from "node:util";
import { OAuth2Client } from "google-auth-library";

// ── Transações, versões e histórico ──
export var VersionConflict = class extends Error {
	constructor() {
		super("Versão da ocorrência alterada.");
		this.code = "VERSION_CONFLICT";
	}
};
export function appendEvent(db, event) {
	if (!db.inTransaction) throw new Error("Evento exige transação.");
	const { occurrenceId, entityType, entityId, actorId = null, action, reason = null, before = null, after = null, references = [], correlationId = null, createdAt = new Date().toISOString() } = event;
	db.prepare(`INSERT INTO events
    (id,occurrenceId,entityType,entityId,actorId,action,reason,beforeJson,afterJson,referencesJson,correlationId,createdAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(randomUUID(), occurrenceId, entityType, entityId, actorId, action, reason, before === null ? null : JSON.stringify(before), after === null ? null : JSON.stringify(after), JSON.stringify(references), correlationId, createdAt);
}
/** Synchronous callbacks only. Authorization and entity-specific invariants belong */
/** to future use cases; this primitive provides atomicity and version comparison. */
export function domainTransaction(db, { expectedVersions = {}, mutate, createdAt = new Date().toISOString() }) {
	if (mutate?.constructor.name === "AsyncFunction") throw new Error("Mutação deve ser síncrona.");
	return db.transaction(() => {
		const ids = Object.keys(expectedVersions);
		for (const id of ids) {
			const expected = expectedVersions[id];
			if (!Number.isSafeInteger(expected) || expected < 1) throw new Error("Versão esperada inválida.");
			const row = db.prepare("SELECT version FROM occurrences WHERE id=?").get(id);
			if (!row || row.version !== expected) throw new VersionConflict();
		}
		const result = mutate();
		if (result?.then) throw new Error("Mutação deve ser síncrona.");
		if (!Array.isArray(result?.events) || result.events.length === 0) throw new Error("Mutação exige evento.");
		const eventIds = new Set(result.events.map((event) => event.occurrenceId));
		if (ids.some((id) => !eventIds.has(id))) throw new Error("Cada ocorrência alterada exige evento.");
		/** Extra ids are permitted only for creation at version 1. */
		for (const id of eventIds) {
			if (!ids.includes(id)) {
				const row = db.prepare("SELECT version FROM occurrences WHERE id=?").get(id);
				if (!row || row.version !== 1 || db.prepare("SELECT 1 FROM events WHERE occurrenceId=?").get(id)) {
					throw new Error("Alteração de ocorrência existente exige versão esperada.");
				}
			}
		}
		const versions = {};
		for (const id of ids) {
			const update = db.prepare("UPDATE occurrences SET version=version+1,updatedAt=? WHERE id=? AND version=?").run(createdAt, id, expectedVersions[id]);
			if (update.changes !== 1) throw new VersionConflict();
			versions[id] = expectedVersions[id] + 1;
		}
		const correlationId = eventIds.size > 1 ? randomUUID() : null;
		for (const event of result.events) appendEvent(db, {
			...event,
			createdAt,
			correlationId
		});
		return {
			value: result.value,
			versions
		};
	}).immediate();
}

// ── Criação e edição de ocorrências ──
export var OccurrenceError = class extends Error {
	constructor(statusCode, code, message, fields) {
		super(message);
		Object.assign(this, {
			statusCode,
			code,
			fields
		});
	}
};
const labels = {
	residuos: "Resíduos",
	agua: "Água"
};
const allowed = [
	"category",
	"description",
	"latitude",
	"longitude",
	"title",
	"locationLabel",
	"environmentalRepresentation"
];
const length = (value) => [...value].length;
const environmentalTypes = {
	water_quality: ["Point"],
	waste: ["Polygon", "MultiPolygon"],
	erosion: ["LineString", "MultiLineString"],
	apparent_sewage: ["Point"],
	flooding: ["Polygon", "MultiPolygon"],
	vegetation: ["Polygon", "MultiPolygon"]
};
const validPosition = (position) => Array.isArray(position) && position.length >= 2
	&& Number.isFinite(position[0]) && Number.isFinite(position[1])
	&& position[0] >= -180 && position[0] <= 180 && position[1] >= -90 && position[1] <= 90;
const validLine = (line) => Array.isArray(line) && line.length >= 2 && line.every(validPosition);
const validRing = (ring) => validLine(ring) && ring.length >= 4 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1];
function validEnvironmentalGeometry(geometry) {
	if (!geometry || typeof geometry !== "object") return false;
	if (geometry.type === "Point") return validPosition(geometry.coordinates);
	if (geometry.type === "LineString") return validLine(geometry.coordinates);
	if (geometry.type === "MultiLineString") return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0 && geometry.coordinates.every(validLine);
	if (geometry.type === "Polygon") return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0 && geometry.coordinates.every(validRing);
	if (geometry.type === "MultiPolygon") return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0 && geometry.coordinates.every((polygon) => Array.isArray(polygon) && polygon.length > 0 && polygon.every(validRing));
	return false;
}
function validEnvironmentalRepresentation(value) {
	if (!value || typeof value !== "object" || Array.isArray(value) || !Object.hasOwn(environmentalTypes, value.type)) return false;
	if (!validEnvironmentalGeometry(value.geometry) || !environmentalTypes[value.type].includes(value.geometry.type)) return false;
	if (!["approximate", "verified"].includes(value.accuracy)) return false;
	if (value.type === "water_quality") return value.measurement?.label === "pH" && Number.isFinite(value.measurement.value) && value.measurement.value >= 0 && value.measurement.value <= 14;
	return value.measurement === undefined;
}
const environmentalPositionCount = (geometry) => {
	if (geometry.type === "Point") return 1;
	if (geometry.type === "LineString") return geometry.coordinates.length;
	if (geometry.type === "Polygon") return geometry.coordinates.reduce((total, ring) => total + ring.length, 0);
	if (geometry.type === "MultiLineString") return geometry.coordinates.reduce((total, line) => total + line.length, 0);
	if (geometry.type === "MultiPolygon") return geometry.coordinates.reduce((total, polygon) => total + polygon.reduce((sum, ring) => sum + ring.length, 0), 0);
	return Infinity;
};
const positionInsideTerritory = ([longitude, latitude]) => longitude >= -46.195 && longitude <= -46.165 && latitude >= -23.95 && latitude <= -23.925;
const environmentalPositions = (geometry) => {
	if (geometry.type === "Point") return [geometry.coordinates];
	if (geometry.type === "LineString") return geometry.coordinates;
	if (geometry.type === "Polygon") return geometry.coordinates.flat();
	if (geometry.type === "MultiLineString") return geometry.coordinates.flat();
	if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2);
	return [];
};
function validPublicEnvironmentalRepresentation(value, category) {
	if (value.accuracy !== "approximate" || environmentalPositionCount(value.geometry) > 50 || !environmentalPositions(value.geometry).every(positionInsideTerritory)) return false;
	return category === "residuos" ? value.type === "waste" : category === "agua" && ["erosion", "apparent_sewage", "flooding"].includes(value.type);
}
export function validateOccurrenceInput(input, { partial = false, allowPreparedRepresentation = false, allowGeometryCorrection = false } = {}) {
	const fields = {}, result = {};
	if (!input || typeof input !== "object" || Array.isArray(input)) throw new OccurrenceError(422, "VALIDATION_ERROR", "Dados da ocorrência inválidos.");
	for (const key of Object.keys(input)) if (!allowed.includes(key)) fields[key] = "Campo não permitido.";
	for (const key of allowed) {
		if (!Object.hasOwn(input, key)) {
			if (!partial && [
				"category",
				"description",
				"latitude",
				"longitude"
			].includes(key)) fields[key] = "Campo obrigatório.";
			continue;
		}
		const value = input[key];
		if (key === "environmentalRepresentation") {
			if (partial && !allowGeometryCorrection) fields[key] = "A representação cartográfica não é editável por esta rota.";
			else if (value === null && partial && allowGeometryCorrection) result[key] = null;
			else if (!validEnvironmentalRepresentation(value)) fields[key] = "Informe tipo, precisão e geometria compatíveis; pH é obrigatório para qualidade da água.";
			else if (!allowPreparedRepresentation && !allowGeometryCorrection && !validPublicEnvironmentalRepresentation(value, result.category ?? input.category)) fields[key] = "Use somente geometria aproximada compatível com a categoria, dentro da área de demonstração e com até 50 posições.";
			else result[key] = structuredClone(value);
		} else if (key === "latitude" || key === "longitude") {
			const [min, max] = key === "latitude" ? [-23.95, -23.925] : [-46.195, -46.165];
			if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) fields[key] = `Use uma coordenada entre ${min} e ${max}.`;
			else result[key] = value;
		} else if (key === "category") {
			if (!Object.hasOwn(labels, value)) fields[key] = "Escolha Resíduos ou Água.";
			else result[key] = value;
		} else {
			const [min, max] = key === "description" ? [20, 3e3] : key === "title" ? [5, 100] : [0, 120];
			if (typeof value !== "string" || length(value.trim()) < min || length(value.trim()) > max) fields[key] = `Use de ${min} a ${max} caracteres.`;
			else result[key] = value.trim();
		}
	}
	if (partial && !Object.keys(input).length) fields.changes = "Informe ao menos um campo.";
	if (Object.keys(fields).length) throw new OccurrenceError(422, "VALIDATION_ERROR", "Revise os campos da ocorrência.", fields);
	return result;
}
export function occurrenceWrites(db, { now = Date.now, allowPreparedRepresentation = false } = {}) {
	const repository = occurrenceWriteRepository(db);
	function run(options) {
		try {
			return domainTransaction(db, options);
		} catch (error) {
			if (error instanceof VersionConflict) throw new OccurrenceError(409, "VERSION_CONFLICT", "A ocorrência mudou. Recarregue e revise antes de enviar novamente.");
			throw error;
		}
	}
	return {
		create(user, input) {
			const values = validateOccurrenceInput(input, { allowPreparedRepresentation }), createdAt = new Date(now()).toISOString();
			return run({
				createdAt,
				mutate() {
					const id = nextOccurrenceId(db);
					repository.insert({
						id,
						authorId: user.id,
						title: values.title ?? `${labels[values.category]} — ${id}`,
						locationLabel: values.locationLabel ?? null,
						environmentalRepresentationJson: values.environmentalRepresentation ? JSON.stringify(values.environmentalRepresentation) : null,
						...values,
						createdAt,
						updatedAt: createdAt
					});
					const after = repository.get(id);
					return {
						value: id,
						events: [{
							occurrenceId: id,
							entityType: "occurrence",
							entityId: id,
							actorId: user.id,
							action: "created",
							after
						}]
					};
				}
			}).value;
		},
		edit(user, id, { expectedVersion, changes }) {
			const values = validateOccurrenceInput(changes, { partial: true });
			if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new OccurrenceError(422, "VALIDATION_ERROR", "Informe uma versão válida.", { expectedVersion: "Versão obrigatória." });
			/** Authorization, time and version are checked under the same write lock. */
			return db.transaction(() => {
				const before = repository.get(id);
				if (!before || before.visibility !== "visible") throw new OccurrenceError(404, "NOT_FOUND", "Ocorrência indisponível.");
				if (before.authorId !== user.id) throw new OccurrenceError(403, "FORBIDDEN", "Somente o autor pode editar este relato.");
				if (before.status !== "received" || before.duplicateOfId) throw new OccurrenceError(409, "EDIT_UNAVAILABLE", "A ocorrência não permite edição neste estado ou vínculo.");
				const date = now();
				if (date - Date.parse(before.createdAt) > 864e5) throw new OccurrenceError(403, "EDIT_EXPIRED", "O prazo de 24 horas para edição terminou.");
				run({
					expectedVersions: { [id]: expectedVersion },
					createdAt: new Date(date).toISOString(),
					mutate() {
						repository.update(id, {
							...before,
							...values
						});
						const after = {
							...repository.get(id),
							version: before.version + 1,
							updatedAt: new Date(date).toISOString()
						};
						return { events: [{
							occurrenceId: id,
							entityType: "occurrence",
							entityId: id,
							actorId: user.id,
							action: "edited",
							before,
							after
						}] };
					}
				});
				return id;
			}).immediate();
		}
	};
}

// ── Administração e denúncias ──
const failAdministration = (status, code, message, fields) => {
	throw new OccurrenceError(status, code, message, fields);
};
export function administrativeReason(value) {
	if (typeof value !== "string" || [...value.trim()].length < 20 || [...value.trim()].length > 1e3) failAdministration(422, "VALIDATION_ERROR", "Revise a justificativa.", { reason: "Use de 20 a 1.000 caracteres." });
	return value.trim();
}
/** Audit responses never expose internal file keys, credentials or report authors. */
const auditValue = (value) => {
	if (Array.isArray(value)) return value.map(auditValue);
	if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => ![
		"storageKey",
		"reporterId",
		"passwordHash",
		"passwordSalt",
		"passwordParams",
		"tokenHash"
	].includes(key)).map(([key, item]) => [key, auditValue(item)]));
	return value;
};
export function administrationService(db, { now = Date.now, queries } = {}) {
	const repository = administrationRepository(db), occurrences = occurrenceRepository(db), contributions = contributionRepository(db), attachments = attachmentRepository(db);
	function admin(user) {
		if (!user) failAdministration(401, "UNAUTHENTICATED", "Entre para continuar.");
		if (repository.role(user.id) !== "admin") failAdministration(403, "FORBIDDEN", "Acesso administrativo não permitido.");
	}
	function scoped(type, id) {
		if (![
			"occurrence",
			"contribution",
			"attachment",
			"stance"
		].includes(type) || typeof id !== "string" || !(type === "occurrence" ? /^CA-(?:[0-9]{3}|[0-9]{6,})$/ : /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i).test(id)) failAdministration(422, "VALIDATION_ERROR", "Identificador ou tipo de alvo inválido.");
		const row = repository.target(type, id);
		if (!row) failAdministration(404, "NOT_FOUND", "Conteúdo indisponível.");
		const occurrence = type === "occurrence" ? row : repository.occurrence(row.occurrenceId);
		if (!occurrence) failAdministration(404, "NOT_FOUND", "Ocorrência indisponível.");
		return {
			row,
			occurrence
		};
	}
	function independent(user, row, occurrence) {
		if (occurrence.authorId === user.id || (row.authorId ?? row.userId ?? row.uploaderId) === user.id) failAdministration(403, "SELF_REVIEW", "Outro administrador deve revisar conteúdo de sua autoria.");
	}
	function publiclyVisible(type, row, parent) {
		return parent.visibility === "visible" && row.visibility === "visible" && !(type === "attachment" && (row.withdrawnAt || row.contributionId && repository.target("contribution", row.contributionId)?.visibility !== "visible")) && !(type === "stance" && !row.active);
	}
	function run(parent, expectedVersion, date, mutate) {
		if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) failAdministration(422, "VALIDATION_ERROR", "Informe uma versão válida.", { expectedVersion: "Versão obrigatória." });
		try {
			return domainTransaction(db, {
				expectedVersions: { [parent.id]: expectedVersion },
				createdAt: date,
				mutate
			});
		} catch (error) {
			if (error instanceof VersionConflict) failAdministration(409, "VERSION_CONFLICT", "A ocorrência mudou. Recarregue e revise antes de enviar novamente.");
			throw error;
		}
	}
	function moderationEvent(user, type, row, parent, action, reason, date) {
		const visibility = action === "hide" ? "hidden" : "visible";
		repository.setVisibility(type, row.id, visibility, date);
		const after = repository.target(type, row.id);
		if (type === "occurrence") {
			after.version = parent.version + 1;
			after.updatedAt = date;
		}
		return {
			occurrenceId: parent.id,
			entityType: type,
			entityId: row.id,
			actorId: user.id,
			action: action === "hide" ? "hidden" : "restored",
			reason,
			before: row,
			after
		};
	}
	const image = (row) => ({
		id: row.id,
		occurrenceId: row.occurrenceId,
		createdAt: row.createdAt,
		available: true,
		caption: row.caption,
		mediaType: row.mediaType,
		byteSize: row.byteSize,
		width: row.width,
		height: row.height,
		fileUrl: `/api/v1/attachments/${row.id}/file?includeHidden=true`,
		visibility: row.visibility,
		withdrawnAt: row.withdrawnAt,
		contributionId: row.contributionId,
		uploaderId: row.uploaderId
	});
	return {
		assertAdmin: admin,
		list(user, query) {
			admin(user);
			return db.transaction(() => {
				const result = occurrences.list({
					...query,
					includeHidden: true,
					includeDuplicates: query.includeDuplicates === "true"
				});
				return {
					data: result.rows.map(publicOccurrence),
					page: query.page,
					pageSize: query.pageSize,
					total: result.total
				};
			})();
		},
		detail(user, id) {
			admin(user);
			return db.transaction(() => {
				const { row } = scoped("occurrence", id);
				const publicDetail = queries.detailFromRow(row);
				return { data: {
					...publicDetail,
					visibility: row.visibility
				} };
			})();
		},
		history(user, id, query) {
			admin(user);
			return db.transaction(() => {
				scoped("occurrence", id);
				const result = occurrences.history(id, query.page, query.pageSize, true);
				return {
					data: result.rows.map(({ beforeJson, afterJson, referencesJson, ...row }) => ({
						...row,
						before: auditValue(JSON.parse(beforeJson)),
						after: auditValue(JSON.parse(afterJson)),
						references: auditValue(JSON.parse(referencesJson))
					})),
					page: query.page,
					pageSize: query.pageSize,
					total: result.total
				};
			})();
		},
		contributions(user, id, query) {
			admin(user);
			return db.transaction(() => {
				const { row } = scoped("occurrence", id), result = contributions.list(id, query.page, query.pageSize);
				return {
					data: result.rows.map((c) => ({
						id: c.id,
						occurrenceId: c.occurrenceId,
						authorId: c.authorId,
						username: c.username,
						type: c.type,
						kind: c.kind,
						text: c.text,
						requestStatus: c.requestStatus,
						available: true,
						visibility: c.visibility,
						createdAt: c.createdAt,
						updatedAt: c.updatedAt,
						attachments: attachments.forContribution(c.id).map(image)
					})),
					page: query.page,
					pageSize: query.pageSize,
					total: result.total,
					occurrenceVersion: row.version
				};
			})();
		},
		attachments(user, id, query) {
			admin(user);
			return db.transaction(() => {
				const { row } = scoped("occurrence", id), result = attachments.list(id, query.page, query.pageSize);
				return {
					data: result.rows.map(image),
					page: query.page,
					pageSize: query.pageSize,
					total: result.total,
					occurrenceVersion: row.version
				};
			})();
		},
		stances(user, id, query) {
			admin(user);
			return db.transaction(() => {
				const { row } = scoped("occurrence", id);
				const { rows, total } = repository.stances(id, query.page, query.pageSize);
				return {
					data: rows.map((s) => ({
						id: s.id,
						occurrenceId: s.occurrenceId,
						userId: s.userId,
						username: s.username,
						type: s.type,
						reason: s.reason,
						active: !!s.active,
						available: true,
						visibility: s.visibility,
						createdAt: s.createdAt,
						updatedAt: s.updatedAt
					})),
					page: query.page,
					pageSize: query.pageSize,
					total,
					counts: row.visibility === "visible" ? occurrences.counts(id) : {
						support: 0,
						contest: 0
					},
					occurrenceVersion: row.version
				};
			})();
		},
		file(user, id) {
			admin(user);
			return scoped("attachment", id).row;
		},
		correct(user, id, input) {
			admin(user);
			const reason = administrativeReason(input.reason), values = validateOccurrenceInput(input.changes, { partial: true, allowGeometryCorrection: true });
			return db.transaction(() => {
				admin(user);
				const { row, occurrence } = scoped("occurrence", id);
				independent(user, row, occurrence);
				if (occurrence.duplicateOfId) failAdministration(409, "EDIT_UNAVAILABLE", "Correção bloqueada pelo vínculo de duplicata.");
				if (values.environmentalRepresentation !== undefined) {
					const category = values.category ?? row.category;
					if (values.environmentalRepresentation !== null && !validPublicEnvironmentalRepresentation(values.environmentalRepresentation, category)) throw new OccurrenceError(422, "VALIDATION_ERROR", "Revise os campos da ocorrência.", { environmentalRepresentation: "Use somente geometria aproximada compatível com a categoria, dentro da área de demonstração e com até 50 posições." });
					values.environmentalRepresentationJson = values.environmentalRepresentation === null ? null : JSON.stringify(values.environmentalRepresentation);
					delete values.environmentalRepresentation;
				}
				const date = new Date(now()).toISOString();
				const result = run(occurrence, input.expectedVersion, date, () => {
					repository.correct(id, {
						...row,
						...values
					});
					const after = {
						...repository.occurrence(id),
						version: row.version + 1,
						updatedAt: date
					};
					return { events: [{
						occurrenceId: id,
						entityType: "occurrence",
						entityId: id,
						actorId: user.id,
						action: "corrected",
						reason,
						before: row,
						after
					}] };
				});
				return {
					data: this.detail(user, id).data,
					occurrenceVersion: result.versions[id]
				};
			}).immediate();
		},
		moderate(user, input) {
			admin(user);
			const reason = administrativeReason(input.reason);
			return db.transaction(() => {
				admin(user);
				const { row, occurrence } = scoped(input.targetType, input.targetId);
				independent(user, row, occurrence);
				if (!["hide", "restore"].includes(input.action)) failAdministration(422, "VALIDATION_ERROR", "Ação inválida.");
				if (row.visibility === (input.action === "hide" ? "hidden" : "visible")) failAdministration(409, "MODERATION_UNCHANGED", "O conteúdo já possui esta visibilidade. Recarregue para revisar.");
				const date = new Date(now()).toISOString();
				const result = run(occurrence, input.expectedVersion, date, () => ({ events: [moderationEvent(user, input.targetType, row, occurrence, input.action, reason, date)] }));
				return {
					data: {
						id: row.id,
						occurrenceId: occurrence.id,
						visibility: input.action === "hide" ? "hidden" : "visible"
					},
					occurrenceVersion: result.versions[occurrence.id]
				};
			}).immediate();
		},
		report(user, input) {
			const reason = administrativeReason(input.reason);
			return db.transaction(() => {
				const { row, occurrence } = scoped(input.targetType, input.targetId);
				if (!publiclyVisible(input.targetType, row, occurrence)) failAdministration(404, "NOT_FOUND", "Conteúdo indisponível para denúncia.");
				if (repository.pending(user.id, input.targetType, row.id)) failAdministration(409, "REPORT_PENDING", "Você já possui uma denúncia pendente deste conteúdo.");
				const date = new Date(now()).toISOString(), id = randomUUID();
				const result = run(occurrence, input.expectedVersion, date, () => {
					repository.insertReport({
						id,
						occurrenceId: occurrence.id,
						reporterId: user.id,
						targetType: input.targetType,
						targetId: row.id,
						reason,
						createdAt: date,
						updatedAt: date
					});
					const after = repository.report(id);
					return {
						value: after,
						events: [{
							occurrenceId: occurrence.id,
							entityType: "report",
							entityId: id,
							actorId: user.id,
							action: "reported",
							after: auditValue(after)
						}]
					};
				});
				return {
					data: result.value,
					occurrenceVersion: result.versions[occurrence.id]
				};
			}).immediate();
		},
		reports(user, query) {
			const current = {
				...user,
				role: repository.role(user.id)
			};
			return db.transaction(() => {
				const result = repository.reports(current, query);
				return {
					data: result.rows.map((row) => ({
						...row,
						occurrenceVersion: repository.occurrence(row.occurrenceId).version
					})),
					page: query.page,
					pageSize: query.pageSize,
					total: result.total
				};
			})();
		},
		decide(user, id, input) {
			admin(user);
			const reason = administrativeReason(input.reason);
			return db.transaction(() => {
				admin(user);
				const report = repository.report(id);
				if (!report) failAdministration(404, "NOT_FOUND", "Denúncia indisponível.");
				const { row, occurrence } = scoped(report.targetType, report.targetId);
				independent(user, row, occurrence);
				if (report.reporterId === user.id) failAdministration(403, "SELF_REVIEW", "Outro administrador deve revisar sua denúncia.");
				if (report.status !== "pending") failAdministration(409, "REPORT_DECIDED", "Esta denúncia já foi revisada.");
				if (!["dismissed", "upheld"].includes(input.decision)) failAdministration(422, "VALIDATION_ERROR", "Decisão inválida.");
				const date = new Date(now()).toISOString();
				const result = run(occurrence, input.expectedVersion, date, () => {
					repository.decide(id, user.id, input.decision, reason, date);
					const after = repository.report(id), events = [{
						occurrenceId: occurrence.id,
						entityType: "report",
						entityId: id,
						actorId: user.id,
						action: "report_decided",
						reason,
						before: auditValue(report),
						after: auditValue(after)
					}];
					if (input.decision === "upheld" && row.visibility !== "hidden") events.push(moderationEvent(user, report.targetType, row, occurrence, "hide", reason, date));
					return {
						value: after,
						events
					};
				});
				return {
					data: result.value,
					occurrenceVersion: result.versions[occurrence.id]
				};
			}).immediate();
		},
		reopenRequests(user, query) {
			admin(user);
			const result = repository.reopenRequests(query);
			return {
				data: result.rows,
				page: query.page,
				pageSize: query.pageSize,
				total: result.total
			};
		},
		reject(user, id, input) {
			admin(user);
			const reason = administrativeReason(input.reason);
			return db.transaction(() => {
				admin(user);
				const { row, occurrence } = scoped("contribution", id);
				independent(user, row, occurrence);
				if (row.type !== "reopen_request") failAdministration(404, "NOT_FOUND", "Pedido indisponível.");
				if (row.requestStatus !== "pending") failAdministration(409, "REQUEST_DECIDED", "Este pedido já foi tratado.");
				const date = new Date(now()).toISOString();
				const result = run(occurrence, input.expectedVersion, date, () => {
					repository.reject(id, date);
					return { events: [{
						occurrenceId: occurrence.id,
						entityType: "contribution",
						entityId: id,
						actorId: user.id,
						action: "reopen_rejected",
						reason,
						before: row,
						after: repository.target("contribution", id)
					}] };
				});
				return {
					data: {
						id,
						occurrenceId: occurrence.id,
						requestStatus: "rejected"
					},
					occurrenceVersion: result.versions[occurrence.id]
				};
			}).immediate();
		}
	};
}

// ── Permissões de participação ──
export const participatoryStates = [
	"community_review",
	"confirmed",
	"monitoring"
];
const failContributionPolicy = (status, code, message, fields) => {
	throw new OccurrenceError(status, code, message, fields);
};
export function contributionPolicy(db, { now = Date.now } = {}) {
	const repository = contributionRepository(db);
	function visible(id) {
		const row = repository.occurrence(id);
		if (!row || row.visibility !== "visible") failContributionPolicy(404, "NOT_FOUND", "Ocorrência indisponível.");
		return row;
	}
	function participating(id) {
		const row = visible(id);
		if (!participatoryStates.includes(row.status) || row.duplicateOfId) failContributionPolicy(409, "PARTICIPATION_UNAVAILABLE", "Esta ocorrência não permite comentários ou complementos neste estado ou vínculo.");
		return row;
	}
	function editable(user, id, occurrenceId) {
		const row = repository.get(id);
		if (!row || row.visibility !== "visible" || !["comment", "supplement"].includes(row.type) || occurrenceId && row.occurrenceId !== occurrenceId) failContributionPolicy(404, "NOT_FOUND", "Contribuição indisponível.");
		visible(row.occurrenceId);
		if (row.authorId !== user.id) failContributionPolicy(403, "FORBIDDEN", "Somente o autor pode editar esta contribuição.");
		participating(row.occurrenceId);
		if (now() - Date.parse(row.createdAt) > 864e5) failContributionPolicy(403, "EDIT_EXPIRED", "O prazo de 24 horas para editar esta contribuição terminou.");
		return row;
	}
	function requestable(id) {
		const row = visible(id);
		if (!["closed", "discarded"].includes(row.status) || row.duplicateOfId) failContributionPolicy(409, "REOPEN_UNAVAILABLE", "Pedidos de reabertura só são permitidos em ocorrências encerradas ou descartadas, sem duplicata.");
		return row;
	}
	function imageEditable(user, id, occurrenceId) {
		const row = repository.get(id);
		if (row?.type !== "reopen_request") return editable(user, id, occurrenceId);
		if (row.visibility !== "visible" || row.occurrenceId !== occurrenceId) failContributionPolicy(404, "NOT_FOUND", "Pedido indisponível.");
		requestable(row.occurrenceId);
		if (row.authorId !== user.id) failContributionPolicy(403, "FORBIDDEN", "Somente o autor pode alterar imagens deste pedido.");
		if (row.requestStatus !== "pending") failContributionPolicy(409, "REOPEN_UNAVAILABLE", "O pedido já foi tratado.");
		if (now() - Date.parse(row.createdAt) > 864e5) failContributionPolicy(403, "EDIT_EXPIRED", "O prazo de 24 horas para alterar imagens terminou.");
		return row;
	}
	return {
		visible,
		participating,
		editable,
		requestable,
		imageEditable
	};
}

// ── Imagens e anexos ──
export const maxImageBytes = 5 * 1024 * 1024;
const failAttachments = (status, code, message, fields) => {
	throw new OccurrenceError(status, code, message, fields);
};
const unavailable = () => failAttachments(404, "NOT_FOUND", "Anexo ou ocorrência indisponível.");
export function attachmentDTO(row) {
	const available = row.visibility === "visible" && !row.withdrawnAt;
	return {
		id: row.id,
		occurrenceId: row.occurrenceId,
		createdAt: row.createdAt,
		available,
		caption: available ? row.caption : null,
		mediaType: available ? row.mediaType : null,
		byteSize: available ? row.byteSize : null,
		width: available ? row.width : null,
		height: available ? row.height : null,
		fileUrl: available ? `/api/v1/attachments/${row.id}/file` : null
	};
}
export async function prepareImage(buffer) {
	if (!Buffer.isBuffer(buffer) || buffer.length === 0) failAttachments(422, "INVALID_IMAGE", "Selecione uma imagem válida.", { file: "Imagem obrigatória." });
	if (buffer.length > 5242880) failAttachments(413, "IMAGE_TOO_LARGE", "Cada imagem pode ter no máximo 5 MiB.");
	let format;
	if (buffer.subarray(0, 8).equals(Buffer.from([
		137,
		80,
		78,
		71,
		13,
		10,
		26,
		10
	]))) format = "png";
	else if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) format = "jpeg";
	else if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") format = "webp";
	if (!format) failAttachments(415, "UNSUPPORTED_IMAGE", "Aceitamos somente JPEG, PNG e WebP válidos.");
	let metadata;
	try {
		metadata = await sharp(buffer, {
			limitInputPixels: false,
			failOn: "warning"
		}).metadata();
	} catch {
		failAttachments(422, "INVALID_IMAGE", "Não foi possível decodificar a imagem.");
	}
	if (metadata.format !== format) failAttachments(415, "UNSUPPORTED_IMAGE", "A assinatura não corresponde ao formato da imagem.");
	if (!metadata.width || !metadata.height || metadata.width * metadata.height > 2e7) failAttachments(422, "IMAGE_DIMENSIONS", "A imagem deve ter no máximo 20 megapixels.");
	if ((metadata.pages ?? 1) > 1) failAttachments(422, "ANIMATED_IMAGE", "Use uma imagem estática, sem animação.");
	try {
		/** Default output strips EXIF/XMP/IPTC/ICC. Decode all pixels, orient and */
		/** re-encode; metadata() alone is insufficient to validate truncated data. */
		const { data, info } = await sharp(buffer, {
			limitInputPixels: 2e7,
			failOn: "warning"
		}).rotate().toFormat(format).toBuffer({ resolveWithObject: true });
		if (data.length > 5242880) failAttachments(413, "IMAGE_TOO_LARGE", "A imagem reencodada ultrapassa 5 MiB. Escolha uma imagem menor.");
		return {
			buffer: data,
			format,
			mediaType: `image/${format}`,
			byteSize: data.length,
			width: info.width,
			height: info.height
		};
	} catch (error) {
		if (error instanceof OccurrenceError) throw error;
		failAttachments(422, "INVALID_IMAGE", "A imagem está danificada ou incompleta.");
	}
}
export function attachmentService(db, storage, { now = Date.now, admin } = {}) {
	const repository = attachmentRepository(db), policy = contributionPolicy(db, { now });
	function visible(id) {
		const occurrence = repository.occurrence(id);
		if (!occurrence || occurrence.visibility !== "visible") unavailable();
		return occurrence;
	}
	function writable(user, id, contributionId = null) {
		if (contributionId) {
			const contribution = policy.imageEditable(user, contributionId, id);
			if (!["supplement", "reopen_request"].includes(contribution.type)) failAttachments(422, "INVALID_ATTACHMENT_PARENT", "Somente complementos e pedidos de reabertura podem receber imagens.");
			return contribution;
		}
		const row = visible(id);
		if (row.authorId !== user.id) failAttachments(403, "FORBIDDEN", "Somente o autor pode alterar as imagens deste relato.");
		if (row.status !== "received" || row.duplicateOfId) failAttachments(409, "EDIT_UNAVAILABLE", "Este estado ou vínculo não permite alterar imagens.");
		if (now() - Date.parse(row.createdAt) > 864e5) failAttachments(403, "EDIT_EXPIRED", "O prazo de 24 horas para alterar imagens terminou.");
		return row;
	}
	function version(value) {
		if (!Number.isSafeInteger(value) || value < 1) failAttachments(422, "VALIDATION_ERROR", "Informe uma versão válida.", { expectedVersion: "Versão obrigatória." });
	}
	function run(options) {
		try {
			return domainTransaction(db, options);
		} catch (error) {
			if (error instanceof VersionConflict) failAttachments(409, "VERSION_CONFLICT", "A ocorrência mudou. Recarregue e revise antes de enviar novamente.");
			throw error;
		}
	}
	return {
		initialize() {
			storage.initialize(repository.storageKeys(), now());
		},
		assertWritable: writable,
		list(id, { page = 1, pageSize = 20, includeHidden } = {}) {
			if (includeHidden === "true") failAttachments(403, "FORBIDDEN", "Consulta de conteúdo oculto não permitida.");
			return db.transaction(() => {
				const row = visible(id), result = repository.list(id, page, pageSize);
				return {
					data: result.rows.map(attachmentDTO),
					page,
					pageSize,
					total: result.total,
					occurrenceVersion: row.version
				};
			})();
		},
		file(id, { includeHidden } = {}, user) {
			if (includeHidden === "true") {
				const row = admin.file(user, id);
				try {
					return {
						buffer: storage.read(row.storageKey, row.byteSize),
						mediaType: row.mediaType
					};
				} catch (error) {
					if (error.code === "ENOENT") unavailable();
					throw error;
				}
			}
			const row = repository.get(id);
			if (!row) unavailable();
			visible(row.occurrenceId);
			if (row.visibility !== "visible" || row.withdrawnAt) unavailable();
			if (row.contributionId) {
				const parent = db.prepare("SELECT 1 FROM contributions WHERE id=? AND occurrenceId=? AND visibility='visible'").get(row.contributionId, row.occurrenceId);
				if (!parent) unavailable();
			}
			try {
				return {
					buffer: storage.read(row.storageKey, row.byteSize),
					mediaType: row.mediaType
				};
			} catch (error) {
				if (error.code === "ENOENT") unavailable();
				throw error;
			}
		},
		async upload(user, id, { buffer, caption, expectedVersion, recheckSession, contributionId = null }) {
			writable(user, id, contributionId);
			version(expectedVersion);
			if (typeof caption !== "string" || [...caption.trim()].length < 5 || [...caption.trim()].length > 200) failAttachments(422, "VALIDATION_ERROR", "Revise a legenda da imagem.", { caption: "Use de 5 a 200 caracteres na legenda." });
			if (repository.count(id, contributionId) >= 5) failAttachments(409, "ATTACHMENT_LIMIT", "Este relato já tem cinco imagens. Retire uma imagem antes de enviar outra.");
			const image = await prepareImage(buffer);
			/** Session may have expired or been revoked while reading/decoding. */
			if (recheckSession) user = await recheckSession();
			const staged = storage.stage(image.buffer, image.format), date = new Date(now()).toISOString(), attachmentId = randomUUID();
			try {
				const result = run({
					expectedVersions: { [id]: expectedVersion },
					createdAt: date,
					mutate() {
						writable(user, id, contributionId);
						if (repository.count(id, contributionId) >= 5) failAttachments(409, "ATTACHMENT_LIMIT", "Este relato já tem cinco imagens.");
						storage.publish(staged);
						repository.insert({
							id: attachmentId,
							occurrenceId: id,
							contributionId,
							uploaderId: user.id,
							storageKey: staged.key,
							mediaType: image.mediaType,
							byteSize: image.byteSize,
							width: image.width,
							height: image.height,
							caption: caption.trim(),
							createdAt: date,
							updatedAt: date
						});
						const after = repository.get(attachmentId);
						return {
							value: attachmentDTO(after),
							events: [{
								occurrenceId: id,
								entityType: "attachment",
								entityId: attachmentId,
								actorId: user.id,
								action: "attachment_added",
								after
							}]
						};
					}
				});
				return {
					data: result.value,
					occurrenceVersion: result.versions[id]
				};
			} catch (error) {
				storage.discard(staged);
				throw error;
			}
		},
		withdraw(user, id, expectedVersion) {
			version(expectedVersion);
			return db.transaction(() => {
				const before = repository.get(id);
				if (!before || before.visibility !== "visible") unavailable();
				writable(user, before.occurrenceId, before.contributionId);
				if (before.withdrawnAt) failAttachments(409, "ALREADY_WITHDRAWN", "Esta imagem já foi retirada.");
				const date = new Date(now()).toISOString();
				const result = run({
					expectedVersions: { [before.occurrenceId]: expectedVersion },
					createdAt: date,
					mutate() {
						repository.withdraw(id, date);
						const after = repository.get(id);
						return {
							value: attachmentDTO(after),
							events: [{
								occurrenceId: before.occurrenceId,
								entityType: "attachment",
								entityId: id,
								actorId: user.id,
								action: "withdrawn",
								before,
								after
							}]
						};
					}
				});
				return {
					data: result.value,
					occurrenceVersion: result.versions[before.occurrenceId]
				};
			}).immediate();
		}
	};
}

// ── Erros de autenticação ──
export var AuthError = class extends Error {
	constructor(statusCode, code, message) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
	}
};

// ── Permissões HTTP ──
export function authGuards(auth) {
	const requireSession = async (request) => {
		/** Consulte o banco novamente; não confie no usuário da requisição nem em cabeçalhos de papel ou identidade. */
		request.user = auth.current(request.headers.cookie);
		if (!request.user) throw new AuthError(401, "UNAUTHENTICATED", "Entre para continuar.");
	};
	return {
		requireSession,
		async requireAdmin(request) {
			await requireSession(request);
			if (request.user.role !== "admin") throw new AuthError(403, "FORBIDDEN", "Acesso administrativo não permitido.");
		},
		async requireOrigin(request) {
			if (request.headers.origin !== auth.origin) throw new AuthError(403, "FORBIDDEN_ORIGIN", "Origem da requisição não permitida.");
		}
	};
}

// ── Limites de tentativas ──
export function authLimits(now = Date.now) {
	const windows = new Map();
	const prune = () => {
		const cutoff = now() - 6e4;
		for (const [key, times] of windows) {
			const current = times.filter((time) => time > cutoff);
			if (current.length) windows.set(key, current);
			else windows.delete(key);
		}
	};
	const timer = setInterval(prune, 6e4);
	timer.unref();
	return {
		close() {
			clearInterval(timer);
			windows.clear();
		},
		take(kind, ip, username, reply) {
			const key = JSON.stringify(kind === "login" ? [
				kind,
				ip,
				username
			] : [kind, ip]), date = now();
			const times = (windows.get(key) ?? []).filter((time) => time > date - 6e4), maximum = kind === "login" ? 10 : 5;
			if (times.length >= maximum) {
				reply.header("retry-after", String(Math.max(1, Math.ceil((times[0] + 6e4 - date) / 1e3))));
				throw new AuthError(429, "RATE_LIMITED", "Muitas tentativas. Aguarde um minuto e tente novamente.");
			}
			times.push(date);
			windows.set(key, times);
		}
	};
}

// ── Proteção das senhas ──
const derive = promisify(scrypt);
export const passwordParams = Object.freeze({
	N: 131072,
	r: 8,
	p: 1,
	keyLength: 64,
	maxmem: 256 * 1024 * 1024
});
let active = 0;
const waiting = [];
async function limitedDerive(password, salt) {
	if (active < 2) active++;
	else await new Promise((resolve) => waiting.push(resolve));
	try {
		return await derive(password, Buffer.from(salt, "hex"), passwordParams.keyLength, passwordParams);
	} finally {
		const next = waiting.shift();
		if (next) next();
		else active--;
	}
}
export async function hashPassword(password) {
	const passwordSalt = randomBytes(16).toString("hex");
	const hash = await limitedDerive(password, passwordSalt);
	return {
		passwordSalt,
		passwordHash: hash.toString("hex"),
		passwordParams: JSON.stringify(passwordParams)
	};
}
export async function verifyPassword(password, user) {
	const params = JSON.parse(user.passwordParams);
	if (Object.keys(params).length !== Object.keys(passwordParams).length || Object.entries(passwordParams).some(([key, value]) => params[key] !== value) || !/^[a-f0-9]{32}$/.test(user.passwordSalt) || !/^[a-f0-9]{128}$/.test(user.passwordHash)) throw new Error("Parâmetros de credencial inválidos.");
	const candidate = await limitedDerive(password, user.passwordSalt);
	return timingSafeEqual(candidate, Buffer.from(user.passwordHash, "hex"));
}
let dummy;
export function dummyCredential() {
	return dummy ??= hashPassword(randomBytes(32).toString("base64url"));
}

// ── Cadastro e sessão ──
export const cookieName = "cuidacao_session";
export const sessionLifetime = 8 * 60 * 60 * 1e3;
const usernamePattern = /^[a-z0-9_]{3,30}$/;
export function validUsername(value) {
	return typeof value === "string" && usernamePattern.test(value.toLowerCase());
}
function assertUsername(username) {
	if (!validUsername(username)) throw new AuthError(422, "INVALID_USERNAME", "Use 3–30 caracteres: minúsculas, números ou sublinhado.", { username: "Use 3–30 caracteres: minúsculas, números ou sublinhado." });
	return username.toLowerCase();
}
function assertPassword(password) {
	if (typeof password !== "string" || [...password].length < 8 || [...password].length > 128) throw new AuthError(422, "INVALID_PASSWORD", "A senha deve ter 8–128 caracteres.", { password: "A senha deve ter 8–128 caracteres." });
	return password;
}
export const tokenHash = (token) => createHash("sha256").update(token).digest("hex");
export const publicUser = (user) => ({
	id: user.id,
	username: user.username,
	role: user.role
});
export function configuredOrigin(value) {
	const url = new URL(value);
	if (url.origin !== value || !["http:", "https:"].includes(url.protocol) || url.username || url.password || url.protocol === "http:" && ![
		"localhost",
		"127.0.0.1",
		"[::1]"
	].includes(url.hostname)) throw new Error("Configure uma origem web HTTP local ou HTTPS, sem caminho.");
	return {
		origin: url.origin,
		secure: url.protocol === "https:"
	};
}
function readToken(header = "") {
	if (typeof header !== "string") return null;
	if (header.split(";").filter((part) => part.trim().startsWith("cuidacao_session" + "=")).length !== 1) return null;
	const token = parseCookie(header)[cookieName];
	return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
export function authService(db, { webOrigin = "http://localhost:5173", now = Date.now } = {}) {
	const repository = authRepository(db), configuration = configuredOrigin(webOrigin);
	const cookie = (value, expiresAt) => stringifySetCookie({
		name: cookieName,
		value,
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		secure: configuration.secure,
		maxAge: value ? sessionLifetime / 1e3 : 0,
		expires: new Date(value ? expiresAt : 0)
	});
	function issueSession(user, header) {
		const token = randomBytes(32).toString("base64url"), date = now(), expiresAt = date + sessionLifetime;
		const previous = readToken(header);
		repository.createSession({
			id: randomUUID(),
			userId: user.id,
			tokenHash: tokenHash(token),
			expiresAt: new Date(expiresAt).toISOString(),
			createdAt: new Date(date).toISOString()
		}, previous ? tokenHash(previous) : null);
		return {
			user: publicUser(user),
			cookie: cookie(token, expiresAt)
		};
	}
	return {
		origin: configuration.origin,
		ready: dummyCredential,
		issueSession,
		async register({ username, password, email }) {
			if (email !== undefined) email = normalizeAccountEmail(email);
			username = assertUsername(username);
			password = assertPassword(password);
			const credential = await hashPassword(password), user = {
				id: randomUUID(),
				username,
				email,
				...credential,
				createdAt: new Date(now()).toISOString()
			};
			try {
				repository.createUser(user);
			} catch (error) {
				if (error.code === "SQLITE_CONSTRAINT_UNIQUE") throw new AuthError(409, "ACCOUNT_TAKEN", "Apelido ou e-mail já cadastrado.");
				if (error.code === "SQLITE_CONSTRAINT_CHECK") throw new AuthError(422, "INVALID_USERNAME", "Use 3–30 caracteres: minúsculas, números ou sublinhado.", { username: "Use 3–30 caracteres: minúsculas, números ou sublinhado." });
				throw error;
			}
			return {
				id: user.id,
				username,
				role: "user"
			};
		},
		async login({ username, password }, header) {
			const normalized = typeof username === "string" ? username.trim().toLowerCase() : "";
			const user = repository.userByUsername(normalized);
			const valid = await verifyPassword(password, user?.passwordHash ? user : await dummyCredential());
			if (!user?.passwordHash || !valid) throw new AuthError(401, "INVALID_CREDENTIALS", "Usuário ou senha inválidos.");
			return issueSession(user, header);
		},
		current(header) {
			const token = readToken(header);
			return token ? repository.sessionUser(tokenHash(token), new Date(now()).toISOString()) ?? null : null;
		},
		logout(header) {
			const token = readToken(header);
			if (token) repository.revoke(tokenHash(token));
			return cookie("", 0);
		}
	};
}

// ── Preferências privadas de exploração ──
const subscriptionUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const subscriptionStatuses = ["received", "community_review", "confirmed", "monitoring", "closed", "discarded"];
const subscriptionLayers = ["occurrences", "areas", "measurements"];
const subscriptionCollections = ["", "coast", "recurring-waste", "awaiting-update", "recently-resolved"];
const subscriptionModes = ["occurrences", "measurements"];
const subscriptionRing = (geometry) => geometry?.type === "Polygon" && Array.isArray(geometry.coordinates) && geometry.coordinates.length === 1 ? geometry.coordinates[0] : null;
function subscriptionPoint(point) {
	return Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) && positionInsideTerritory(point);
}
function subscriptionPolygon(geometry) {
	const ring = subscriptionRing(geometry);
	return ring && ring.length >= 4 && ring.length <= 51 && ring.every(subscriptionPoint) && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1];
}
function pointInSubscriptionPolygon(point, geometry) {
	const ring = subscriptionRing(geometry);
	if (!ring) return false;
	let inside = false;
	for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
		const [x, y] = ring[index], [px, py] = ring[previous];
		if ((y > point[1]) !== (py > point[1]) && point[0] < (px - x) * (point[1] - y) / (py - y) + x) inside = !inside;
	}
	return inside;
}
const orientation = (a, b, c) => Math.sign((b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]));
const segmentsIntersect = (a, b, c, d) => orientation(a, b, c) !== orientation(a, b, d) && orientation(c, d, a) !== orientation(c, d, b);
function geometryIntersectsSubscription(geometry, selection) {
	if (!geometry || !selection) return false;
	if (geometry.type === "Point") return pointInSubscriptionPolygon(geometry.coordinates, selection);
	const selectionRing = subscriptionRing(selection);
	const lines = geometry.type === "LineString" ? [geometry.coordinates] : geometry.type === "MultiLineString" ? geometry.coordinates : geometry.type === "Polygon" ? geometry.coordinates : geometry.type === "MultiPolygon" ? geometry.coordinates.flat() : [];
	for (const line of lines) {
		if (line.some((point) => pointInSubscriptionPolygon(point, selection))) return true;
		for (let index = 1; index < line.length; index++) for (let edge = 1; edge < selectionRing.length; edge++) if (segmentsIntersect(line[index - 1], line[index], selectionRing[edge - 1], selectionRing[edge])) return true;
	}
	return false;
}
function distanceMeters(first, second) {
	const radians = (value) => value * Math.PI / 180, latitude = radians(second[1] - first[1]), longitude = radians(second[0] - first[0]);
	const value = Math.sin(latitude / 2) ** 2 + Math.cos(radians(first[1])) * Math.cos(radians(second[1])) * Math.sin(longitude / 2) ** 2;
	return 12742000 * Math.asin(Math.sqrt(value));
}
function sanitizeSavedQuery(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new AuthError(422, "VALIDATION_ERROR", "Consulta salva inválida.");
	const allowed = ["search", "category", "status", "period", "mode", "collection", "center", "zoom", "layers"];
	if (Object.keys(value).some((key) => !allowed.includes(key))) throw new AuthError(422, "VALIDATION_ERROR", "Consulta salva contém campos não permitidos.");
	const result = {};
	if (value.search !== undefined) {
		if (typeof value.search !== "string" || [...value.search.trim()].length > 120) throw new AuthError(422, "VALIDATION_ERROR", "Busca inválida.");
		result.search = value.search.trim();
	}
	if (value.category !== undefined) {
		if (!["", "residuos", "agua"].includes(value.category)) throw new AuthError(422, "VALIDATION_ERROR", "Categoria inválida.");
		result.category = value.category;
	}
	if (value.status !== undefined) {
		if (!["", ...subscriptionStatuses].includes(value.status)) throw new AuthError(422, "VALIDATION_ERROR", "Estado inválido.");
		result.status = value.status;
	}
	if (value.period !== undefined) {
		if (!["", "7", "30", "90"].includes(String(value.period))) throw new AuthError(422, "VALIDATION_ERROR", "Período inválido.");
		result.period = String(value.period);
	}
	if (value.mode !== undefined) {
		if (!subscriptionModes.includes(value.mode)) throw new AuthError(422, "VALIDATION_ERROR", "Modo inválido.");
		result.mode = value.mode;
	}
	if (value.collection !== undefined) {
		if (!subscriptionCollections.includes(value.collection)) throw new AuthError(422, "VALIDATION_ERROR", "Coleção inválida.");
		result.collection = value.collection;
	}
	if (value.center !== undefined) {
		if (!subscriptionPoint(value.center)) throw new AuthError(422, "VALIDATION_ERROR", "Enquadramento inválido.");
		result.center = value.center;
	}
	if (value.zoom !== undefined) {
		if (!Number.isFinite(value.zoom) || value.zoom < 15 || value.zoom > 19) throw new AuthError(422, "VALIDATION_ERROR", "Zoom inválido.");
		result.zoom = value.zoom;
	}
	if (value.layers !== undefined) {
		if (!Array.isArray(value.layers) || !value.layers.length || value.layers.some((layer) => !subscriptionLayers.includes(layer)) || new Set(value.layers).size !== value.layers.length) throw new AuthError(422, "VALIDATION_ERROR", "Camadas inválidas.");
		result.layers = value.layers;
	}
	return result;
}
export function preferenceService(db, { now = Date.now } = {}) {
	const repository = preferenceRepository(db);
	const dtoSubscription = (row) => ({
		id: row.id,
		kind: row.kind,
		occurrenceId: row.occurrenceId,
		label: row.label,
		geometry: row.geometryJson ? JSON.parse(row.geometryJson) : null,
		radiusMeters: row.radiusMeters,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	});
	const requireUser = (user) => {
		if (!user) throw new AuthError(401, "UNAUTHENTICATED", "Entre para continuar.");
	};
	const validLabel = (label, maximum = 120) => typeof label === "string" && [...label.trim()].length >= 3 && [...label.trim()].length <= maximum;
	function matches(row) {
		if (row.kind === "occurrence") return true;
		const target = JSON.parse(row.geometryJson);
		if (row.kind === "place") return distanceMeters(target.coordinates, [row.longitude, row.latitude]) <= row.radiusMeters;
		if (pointInSubscriptionPolygon([row.longitude, row.latitude], target)) return true;
		if (!row.environmentalRepresentationJson) return false;
		try {
			return geometryIntersectsSubscription(JSON.parse(row.environmentalRepresentationJson).geometry, target);
		} catch {
			return false;
		}
	}
	function notifications(user) {
		requireUser(user);
		return repository.notificationCandidates(user.id).filter(matches).map((row) => ({ eventId: row.eventId, subscriptionId: row.subscriptionId, subscriptionKind: row.kind, subscriptionLabel: row.label, occurrenceId: row.occurrenceId, title: row.title, action: row.action, reason: row.reason, createdAt: row.createdAt, read: !!row.isRead }));
	}
	return {
		listSubscriptions(user) {
			requireUser(user);
			return repository.listSubscriptions(user.id).map(dtoSubscription);
		},
		createSubscription(user, input) {
			requireUser(user);
			if (!input || !["occurrence", "place", "area"].includes(input.kind) || !validLabel(input.label)) throw new AuthError(422, "VALIDATION_ERROR", "Revise o acompanhamento.");
			let occurrenceId = null, geometryJson = null, radiusMeters = null;
			if (input.kind === "occurrence") {
				const occurrence = repository.occurrence(input.occurrenceId);
				if (!occurrence || occurrence.visibility !== "visible") throw new AuthError(404, "NOT_FOUND", "Ocorrência indisponível.");
				occurrenceId = occurrence.id;
			} else if (input.kind === "place") {
				if (input.geometry?.type !== "Point" || !subscriptionPoint(input.geometry.coordinates) || input.radiusMeters !== 500) throw new AuthError(422, "VALIDATION_ERROR", "Lugar inválido.");
				geometryJson = JSON.stringify(input.geometry);
				radiusMeters = 500;
			} else {
				if (!subscriptionPolygon(input.geometry)) throw new AuthError(422, "VALIDATION_ERROR", "Área inválida.");
				geometryJson = JSON.stringify(input.geometry);
			}
			const date = new Date(now()).toISOString(), row = { id: randomUUID(), userId: user.id, kind: input.kind, occurrenceId, label: input.label.trim(), geometryJson, radiusMeters, createdAt: date, updatedAt: date };
			repository.insertSubscription(row);
			return dtoSubscription(row);
		},
		deleteSubscription(user, id) {
			requireUser(user);
			if (!subscriptionUuid.test(id) || !repository.deleteSubscription(user.id, id)) throw new AuthError(404, "NOT_FOUND", "Acompanhamento indisponível.");
		},
		listQueries(user) {
			requireUser(user);
			return repository.listQueries(user.id).map((row) => ({ id: row.id, name: row.name, query: JSON.parse(row.queryJson), createdAt: row.createdAt, updatedAt: row.updatedAt }));
		},
		createQuery(user, input) {
			requireUser(user);
			if (!validLabel(input?.name, 60)) throw new AuthError(422, "VALIDATION_ERROR", "Nome da consulta inválido.");
			if (repository.countQueries(user.id) >= 20) throw new AuthError(409, "LIMIT_REACHED", "Remova uma consulta antes de salvar outra.");
			const query = sanitizeSavedQuery(input.query), date = new Date(now()).toISOString(), row = { id: randomUUID(), userId: user.id, name: input.name.trim(), queryJson: JSON.stringify(query), createdAt: date, updatedAt: date };
			repository.insertQuery(row);
			return { id: row.id, name: row.name, query, createdAt: date, updatedAt: date };
		},
		deleteQuery(user, id) {
			requireUser(user);
			if (!subscriptionUuid.test(id) || !repository.deleteQuery(user.id, id)) throw new AuthError(404, "NOT_FOUND", "Consulta indisponível.");
		},
		notifications,
		markRead(user, eventId) {
			requireUser(user);
			if (!subscriptionUuid.test(eventId) || !notifications(user).some((row) => row.eventId === eventId)) throw new AuthError(404, "NOT_FOUND", "Atualização indisponível.");
			repository.markRead(user.id, eventId, new Date(now()).toISOString());
		}
	};
}

// ── Comentários, complementos e pedidos ──
const failContributions = (status, code, message, fields) => {
	throw new OccurrenceError(status, code, message, fields);
};
export function contributionService(db, { now = Date.now } = {}) {
	const repository = contributionRepository(db), images = attachmentRepository(db), policy = contributionPolicy(db, { now });
	function dto(row) {
		const available = row.visibility === "visible";
		return {
			id: row.id,
			occurrenceId: row.occurrenceId,
			available,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			authorId: available ? row.authorId : null,
			username: available ? row.username : null,
			type: available ? row.type : null,
			kind: available ? row.kind : null,
			text: available ? row.text : null,
			requestStatus: available ? row.requestStatus : null,
			attachments: available && ["supplement", "reopen_request"].includes(row.type) ? images.forContribution(row.id).map(attachmentDTO) : []
		};
	}
	function validateText(text, type) {
		const min = type === "comment" ? 1 : 20, max = type === "comment" ? 2e3 : 3e3;
		if (typeof text !== "string" || [...text.trim()].length < min || [...text.trim()].length > max) failContributions(422, "VALIDATION_ERROR", "Revise o texto da contribuição.", { text: `Use de ${min} a ${max} caracteres.` });
		return text.trim();
	}
	function run(expectedVersion, id, date, mutate) {
		if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) failContributions(422, "VALIDATION_ERROR", "Informe uma versão válida.", { expectedVersion: "Versão obrigatória." });
		try {
			return domainTransaction(db, {
				expectedVersions: { [id]: expectedVersion },
				createdAt: date,
				mutate
			});
		} catch (error) {
			if (error instanceof VersionConflict) failContributions(409, "VERSION_CONFLICT", "A ocorrência mudou. Recarregue e revise antes de enviar novamente.");
			throw error;
		}
	}
	return {
		list(id, { page = 1, pageSize = 20, includeHidden } = {}) {
			if (includeHidden === "true") failContributions(403, "FORBIDDEN", "Consulta de conteúdo oculto não permitida.");
			return db.transaction(() => {
				const occurrence = policy.visible(id), result = repository.list(id, page, pageSize);
				return {
					data: result.rows.map(dto),
					page,
					pageSize,
					total: result.total,
					occurrenceVersion: occurrence.version
				};
			})();
		},
		create(user, id, input) {
			if (input.type === "reopen_request") policy.requestable(id);
			else policy.participating(id);
			if (![
				"comment",
				"supplement",
				"reopen_request"
			].includes(input.type) || input.type !== "supplement" && Object.hasOwn(input, "kind") || input.type === "supplement" && !["observation", "resolution"].includes(input.kind)) failContributions(422, "VALIDATION_ERROR", "Tipo de contribuição inválido.", { type: "Use comentário ou complemento; complemento exige observação ou resolução." });
			const text = validateText(input.text, input.type), date = new Date(now()).toISOString(), contributionId = randomUUID();
			const result = run(input.expectedVersion, id, date, () => {
				if (input.type === "reopen_request") {
					policy.requestable(id);
					if (repository.pending(id, user.id)) failContributions(409, "REOPEN_PENDING", "Você já possui um pedido pendente nesta ocorrência.");
				} else policy.participating(id);
				repository.insert({
					id: contributionId,
					occurrenceId: id,
					authorId: user.id,
					type: input.type,
					kind: input.kind ?? null,
					requestStatus: input.type === "reopen_request" ? "pending" : null,
					text,
					createdAt: date,
					updatedAt: date
				});
				const after = repository.get(contributionId);
				return {
					value: dto(after),
					events: [{
						occurrenceId: id,
						entityType: "contribution",
						entityId: contributionId,
						actorId: user.id,
						action: input.type === "comment" ? "commented" : input.type === "reopen_request" ? "reopen_requested" : "supplemented",
						after
					}]
				};
			});
			return {
				data: result.value,
				occurrenceVersion: result.versions[id]
			};
		},
		edit(user, id, { text, expectedVersion }) {
			return db.transaction(() => {
				const before = policy.editable(user, id), value = validateText(text, before.type), date = new Date(now()).toISOString();
				const result = run(expectedVersion, before.occurrenceId, date, () => {
					repository.edit(id, value, date);
					const after = repository.get(id);
					return {
						value: dto(after),
						events: [{
							occurrenceId: before.occurrenceId,
							entityType: "contribution",
							entityId: id,
							actorId: user.id,
							action: "contribution_edited",
							before,
							after
						}]
					};
				});
				return {
					data: result.value,
					occurrenceVersion: result.versions[before.occurrenceId]
				};
			}).immediate();
		}
	};
}

// ── Verificação de identidade Google ──
export function googleVerifier(clientId, { client = new OAuth2Client({ clientId }), now = Date.now } = {}) {
	/** Os testes controlam somente o transporte do certificado. O verificador oficial */
	/** continua responsável por assinatura, destinatário, emissor e datas. */
	client.transporter.defaults = {
		...client.transporter.defaults,
		timeout: 8e3,
		retry: false
	};
	return async (credential) => {
		let payload;
		try {
			payload = (await client.verifyIdToken({
				idToken: credential,
				audience: clientId
			})).getPayload();
		} catch (error) {
			if (error.code || error.response || /fetch|certificate|network|socket/i.test(error.message ?? "")) throw new AuthError(503, "GOOGLE_NETWORK", "Não foi possível consultar o Google. Tente novamente.");
			throw new AuthError(401, "GOOGLE_INVALID_IDENTITY", "A identidade Google não pôde ser validada. Tente entrar novamente.");
		}
		const time = Math.floor(now() / 1e3);
		if (!payload || !["accounts.google.com", "https://accounts.google.com"].includes(payload.iss) || payload.aud !== clientId || typeof payload.sub !== "string" || payload.sub.length < 1 || payload.sub.length > 255 || !Number.isInteger(payload.exp) || payload.exp <= time || !Number.isInteger(payload.iat) || payload.iat > time + 60) throw new AuthError(401, "GOOGLE_INVALID_IDENTITY", "A identidade Google não pôde ser validada. Tente entrar novamente.");
		return {
			subject: payload.sub,
			nonce: payload.nonce
		};
	};
}

// ── Autenticação Google ──
const cookieNameGoogle = "cuidacao_google";
const lifetime = 6e5;
function context(header = "") {
	if (typeof header !== "string" || header.split(";").filter((p) => p.trim().startsWith(cookieNameGoogle + "=")).length !== 1) return null;
	const value = parseCookie(header)[cookieNameGoogle];
	return /^[A-Za-z0-9_-]{43}$/.test(value ?? "") ? tokenHash(value) : null;
}
export function googleService(db, auth, { clientId = process.env.CUIDACAO_GOOGLE_CLIENT_ID ?? "", client, now = Date.now } = {}) {
	const configuration = configuredOrigin(auth.origin), repository = googleRepository(db);
	const migrated = !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='google_identities'").get();
	const enabled = migrated && /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId);
	const verify = enabled ? googleVerifier(clientId, {
		client,
		now
	}) : null;
	const cookie = (token = "") => stringifySetCookie({
		name: cookieNameGoogle,
		value: token,
		path: "/api/v1/auth/google",
		httpOnly: true,
		sameSite: "strict",
		secure: configuration.secure,
		maxAge: token ? lifetime / 1e3 : 0
	});
	function available() {
		if (!enabled) throw new AuthError(503, "GOOGLE_UNAVAILABLE", "Acesso com Google indisponível. Use usuário e senha.");
	}
	function flow(header, validated = false) {
		const hash = context(header), row = hash ? repository.flow(hash) : null;
		if (!row || Date.parse(row.expiresAt) <= now() || validated && !row.subject) throw new AuthError(401, "GOOGLE_EXPIRED", "A tentativa Google expirou. Inicie novamente; seu rascunho foi mantido.");
		return row;
	}
	function signIn(row, user, header) {
		const result = auth.issueSession(user, header);
		repository.remove(row.tokenHash);
		return {
			data: { user: result.user },
			cookies: [result.cookie, cookie()]
		};
	}
	return {
		configuration() {
			return enabled ? {
				enabled: true,
				clientId
			} : { enabled: false };
		},
		challenge(header) {
			available();
			return repository.transaction(() => {
				repository.prune(new Date(now()).toISOString());
				const token = randomBytes(32).toString("base64url"), nonce = randomBytes(32).toString("base64url");
				repository.begin({
					tokenHash: tokenHash(token),
					nonce,
					expiresAt: new Date(now() + lifetime).toISOString()
				}, context(header));
				return {
					data: {
						clientId,
						nonce
					},
					cookies: [cookie(token)]
				};
			});
		},
		async verify(credential, header) {
			available();
			const start = flow(header);
			if (start.subject) throw new AuthError(409, "GOOGLE_USED", "Essa resposta Google já foi utilizada. Continue escolhendo o nome ou inicie novamente.");
			const identity = await verify(credential);
			if (typeof identity.nonce !== "string" || identity.nonce !== start.nonce) throw new AuthError(401, "GOOGLE_INVALID_NONCE", "A tentativa Google não corresponde a esta página. Inicie novamente.");
			return repository.transaction(() => {
				const current = flow(header);
				if (current.subject || current.nonce !== start.nonce) throw new AuthError(409, "GOOGLE_USED", "A tentativa Google já foi utilizada.");
				const user = repository.user(identity.subject);
				if (user) return signIn(current, user, header);
				repository.verified(current.tokenHash, identity.subject);
				return {
					data: { needsUsername: true },
					cookies: []
				};
			});
		},
		complete(username, header) {
			available();
			username = assertUsername(username);
			return repository.transaction(() => {
				const row = flow(header, true);
				let user = repository.user(row.subject);
				if (!user) {
					user = {
						id: randomUUID(),
						username: username.toLowerCase(),
						role: "user"
					};
					try {
						repository.create(user, row.subject, new Date(now()).toISOString());
					} catch (error) {
						if (error.code === "SQLITE_CONSTRAINT_UNIQUE") throw new AuthError(409, "USERNAME_TAKEN", "Esse nome já está em uso. Escolha outro ou entre na conta existente com sua senha. Vinculação não está disponível.");
						throw error;
					}
				}
				return signIn(row, user, header);
			});
		},
		cancel(header) {
			if (migrated) {
				const hash = context(header);
				if (hash) repository.remove(hash);
			}
			return { cookies: [cookie()] };
		}
	};
}

// ── Autenticação Firebase ──
const cookieNameFirebase = "cuidacao_firebase";
const firebaseFlowLifetime = 6e5;
function firebaseContext(header = "") {
	if (typeof header !== "string" || header.split(";").filter((part) => part.trim().startsWith(cookieNameFirebase + "=")).length !== 1) return null;
	const value = parseCookie(header)[cookieNameFirebase];
	return /^[A-Za-z0-9_-]{43}$/.test(value ?? "") ? tokenHash(value) : null;
}
export function firebaseIdentityService(db, auth, { projectId = process.env.CUIDACAO_FIREBASE_PROJECT_ID ?? "", verifyToken, now = Date.now } = {}) {
	const configuration = configuredOrigin(auth.origin), repository = firebaseIdentityRepository(db);
	const migrated = !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='firebase_identities'").get();
	const enabled = migrated && /^[a-z0-9][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId) && typeof verifyToken === "function";
	const cookie = (token = "") => stringifySetCookie({
		name: cookieNameFirebase,
		value: token,
		path: "/api/v1/auth/firebase",
		httpOnly: true,
		sameSite: "strict",
		secure: configuration.secure,
		maxAge: token ? firebaseFlowLifetime / 1e3 : 0
	});
	function available() {
		if (!enabled) throw new AuthError(503, "FIREBASE_UNAVAILABLE", "Acesso com Firebase indisponível. Use usuário e senha.");
	}
	function pending(header) {
		const hash = firebaseContext(header), row = hash ? repository.flow(hash) : null;
		if (!row || !row.uid || Date.parse(row.expiresAt) <= now()) throw new AuthError(401, "FIREBASE_EXPIRED", "A tentativa Firebase expirou. Inicie novamente; seu rascunho foi mantido.");
		return row;
	}
	function signIn(row, user, header) {
		const result = auth.issueSession(user, header);
		if (row) repository.remove(row.tokenHash);
		return { data: { user: result.user }, cookies: [result.cookie, cookie()] };
	}
	return {
		configuration: () => ({ enabled }),
		async verify(idToken, header) {
			available();
			let decoded;
			try {
				decoded = await verifyToken(idToken);
			} catch {
				throw new AuthError(401, "FIREBASE_INVALID_IDENTITY", "A identidade Firebase não pôde ser validada. Tente entrar novamente.");
			}
			const provider = decoded?.firebase?.sign_in_provider;
			if (typeof decoded?.uid !== "string" || decoded.uid.length < 1 || decoded.uid.length > 128 || decoded.aud !== projectId || decoded.iss !== `https://securetoken.google.com/${projectId}` || provider !== "google.com") throw new AuthError(401, "FIREBASE_INVALID_IDENTITY", "A identidade Firebase não pôde ser validada. Tente entrar novamente.");
			return repository.transaction(() => {
				repository.prune(new Date(now()).toISOString());
				const user = repository.user(decoded.uid);
				if (user) return signIn(null, user, header);
				const token = randomBytes(32).toString("base64url");
				repository.verified({ tokenHash: tokenHash(token), uid: decoded.uid, expiresAt: new Date(now() + firebaseFlowLifetime).toISOString() }, firebaseContext(header));
				return { data: { needsUsername: true }, cookies: [cookie(token)] };
			});
		},
		complete(username, header) {
			available();
			username = assertUsername(username);
			return repository.transaction(() => {
				const row = pending(header);
				let user = repository.user(row.uid);
				if (!user) {
					user = { id: randomUUID(), username: username.toLowerCase(), role: "user" };
					try {
						repository.create(user, row.uid, new Date(now()).toISOString());
					} catch (error) {
						if (error.code === "SQLITE_CONSTRAINT_UNIQUE") throw new AuthError(409, "USERNAME_TAKEN", "Esse nome já está em uso. Escolha outro ou entre na conta existente com sua senha. Vinculação não está disponível.");
						throw error;
					}
				}
				return signIn(row, user, header);
			});
		},
		cancel(header) {
			const hash = firebaseContext(header);
			if (hash && migrated) repository.remove(hash);
			return { cookies: [cookie()] };
		}
	};
}

// ── Duplicatas e relações ──
const failLinks = (status, code, message) => {
	throw new OccurrenceError(status, code, message);
};
const summary = (row) => ({
	id: row.id,
	title: row.title,
	description: row.description,
	status: row.status,
	version: row.version,
	createdAt: row.createdAt,
	duplicateOfId: row.duplicateOfId
});
export function linkService(db, { now = Date.now } = {}) {
	const repo = linkRepository(db), requireRow = (id) => {
		const row = repo.occurrence(id);
		if (!row) failLinks(404, "NOT_FOUND", "Ocorrência indisponível.");
		return row;
	};
	const requireAdmin = (user) => {
		if (!repo.admin(user?.id ?? "")) failLinks(403, "FORBIDDEN", "Acesso exclusivo de administradores.");
	};
	function list(user, id, kind, { page = 1, pageSize = 20, includeHidden = "false" } = {}) {
		return db.transaction(() => {
			const privateRead = includeHidden === "true";
			if (privateRead) requireAdmin(user);
			const parent = requireRow(id);
			if (!privateRead && parent.visibility !== "visible") failLinks(404, "NOT_FOUND", "Ocorrência indisponível.");
			const rows = repo[kind](id).filter((row) => privateRead || row.visibility === "visible");
			return {
				data: rows.slice((page - 1) * pageSize, page * pageSize).map((row) => ({
					...summary(row),
					...privateRead ? { visibility: row.visibility } : {}
				})),
				page,
				pageSize,
				total: rows.length,
				occurrenceVersion: parent.version
			};
		})();
	}
	function change(user, id, operation, input) {
		const reason = typeof input.reason === "string" ? input.reason.trim() : "";
		if ([...reason].length < 20 || [...reason].length > 1e3) failLinks(422, "VALIDATION_ERROR", "Justificativa deve ter de 20 a 1.000 caracteres.");
		try {
			return db.transaction(() => {
				requireAdmin(user);
				const source = requireRow(id), otherId = operation === "duplicate_removed" ? source.duplicateOfId : input.principalId ?? input.relatedId;
				if (!otherId) failLinks(409, "LINK_CONFLICT", "A ocorrência não possui vínculo de duplicata.");
				if (id === otherId) failLinks(409, "LINK_CONFLICT", "Uma ocorrência não pode ser vinculada a si mesma.");
				const other = requireRow(otherId);
				if ([source, other].some((row) => row.authorId === user.id)) failLinks(403, "FORBIDDEN", "Outro administrador deve revisar ocorrências de sua autoria.");
				const ids = [id, otherId].sort(), versions = input.expectedVersions;
				if (!versions || Object.keys(versions).sort().join("|") !== ids.join("|") || ids.some((key) => !Number.isSafeInteger(versions[key]) || versions[key] < 1)) failLinks(422, "VALIDATION_ERROR", "Informe as versões das duas ocorrências envolvidas.");
				/** Compare before business conflicts so stale clients must review both records. */
				if (ids.some((key) => versions[key] !== repo.occurrence(key).version)) throw new VersionConflict();
				let before = null, after = null;
				if (operation === "duplicate_linked") {
					if ([source, other].some((row) => row.visibility !== "visible")) failLinks(404, "NOT_FOUND", "Ocorrência indisponível para vinculação.");
					if ([source, other].some((row) => ["closed", "discarded"].includes(row.status))) failLinks(409, "LINK_CONFLICT", "Duplicatas exigem origem e principal não terminais.");
					if (source.duplicateOfId || other.duplicateOfId || repo.duplicates(id).length) failLinks(409, "LINK_CONFLICT", "Desvincule primeiro as duplicatas existentes. Cadeias e ciclos são proibidos.");
					if (repo.relations(id).length) failLinks(409, "LINK_CONFLICT", "Remova primeiro as relações da ocorrência a duplicar.");
					const oldest = [
						source,
						other,
						...repo.duplicates(otherId)
					].filter((row) => row.visibility === "visible" && row.status !== "discarded").sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0];
					if (oldest.id !== otherId) failLinks(409, "LINK_CONFLICT", "A principal deve ser a ocorrência mais antiga do conjunto.");
					after = {
						duplicateId: id,
						principalId: otherId
					};
				} else if (operation === "duplicate_removed") {
					before = {
						duplicateId: id,
						principalId: otherId
					};
				} else {
					if ([source, other].some((row) => row.visibility !== "visible")) failLinks(404, "NOT_FOUND", "Relações exigem dois registros visíveis.");
					if ([source, other].some((row) => row.status === "discarded" || row.duplicateOfId)) failLinks(409, "LINK_CONFLICT", "Relações exigem registros não descartados e sem vínculo de duplicata.");
					const existing = repo.related(id, otherId);
					if (operation === "relation_added" && existing) failLinks(409, "LINK_CONFLICT", "Esta relação já existe.");
					if (operation === "relation_removed" && !existing) failLinks(409, "LINK_CONFLICT", "Esta relação não existe.");
					before = existing ?? null;
					after = operation === "relation_added" ? {
						leftId: ids[0],
						rightId: ids[1],
						createdBy: user.id,
						reason,
						createdAt: new Date(now()).toISOString()
					} : null;
				}
				const result = domainTransaction(db, {
					expectedVersions: versions,
					createdAt: new Date(now()).toISOString(),
					mutate() {
						if (operation === "duplicate_linked") repo.duplicate(id, otherId);
						else if (operation === "duplicate_removed") repo.duplicate(id, null);
						else if (operation === "relation_added") repo.addRelation(id, otherId, user.id, reason, after.createdAt);
						else repo.removeRelation(id, otherId);
						return {
							value: after ?? before,
							events: ids.map((occurrenceId) => ({
								occurrenceId,
								entityType: "relation",
								entityId: ids.join(":"),
								actorId: user.id,
								action: operation,
								reason,
								before,
								after
							}))
						};
					}
				});
				return {
					data: result.value,
					versions: result.versions
				};
			}).immediate();
		} catch (error) {
			if (error instanceof VersionConflict) failLinks(409, "VERSION_CONFLICT", "Uma das ocorrências mudou. Recarregue e revise ambas antes de enviar.");
			throw error;
		}
	}
	return {
		list,
		change
	};
}

// ── Consulta pública de ocorrências ──
export var QueryError = class extends Error {
	constructor(statusCode, code, message) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
	}
};
const publicOccurrence = (row) => {
	const { environmentalRepresentationJson, ...values } = row;
	return {
		...values,
		simulated: row.simulated === 1,
		...(environmentalRepresentationJson ? { environmentalRepresentation: JSON.parse(environmentalRepresentationJson) } : {})
	};
};
const comparedFields = {
	stance: ["type", "reason"],
	contribution: [
		"type",
		"kind",
		"text",
		"requestStatus"
	],
	occurrence: [
		"title",
		"description",
		"category",
		"latitude",
		"longitude",
		"locationLabel"
	],
	attachment: [
		"caption",
		"mediaType",
		"byteSize",
		"width",
		"height",
		"storageKey"
	]
};
function referenceFlags(repository, occurrence) {
	const flags = {
		referencesUnavailable: false,
		referencesChanged: false,
		relationsRemoved: false,
		duplicateTargetUnavailable: false
	};
	if (occurrence.duplicateOfId) flags.duplicateTargetUnavailable = !repository.visible(occurrence.duplicateOfId);
	for (const event of repository.decisionReferences(occurrence.id)) {
		const references = JSON.parse(event.referencesJson);
		if (!Array.isArray(references)) throw new Error("Referências de decisão inválidas.");
		for (const ref of references) {
			const current = repository.reference(ref.type, ref.id);
			if (!current || current.visibility !== "visible" || current.parentVisible === false || current.active === 0 || current.withdrawnAt) {
				flags.referencesUnavailable = true;
			}
			if (ref.type === "occurrence" && !repository.related(occurrence.id, ref.id)) flags.relationsRemoved = true;
			if (current && ref.snapshot) {
				/** Parent version changes on unrelated child writes; compare the referenced */
				/** content itself, not the whole occurrence version or timestamps. */
				if ((comparedFields[ref.type] || []).some((field) => Object.hasOwn(ref.snapshot, field) && ref.snapshot[field] !== current[field])) {
					flags.referencesChanged = true;
				}
			}
		}
	}
	return flags;
}
function publicClosure(repository, occurrence) {
	if (occurrence.status !== "closed" || occurrence.visibility === "hidden") return null;
	const event = repository.latestClosure(occurrence.id);
	if (!event) return null;
	const references = JSON.parse(event.referencesJson);
	if (!Array.isArray(references)) throw new Error("Referências de decisão inválidas.");
	const ref = references.find((row) => row.type === "contribution");
	const current = ref ? repository.resolution(ref.id, occurrence.id) : null;
	const available = !!current && current.visibility === "visible" && current.type === "supplement" && current.kind === "resolution";
	return {
		eventId: event.id,
		reason: event.reason,
		username: event.username,
		createdAt: event.createdAt,
		resolution: {
			available,
			id: available ? current.id : null,
			username: available ? current.username : null,
			text: available ? current.text : null,
			createdAt: available ? current.createdAt : null
		}
	};
}
export function occurrenceQueries(db) {
	const repository = occurrenceRepository(db);
	const guard = (query) => {
		if (query.includeHidden === "true") throw new QueryError(403, "FORBIDDEN", "Consulta de conteúdo oculto não permitida.");
	};
	const requireVisible = (id) => {
		const row = repository.visible(id);
		if (!row) throw new QueryError(404, "NOT_FOUND", "Ocorrência indisponível.");
		return row;
	};
	/** A short read transaction keeps counts/pages/visibility in one SQLite snapshot. */
	return {
		detailFromRow(row) {
			const { visibility, ...values } = row;
			return {
				...publicOccurrence(values),
				counts: visibility === "hidden" ? {
					support: 0,
					contest: 0
				} : repository.counts(row.id),
				flags: referenceFlags(repository, row),
				closure: publicClosure(repository, row)
			};
		},
		list(query) {
			guard(query);
			return db.transaction(() => {
				const { rows, total } = repository.list({
					...query,
					includeDuplicates: query.includeDuplicates === "true"
				});
				return {
					data: rows.map(publicOccurrence),
					page: query.page,
					pageSize: query.pageSize,
					total
				};
			})();
		},
		detail(id, query) {
			guard(query);
			return db.transaction(() => {
				const row = requireVisible(id);
				return { data: {
					...publicOccurrence(row),
					counts: repository.counts(id),
					flags: referenceFlags(repository, row),
					closure: publicClosure(repository, row)
				} };
			})();
		},
		history(id, query) {
			guard(query);
			return db.transaction(() => {
				requireVisible(id);
				const { rows, total } = repository.history(id, query.page, query.pageSize);
				return {
					data: rows,
					page: query.page,
					pageSize: query.pageSize,
					total
				};
			})();
		}
	};
}

// ── Apoios e contestações ──
const failStances = (status, code, message, fields) => {
	throw new OccurrenceError(status, code, message, fields);
};
export function stanceService(db, { now = Date.now } = {}) {
	const repository = stanceRepository(db), occurrences = occurrenceRepository(db);
	function visible(id) {
		const row = repository.occurrence(id);
		if (!row || row.visibility !== "visible") failStances(404, "NOT_FOUND", "Ocorrência indisponível.");
		return row;
	}
	function participating(user, id) {
		const parent = visible(id);
		if (parent.authorId === user.id) failStances(403, "SELF_PARTICIPATION", "O autor não pode apoiar ou contestar a própria ocorrência.");
		if (!participatoryStates.includes(parent.status) || parent.duplicateOfId) failStances(409, "PARTICIPATION_UNAVAILABLE", "Esta ocorrência não permite apoio ou contestação neste estado ou vínculo.");
		const own = repository.own(id, user.id);
		if (own?.visibility === "hidden") failStances(404, "NOT_FOUND", "Manifestação indisponível por moderação.");
		return {
			parent,
			own
		};
	}
	function dto(row) {
		const available = row.visibility === "visible";
		return {
			id: row.id,
			occurrenceId: row.occurrenceId,
			active: !!row.active,
			available,
			userId: available ? row.userId : null,
			username: available ? row.username : null,
			type: available ? row.type : null,
			reason: available ? row.reason : null,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt
		};
	}
	function checkVersion(parent, expectedVersion) {
		if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) failStances(422, "VALIDATION_ERROR", "Informe uma versão válida.", { expectedVersion: "Versão obrigatória." });
		if (parent.version !== expectedVersion) failStances(409, "VERSION_CONFLICT", "A ocorrência mudou. Recarregue e revise antes de enviar novamente.");
	}
	function mutate(user, id, input, withdraw) {
		return db.transaction(() => {
			const { parent, own } = participating(user, id);
			checkVersion(parent, input.expectedVersion);
			if (withdraw && !own) failStances(404, "NOT_FOUND", "Você não possui manifestação nesta ocorrência.");
			if (withdraw && !own.active) return {
				data: dto(own),
				occurrenceVersion: parent.version
			};
			let reason;
			if (!withdraw) {
				if (!["support", "contest"].includes(input.type)) failStances(422, "VALIDATION_ERROR", "Tipo de manifestação inválido.", { type: "Escolha apoio ou contestação." });
				if (typeof input.reason !== "string" || [...input.reason.trim()].length < 20 || [...input.reason.trim()].length > 1e3) failStances(422, "VALIDATION_ERROR", "Revise a justificativa.", { reason: "Use de 20 a 1.000 caracteres." });
				reason = input.reason.trim();
			}
			const date = new Date(now()).toISOString(), entityId = own?.id ?? randomUUID();
			try {
				const result = domainTransaction(db, {
					expectedVersions: { [id]: input.expectedVersion },
					createdAt: date,
					mutate() {
						if (withdraw) repository.withdraw(entityId, date);
						else if (own) repository.replace(entityId, input.type, reason, date);
						else repository.insert({
							id: entityId,
							occurrenceId: id,
							userId: user.id,
							type: input.type,
							reason,
							createdAt: date,
							updatedAt: date
						});
						const after = repository.own(id, user.id);
						return {
							value: dto(after),
							events: [{
								occurrenceId: id,
								entityType: "stance",
								entityId,
								actorId: user.id,
								action: withdraw ? "stance_withdrawn" : own ? "stance_replaced" : "stance_created",
								before: own ?? null,
								after
							}]
						};
					}
				});
				return {
					data: result.value,
					occurrenceVersion: result.versions[id]
				};
			} catch (error) {
				if (error instanceof VersionConflict) failStances(409, "VERSION_CONFLICT", "A ocorrência mudou. Recarregue e revise antes de enviar novamente.");
				throw error;
			}
		}).immediate();
	}
	return {
		list(id, { page = 1, pageSize = 20, includeHidden } = {}) {
			if (includeHidden === "true") failStances(403, "FORBIDDEN", "Consulta de conteúdo oculto não permitida.");
			return db.transaction(() => {
				const parent = visible(id), result = repository.list(id, page, pageSize);
				return {
					data: result.rows.map(dto),
					page,
					pageSize,
					total: result.total,
					counts: occurrences.counts(id),
					occurrenceVersion: parent.version
				};
			})();
		},
		set: (user, id, input) => mutate(user, id, input, false),
		withdraw: (user, id, input) => mutate(user, id, input, true)
	};
}

// ── Mudanças de estado ──
export const transitionTargets = {
	received: ["community_review", "discarded"],
	community_review: ["confirmed", "discarded"],
	confirmed: [
		"monitoring",
		"closed",
		"discarded"
	],
	monitoring: ["closed", "discarded"],
	closed: ["community_review"],
	discarded: ["community_review"]
};
const fail = (status, code, message, fields) => {
	throw new OccurrenceError(status, code, message, fields);
};
export function transitionService(db, { now = Date.now } = {}) {
	const repository = transitionRepository(db);
	function text(value, field) {
		if (typeof value !== "string" || [...value.trim()].length < 20 || [...value.trim()].length > 1e3) fail(422, "VALIDATION_ERROR", "Revise a justificativa ou parecer.", { [field]: "Use de 20 a 1.000 caracteres." });
		return value.trim();
	}
	function visible(id) {
		const row = repository.occurrence(id);
		if (!row || row.visibility !== "visible") fail(404, "NOT_FOUND", "Ocorrência indisponível.");
		return row;
	}
	function contribution(id, parent, user, { kind, type = "supplement" } = {}) {
		const row = repository.contribution(id);
		if (!row || row.occurrenceId !== parent.id || row.visibility !== "visible" || row.type !== type || kind && row.kind !== kind) fail(422, "INVALID_REFERENCE", "Referencie uma contribuição visível do tipo exigido nesta ocorrência.");
		if (row.authorId === user.id) fail(403, "SELF_DECISION", "Outro administrador deve decidir uma contribuição de sua autoria.");
		return row;
	}
	return { transition(user, id, input) {
		return db.transaction(() => {
			if (repository.role(user.id) !== "admin") fail(403, "FORBIDDEN", "Acesso administrativo não permitido.");
			const before = visible(id);
			if (before.authorId === user.id) fail(403, "SELF_DECISION", "Outro administrador deve decidir esta ocorrência de sua autoria.");
			if (before.duplicateOfId) fail(409, "DUPLICATE_UNAVAILABLE", "Uma ocorrência vinculada como duplicata não permite transições.");
			if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) fail(422, "VALIDATION_ERROR", "Informe uma versão válida.", { expectedVersion: "Versão obrigatória." });
			if (before.version !== input.expectedVersion) fail(409, "VERSION_CONFLICT", "A ocorrência mudou. Recarregue e revise antes de enviar novamente.");
			if (!transitionTargets[before.status]?.includes(input.to)) fail(409, "INVALID_TRANSITION", "Esta mudança de estado não é permitida.");
			const reason = text(input.reason, "reason"), date = new Date(now()).toISOString(), references = [], extraEvents = [];
			const specific = input.to === "confirmed" ? ["supportRefs", "contestAssessments"] : input.to === "monitoring" ? ["updateId"] : input.to === "closed" ? ["updateId", "closureReason"] : input.to === "discarded" ? ["discardReason"] : before.status === "received" ? [] : ["reopenRequestId"];
			if (Object.keys(input).some((key) => ![
				"expectedVersion",
				"to",
				"reason",
				...specific
			].includes(key))) fail(422, "VALIDATION_ERROR", "Há campos de outra transição neste envio.");
			const reference = (type, row, assessment) => ({
				type,
				id: row.id,
				occurrenceVersion: row.occurrenceId ? repository.occurrence(row.occurrenceId).version : row.version,
				snapshot: row,
				...assessment ? { assessment } : {}
			});
			if (before.status === "received" && input.to === "community_review") validateOccurrenceInput({
				category: before.category,
				description: before.description,
				latitude: before.latitude,
				longitude: before.longitude
			});
			if (input.to === "confirmed") {
				if (!Array.isArray(input.supportRefs) || !input.supportRefs.length) fail(422, "SUPPORT_REQUIRED", "A confirmação exige ao menos um suporte visível independente do criador.", { supportRefs: "Selecione suporte independente." });
				const ids = new Set();
				for (const ref of input.supportRefs) {
					if (!ref || ![
						"stance",
						"contribution",
						"occurrence"
					].includes(ref.type) || typeof ref.id !== "string" || ids.has(ref.type + ":" + ref.id)) fail(422, "INVALID_REFERENCE", "Referências de suporte inválidas ou repetidas.");
					ids.add(ref.type + ":" + ref.id);
					let row;
					if (ref.type === "stance") {
						row = repository.stance(ref.id);
						if (!row || row.occurrenceId !== id || row.visibility !== "visible" || !row.active || row.type !== "support" || row.userId === before.authorId) fail(422, "INVALID_REFERENCE", "O apoio deve estar ativo, visível e ser independente do autor nesta ocorrência.");
						if (row.userId === user.id) fail(403, "SELF_DECISION", "Outro administrador deve revisar apoio/ocorrência de própria autoria.");
					} else if (ref.type === "contribution") {
						row = contribution(ref.id, before, user, { kind: "observation" });
						if (row.authorId === before.authorId) fail(422, "INVALID_REFERENCE", "O complemento de observação deve ser independente do criador.");
					} else {
						row = repository.occurrence(ref.id);
						if (!row || row.visibility !== "visible" || row.duplicateOfId || row.status === "discarded" || row.authorId === before.authorId || !repository.related(id, row.id)) fail(422, "INVALID_REFERENCE", "Referencie uma ocorrência relacionada visível e independente, sem duplicata ou descarte.");
						if (row.authorId === user.id) fail(403, "SELF_DECISION", "Outro administrador deve revisar sua ocorrência usada como suporte.");
					}
					references.push(reference(ref.type, row));
				}
				const contests = repository.contests(id), assessments = input.contestAssessments ?? [];
				if (!Array.isArray(assessments) || assessments.length !== contests.length) fail(422, "CONTEST_ASSESSMENT_REQUIRED", "Examine individualmente todas as contestações ativas e visíveis.", { contestAssessments: "Um parecer por contestação ativa visível." });
				const seen = new Set();
				for (const assessment of assessments) {
					const row = contests.find((row) => row.id === assessment.stanceId);
					if (!row || seen.has(row.id)) fail(422, "CONTEST_ASSESSMENT_REQUIRED", "Parecer de contestação inválido, repetido ou de outra ocorrência.");
					seen.add(row.id);
					references.push(reference("stance", row, text(assessment.assessment, "contestAssessments")));
				}
			}
			if (input.to === "monitoring" || input.to === "closed") {
				if (input.to === "closed" && input.closureReason !== "resolved") fail(422, "VALIDATION_ERROR", "Encerramento exige resolução relatada.", { closureReason: "Use resolved." });
				const row = contribution(input.updateId, before, user, { kind: input.to === "closed" ? "resolution" : undefined });
				references.push(reference("contribution", row));
			}
			if (input.to === "discarded" && !["invalid", "out_of_scope"].includes(input.discardReason)) fail(422, "VALIDATION_ERROR", "Informe o motivo de descarte.", { discardReason: "Escolha invalid ou out_of_scope." });
			let reopen;
			if (input.to === "community_review" && before.status !== "received") {
				reopen = contribution(input.reopenRequestId, before, user, { type: "reopen_request" });
				if (reopen.requestStatus !== "pending") fail(422, "INVALID_REFERENCE", "Reabertura exige pedido pendente com fato novo.");
			}
			try {
				const result = domainTransaction(db, {
					expectedVersions: { [id]: input.expectedVersion },
					createdAt: date,
					mutate() {
						if (reopen) {
							for (const row of repository.pending(id)) {
								const status = row.id === reopen.id ? "accepted" : "superseded";
								repository.requestStatus(row.id, status, date);
								const after = repository.contribution(row.id);
								extraEvents.push({
									occurrenceId: id,
									entityType: "contribution",
									entityId: row.id,
									actorId: user.id,
									action: status === "accepted" ? "reopen_accepted" : "reopen_superseded",
									before: row,
									after
								});
								if (row.id === reopen.id) references.push(reference("contribution", after));
							}
						}
						repository.update(id, input.to, input.to === "closed" ? "resolved" : null, input.to === "discarded" ? input.discardReason : null);
						const after = {
							...repository.occurrence(id),
							version: before.version + 1,
							updatedAt: date
						};
						return { events: [{
							occurrenceId: id,
							entityType: "occurrence",
							entityId: id,
							actorId: user.id,
							action: "transition",
							reason,
							before,
							after,
							references
						}, ...extraEvents] };
					}
				});
				return { occurrenceVersion: result.versions[id] };
			} catch (error) {
				if (error instanceof VersionConflict) fail(409, "VERSION_CONFLICT", "A ocorrência mudou. Recarregue e revise antes de enviar novamente.");
				throw error;
			}
		}).immediate();
	} };
}


export function normalizeAccountEmail(email) {
 if (typeof email !== "string" || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
  throw new AuthError(422, "INVALID_EMAIL", "Informe um e-mail válido.", {email: "Informe um e-mail válido."});
 return email.trim().toLowerCase();
}
