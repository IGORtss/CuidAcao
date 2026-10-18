import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../../servidor/http/aplicacao.js";
import { migrate, openDatabase } from "../../../servidor/dados/banco-de-dados.js";

const origin = "http://localhost:5173";
const password = "Senha fictícia preferências 123";

async function setup(t) {
	const directory = mkdtempSync(join(tmpdir(), "cuidacao-preferences-"));
	const filename = join(directory, "preferences.sqlite");
	const db = openDatabase(filename);
	migrate(db);
	let clock = Date.now();
	const app = createApp({ db, webOrigin: origin, now: () => clock });
	t.after(async () => {
		await app.close();
		if (db.open) db.close();
		rmSync(directory, { recursive: true, force: true });
	});
	async function account(username) {
		const credentials = { username, password };
		assert.equal((await app.inject({ method: "POST", url: "/api/v1/auth/register", headers: { origin }, payload: credentials })).statusCode, 201);
		const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", headers: { origin }, payload: credentials });
		return { id: login.json().data.id, cookie: login.headers["set-cookie"].split(";")[0] };
	}
	const user = await account("explorador_demo"), other = await account("outro_explorador");
	const request = (method, path, payload = {}, accountValue = user, requestOrigin = origin) => app.inject({ method, url: "/api/v1" + path, headers: { origin: requestOrigin, cookie: accountValue.cookie }, ...method === "GET" ? {} : { payload } });
	return { app, db, filename, user, other, request, advance(milliseconds) { clock += milliseconds; } };
}

test("acompanhamentos, consultas e notificações internas persistem com autorização", async (t) => {
	const { app, db, filename, user, other, request, advance } = await setup(t);
	assert.equal((await app.inject("/api/v1/account/subscriptions")).statusCode, 401);
	const occurrence = await request("POST", "/occurrences", { category: "residuos", description: "Relato fictício suficiente para acompanhar atualizações.", latitude: -23.94, longitude: -46.18 });
	assert.equal(occurrence.statusCode, 201, occurrence.body);
	const id = occurrence.json().data.id;
	assert.equal((await request("POST", "/account/subscriptions", { kind: "occurrence", occurrenceId: id, label: "Relato acompanhado" }, user, "http://example.invalid")).statusCode, 403);
	const followed = await request("POST", "/account/subscriptions", { kind: "occurrence", occurrenceId: id, label: "Relato acompanhado" });
	assert.equal(followed.statusCode, 201, followed.body);
	const place = await request("POST", "/account/subscriptions", { kind: "place", label: "Trecho acompanhado", geometry: { type: "Point", coordinates: [-46.18, -23.94] }, radiusMeters: 500 });
	assert.equal(place.statusCode, 201, place.body);
	const areaGeometry = { type: "Polygon", coordinates: [[[-46.181, -23.941], [-46.179, -23.941], [-46.179, -23.939], [-46.181, -23.941]]] };
	assert.equal((await request("POST", "/account/subscriptions", { kind: "area", label: "Área acompanhada", geometry: areaGeometry })).statusCode, 201);
	assert.equal((await request("POST", "/account/subscriptions", { kind: "area", label: "Área inválida", geometry: { type: "Polygon", coordinates: [] } })).statusCode, 422);
	assert.equal((await request("DELETE", `/account/subscriptions/${followed.json().data.id}`, {}, other)).statusCode, 404);

	const saved = await request("POST", "/account/saved-queries", { name: "Água recente", query: { category: "agua", period: "30", mode: "occurrences", layers: ["occurrences", "areas"] } });
	assert.equal(saved.statusCode, 201, saved.body);
	assert.equal((await request("POST", "/account/saved-queries", { name: "Consulta inválida", query: { privateToken: "não" } })).statusCode, 422);

	advance(1_000);
	const edited = await request("PATCH", `/occurrences/${id}`, { expectedVersion: 1, changes: { title: "Relato fictício acompanhado e atualizado" } });
	assert.equal(edited.statusCode, 200, edited.body);
	const notifications = await request("GET", "/account/notifications");
	assert.equal(notifications.statusCode, 200, notifications.body);
	assert.ok(notifications.json().data.some((row) => row.occurrenceId === id && row.action === "edited" && row.read === false));
	const eventId = notifications.json().data.find((row) => row.occurrenceId === id).eventId;
	assert.equal((await request("POST", `/account/notifications/${eventId}/read`, {})).statusCode, 204);
	assert.ok((await request("GET", "/account/notifications")).json().data.filter((row) => row.eventId === eventId).every((row) => row.read));

	assert.equal(db.prepare("SELECT count(*) AS total FROM subscriptions").get().total, 3);
	assert.equal(db.prepare("SELECT count(*) AS total FROM saved_queries").get().total, 1);
	await app.close();
	db.close();
	const restarted = createApp({ databasePath: filename, webOrigin: origin });
	try {
		const subscriptions = await restarted.inject({ url: "/api/v1/account/subscriptions", headers: { cookie: user.cookie } });
		assert.equal(subscriptions.statusCode, 200);
		assert.equal(subscriptions.json().data.length, 3);
		const queries = await restarted.inject({ url: "/api/v1/account/saved-queries", headers: { cookie: user.cookie } });
		assert.equal(queries.json().data[0].name, "Água recente");
	} finally {
		await restarted.close();
	}
});

test("geometria pública exige combinação explícita, aproximação e caixa demonstrativa", async (t) => {
	const { request } = await setup(t);
	const polygon = { type: "Polygon", coordinates: [[[-46.181, -23.941], [-46.179, -23.941], [-46.179, -23.939], [-46.181, -23.941]]] };
	const base = { category: "residuos", description: "Relato fictício com extensão explicitamente desenhada.", latitude: -23.94, longitude: -46.18 };
	assert.equal((await request("POST", "/occurrences", { ...base, environmentalRepresentation: { type: "waste", geometry: polygon, accuracy: "approximate" } })).statusCode, 201);
	assert.equal((await request("POST", "/occurrences", { ...base, environmentalRepresentation: { type: "waste", geometry: polygon, accuracy: "verified" } })).statusCode, 422);
	assert.equal((await request("POST", "/occurrences", { ...base, category: "agua", environmentalRepresentation: { type: "waste", geometry: polygon, accuracy: "approximate" } })).statusCode, 422);
});
