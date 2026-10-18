import { applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const appName = "cuidacao-auth";

export function createFirebaseTokenVerifier(projectId, { emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST } = {}) {
	if (!/^[a-z0-9][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId ?? "")) return null;
	if (emulatorHost && !/^(?:localhost|127\.0\.0\.1|\[::1\]):\d{1,5}$/.test(emulatorHost)) throw new Error("FIREBASE_AUTH_EMULATOR_HOST deve apontar para host local sem protocolo.");
	const existing = getApps().find((app) => app.name === appName);
	const app = existing ?? initializeApp({
		projectId,
		...emulatorHost ? {} : { credential: applicationDefault() }
	}, appName);
	const auth = getAuth(app);
	return (idToken) => auth.verifyIdToken(idToken, true);
}
