import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, createPreferenceClient } from "../../../codigo-fonte/servicos/api.js";

const response = (status, value) => ({ ok: status >= 200 && status < 300, status, json: async () => value });

test("cliente de preferências usa sessão same-origin e não confunde 204 com falha", async () => {
	const calls = [];
	const client = createPreferenceClient(async (url, options) => {
		calls.push({ url, options });
		if (options.method === "DELETE") return response(204);
		return response(201, { data: { id: "pref" } });
	});
	assert.deepEqual(await client.createQuery("Orla", { collection: "coast", layers: ["occurrences"] }), { id: "pref" });
	await client.removeQuery("00000000-0000-4000-8000-000000000000");
	assert.equal(calls[0].url, "/api/v1/account/saved-queries");
	assert.equal(calls[0].options.credentials, "same-origin");
	assert.deepEqual(JSON.parse(calls[0].options.body), { name: "Orla", query: { collection: "coast", layers: ["occurrences"] } });
	assert.equal(calls[1].options.method, "DELETE");
});

test("cliente de preferências mantém erro autenticado explícito", async () => {
	const client = createPreferenceClient(async () => response(401, { error: { message: "Entre para continuar." } }));
	await assert.rejects(client.listSubscriptions(), (error) => error instanceof ApiError && error.status === 401 && error.message === "Entre para continuar.");
});
