/**
 * Autenticação Google
 */
import { loadGoogleIdentity } from "../../../servicos/api.js";

const node = (tag, text) => {
	const element = document.createElement(tag);
	element.textContent = text;
	return element;
};

export function mountGoogleAuth(container, client, firebaseClient, { current, busy, onBusy, onPending, onUser, onError }) {
	const buttonHost = node("div", ""), status = node("p", "");
	status.setAttribute("role", "status");
	const retry = node("button", "Tentar preparar Google novamente");
	retry.type = "button";
	retry.className = "secondary";
	retry.hidden = true;
	container.append(buttonHost, status, retry);
	let generation = 0, attempt = false, cleanup = Promise.resolve();
	function unavailable(text) {
		const button = node("button", "Continuar com Google");
		button.type = "button";
		button.className = "secondary";
		button.disabled = true;
		buttonHost.replaceChildren(button);
		status.textContent = text;
	}
	async function show() {
		const view = ++generation;
		retry.hidden = true;
		unavailable("Verificando disponibilidade do Google…");
		try {
			await cleanup;
			if (view !== generation || !current()) return;
			const firebaseConfiguration = await firebaseClient.config();
			if (view !== generation || !current()) return;
			if (firebaseConfiguration?.enabled) {
				const firebaseButton = node("button", "Continuar com Google");
				firebaseButton.type = "button";
				firebaseButton.className = "secondary";
				buttonHost.replaceChildren(firebaseButton);
				status.textContent = "A autenticação é validada pelo Firebase e convertida em uma sessão local do CuidAção.";
				firebaseButton.addEventListener("click", async () => {
					if (busy() || view !== generation || !current()) return;
					onBusy(true);
					try {
						const [{ firebaseGoogleIdToken }, services] = await Promise.all([import("../../../servicos/firebase/autenticacao.js"), import("../../../servicos/firebase/inicializacao.js")]);
						const idToken = await firebaseGoogleIdToken(services.auth);
						const result = await firebaseClient.verify(idToken);
						if (result?.needsUsername) onPending();
						else if (result?.user) onUser(result.user);
						else onError("Resposta de autenticação inválida. Tente novamente.");
					} catch (error) {
						onError(error?.code === "auth/popup-closed-by-user" ? "A janela do Google foi fechada. Você pode tentar novamente." : error.message);
						retry.hidden = false;
					} finally {
						onBusy(false);
					}
				});
				return;
			}
			const configuration = await client.config();
			if (view !== generation || !current()) return;
			if (!configuration?.enabled) {
				unavailable("Google indisponível nesta instalação. Use usuário e senha.");
				return;
			}
			const sdk = await loadGoogleIdentity();
			if (view !== generation || !current()) return;
			const challenge = await client.challenge();
			attempt = true;
			if (view !== generation || !current()) return;
			buttonHost.replaceChildren();
			status.textContent = "A janela Google não apaga seu rascunho. Se cancelar ou fechá-la, você pode tentar novamente.";
			sdk.initialize({
				client_id: challenge.clientId,
				nonce: challenge.nonce,
				ux_mode: "popup",
				auto_select: false,
				button_auto_select: false,
				callback: async (response) => {
					if (view !== generation || !current() || busy()) return;
					if (typeof response?.credential !== "string") {
						onError("O Google não retornou uma identidade. Tente novamente.");
						return;
					}
					onBusy(true);
					try {
						const result = await client.verify(response.credential);
						if (result?.needsUsername) onPending();
						else if (result?.user) onUser(result.user);
						else onError("Resposta de autenticação inválida. Tente novamente.");
					} catch (error) {
						onError(error.message);
						retry.hidden = false;
					} finally {
						onBusy(false);
					}
				}
			});
			sdk.renderButton(buttonHost, {
				type: "standard",
				theme: "outline",
				size: "large",
				text: "continue_with",
				locale: "pt-BR",
				width: 240
			});
		} catch (error) {
			if (view !== generation || !current()) return;
			unavailable(error.message);
			retry.hidden = false;
		}
	}
	retry.addEventListener("click", () => {
		if (!busy()) show();
	});
	return {
		show,
		cancel() {
			generation++;
			if (attempt) {
				attempt = false;
				cleanup = client.cancel().catch(() => {});
			}
			firebaseClient.cancel().catch(() => {});
			globalThis.google?.accounts?.id?.cancel();
		},
		disableAutoSelect() {
			globalThis.google?.accounts?.id?.disableAutoSelect();
		}
	};
}