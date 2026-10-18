import { GoogleAuthProvider, connectAuthEmulator, getAuth, signInWithPopup, signOut } from "firebase/auth";

let emulatorConnected = false;

export function initializeFirebaseAuth(app, emulator = null) {
	if (!app) return null;
	const auth = getAuth(app);
	if (emulator && !emulatorConnected) {
		connectAuthEmulator(auth, emulator.authUrl, { disableWarnings: true });
		emulatorConnected = true;
	}
	return auth;
}

export async function firebaseGoogleIdToken(auth) {
	if (!auth) throw new Error("Firebase Authentication indisponível nesta instalação.");
	const result = await signInWithPopup(auth, new GoogleAuthProvider());
	try {
		return await result.user.getIdToken(true);
	} finally {
		await signOut(auth).catch(() => {});
	}
}
