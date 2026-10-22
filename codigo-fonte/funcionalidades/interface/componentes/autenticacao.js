/**
 * Cadastro e sessão
 */
import { createAuthClient, createRequestScope } from "../../../servicos/api.js";
import { entrarElementos, ajustarAltura } from "./movimento.js";

const node = (tag, text, className) => {
	const value = document.createElement(tag);
	value.textContent = text;
	if (className) value.className = className;
	return value;
};

export function mountAuth(header) {
	const client = createAuthClient(), scope = createRequestScope();
	const nav = node("nav", "", "auth-nav auth-state");
	nav.setAttribute("aria-label", "Conta fictícia");
	header.append(nav);
	const controls = node("div", "", "auth-controls"), notice = node("p", "Verificando sessão…");
	controls.hidden = true;
	notice.setAttribute("role", "status");
	nav.append(controls, notice);
	const dialog = node("dialog", "", "auth-dialog");
	dialog.setAttribute("aria-labelledby", "auth-title");
	const head = node("div", "", "dialog-head"), title = node("h2", "Entrar");
	title.id = "auth-title";
	const close = node("button", "Fechar ×", "secondary");
	close.type = "button";
	close.setAttribute("aria-label", "Fechar autenticação");
	head.append(title, close);
	const help = node("p", "Use um identificador fictício de 3 a 30 letras, números ou sublinhado e senha de 8 a 128 caracteres. Não informe dados pessoais nem uma senha usada em outros serviços.");
	const localHelp = "Escolha um apelido público de 3 a 30 letras, números ou sublinhado e uma senha com pelo menos 8 caracteres.";
	const message = node("p", "");
	message.id = "auth-message";
	message.setAttribute("role", "status");
	message.tabIndex = -1;
	const form = node("form", "");
	form.noValidate = true;
	const field = (id, label, type, auto) => {
		const wrapper = node("div", ""), labelNode = node("label", label), input = node("input", "");
		labelNode.htmlFor = id;
		input.id = id;
		input.name = id;
		input.type = type;
		input.autocomplete = auto;
		input.required = true;
		input.setAttribute("aria-describedby", "auth-message");
		wrapper.append(labelNode, input);
		form.append(wrapper);
		return input;
	};
	const username = field("auth-username", "Apelido público", "text", "username");
	username.maxLength = 254;
	username.autocapitalize = "none";
	username.spellcheck = false;
	const password = field("auth-password", "Senha", "password", "current-password");
	password.maxLength = 128;
	const confirmation = field("auth-confirmation", "Confirmar senha", "password", "new-password");
	confirmation.maxLength = 128;
	const submit = node("button", "Entrar");
	submit.type = "submit";
	const switchMode = node("button", "Criar conta", "secondary");
	switchMode.type = "button";
	form.append(submit, switchMode);
	dialog.append(head, help, message, form);
	document.body.append(dialog);
	let user = null, busy = false, checking = true, mode = "login", originFocus = null, view = 0, lastUserId = null;
	const listeners = new Set();
	function button(label, action) {
		const control = node("button", label, "secondary");
		control.type = "button";
		control.disabled = busy || checking;
		control.addEventListener("click", action);
		return control;
	}
	function renderNav() {
		const changed = lastUserId !== (user?.id ?? null);
		lastUserId = user?.id ?? null;
		controls.replaceChildren();
		if (user) {
			const label = node("span", `Conta: ${user.username}`);
			label.id = "session-user";
			label.tabIndex = -1;
			controls.append(label, button("Sair", logout));
		} else controls.append(button("Entrar", () => open("login")), button("Criar conta", () => open("register")));
		if (changed) for (const listener of listeners) listener();
	}
	function renderForm() {
		help.textContent = localHelp;
		title.textContent = mode === "register" ? "Criar conta" : "Entrar";
		confirmation.parentElement.hidden = mode !== "register";
		confirmation.required = mode === "register";
		password.autocomplete = mode === "register" ? "new-password" : "current-password";
		submit.textContent = busy ? "Aguarde…" : title.textContent;
		switchMode.textContent = mode === "register" ? "Já tenho conta" : "Criar conta";
		for (const element of [...form.elements, close]) element.disabled = busy;
		form.setAttribute("aria-busy", String(busy));
	}
	function showMessage(text, error = false, invalid = []) {
		for (const input of [
			username,
			password,
			confirmation
		]) {
			if (invalid.includes(input)) input.setAttribute("aria-invalid", "true");
			else input.removeAttribute("aria-invalid");
		}
		message.textContent = text;
		message.setAttribute("role", error ? "alert" : "status");
		if (error) message.focus();
	}
	function open(next) {
		if (busy || checking) return;
		originFocus = document.activeElement;
		mode = next;
		view++;
		showMessage("");
		password.value = "";
		confirmation.value = "";
		renderForm();
		if (!dialog.open) dialog.showModal();
		username.focus();
	}
	function closeDialog() {
		if (busy) return;
		dialog.close();
	}
	function clearPasswords() {
		password.value = "";
		confirmation.value = "";
	}
	close.addEventListener("click", closeDialog);
	dialog.addEventListener("cancel", (event) => {
		event.preventDefault();
		closeDialog();
	});
	dialog.addEventListener("close", () => {
		view++;
		clearPasswords();
		if (!document.querySelector("#details")?.open) (originFocus?.isConnected ? originFocus : controls.querySelector("button,span"))?.focus();
	});
	switchMode.addEventListener("click", () => {
		const previousBounds = dialog.getBoundingClientRect();
		mode = mode === "register" ? "login" : "register";
		view++;
		clearPasswords();
		showMessage("");
		renderForm();
		ajustarAltura(dialog, previousBounds);
		entrarElementos(form, mode === "register" ? 1 : -1);
		username.focus();
	});
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (busy) return;
		if (mode !== "login" && !/^[A-Za-z0-9_]{3,30}$/.test(username.value)) {
			showMessage("Use de 3 a 30 letras, números ou sublinhado no identificador fictício.", true, [username]);
			return;
		}
		if ([...password.value].length < 8 || [...password.value].length > 128) {
			showMessage("A senha deve ter de 8 a 128 caracteres.", true, [password]);
			return;
		}
		if (mode === "register" && password.value !== confirmation.value) {
			showMessage("As senhas não coincidem.", true, [confirmation]);
			return;
		}
		let succeeded = false;
		const current = view, operation = mode, data = {
			username: username.value,
			password: password.value
		};
		busy = true;
		scope.cancel();
		renderNav();
		renderForm();
		showMessage(operation === "register" ? "Criando conta…" : "Entrando…");
		try {
			const account = await client[operation](data);
			succeeded = true;
			if (operation === "register") {
				if (current === view) {
					mode = "login";
					username.value = account.username;
					clearPasswords();
					showMessage("Conta criada. Entre com seu nome de usuário e senha.");
				}
			} else {
				user = account;
				notice.textContent = "Sessão iniciada.";
				clearPasswords();
				if (dialog.open) dialog.close();
			}
		} catch (error) {
			if (current === view) showMessage(error.message, true, Object.keys(error.fields ?? {}).map((key) => ({
				username,
				password,
				confirmation
			})[key]).filter(Boolean));
		} finally {
			busy = false;
			checking = false;
			renderNav();
			renderForm();
			if (succeeded && current === view && operation === "register") password.focus();
		}
	});
	async function logout() {
		if (busy) return;
		busy = true;
		scope.cancel();
		renderNav();
		notice.textContent = "Saindo…";
		try {
			await client.logout();
			user = null;
			notice.textContent = "Sessão encerrada.";
		} catch (error) {
			notice.textContent = error.message;
		} finally {
			busy = false;
			renderNav();
			controls.querySelector("button")?.focus();
		}
	}
	async function refresh() {
		if (busy) return;
		const request = scope.begin();
		try {
			const account = await client.me({ signal: request.signal });
			if (!request.isCurrent()) return;
			const expired = user && !account;
			user = account;
			if (expired) notice.textContent = "Sua sessão expirou ou foi encerrada. Entre novamente.";
			else if (account || !notice.textContent.startsWith("Sua sessão")) notice.textContent = "";
		} catch (error) {
			if (!request.isCurrent()) return;
			notice.replaceChildren(node("span", error.message + " "), button("Verificar sessão novamente", refresh));
		} finally {
			if (request.isCurrent()) {
				checking = false;
				renderNav();
				const retry = notice.querySelector("button");
				if (retry) retry.disabled = false;
			}
		}
	}
	window.addEventListener("focus", () => refresh());
	document.addEventListener("visibilitychange", () => {
		if (!document.hidden) refresh();
	});
	window.addEventListener("hashchange", () => {
		if (dialog.open) dialog.close();
	});
	const timer = setInterval(() => {
		if (!document.hidden) refresh();
	}, 6e4);
	window.addEventListener("pagehide", () => {
		clearInterval(timer);
		scope.cancel();
	});
	renderNav();
	refresh();
	return {
		getUser: () => user,
		openLogin: () => open("login"),
		openRegister: () => open("register"),
		logout,
		getStatus: () => notice.textContent,
		refresh,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}
	};
}
