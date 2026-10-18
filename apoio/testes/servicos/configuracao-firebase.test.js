import test from "node:test";
import assert from "node:assert/strict";
import { firebaseEmulatorConfig, firebaseWebConfig } from "../../../codigo-fonte/servicos/firebase/configuracao.js";

test("Firebase desabilitado não cria configuração ou fonte de identidade", () => {
	assert.equal(firebaseWebConfig({}), null);
	assert.equal(firebaseEmulatorConfig({}), null);
});

test("configuração web exige o conjunto público completo", () => {
	assert.throws(() => firebaseWebConfig({ VITE_FIREBASE_PROJECT_ID: "cuidacao-local" }), /VITE_FIREBASE_API_KEY/);
	assert.deepEqual(firebaseWebConfig({
		VITE_FIREBASE_API_KEY: "public-web-key",
		VITE_FIREBASE_AUTH_DOMAIN: "cuidacao-local.firebaseapp.com",
		VITE_FIREBASE_PROJECT_ID: "cuidacao-local",
		VITE_FIREBASE_STORAGE_BUCKET: "cuidacao-local.firebasestorage.app",
		VITE_FIREBASE_APP_ID: "1:123:web:abc",
		VITE_FIREBASE_MESSAGING_SENDER_ID: "123",
		VITE_FIREBASE_MEASUREMENT_ID: "G-ABC123"
	}), {
		apiKey: "public-web-key",
		authDomain: "cuidacao-local.firebaseapp.com",
		projectId: "cuidacao-local",
		storageBucket: "cuidacao-local.firebasestorage.app",
		appId: "1:123:web:abc",
		messagingSenderId: "123",
		measurementId: "G-ABC123"
	});
});

test("emuladores dependem de opt-in explícito e têm padrões locais", () => {
	assert.deepEqual(firebaseEmulatorConfig({ VITE_FIREBASE_USE_EMULATORS: "true" }), {
		authUrl: "http://127.0.0.1:9099",
		firestoreHost: "127.0.0.1",
		firestorePort: 8080,
		storageHost: "127.0.0.1",
		storagePort: 9199
	});
});
