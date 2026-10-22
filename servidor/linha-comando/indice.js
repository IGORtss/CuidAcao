/**
 * Comandos locais: início da API, preparação do banco e operação da apresentação.
 * Edite este arquivo diretamente. Guia: apoio/documentacao/ESTRUTURA.md.
 *
 * 1. Base fictícia inicial, somente quando vazia
 * 2. Cenários fictícios da apresentação
 * 3. Preparação, backup e restauração
 * 4. Iniciar a API local
 * 5. Comandos de migração e seed
 * 6. Iniciar a apresentação
 * 7. Comandos da apresentação
 */
import { pathToFileURL } from "node:url";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { administrationService, attachmentService, authService, contributionService, domainTransaction, hashPassword, linkService, occurrenceWrites, stanceService, transitionService } from "../dominio/indice.js";
import sharp from "sharp";
import { attachmentStorage, defaultDatabasePath, migrate, openDatabase } from "../dados/banco-de-dados.js";
import Database from "better-sqlite3";
import { chmodSync, closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, parse, resolve } from "node:path";
import { createApp } from "../http/aplicacao.js";
import { defaultApiPort, demoWebOptions } from "../../configuracao/vite.configuracao.js";

// ── Base fictícia inicial, somente quando vazia ──
const tables = [
	"google_identities",
	"google_flows",
	"firebase_identities",
	"firebase_flows",
	"account_tokens",
	"subscriptions",
	"saved_queries",
	"notification_reads",
	"users",
	"sessions",
	"occurrences",
	"contributions",
	"stances",
	"attachments",
	"occurrence_relations",
	"reports",
	"events"
];
function assertEmpty(db) {
	const allowed = new Set([
		...tables,
		"schema_migrations",
		"occurrence_sequence"
	]);
	const existing = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
	if (existing.some(({ name }) => !allowed.has(name))) throw new Error("Seed recusado: a base contém tabelas alheias à demonstração.");
	for (const table of tables) {
		/** Table names are a fixed internal allowlist, never caller input. */
		if (existing.some((row) => row.name === table) && db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get()) throw new Error("Seed recusado: a base contém dados.");
	}
	if (db.prepare("SELECT nextValue FROM occurrence_sequence WHERE singleton=1").get()?.nextValue !== 1) {
		throw new Error("Seed recusado: a sequência já foi utilizada.");
	}
}
/** Dedicated demonstration data, not fixture history or a public write API. */
const examples = [
	{
		id: "CA-001",
		title: "Resíduos junto à faixa de areia",
		category: "residuos",
		latitude: -23.9406,
		longitude: -46.1834,
		locationLabel: "Trecho ilustrativo da praia",
		description: "Relato fictício de embalagens e sacolas acumuladas na faixa de areia. Localização ilustrativa, sem verificação no mundo real.",
		target: "community_review"
	},
	{
		id: "CA-002",
		title: "Alteração aparente na água",
		category: "agua",
		latitude: -23.9398,
		longitude: -46.1795,
		locationLabel: "Ponto ilustrativo próximo à orla",
		description: "Observação fictícia de coloração diferente na água. Não confirma contaminação nem informa condições de banho.",
		target: "received"
	},
	{
		id: "CA-003",
		title: "Descarte de resíduos em área aberta",
		category: "residuos",
		latitude: -23.9366,
		longitude: -46.1832,
		locationLabel: "Área ilustrativa no bairro",
		description: "Relato fictício de resíduos acumulados em área aberta. A revisão e as atualizações fazem parte da simulação acadêmica.",
		target: "monitoring"
	},
	{
		id: "CA-004",
		title: "Limpeza acompanhada pela comunidade",
		category: "residuos",
		latitude: -23.9381,
		longitude: -46.1862,
		locationLabel: "Trecho ilustrativo de acesso à praia",
		description: "Relato fictício de resíduos num acesso à praia, seguido de atualização simulada sobre sua retirada. Não representa ação real.",
		target: "closed"
	}
];
export async function seed(db) {
	assertEmpty(db);
	const credentials = [];
	const users = [];
	/** Sequential derivation keeps memory bounded (one scrypt at a time). */
	for (const [username, role] of [
		["morador_demo_1", "user"],
		["morador_demo_2", "user"],
		["morador_demo_3", "user"],
		["admin_demo_1", "admin"],
		["admin_demo_2", "admin"]
	]) {
		const password = randomBytes(24).toString("base64url");
		users.push({
			id: randomUUID(),
			username,
			role,
			...await hashPassword(password)
		});
		credentials.push({
			username,
			role,
			password
		});
	}
	db.transaction(() => {
		/** Recheck under write lock after asynchronous hashing, before any insert. */
		assertEmpty(db);
		const userDate = "2026-10-01T10:00:00.000Z";
		for (const user of users) db.prepare(`INSERT INTO users
      (id,username,role,passwordHash,passwordSalt,passwordParams,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?)`).run(user.id, user.username, user.role, user.passwordHash, user.passwordSalt, user.passwordParams, userDate, userDate);
		let clock = Date.parse("2026-10-01T12:00:00.000Z");
		const time = () => new Date(clock += 6e4).toISOString();
		const snapshot = (id) => db.prepare("SELECT * FROM occurrences WHERE id=?").get(id);
		const apply = (id, mutate) => domainTransaction(db, {
			expectedVersions: { [id]: snapshot(id).version },
			createdAt: time(),
			mutate
		});
		for (const [index, example] of examples.entries()) {
			const authorId = users[index % 3].id;
			const adminId = users[3 + index % 2].id;
			const observerId = users[(index + 1) % 3].id;
			const createdAt = time();
			domainTransaction(db, {
				createdAt,
				mutate() {
					db.prepare(`INSERT INTO occurrences
          (id,authorId,title,description,category,latitude,longitude,locationLabel,status,simulated,visibility,version,createdAt,updatedAt)
          VALUES (?,?,?,?,?,?,?,?,'received',1,'visible',1,?,?)`).run(example.id, authorId, example.title, example.description, example.category, example.latitude, example.longitude, example.locationLabel, createdAt, createdAt);
					return { events: [{
						occurrenceId: example.id,
						entityType: "occurrence",
						entityId: example.id,
						actorId: authorId,
						action: "created",
						after: snapshot(example.id)
					}] };
				}
			});
			const transition = (to, reason, references = []) => apply(example.id, () => {
				const before = snapshot(example.id);
				db.prepare("UPDATE occurrences SET status=?,closureReason=? WHERE id=?").run(to, to === "closed" ? "resolved" : null, example.id);
				const after = {
					...snapshot(example.id),
					version: before.version + 1,
					updatedAt: new Date(clock).toISOString()
				};
				return { events: [{
					occurrenceId: example.id,
					entityType: "occurrence",
					entityId: example.id,
					actorId: adminId,
					action: "transition",
					reason,
					before,
					after,
					references
				}] };
			});
			if (example.target === "received") continue;
			transition("community_review", "Triagem fictícia: categoria, localização e descrição conferidas; conteúdo adequado para a demonstração.");
			if (example.target === "community_review") continue;
			const supportId = randomUUID();
			apply(example.id, () => {
				const createdAt = new Date(clock).toISOString();
				db.prepare(`INSERT INTO stances (id,occurrenceId,userId,type,reason,active,visibility,createdAt,updatedAt)
          VALUES (?,?,?,'support',?,1,'visible',?,?)`).run(supportId, example.id, observerId, "Observação fictícia independente: resíduos visíveis no ponto ilustrativo descrito pelo relato.", createdAt, createdAt);
				const after = db.prepare("SELECT * FROM stances WHERE id=?").get(supportId);
				return { events: [{
					occurrenceId: example.id,
					entityType: "stance",
					entityId: supportId,
					actorId: observerId,
					action: "created",
					after
				}] };
			});
			transition("confirmed", "O apoio independente relata observação do mesmo problema; não existem contestações ativas nesta simulação.", [{
				type: "stance",
				id: supportId,
				occurrenceVersion: snapshot(example.id).version,
				snapshot: db.prepare("SELECT * FROM stances WHERE id=?").get(supportId)
			}]);
			const kind = example.target === "closed" ? "resolution" : "observation";
			const contributionId = randomUUID();
			apply(example.id, () => {
				const createdAt = new Date(clock).toISOString();
				db.prepare(`INSERT INTO contributions (id,occurrenceId,authorId,type,kind,text,visibility,createdAt,updatedAt)
          VALUES (?,?,?,'supplement',?,?,'visible',?,?)`).run(contributionId, example.id, observerId, kind, kind === "resolution" ? "Atualização fictícia: os resíduos foram retirados e o acesso está livre nesta simulação." : "Atualização fictícia: ainda existem resíduos no local ilustrativo; a situação segue em acompanhamento.", createdAt, createdAt);
				return { events: [{
					occurrenceId: example.id,
					entityType: "contribution",
					entityId: contributionId,
					actorId: observerId,
					action: "created",
					after: db.prepare("SELECT * FROM contributions WHERE id=?").get(contributionId)
				}] };
			});
			transition(example.target, kind === "resolution" ? "Encerramento fictício por resolução relatada no complemento independente referenciado." : "Acompanhamento fictício baseado no complemento que atualiza a permanência do problema.", [{
				type: "contribution",
				id: contributionId,
				occurrenceVersion: snapshot(example.id).version,
				snapshot: db.prepare("SELECT * FROM contributions WHERE id=?").get(contributionId)
			}]);
		}
		db.prepare("UPDATE occurrence_sequence SET nextValue=? WHERE singleton=1").run(5);
	}).immediate();
	/** A linha de comando local exibe o texto somente após o commit. Ele nunca é salvo. */
	return credentials;
}

