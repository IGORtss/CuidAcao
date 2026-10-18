import { firebaseApp, initializeFirebaseAnalytics } from "./aplicativo.js";
import { firebaseEmulatorConfig } from "./configuracao.js";

const environment = import.meta.env ?? {};
const emulator = firebaseEmulatorConfig(environment);

async function bootstrapFirebase() {
	if (!firebaseApp) return Object.freeze({ app: null, analytics: null, auth: null, firestore: null, storage: null, appCheck: null });
	const [{ initializeFirebaseAuth }, { initializeFirebaseFirestore }, { initializeFirebaseStorage }, { initializeFirebaseAppCheck }] = await Promise.all([
		import("./autenticacao.js"), import("./firestore.js"), import("./armazenamento.js"), import("./verificacao-aplicativo.js")
	]);
	return Object.freeze({
		app: firebaseApp,
		analytics: await initializeFirebaseAnalytics(firebaseApp),
		auth: initializeFirebaseAuth(firebaseApp, emulator),
		firestore: initializeFirebaseFirestore(firebaseApp, emulator),
		storage: initializeFirebaseStorage(firebaseApp, emulator),
		appCheck: initializeFirebaseAppCheck(firebaseApp, {
			siteKey: environment.VITE_FIREBASE_APP_CHECK_SITE_KEY?.trim(),
			debugToken: environment.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN?.trim()
		})
	});
}

export const firebaseServices = bootstrapFirebase();
