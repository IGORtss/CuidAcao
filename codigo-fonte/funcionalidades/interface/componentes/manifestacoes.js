/**
 * Apoios e contestações
 */
import { createStanceClient, createOccurrenceClient, formatDate } from "../../../servicos/api.js";

const node = (tag, text = "") => {
	const element = document.createElement(tag);
	element.textContent = text;
	return element;
};

const allowed = (item) => [
	"community_review",
	"confirmed",
	"monitoring"
].includes(item.statusCode) && !item.duplicateOfId;
const label = (type) => type === "support" ? "Apoio" : "Contestação";

export function mountStanceForm({ auth, onChanged }) {
	const client = createStanceClient(), dialog = node("dialog");
	dialog.className = "stance-dialog";
	dialog.setAttribute("aria-labelledby", "stance-title");
	const head = node("div");
	head.className = "dialog-head";
	const title = node("h2", "Manifestação comunitária");
	title.id = "stance-title";
	const close = node("button", "Fechar ×");
	close.type = "button";
	close.setAttribute("aria-label", "Fechar manifestação");
	head.append(title, close);
	const help = node("p", "Use informações fictícias. Uma posição ativa por pessoa e ocorrência. A participação comunitária não equivale a laudo técnico e não altera automaticamente o estado. Sua posição pode ser substituída ou retirada nos estados permitidos.");
	const message = node("p");
	message.id = "stance-message";
	message.setAttribute("role", "status");
	message.tabIndex = -1;
	const form = node("form");
	form.noValidate = true;
	const typeLabel = node("label", "Sua posição"), type = node("select");
	type.id = "stance-type";
	typeLabel.htmlFor = type.id;
	type.append(new Option("Apoio", "support"), new Option("Contestação", "contest"));
	const reasonLabel = node("label", "Justificativa fictícia (20 a 1.000 caracteres)"), reason = node("textarea");
	reason.id = "stance-reason";
	reason.rows = 6;
	reason.maxLength = 1e3;
	reasonLabel.htmlFor = reason.id;
	const reasonError = node("small");
	reasonError.id = "stance-reason-error";
	reason.setAttribute("aria-describedby", reasonError.id);
	const submit = node("button", "Salvar posição");
	submit.type = "submit";
	const withdraw = node("button", "Retirar minha posição"), login = node("button", "Entrar para continuar"), reload = node("button", "Recarregar manifestações para revisão"), accept = node("button", "Revisei; usar esta versão"), review = node("div");
	for (const button of [
		withdraw,
		login,
		reload,
		accept
	]) button.type = "button";
	form.append(typeLabel, type, reasonLabel, reason, reasonError, submit, withdraw, login, reload, review, accept);
	dialog.append(head, help, message, form);
	document.body.append(dialog);
	let parent, own, busy = false, conflict = false, latest, latestOwn, originFocus;
	const status = (value) => {
		message.textContent = value;
		message.focus();
	};
	function state() {
		reason.disabled = type.disabled = busy;
		submit.disabled = withdraw.disabled = busy || conflict;
		submit.textContent = busy ? "Salvando…" : "Salvar posição";
		for (const button of [
			close,
			login,
			reload,
			accept
		]) button.disabled = busy;
		withdraw.hidden = !own?.active;
		form.setAttribute("aria-busy", String(busy));
	}
	function open(item, position = null, requestedType = "support") {
		if (busy) return;
		parent = { ...item };
		own = position;
		conflict = false;
		latest = null;
		latestOwn = null;
		originFocus = document.activeElement;
		type.value = position?.type ?? requestedType;
		reason.value = position?.reason ?? "";
		message.textContent = reasonError.textContent = "";
		reason.removeAttribute("aria-invalid");
		reload.hidden = accept.hidden = review.hidden = true;
		login.hidden = !!auth.getUser();
		state();
		dialog.showModal();
		reason.focus();
	}
	function hide() {
		if (busy) return;
		dialog.close();
	}
	close.addEventListener("click", hide);
	dialog.addEventListener("cancel", (event) => {
		event.preventDefault();
		hide();
	});
	dialog.addEventListener("close", () => {
		(originFocus?.isConnected ? originFocus : document.getElementById("close"))?.focus();
	});
	login.addEventListener("click", () => auth.openLogin());
	reload.addEventListener("click", async () => {
		busy = true;
		state();
		try {
			const [item, rows] = await Promise.all([createOccurrenceClient().detail(parent.id), client.list(parent.id)]);
			if (item.version !== rows.occurrenceVersion) throw new Error("A ocorrência mudou durante a revisão. Carregue novamente.");
			latest = item;
			latestOwn = rows.data.find((row) => row.available && row.userId === auth.getUser()?.id) ?? null;
			review.replaceChildren(node("p", `Versão atual ${item.version} · ${item.status} · Apoios: ${rows.counts.support} · Contestações: ${rows.counts.contest}`));
			for (const row of rows.data) review.append(node("p", row.available ? `${label(row.type)} · ${row.username}: ${row.reason}` : "Manifestação indisponível por moderação."));
			review.hidden = accept.hidden = false;
			status("Compare as posições atuais com seu rascunho antes de confirmar.");
		} catch (error) {
			status(error.message);
		} finally {
			busy = false;
			state();
		}
	});
	accept.addEventListener("click", () => {
		parent = latest;
		own = latestOwn;
		conflict = false;
		reload.hidden = accept.hidden = true;
		status("Versão revisada. Seu rascunho foi preservado; confira antes de enviar.");
		state();
	});
	async function send(remove) {
		if (busy || conflict) return;
		busy = true;
		state();
		reasonError.textContent = "";
		reason.removeAttribute("aria-invalid");
		message.textContent = remove ? "Retirando posição…" : "Salvando posição…";
		try {
			if (remove) await client.withdraw(parent.id, parent.version);
			else await client.set(parent.id, {
				expectedVersion: parent.version,
				type: type.value,
				reason: reason.value
			});
			busy = false;
			dialog.close();
			onChanged();
		} catch (error) {
			status(error.message);
			if (error.fields?.reason) {
				reasonError.textContent = error.fields.reason;
				reason.setAttribute("aria-invalid", "true");
			}
			if (error.status === 401) {
				login.hidden = false;
				auth.refresh();
			}
			if (error.status === 409) {
				conflict = true;
				reload.hidden = false;
			}
		} finally {
			busy = false;
			state();
		}
	}
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		send(false);
	});
	withdraw.addEventListener("click", () => send(true));
	return { open };
}