// ── Cenários fictícios da apresentação ──
export async function buildScenarios(db, uploadDirectory) {
	/** Time is issued by the preparation process, never supplied through HTTP. */
	/** Millisecond steps make ordering explicit without rewriting stored events. */
	let clock = Date.now();
	const now = () => clock++;
	const auth = authService(db, { now }), accounts = [];
	for (const [username, role] of [
		["morador_demo_1", "user"],
		["morador_demo_2", "user"],
		["morador_demo_3", "user"],
		["admin_demo_1", "admin"],
		["admin_demo_2", "admin"]
	]) {
		const password = randomBytes(24).toString("base64url");
		const user = await auth.register({
			username,
			password
		});
		/** D01: privileged accounts are provisioned locally, never by registration API. */
		if (role === "admin") db.prepare("UPDATE users SET role=? WHERE id=?").run(role, user.id);
		accounts.push({
			...user,
			role,
			password
		});
	}
	const [author, observer, challenger, admin, reviewer] = accounts;
	const writes = occurrenceWrites(db, { now, allowPreparedRepresentation: true }), contributions = contributionService(db, { now }), stances = stanceService(db, { now }), transitions = transitionService(db, { now }), administration = administrationService(db, { now }), links = linkService(db, { now });
	const images = attachmentService(db, attachmentStorage(uploadDirectory), { now });
	images.initialize();
	const illustration = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#193f3b"/><path d="M0 260Q160 170 320 260T640 260V360H0" fill="#d6b986"/><rect x="38" y="38" width="564" height="148" rx="12" fill="#f2e4cb"/><text x="320" y="94" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#193f3b">ILUSTRAÇÃO FICTÍCIA</text><text x="320" y="136" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#193f3b">CuidAção · teste acadêmico</text><text x="320" y="166" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#193f3b">Não é fotografia nem evidência de fato real</text></svg>`)).png().toBuffer();
	const version = (id) => db.prepare("SELECT version FROM occurrences WHERE id=?").get(id).version;
	const scenarios = [];
	const create = (key, title, category, user, latitude, longitude, environmentalRepresentation) => {
		const id = writes.create(user, {
			title: "[Fictício] " + title,
			category,
			description: `Simulação acadêmica do TCC CuidAção: ${title.toLowerCase()}. Este relato foi inventado exclusivamente para demonstrar o sistema; não descreve fatos reais, pessoas ou ações no Perequê.`,
			latitude,
			longitude,
			locationLabel: "Ponto ilustrativo da demonstração — sem precisão oficial",
			...environmentalRepresentation ? { environmentalRepresentation } : {}
		});
		scenarios.push({
			key,
			id,
			title: "[Fictício] " + title,
			author: user.username
		});
		return id;
	};
	const addImage = (user, id, contributionId = null) => images.upload(user, id, {
		expectedVersion: version(id),
		buffer: illustration,
		caption: "Ilustração fictícia do TCC: formas gráficas, sem fotografia ou fato real.",
		contributionId
	});
	const move = (id, to, extra = {}, actor = admin) => transitions.transition(actor, id, {
		expectedVersion: version(id),
		to,
		reason: "Revisão fictícia independente para demonstrar o ciclo acadêmico; não constitui laudo técnico.",
		...extra
	});
	const contribute = (user, id, type, text, kind) => contributions.create(user, id, {
		expectedVersion: version(id),
		type,
		text,
		...kind ? { kind } : {}
	}).data;
	const stance = (user, id, type) => stances.set(user, id, {
		expectedVersion: version(id),
		type,
		reason: type === "support" ? "Apoio fictício: na simulação, observei a situação descrita pelo outro autor." : "Contestação fictícia: na simulação, a observação pode representar situação diferente."
	}).data;
	const confirm = (id, support) => move(id, "confirmed", {
		supportRefs: [{
			type: "stance",
			id: support.id
		}],
		contestAssessments: []
	});
	const received = create("received", "Relato para o fluxo ao vivo", "agua", author, -23.9406, -46.1834);
	const review = create("community_review", "Relatos em verificação comunitária", "residuos", author, -23.9398, -46.1795);
	const confirmed = create("confirmed", "Observação confirmada na simulação", "agua", observer, -23.9366, -46.1832);
	const monitoring = create("monitoring", "Acompanhamento ilustrativo de resíduos", "residuos", author, -23.9381, -46.1862);
	const closed = create("closed", "Resolução relatada e pedido de reabertura", "residuos", author, -23.943, -46.187);
	const discarded = create("discarded", "Relato descartado após revisão fictícia", "agua", observer, -23.933, -46.172);
	const duplicate = create("duplicate", "Outro relato do mesmo problema simulado", "residuos", challenger, -23.9399, -46.1796);
	const hidden = create("hidden", "Conteúdo reservado à revisão administrativa", "agua", observer, -23.947, -46.19);
	const point = (longitude, latitude) => ({ type: "Point", coordinates: [longitude, latitude] });
	const polygon = (coordinates) => ({ type: "Polygon", coordinates: [coordinates] });
	create("map_water_quality", "Ponto demonstrativo de qualidade da água", "agua", author, -23.9417, -46.1812, {
		type: "water_quality",
		geometry: point(-46.1812, -23.9417),
		accuracy: "verified",
		measurement: {
			label: "pH",
			value: 7.2,
			unit: "pH",
			measuredAt: new Date(now()).toISOString(),
			source: "Base demonstrativa fictícia do CuidAção",
			stationId: "PEREQUE-DEMO-01"
		}
	});
	create("map_waste", "Área demonstrativa de resíduos delimitados", "residuos", observer, -23.9375, -46.1871, {
		type: "waste",
		geometry: polygon([[ -46.18755, -23.93775 ], [ -46.18685, -23.93782 ], [ -46.1866, -23.93738 ], [ -46.18718, -23.9371 ], [ -46.18755, -23.93775 ]]),
		accuracy: "approximate"
	});
	create("map_erosion", "Trecho demonstrativo de erosão costeira", "agua", challenger, -23.9438, -46.1842, {
		type: "erosion",
		geometry: { type: "LineString", coordinates: [[ -46.185, -23.94415 ], [ -46.18435, -23.94382 ], [ -46.1837, -23.94355 ]] },
		accuracy: "verified"
	});
	create("map_sewage", "Ponto demonstrativo de esgoto aparente", "agua", author, -23.9348, -46.1778, {
		type: "apparent_sewage",
		geometry: point(-46.1778, -23.9348),
		accuracy: "approximate"
	});
	create("map_flooding", "Área demonstrativa sujeita a alagamento", "agua", observer, -23.9328, -46.1845, {
		type: "flooding",
		geometry: polygon([[ -46.18505, -23.93315 ], [ -46.18425, -23.9332 ], [ -46.18395, -23.93265 ], [ -46.1847, -23.93235 ], [ -46.18505, -23.93315 ]]),
		accuracy: "approximate"
	});
	create("map_vegetation", "Extensão demonstrativa de vegetação registrada", "residuos", challenger, -23.9462, -46.1792, {
		type: "vegetation",
		geometry: polygon([[ -46.1798, -23.94655 ], [ -46.1789, -23.94662 ], [ -46.17862, -23.94605 ], [ -46.17935, -23.94575 ], [ -46.1798, -23.94655 ]]),
		accuracy: "verified"
	});
	for (const [id, user] of [
		[received, author],
		[review, author],
		[monitoring, author],
		[closed, author],
		[duplicate, challenger],
		[hidden, observer]
	]) await addImage(user, id);
	move(review, "community_review");
	contribute(observer, review, "comment", "Comentário fictício para a apresentação: este registro é somente um exemplo acadêmico.");
	const observation = contribute(observer, review, "supplement", "Observação fictícia: a imagem ilustrativa representa a informação complementar, sem documentar um fato real.", "observation");
	await addImage(observer, review, observation.id);
	stance(observer, review, "support");
	stance(challenger, review, "contest");
	move(confirmed, "community_review");
	confirm(confirmed, stance(author, confirmed, "support"));
	move(monitoring, "community_review");
	confirm(monitoring, stance(observer, monitoring, "support"));
	const update = contribute(observer, monitoring, "supplement", "Atualização fictícia: o problema inventado segue em acompanhamento para demonstrar a revisão.", "observation");
	move(monitoring, "monitoring", { updateId: update.id });
	move(closed, "community_review");
	confirm(closed, stance(observer, closed, "support"));
	const resolution = contribute(challenger, closed, "supplement", "Resolução fictícia: na simulação, a situação descrita deixou de ser observada. Isto não certifica qualquer ação ou condição real.", "resolution");
	await addImage(challenger, closed, resolution.id);
	move(closed, "closed", {
		updateId: resolution.id,
		closureReason: "resolved"
	});
	const request = contribute(observer, closed, "reopen_request", "Fato novo fictício: na simulação, a situação voltou a ser observada e precisa de outra revisão independente.");
	await addImage(observer, closed, request.id);
	move(discarded, "discarded", {
		discardReason: "invalid",
		reason: "Relato fictício inválido para esta simulação após revisão independente; descarte justificado, sem alegação sobre o bairro."
	});
	move(duplicate, "community_review");
	contribute(author, duplicate, "comment", "Comentário fictício conservado no registro de origem, sem transferência para a principal.");
	stance(observer, duplicate, "support");
	links.change(admin, duplicate, "duplicate_linked", {
		principalId: review,
		expectedVersions: {
			[duplicate]: version(duplicate),
			[review]: version(review)
		},
		reason: "Mesmo fato inventado, mesmo ponto ilustrativo e mesmo contexto temporal na simulação; principal mais antiga."
	});
	links.change(admin, review, "relation_added", {
		relatedId: confirmed,
		expectedVersions: {
			[review]: version(review),
			[confirmed]: version(confirmed)
		},
		reason: "Problemas fictícios distintos relacionados no roteiro acadêmico; vínculo não unifica estados nem participações."
	});
	const pending = administration.report(challenger, {
		expectedVersion: version(review),
		targetType: "occurrence",
		targetId: review,
		reason: "Denúncia fictícia pendente para demonstrar revisão privada de conteúdo, sem denúncia real."
	}).data;
	const moderated = administration.report(challenger, {
		expectedVersion: version(hidden),
		targetType: "occurrence",
		targetId: hidden,
		reason: "Solicitação fictícia de revisão deste conteúdo demonstrativo, sem informação pessoal ou fato real."
	}).data;
	administration.decide(reviewer, moderated.id, {
		expectedVersion: version(hidden),
		decision: "upheld",
		reason: "Conteúdo fictício ocultado para demonstrar privacidade e restauração; estado preservado, sem exclusão física."
	});
	for (const scenario of scenarios) {
		const row = db.prepare("SELECT status,visibility,duplicateOfId,version FROM occurrences WHERE id=?").get(scenario.id);
		Object.assign(scenario, row);
	}
	return {
		credentials: accounts,
		illustration,
		scenarios,
		reportId: pending.id,
		reopenRequestId: request.id,
		preparedAt: new Date(now()).toISOString()
	};
}

