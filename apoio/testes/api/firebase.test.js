import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../../../servidor/http/aplicacao.js";
import { migrate, openDatabase } from "../../../servidor/dados/banco-de-dados.js";

const origin = "http://localhost:5173";
const projectId = "cuidacao-13fc8";
const claims = (uid = "firebase-user") => ({
	uid,
	aud: projectId,
	iss: `https://securetoken.google.com/${projectId}`,
	firebase: { sign_in_provider: "google.com" }
});
const cookies = (response) => (response.headers["set-cookie"] ?? []).map((value) => value.split(";")[0]).join("; ");
const localSession = (response) => cookies(response).split("; ").find((value) => value.startsWith("cuidacao_session="));

async function setup(t, verifyToken = async (token) => claims(token)) {
	const db = openDatabase(":memory:");
	migrate(db);
	const app = createApp({ db, webOrigin: origin, firebase: { projectId, verifyToken } });
	t.after(async () => { await app.close(); db.close(); });
	const post = (path, payload = {}, cookie = "") => app.inject({ method: "POST", url: "/api/v1/auth/firebase/" + path, headers: { origin, ...(cookie ? { cookie } : {}) }, payload });
	return { app, db, post };
}

test("Firebase cria identidade local sem senha, papel ou perfil do provedor", async (t) => {
	const { app, db, post } = await setup(t);
	assert.deepEqual((await app.inject("/api/v1/auth/firebase/config")).json(), { data: { enabled: true } });
	const verified = await post("verify", { idToken: "uid-one" });
	assert.deepEqual(verified.json(), { data: { needsUsername: true } });
	const completed = await post("complete", { username: "Firebase_User" }, cookies(verified));
	assert.equal(completed.statusCode, 200);
	assert.deepEqual(completed.json().data.user, { id: completed.json().data.user.id, username: "firebase_user", role: "user" });
	const row = db.prepare("SELECT passwordHash,passwordSalt,passwordParams,role FROM users").get();
	assert.deepEqual(row, { passwordHash: null, passwordSalt: null, passwordParams: null, role: "user" });
	assert.equal(db.prepare("SELECT uid FROM firebase_identities").get().uid, "uid-one");
	assert.equal((await app.inject({ url: "/api/v1/auth/me", headers: { cookie: localSession(completed) } })).statusCode, 200);
});

test("Firebase recorrente usa uid, rotaciona sessão e não vincula por username", async (t) => {
	const { app, db, post } = await setup(t);
	const first = await post("verify", { idToken: "same-uid" });
	const created = await post("complete", { username: "firebase_one" }, cookies(first));
	const oldSession = localSession(created);
	const again = await post("verify", { idToken: "same-uid" }, oldSession);
	assert.equal(again.json().data.user.id, created.json().data.user.id);
	assert.equal(db.prepare("SELECT count(*) AS total FROM users").get().total, 1);
	assert.equal((await app.inject({ url: "/api/v1/auth/me", headers: { cookie: oldSession } })).statusCode, 401);
	const local = await app.inject({ method: "POST", url: "/api/v1/auth/register", headers: { origin }, payload: { username: "occupied_name", password: "Senha ficticia local 123" } });
	assert.equal(local.statusCode, 201);
	const second = await post("verify", { idToken: "other-uid" });
	assert.equal((await post("complete", { username: "occupied_name" }, cookies(second))).statusCode, 409);
	assert.equal(db.prepare("SELECT count(*) AS total FROM firebase_identities").get().total, 1);
});

test("Firebase recusa token, provedor, projeto, origem e campos não autorizados", async (t) => {
	const { app, db, post } = await setup(t, async (token) => {
		if (token === "invalid") throw new Error("private verifier failure");
		if (token === "password") return { ...claims("password-user"), firebase: { sign_in_provider: "password" } };
		if (token === "wrong-project") return { ...claims("wrong-project"), aud: "other-project" };
		return claims(token);
	});
	for (const token of ["invalid", "password", "wrong-project"]) assert.equal((await post("verify", { idToken: token })).statusCode, 401);
	assert.equal((await post("verify", { idToken: "valid", role: "admin" })).statusCode, 422);
	assert.equal((await app.inject({ method: "POST", url: "/api/v1/auth/firebase/verify", headers: { origin: "https://evil.invalid", "content-type": "application/json" }, payload: { idToken: "valid" } })).statusCode, 403);
	assert.equal(db.prepare("SELECT count(*) AS total FROM users").get().total, 0);
	assert.equal(db.prepare("SELECT count(*) AS total FROM sessions").get().total, 0);
});

test("Firebase fica indisponível sem configuração e cancelamento invalida pendência", async (t) => {
	const db = openDatabase(":memory:"); migrate(db);
	const app = createApp({ db, webOrigin: origin });
	t.after(async () => { await app.close(); db.close(); });
	assert.deepEqual((await app.inject("/api/v1/auth/firebase/config")).json(), { data: { enabled: false } });
	const configured = await setup(t);
	const verified = await configured.post("verify", { idToken: "cancelled" });
	assert.equal((await configured.post("cancel", {}, cookies(verified))).statusCode, 204);
	assert.equal((await configured.post("complete", { username: "never_created" }, cookies(verified))).statusCode, 401);
});
