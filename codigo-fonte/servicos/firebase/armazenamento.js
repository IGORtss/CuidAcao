import { connectStorageEmulator, getStorage } from "firebase/storage";

let emulatorConnected = false;

export function initializeFirebaseStorage(app, emulator = null) {
	if (!app) return null;
	const storage = getStorage(app);
	if (emulator && !emulatorConnected) {
		connectStorageEmulator(storage, emulator.storageHost, emulator.storagePort);
		emulatorConnected = true;
	}
	return storage;
}