// ── Preparação, backup e restauração ──
const markerName = ".cuidacao-demo.json";
const lockName = ".demo.lock";
export const defaultDemoDirectory = resolve(import.meta.dirname, "../../demo-data");
const inside = (parent, path) => path === parent || path.startsWith(parent + "/");
const fail = (message) => {
	throw new Error(message);
};
const digest = (buffer) => createHash("sha256").update(buffer).digest("hex");
function noSymlinks(path) {
	const absolute = resolve(path);
	let part = parse(absolute).root;
	for (const name of absolute.slice(part.length).split("/").filter(Boolean)) {
		part = join(part, name);
		if (existsSync(part) || (() => {
			try {
				lstatSync(part);
				return true;
			} catch {
				return false;
			}
		})()) {
			if (lstatSync(part).isSymbolicLink()) fail("Caminhos simbólicos não são permitidos na demonstração.");
		}
	}
}
function treeSafe(path) {
	noSymlinks(path);
	if (!existsSync(path)) return;
	for (const name of readdirSync(path)) {
		const file = join(path, name), stat = lstatSync(file);
		if (stat.isSymbolicLink()) fail("Arquivo simbólico não permitido.");
		if (stat.isDirectory()) treeSafe(file);
		else if (!stat.isFile()) fail("Tipo de arquivo não permitido.");
	}
}
export function demoDirectory(value = process.env.CUIDACAO_DEMO_DIR ?? defaultDemoDirectory) {
	const root = resolve(value);
	if (!/^(?:demo-data|cuidacao-demo(?:-[a-z0-9-]+)?)$/.test(basename(root))) fail("Use pasta dedicada demo-data ou cuidacao-demo[-nome].");
	noSymlinks(root);
	const protectedPaths = [
		resolve(import.meta.dirname, "../../data"),
		defaultDatabasePath,
		process.env.CUIDACAO_DB_PATH && resolve(process.env.CUIDACAO_DB_PATH),
		process.env.CUIDACAO_UPLOAD_DIR && resolve(process.env.CUIDACAO_UPLOAD_DIR)
	].filter(Boolean);
	if (protectedPaths.some((path) => inside(root, path) || inside(path, root))) fail("Diretório conflita com a base de uso; operação recusada.");
	return root;
}
function empty(root) {
	noSymlinks(root);
	if (existsSync(root) && (!lstatSync(root).isDirectory() || readdirSync(root).length)) fail("Preparação recusada: diretório preenchido. Nenhum dado foi sobrescrito.");
}
function identified(root) {
	root = demoDirectory(root);
	treeSafe(root);
	const marker = JSON.parse(readFileSync(join(root, markerName), "utf8"));
	if (marker.kind !== "cuidacao-demo" || marker.format !== 1 || marker.directory !== root || !/^[0-9a-f-]{36}$/.test(marker.id)) fail("Diretório demonstrativo não identificado.");
	return marker;
}
export function acquireDemoLock(root) {
	identified(root);
	const path = join(root, lockName), value = JSON.stringify({
		pid: process.pid,
		nonce: randomUUID()
	});
	let fd;
	try {
		fd = openSync(path, "wx", 384);
	} catch (error) {
		if (error.code === "EEXIST") fail("Demonstração em uso ou lock pendente. Pare demo:start antes da operação.");
		throw error;
	}
	try {
		writeFileSync(fd, value);
		fsyncSync(fd);
	} finally {
		closeSync(fd);
	}
	return () => {
		if (existsSync(path) && readFileSync(path, "utf8") === value) unlinkSync(path);
	};
}
function writePrivate(path, data) {
	mkdirSync(dirname(path), {
		recursive: true,
		mode: 0o700
	});
	const fd = openSync(path, "wx", 384);
	try {
		writeFileSync(fd, data);
		fsyncSync(fd);
	} finally {
		closeSync(fd);
	}
}
const json = (path, value) => writePrivate(path, JSON.stringify(value, null, 2) + "\n");
function syncDirectory(path) {
	const fd = openSync(path, "r");
	try {
		fsyncSync(fd);
	} finally {
		closeSync(fd);
	}
}
function databaseValid(path) {
	const db = new Database(path, {
		readonly: true,
		fileMustExist: true
	});
	try {
		if (db.pragma("integrity_check", { simple: true }) !== "ok" || db.pragma("foreign_key_check").length) fail("Backup com banco inconsistente.");
		return db.prepare("SELECT storageKey,byteSize FROM attachments ORDER BY storageKey").all();
	} finally {
		db.close();
	}
}
const allowedFile = (path) => [
	"db.sqlite",
	"credentials.json",
	"scenarios.json",
	"examples/ilustracao.png"
].includes(path) || /^uploads\/[0-9a-f-]{36}\.(?:jpeg|png|webp)$/.test(path);
export function validateSnapshot(directory) {
	treeSafe(directory);
	const manifest = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8"));
	if (manifest.kind !== "cuidacao-demo-snapshot" || manifest.format !== 1 || !Array.isArray(manifest.files)) fail("Snapshot demonstrativo inválido.");
	const names = new Set();
	for (const entry of manifest.files) {
		if (!allowedFile(entry.path) || names.has(entry.path)) fail("Caminho inválido/repetido no backup.");
		names.add(entry.path);
		const bytes = readFileSync(join(directory, entry.path));
		if (bytes.length !== entry.size || digest(bytes) !== entry.sha256) fail("Backup alterado ou incompleto.");
	}
	for (const path of [
		"db.sqlite",
		"credentials.json",
		"scenarios.json",
		"examples/ilustracao.png"
	]) if (!names.has(path)) fail("Backup incompleto.");
	const rows = databaseValid(join(directory, "db.sqlite"));
	if (rows.some((row) => !names.has("uploads/" + row.storageKey) || lstatSync(join(directory, "uploads", row.storageKey)).size !== row.byteSize) || names.size !== 4 + rows.length) fail("Banco e anexos do backup não correspondem.");
	const credentials = JSON.parse(readFileSync(join(directory, "credentials.json"), "utf8"));
	if (!Array.isArray(credentials) || credentials.length < 5) fail("Contas demonstrativas incompletas.");
	return manifest;
}
async function snapshot(source, destination, sourceId) {
	treeSafe(source);
	empty(destination);
	mkdirSync(destination, {
		recursive: true,
		mode: 0o700
	});
	const db = new Database(join(source, "db.sqlite"), {
		readonly: true,
		fileMustExist: true
	});
	try {
		await db.backup(join(destination, "db.sqlite"));
		chmodSync(join(destination, "db.sqlite"), 384);
	} finally {
		db.close();
	}
	/** Copy only immutable, retained files referenced by this SQLite snapshot. */
	const names = [
		"db.sqlite",
		"credentials.json",
		"scenarios.json",
		"examples/ilustracao.png",
		...databaseValid(join(destination, "db.sqlite")).map((row) => "uploads/" + row.storageKey)
	];
	if (names.some((path) => !allowedFile(path))) fail("Chave de anexo inválida no banco demonstrativo.");
	for (const path of names.slice(1)) writePrivate(join(destination, path), readFileSync(join(source, path)));
	json(join(destination, "manifest.json"), {
		kind: "cuidacao-demo-snapshot",
		format: 1,
		sourceId,
		createdAt: new Date().toISOString(),
		files: names.map((path) => {
			const bytes = readFileSync(join(destination, path));
			return {
				path,
				size: bytes.length,
				sha256: digest(bytes)
			};
		})
	});
	validateSnapshot(destination);
	syncDirectory(destination);
}
function copySnapshot(source, destination) {
	const manifest = validateSnapshot(source);
	empty(destination);
	mkdirSync(destination, {
		recursive: true,
		mode: 0o700
	});
	for (const entry of manifest.files) writePrivate(join(destination, entry.path), readFileSync(join(source, entry.path)));
	const db = openDatabase(join(destination, "db.sqlite"));
	try {
		db.prepare("DELETE FROM sessions").run();
		if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='account_tokens'").get()) db.prepare("DELETE FROM account_tokens").run();
		if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='google_flows'").get()) db.prepare("DELETE FROM google_flows").run();
		if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='firebase_flows'").get()) db.prepare("DELETE FROM firebase_flows").run();
		db.pragma("wal_checkpoint(TRUNCATE)");
	} finally {
		db.close();
	}
	databaseValid(join(destination, "db.sqlite"));
	syncDirectory(destination);
}
function marker(root) {
	const value = {
		kind: "cuidacao-demo",
		format: 1,
		id: randomUUID(),
		directory: root,
		createdAt: new Date().toISOString()
	};
	json(join(root, markerName), value);
	return value;
}
export async function prepareDemo(value) {
	const root = demoDirectory(value);
	empty(root);
	mkdirSync(root, {
		recursive: true,
		mode: 0o700
	});
	const identity = marker(root), release = acquireDemoLock(root), stage = join(root, ".prepare-" + randomUUID());
	let db;
	try {
		mkdirSync(stage, { mode: 0o700 });
		db = openDatabase(join(stage, "db.sqlite"));
		chmodSync(join(stage, "db.sqlite"), 384);
		migrate(db);
		const { credentials, illustration, ...index } = await buildScenarios(db, join(stage, "uploads"));
		json(join(stage, "credentials.json"), credentials);
		json(join(stage, "scenarios.json"), index);
		writePrivate(join(stage, "examples", "ilustracao.png"), illustration);
		db.pragma("wal_checkpoint(TRUNCATE)");
		db.close();
		db = null;
		await snapshot(stage, join(root, "initial"), identity.id);
		renameSync(stage, join(root, "current"));
		syncDirectory(root);
		return root;
	} catch (error) {
		if (db?.open) db.close();
		rmSync(stage, {
			recursive: true,
			force: true
		});
		rmSync(join(root, "initial"), {
			recursive: true,
			force: true
		});
		unlinkSync(join(root, markerName));
		throw error;
	} finally {
		release();
	}
}
async function backupUnlocked(root) {
	const identity = identified(root), parent = join(root, "backups");
	mkdirSync(parent, {
		recursive: true,
		mode: 0o700
	});
	const name = new Date().toISOString().replaceAll(":", "-") + "-" + randomUUID(), destination = join(parent, name), stage = join(parent, ".pending-" + randomUUID());
	try {
		await snapshot(join(root, "current"), stage, identity.id);
		renameSync(stage, destination);
		syncDirectory(parent);
		return destination;
	} catch (error) {
		rmSync(stage, {
			recursive: true,
			force: true
		});
		throw error;
	}
}
export async function backupDemo(value) {
	const root = demoDirectory(value), release = acquireDemoLock(root);
	try {
		return await backupUnlocked(root);
	} finally {
		release();
	}
}
export async function resetDemo(value, { environment = process.env.CUIDACAO_ENV, confirmed = false } = {}) {
	if (environment !== "demo" || !confirmed) fail("Reset exige CUIDACAO_ENV=demo e --confirm-demo-reset.");
	const root = demoDirectory(value), release = acquireDemoLock(root), stage = join(root, ".reset-" + randomUUID()), previous = join(root, ".previous-" + randomUUID());
	let moved = false, installed = false;
	try {
		/** Valide o estado inicial primeiro. Só altere o estado atual depois que o backup terminar. */
		validateSnapshot(join(root, "initial"));
		const backup = await backupUnlocked(root);
		copySnapshot(join(root, "initial"), stage);
		renameSync(join(root, "current"), previous);
		moved = true;
		renameSync(stage, join(root, "current"));
		installed = true;
		syncDirectory(root);
		rmSync(previous, { recursive: true });
		return backup;
	} catch (error) {
		if (moved && !installed) renameSync(previous, join(root, "current"));
		throw error;
	} finally {
		rmSync(stage, {
			recursive: true,
			force: true
		});
		release();
	}
}
export async function restoreDemo(source, value) {
	const root = demoDirectory(value);
	empty(root);
	validateSnapshot(resolve(source));
	mkdirSync(root, {
		recursive: true,
		mode: 0o700
	});
	const identity = marker(root), release = acquireDemoLock(root), stage = join(root, ".restore-" + randomUUID());
	try {
		copySnapshot(resolve(source), stage);
		await snapshot(stage, join(root, "initial"), identity.id);
		renameSync(stage, join(root, "current"));
		syncDirectory(root);
		return root;
	} catch (error) {
		rmSync(stage, {
			recursive: true,
			force: true
		});
		rmSync(join(root, "initial"), {
			recursive: true,
			force: true
		});
		unlinkSync(join(root, markerName));
		throw error;
	} finally {
		release();
	}
}
export function currentDemo(value) {
	const root = demoDirectory(value);
	identified(root);
	const current = join(root, "current");
	databaseValid(join(current, "db.sqlite"));
	return {
		root,
		databasePath: join(current, "db.sqlite"),
		uploadDirectory: join(current, "uploads")
	};
}

