/**
 * Comentários, complementos e pedidos
 */
import { createContributionClient, createAttachmentClient, createOccurrenceClient, formatDate } from "../../../servicos/api.js";
import { createImageFields } from "./anexos.js";

const node = (tag, text = "") => {
	const element = document.createElement(tag);
	element.textContent = text;
	return element;
};

const allowedContributions = (item) => [
	"community_review",
	"confirmed",
	"monitoring"
].includes(item.statusCode) && !item.duplicateOfId;
const labelContributions = (row) => row.type === "reopen_request" ? "Pedido de reabertura" : row.type === "comment" ? "Comentário" : row.kind === "resolution" ? "Complemento — informação de resolução" : "Complemento — observação";

export function mountContributionForm({ auth, onChanged }) {
	const client = createContributionClient(), attachmentClient = createAttachmentClient();
	const dialog = node("dialog");
	dialog.className = "contribution-dialog";
	dialog.setAttribute("aria-labelledby", "contribution-title");
	const head = node("div");
	head.className = "dialog-head";
	const title = node("h2");
	title.id = "contribution-title";
	const close = node("button", "Fechar ×");
	close.type = "button";
	close.setAttribute("aria-label", "Fechar contribuição");
	head.append(title, close);
	const help = node("p", "Simulação acadêmica: use somente informações fictícias. Informar uma resolução não encerra a ocorrência. Comentários não recebem imagens. Pedido de reabertura exige fato novo, tem texto imutável e imagens nas primeiras 24h enquanto pendente. Edição de comentários/complementos até 24 horas; retirada de texto depende de solicitação/denúncia e moderação administrativa.");
	const message = node("p");
	message.id = "contribution-message";
	message.setAttribute("role", "status");
	message.tabIndex = -1;
	const form = node("form");
	form.noValidate = true;
	const kindLabel = node("label", "Tipo de complemento"), kind = node("select");
	kind.id = "contribution-kind";
	kindLabel.htmlFor = kind.id;
	kind.append(new Option("Observação", "observation"), new Option("Informação de resolução", "resolution"));
	const textLabel = node("label", "Texto fictício da contribuição"), text = node("textarea");
	text.id = "contribution-text";
	textLabel.htmlFor = text.id;
	text.rows = 6;
	const textError = node("small");
	textError.id = "contribution-text-error";
	text.setAttribute("aria-describedby", textError.id);
	const images = createImageFields({ parentLabel: "complemento" }), submit = node("button", "Publicar contribuição");
	submit.type = "submit";
	const login = node("button", "Entrar para continuar"), reload = node("button", "Recarregar contribuições para revisão"), accept = node("button", "Revisei; usar esta versão"), finish = node("button", "Ver complemento salvo");
	for (const button of [
		login,
		reload,
		accept,
		finish
	]) button.type = "button";
	const review = node("div");
	form.append(kindLabel, kind, textLabel, text, textError, images.element, submit, login, reload, review, accept, finish);
	dialog.append(head, help, message, form);
	document.body.append(dialog);
	let parent, contribution, type, busy = false, conflict = false, savedForImages = false, latest, originFocus;
	function status(value) {
		message.textContent = value;
		message.focus();
	}
	function state() {
		text.disabled = busy || savedForImages;
		kind.disabled = busy || !!contribution || savedForImages;
		submit.disabled = busy || conflict;
		submit.textContent = busy ? "Salvando…" : savedForImages ? "Enviar imagens pendentes" : contribution ? "Salvar contribuição" : "Publicar contribuição";
		images.setBusy(busy);
		for (const button of [
			close,
			login,
			reload,
			accept,
			finish
		]) button.disabled = busy;
		form.setAttribute("aria-busy", String(busy));
	}
	function open(item, value = null, requestedType = "comment") {
		if (busy) return;
		parent = { ...item };
		contribution = value;
		type = value?.type ?? requestedType;
		busy = false;
		conflict = false;
		savedForImages = false;
		latest = null;
		originFocus = document.activeElement;
		finish.textContent = type === "reopen_request" ? "Ver pedido salvo" : "Ver complemento salvo";
		title.textContent = value ? "Editar contribuição" : type === "comment" ? "Comentar ocorrência" : type === "reopen_request" ? "Pedir reabertura" : "Acrescentar complemento";
		text.value = value?.text ?? "";
		text.maxLength = type === "comment" ? 2e3 : 3e3;
		textLabel.textContent = `Texto fictício da contribuição (${type === "comment" ? "1 a 2.000" : "20 a 3.000"} caracteres)`;
		kind.value = value?.kind ?? "observation";
		kind.hidden = kindLabel.hidden = type !== "supplement";
		images.element.hidden = type === "comment";
		images.reset();
		message.textContent = "";
		textError.textContent = "";
		text.removeAttribute("aria-invalid");
		reload.hidden = accept.hidden = review.hidden = finish.hidden = true;
		login.hidden = !!auth.getUser();
		state();
		dialog.showModal();
		text.focus();
	}
	function hide() {
		if (busy) return;
		dialog.close();
		if (savedForImages) onChanged();
	}
	close.addEventListener("click", hide);
	finish.addEventListener("click", hide);
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
			review.replaceChildren(node("p", `Versão atual ${item.version} · ${item.status}`));
			for (const row of rows.data) review.append(node("p", row.available ? `${labelContributions(row)} · ${row.username}: ${row.text}` : "Contribuição indisponível."), node("p", row.attachments.filter((image) => image.available).map((image) => image.caption).join("; ")));
			review.hidden = false;
			accept.hidden = false;
			status("Compare as contribuições e imagens atuais com seu rascunho antes de confirmar.");
		} catch (error) {
			status(error.message);
		} finally {
			busy = false;
			state();
		}
	});
	accept.addEventListener("click", () => {
		parent = latest;
		conflict = false;
		reload.hidden = accept.hidden = true;
		status("Versão revisada. Seu rascunho foi preservado; confira antes de enviar.");
		state();
	});
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (busy || conflict) return;
		busy = true;
		state();
		textError.textContent = "";
		text.removeAttribute("aria-invalid");
		message.textContent = "Salvando contribuição…";
		try {
			if (!savedForImages) {
				const result = contribution ? await client.edit(contribution.id, parent.version, text.value) : await client.create(parent.id, {
					expectedVersion: parent.version,
					type,
					text: text.value,
					...type === "supplement" ? { kind: kind.value } : {}
				});
				contribution = result.data;
				parent.version = result.occurrenceVersion;
				if (images.pending().length) {
					savedForImages = true;
					finish.hidden = false;
					title.textContent = "Contribuição salva — imagens opcionais";
				}
			}
			if (savedForImages) {
				message.textContent = type === "reopen_request" ? "Pedido salvo. Enviando imagens…" : "Complemento salvo. Enviando imagens…";
				await images.send(attachmentClient, parent, contribution.id);
			}
			busy = false;
			dialog.close();
			onChanged();
		} catch (error) {
			status((savedForImages ? type === "reopen_request" ? "Pedido salvo; anexo não enviado. " : "Complemento salvo; anexo não enviado. " : "") + error.message);
			if (error.fields?.text) {
				textError.textContent = error.fields.text;
				text.setAttribute("aria-invalid", "true");
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
	});
	return { open };
}

