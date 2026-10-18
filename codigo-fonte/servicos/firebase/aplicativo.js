import { getApp, getApps, initializeApp } from "firebase/app";
import { firebaseWebConfig } from "./configuracao.js";

let analyticsPromise = null;

export function initializeFirebase(environment = import.meta.env ?? {}) {
	const config = firebaseWebConfig(environment);
	if (!config) return null;
	return getApps().length ? getApp() : initializeApp(config);
}

export function initializeFirebaseAnalytics(app) {
	if (!app || !app.options.measurementId || typeof window === "undefined") return Promise.resolve(null);
	if (!analyticsPromise) {
		analyticsPromise = import("firebase/analytics")
			.then(async ({ getAnalytics, isSupported }) => await isSupported() ? getAnalytics(app) : null)
			.catch(() => null);
	}
	return analyticsPromise;
}

export const firebaseApp = initializeFirebase();
export const firebaseAnalytics = initializeFirebaseAnalytics(firebaseApp);
