/**
 * Validação da configuração pública usada pelo Firebase Web SDK.
 */
const required = Object.freeze({
	apiKey: "VITE_FIREBASE_API_KEY",
	authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
	projectId: "VITE_FIREBASE_PROJECT_ID",
	storageBucket: "VITE_FIREBASE_STORAGE_BUCKET",
	appId: "VITE_FIREBASE_APP_ID"
});

function normalized(value) {
	return typeof value === "string" ? value.trim() : "";
}

export function firebaseWebConfig(environment = import.meta.env ?? {}) {
	const config = Object.fromEntries(Object.entries(required).map(([field, key]) => [field, normalized(environment[key])]));
	const configured = Object.values(config).filter(Boolean).length;
	if (configured === 0) return null;
	if (configured !== Object.keys(required).length) {
		const missing = Object.entries(required).filter(([field]) => !config[field]).map(([, key]) => key);
		throw new Error(`Configuração Firebase incompleta: ${missing.join(", ")}.`);
	}
	const messagingSenderId = normalized(environment.VITE_FIREBASE_MESSAGING_SENDER_ID);
	const measurementId = normalized(environment.VITE_FIREBASE_MEASUREMENT_ID);
	return {
		...config,
		...(messagingSenderId ? { messagingSenderId } : {}),
		...(measurementId ? { measurementId } : {})
	};
}

export function firebaseEmulatorConfig(environment = import.meta.env ?? {}) {
	if (normalized(environment.VITE_FIREBASE_USE_EMULATORS).toLowerCase() !== "true") return null;
	return Object.freeze({
		authUrl: normalized(environment.VITE_FIREBASE_AUTH_EMULATOR_URL) || "http://127.0.0.1:9099",
		firestoreHost: normalized(environment.VITE_FIRESTORE_EMULATOR_HOST) || "127.0.0.1",
		firestorePort: Number(normalized(environment.VITE_FIRESTORE_EMULATOR_PORT) || 8080),
		storageHost: normalized(environment.VITE_FIREBASE_STORAGE_EMULATOR_HOST) || "127.0.0.1",
		storagePort: Number(normalized(environment.VITE_FIREBASE_STORAGE_EMULATOR_PORT) || 9199)
	});
}