export async function renderContributions(container, item, { auth, signal, form, onChanged, reportForm }) {
	container.replaceChildren(node("p", "Carregando contribuições…"));
	try {
		const result = await createContributionClient().list(item.id, { signal });
		if (signal?.aborted) return;
		container.replaceChildren();
		if (!result.data.length) container.append(node("p", "Nenhum comentário ou complemento publicado."));
		const current = {
			...item,
			version: result.occurrenceVersion
		};
		for (const row of result.data) {
			const article = node("article");
			article.className = "contribution";
			article.dataset.id = row.id;
			container.append(article);
			if (!row.available) {
				article.append(node("p", "Contribuição indisponível por moderação."));
				continue;
			}
			reportForm?.appendReport(article, current, "contribution", row.id);
			article.append(node("h4", labelContributions(row)), node("p", `${row.username} · ${formatDate(row.createdAt)}`), node("p", row.text));
			if (row.updatedAt !== row.createdAt) article.append(node("small", `Editada em ${formatDate(row.updatedAt)}`));
			if (row.type === "reopen_request") article.append(node("p", "Situação do pedido: " + {
				pending: "pendente",
				accepted: "aceito",
				rejected: "rejeitado",
				superseded: "substituído"
			}[row.requestStatus]));
			if (["supplement", "reopen_request"].includes(row.type)) {
				const gallery = node("section");
				gallery.className = "attachment-gallery";
				gallery.setAttribute("aria-label", row.type === "reopen_request" ? "Imagens do pedido de reabertura" : "Imagens do complemento");
				article.append(gallery);
				renderAttachments(gallery, current, {
					auth,
					signal,
					onChanged,
					images: row.attachments,
					occurrenceVersion: result.occurrenceVersion,
					contribution: row,
					reportForm
				});
			}
			if (row.type !== "reopen_request" && allowedContributions(current) && Date.now() - Date.parse(row.createdAt) <= 864e5) {
				const edit = node("button", "Editar contribuição");
				edit.type = "button";
				edit.hidden = auth.getUser()?.id !== row.authorId;
				edit.addEventListener("click", () => form.open(current, row));
				article.append(edit);
			}
		}
		if (allowedContributions(current)) {
			if (!auth.getUser()) container.append(node("p", "Entre para publicar comentários ou complementos."));
			for (const [type, title] of [["comment", "Comentar"], ["supplement", "Acrescentar complemento"]]) {
				const button = node("button", title);
				button.type = "button";
				button.addEventListener("click", () => form.open(current, null, type));
				container.append(button);
			}
		} else {
			if (["closed", "discarded"].includes(current.statusCode) && !current.duplicateOfId) {
				const request = node("button", "Pedir reabertura");
				request.type = "button";
				request.disabled = result.data.some((row) => row.available && row.type === "reopen_request" && row.authorId === auth.getUser()?.id && row.requestStatus === "pending");
				request.addEventListener("click", () => form.open(current, null, "reopen_request"));
				container.append(node("p", "Pedido de reabertura exige fato novo; não altera o estado automaticamente."), request);
			}
			container.append(node("p", "Comentários e complementos só são permitidos em Verificação comunitária, Confirmada ou Acompanhamento, sem vínculo de duplicata."));
		}
	} catch (error) {
		if (signal?.aborted) return;
		container.replaceChildren(node("p", error.message));
		const retry = node("button", "Tentar consultar contribuições novamente");
		retry.type = "button";
		retry.addEventListener("click", () => renderContributions(container, item, {
			auth,
			signal,
			form,
			onChanged,
			reportForm
		}));
		container.append(retry);
	}
}

// Import from attachments
import { renderAttachments } from "./anexos.js";