// ── Iniciar a API local ──
export async function startApi() {
	const app = createApp({
		databasePath: process.env.CUIDACAO_DB_PATH,
		uploadDirectory: process.env.CUIDACAO_UPLOAD_DIR,
		logger: true
	});
	const shutdown = async () => {
		await app.close();
	};
	const host = process.env.CUIDACAO_HOST || "127.0.0.1";
	const port = Number(process.env.CUIDACAO_PORT || defaultApiPort);
	process.once("SIGINT", shutdown);
	process.once("SIGTERM", shutdown);
	try {
		/** Local API only. Database preparation is explicit via db:migrate/db:seed. */
		await app.listen({
			host,
			port
		});
	} catch {
		console.error(`Não foi possível iniciar a API local em ${host}:${port}.`);
		await app.close();
		process.exitCode = 1;
	}
}

// ── Comandos de migração e seed ──
export async function runDatabaseCommand() {
	const operation = process.argv[2];
	if (!["migrate", "seed"].includes(operation) || process.argv.length !== 3) {
		console.error("Use npm run db:migrate ou npm run db:seed.");
		process.exitCode = 1;
	} else {
		let db;
		try {
			db = openDatabase(process.env.CUIDACAO_DB_PATH || undefined);
			if (operation === "migrate") {
				const versions = migrate(db);
				console.log(versions.length ? `Migrações aplicadas: ${versions.join(", ")}.` : "Migrações já aplicadas; dados preservados.");
			} else {
				/** Seed requires a previously migrated schema; it never resets a database. */
				const credentials = await seed(db);
				console.log("Seed fictício concluído. Credenciais locais (não salve no repositório):");
				for (const { username, role, password } of credentials) console.log(`${username} (${role}): ${password}`);
			}
		} catch (error) {
			console.error(`Operação não concluída: ${error.message}`);
			process.exitCode = 1;
		} finally {
			db?.close();
		}
	}
}