export async function renderStances(container, item, { auth, signal, form, reportForm }) {
	container.replaceChildren(node("p", "Carregando manifestações…"));
	try {
		const result = await createStanceClient().list(item.id, { signal });
		if (signal?.aborted) return;
		if (signal?.aborted) return;
		container.replaceChildren(node("p", "A participação comunitária não equivale a laudo técnico. Apoios e contestações não alteram automaticamente o estado."), node("p", `Apoios: ${result.counts.support} · Contestações: ${result.counts.contest}`));
		const current = {
			...item,
			version: result.occurrenceVersion
		}, own = result.data.find((row) => row.available && row.userId === auth.getUser()?.id);
		for (const [type, title] of [["support", "Apoios ativos"], ["contest", "Contestações ativas"]]) {
			const section = node("section");
			section.setAttribute("aria-label", title);
			section.append(node("h4", title));
			const rows = result.data.filter((row) => row.available && row.type === type);
			if (!rows.length) section.append(node("p", "Nenhuma manifestação ativa deste tipo."));
			for (const row of rows) {
				const article = node("article");
				article.className = "stance";
				article.dataset.id = row.id;
				reportForm?.appendReport(article, {
					...item,
					version: result.occurrenceVersion
				}, "stance", row.id);
				article.append(node("h4", label(row.type)), node("p", `${row.username} · ${formatDate(row.createdAt)}`), node("p", row.reason));
				if (row.updatedAt !== row.createdAt) article.append(node("small", `Atualizada em ${formatDate(row.updatedAt)}`));
				section.append(article);
			}
			container.append(section);
		}
		for (const row of result.data.filter((row) => !row.available)) container.append(node("p", "Manifestação indisponível por moderação."));
		if (!allowed(current)) container.append(node("p", "Apoio e contestação só são permitidos em Verificação comunitária, Confirmada ou Acompanhamento, sem vínculo de duplicata."));
		else if (auth.getUser()?.id === current.authorId) container.append(node("p", "O autor não pode apoiar ou contestar a própria ocorrência."));
		else if (own) {
			const edit = node("button", "Alterar ou retirar minha posição");
			edit.type = "button";
			edit.addEventListener("click", () => form.open(current, own));
			container.append(edit);
		} else {
			if (!auth.getUser()) container.append(node("p", "Entre para apoiar ou contestar."));
			for (const [type, title] of [["support", "Apoiar"], ["contest", "Contestar"]]) {
				const button = node("button", title);
				button.type = "button";
				button.addEventListener("click", () => form.open(current, null, type));
				container.append(button);
			}
		}
	} catch (error) {
		if (signal?.aborted) return;
		container.replaceChildren(node("p", error.message));
		const retry = node("button", "Tentar consultar manifestações novamente");
		retry.type = "button";
		retry.addEventListener("click", () => renderStances(container, item, {
			auth,
			signal,
			form,
			reportForm
		}));
		container.append(retry);
	}
}