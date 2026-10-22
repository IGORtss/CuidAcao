import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

let appCheck = null;

export function initializeFirebaseAppCheck(app, { siteKey = "", debugToken = "" } = {}) {
	if (!app || !siteKey || typeof window === "undefined") return null;
	if (appCheck) return appCheck;
	if (debugToken) self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === "true" ? true : debugToken;
	appCheck = initializeAppCheck(app, {
		provider: new ReCaptchaEnterpriseProvider(siteKey),
		isTokenAutoRefreshEnabled: true
	});
	return appCheck;
}