// ── Iniciar a apresentação ──
export async function startDemo() {
	const { createServer } = await import("vite");
	let api, vite, release, closing;
	async function close() {
		return closing ??= (async () => {
			try {
				await vite?.close();
				await api?.close();
			} finally {
				release?.();
			}
		})();
	}
	for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => {
		close().then(() => process.exit(0));
	});
	try {
		const configuration = currentDemo();
		release = acquireDemoLock(configuration.root);
		api = createApp({
			...configuration,
			webOrigin: "http://127.0.0.1:5174"
		});
		await api.listen({
			host: "127.0.0.1",
			port: 3001
		});
		vite = await createServer(demoWebOptions(configuration.root, 5174, 3001));
		await vite.listen();
		console.log("Apresentação fictícia: http://127.0.0.1:5174 · banco/anexos exclusivos em " + configuration.root + "/current");
	} catch (error) {
		console.error("Demonstração não iniciada: " + error.message);
		await close();
		process.exitCode = 1;
	}
}

// ── Comandos da apresentação ──
export async function runDemoCommand() {
	const [command, ...args] = process.argv.slice(2);
	const operation = command.replace("demo:", "");
	try {
		if (operation === "prepare" && args.length === 0) {
			const root = await prepareDemo();
			console.log("Demonstração preparada em " + root + "; contas locais em current/credentials.json.");
		} else if (operation === "backup" && args.length === 0) console.log("Backup verificado: " + await backupDemo());
		else if (operation === "reset" && args.length === 1 && args[0] === "--confirm-demo-reset") console.log("Cenário inicial restaurado; backup anterior: " + await resetDemo(undefined, { confirmed: true }));
		else if (operation === "restore" && args.length === 4 && args[0] === "--backup" && args[2] === "--target") console.log("Backup restaurado em pasta separada: " + await restoreDemo(args[1], demoDirectory(args[3])));
		else throw new Error("Use demo:prepare, demo:backup, demo:reset -- --confirm-demo-reset ou demo:restore -- --backup PASTA --target PASTA-VAZIA.");
	} catch (error) {
		console.error("Operação demonstrativa recusada: " + error.message);
		process.exitCode = 1;
	}
}


// ── Entrada pelo terminal; importar este arquivo não inicia processos ──
if (import.meta.url === pathToFileURL(process.argv[1] ? resolve(process.argv[1]) : "").href) {
 const command = process.argv[2];
 if (command === "start" && process.argv.length === 3) await startApi();
 else if (["migrate", "seed"].includes(command)) await runDatabaseCommand();
 else if (command === "demo:start" && process.argv.length === 3) await startDemo();
 else if (["demo:prepare", "demo:backup", "demo:reset", "demo:restore"].includes(command)) await runDemoCommand();
 else { console.error("Use os comandos npm descritos no README.md."); process.exitCode = 1; }
}
