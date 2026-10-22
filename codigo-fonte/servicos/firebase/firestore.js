import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

let emulatorConnected = false;

export function initializeFirebaseFirestore(app, emulator = null) {
	if (!app) return null;
	const firestore = getFirestore(app);
	if (emulator && !emulatorConnected) {
		connectFirestoreEmulator(firestore, emulator.firestoreHost, emulator.firestorePort);
		emulatorConnected = true;
	}
	return firestore;
}
