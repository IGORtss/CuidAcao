/**
 * Mudanças de estado
 */
import { createTransitionClient, createContributionClient, createStanceClient, createOccurrenceClient, statusLabels } from "../../../servicos/api.js";

const targets = {
	received: ["community_review", "discarded"],
	community_review: ["confirmed", "discarded"],
	confirmed: [
		"monitoring",
		"closed",
		"discarded"
	],
	monitoring: ["closed", "discarded"],
	closed: ["community_review"],
	discarded: ["community_review"]
};
const node = (tag, text = "") => {
	const element = document.createElement(tag);
	element.textContent = text;
	return element;
};

export function mountTransitionForm({ auth, onChanged }) {
	const client = createTransitionClient(), dialog = node("dialog");
	dialog.className = "transition-dialog";
	dialog.setAttribute("aria-labelledby", "transition-title");
	const head = node("div");
	head.className = "dialog-head";
	const title = node("h2", "Mudar estado da ocorrência");
	title.id = "transition-title";
	const close = node("button", "Fechar ×");
	close.type = "button";
	close.setAttribute("aria-label", "Fechar mudança de estado");
	head.append(title, close);
	const help = node("p", "Decisão demonstrativa de administrador independente. Revise o relato, localização e contribuições. Apoios não equivalem a laudo técnico; informar resolução não encerra automaticamente. Reabertura exige fato novo e nova confirmação.");
	const message = node("p");
	message.id = "transition-message";
	message.setAttribute("role", "status");
	message.tabIndex = -1;
	const form = node("form");
	form.noValidate = true;
	const field = (label, tag, id) => {
		const caption = node("label", label), element = node(tag);
		element.id = id;
		caption.htmlFor = id;
		form.append(caption, element);
		return element;
	};
	const to = field("Novo estado", "select", "transition-to"), reason = field("Justificativa da mudança (20 a 1.000 caracteres)", "textarea", "transition-reason");
	reason.rows = 5;
	reason.maxLength = 1e3;
	const error = node("small");
	error.id = "transition-error";
	reason.setAttribute("aria-describedby", error.id);
	form.append(error);
	const requirements = node("section");
	requirements.setAttribute("aria-label", "Requisitos da mudança");
	const submit = node("button", "Registrar mudança");
	submit.type = "submit";
	const login = node("button", "Entrar para continuar"), reload = node("button", "Recarregar requisitos para revisão"), accept = node("button", "Revisei; usar esta versão"), review = node("div");
	for (const button of [
		login,
		reload,
		accept
	]) button.type = "button";
	form.append(requirements, submit, login, reload, review, accept);
	dialog.append(head, help, message, form);
	document.body.append(dialog);
	let parent, latest, rows, positions, busy = false, conflict = false, originFocus, selected = new Set(), assessments = new Map(), updateId = "", relatedIds = "", discardReason = "invalid";
	const status = (value) => {
		message.textContent = value;
		message.focus();
	};
	function state() {
		for (const input of form.querySelectorAll("input,select,textarea")) input.disabled = busy;
		submit.disabled = busy || conflict || !rows;
		submit.textContent = busy ? "Aguarde…" : "Registrar mudança";
		for (const button of [
			close,
			login,
			reload,
			accept
		]) button.disabled = busy;
		form.setAttribute("aria-busy", String(busy));
	}
	function renderRequirements() {
		requirements.replaceChildren();
		const value = to.value;
		if (value === "community_review" && (latest ?? parent).statusCode === "received") requirements.append(node("p", "Revise categoria, descrição, ponto no território e ausência de inadequação antes de encaminhar para verificação comunitária."));
		if (value === "confirmed") {
			requirements.append(node("h3", "Suporte independente"), node("p", "Selecione os registros que sustentam o relato e justifique sua pertinência. Não há quórum de votos."));
			const choices = [...positions.filter((row) => row.available && row.type === "support").map((row) => ({
				type: "stance",
				id: row.id,
				authorId: row.userId,
				text: row.reason,
				username: row.username
			})), ...rows.filter((row) => row.available && row.type === "supplement" && row.kind === "observation" && row.authorId !== auth.getUser()?.id).map((row) => ({
				...row,
				type: "contribution"
			}))].filter((row) => row.authorId !== parent.authorId);
			for (const row of choices) {
				const key = row.type + ":" + row.id, caption = node("label", `${row.username}: ${row.text}`), checkbox = node("input");
				checkbox.type = "checkbox";
				checkbox.value = key;
				checkbox.checked = selected.has(key);
				checkbox.addEventListener("change", () => {
					if (checkbox.checked) selected.add(key);
					else selected.delete(key);
				});
				caption.prepend(checkbox);
				requirements.append(caption);
			}
			const relatedLabel = node("label", "IDs de ocorrências já relacionadas (opcional, separados por vírgula)"), related = node("input");
			related.id = "transition-related";
			relatedLabel.htmlFor = related.id;
			related.value = relatedIds;
			related.addEventListener("input", () => {
				relatedIds = related.value;
			});
			requirements.append(relatedLabel, related, node("p", "Somente vínculos já existentes podem servir de suporte; o servidor revalida conteúdo, autoria e relação."));
			for (const row of positions.filter((row) => row.available && row.type === "contest")) {
				const caption = node("label", `Parecer sobre contestação de ${row.username}: ${row.reason}`), assessment = node("textarea");
				assessment.id = "assessment-" + row.id;
				caption.htmlFor = assessment.id;
				assessment.rows = 3;
				assessment.maxLength = 1e3;
				assessment.value = assessments.get(row.id) ?? "";
				assessment.addEventListener("input", () => assessments.set(row.id, assessment.value));
				requirements.append(caption, assessment);
			}
		}
		if (value === "monitoring" || value === "closed" || value === "community_review" && (latest ?? parent).statusCode !== "received") {
			const reopen = value === "community_review", caption = node("label", reopen ? "Pedido com fato novo" : value === "closed" ? "Complemento de resolução" : "Complemento de atualização"), select = node("select");
			select.id = "transition-update";
			caption.htmlFor = select.id;
			select.append(new Option("Selecione uma contribuição", ""));
			const choices = rows.filter((row) => row.available && row.authorId !== auth.getUser()?.id && (reopen ? row.type === "reopen_request" && row.requestStatus === "pending" : row.type === "supplement" && (value !== "closed" || row.kind === "resolution")));
			for (const row of choices) select.append(new Option(`${row.username}: ${row.text}`, row.id));
			select.value = updateId;
			select.addEventListener("change", () => {
				updateId = select.value;
			});
			requirements.append(caption, select);
			if (!choices.length) requirements.append(node("p", "Nenhuma contribuição visível pode fundamentar esta mudança. Publique primeiro o conteúdo exigido para a transição."));
		}
		if (value === "discarded") {
			const caption = node("label", "Classificação do descarte"), select = node("select");
			select.id = "transition-discard";
			caption.htmlFor = select.id;
			select.append(new Option("Registro inválido", "invalid"), new Option("Fora do escopo", "out_of_scope"));
			select.value = discardReason;
			select.addEventListener("change", () => {
				discardReason = select.value;
			});
			requirements.append(caption, select);
		}
		state();
	}
	async function load() {
		busy = true;
		state();
		try {
			const [item, contributions, stances] = await Promise.all([
				createOccurrenceClient().detail(parent.id),
				createContributionClient().list(parent.id),
				createStanceClient().list(parent.id)
			]);
			if (item.version !== contributions.occurrenceVersion || item.version !== stances.occurrenceVersion) throw new Error("A ocorrência mudou durante a consulta. Carregue novamente.");
			latest = item;
			rows = contributions.data;
			positions = stances.data;
			const previous = to.value;
			to.replaceChildren(...targets[item.statusCode].map((value) => new Option(statusLabels[value], value)));
			if (targets[item.statusCode].includes(previous)) to.value = previous;
			review.replaceChildren(node("p", `Versão ${item.version} · Estado atual: ${item.status}`), node("p", item.description));
			for (const row of rows) review.append(node("p", row.available ? `${row.username}: ${row.text}` : "Contribuição indisponível."));
			for (const row of positions) review.append(node("p", row.available ? `${row.username}: ${row.reason}` : "Manifestação indisponível."));
			if (conflict || item.version !== parent.version) {
				conflict = true;
				review.hidden = accept.hidden = false;
				status("Compare o estado e os registros atuais com seu rascunho; confirme a revisão da versão.");
			} else status("Requisitos carregados. Revise e justifique a decisão.");
			reload.hidden = false;
			renderRequirements();
		} catch (error) {
			status(error.message);
			reload.hidden = false;
			if (error.status === 401) {
				login.hidden = false;
				auth.refresh();
			}
		} finally {
			busy = false;
			state();
		}
	}
	function open(item) {
		if (busy) return;
		parent = { ...item };
		latest = null;
		rows = null;
		positions = [];
		conflict = false;
		selected = new Set();
		assessments = new Map();
		updateId = relatedIds = "";
		discardReason = "invalid";
		originFocus = document.activeElement;
		reason.value = error.textContent = message.textContent = "";
		to.replaceChildren(...targets[item.statusCode].map((value) => new Option(statusLabels[value], value)));
		requirements.replaceChildren();
		review.hidden = accept.hidden = reload.hidden = true;
		login.hidden = true;
		dialog.showModal();
		load();
		reason.focus();
	}
	const hide = () => {
		if (!busy) dialog.close();
	};
	close.addEventListener("click", hide);
	dialog.addEventListener("cancel", (event) => {
		event.preventDefault();
		hide();
	});
	dialog.addEventListener("close", () => {
		(originFocus?.isConnected ? originFocus : document.getElementById("close"))?.focus();
	});
	to.addEventListener("change", renderRequirements);
	reload.addEventListener("click", load);
	login.addEventListener("click", () => auth.openLogin());
	accept.addEventListener("click", () => {
		parent = latest;
		conflict = false;
		accept.hidden = true;
		status("Versão revisada. Justificativa e pareceres preservados; confira antes de enviar.");
		state();
	});
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (busy || conflict || !rows) return;
		busy = true;
		state();
		error.textContent = "";
		const input = {
			expectedVersion: parent.version,
			to: to.value,
			reason: reason.value
		};
		if (input.to === "confirmed") {
			input.supportRefs = [...requirements.querySelectorAll("input[type=checkbox]:checked")].map((element) => {
				const [type, id] = element.value.split(":");
				return {
					type,
					id
				};
			});
			input.supportRefs.push(...relatedIds.split(",").map((id) => id.trim()).filter(Boolean).map((id) => ({
				type: "occurrence",
				id
			})));
			input.contestAssessments = positions.filter((row) => row.available && row.type === "contest").map((row) => ({
				stanceId: row.id,
				assessment: assessments.get(row.id) ?? ""
			}));
		}
		if (input.to === "monitoring" || input.to === "closed") {
			input.updateId = updateId;
			if (input.to === "closed") input.closureReason = "resolved";
		}
		if (input.to === "discarded") input.discardReason = discardReason;
		if (input.to === "community_review" && parent.statusCode !== "received") input.reopenRequestId = updateId;
		try {
			await client.transition(parent.id, input);
			busy = false;
			dialog.close();
			onChanged();
		} catch (failure) {
			status(failure.message);
			error.textContent = Object.values(failure.fields ?? {}).join(" ");
			if (failure.status === 401) {
				login.hidden = false;
				auth.refresh();
			}
			if (failure.status === 409) {
				conflict = true;
				reload.hidden = false;
			}
		} finally {
			busy = false;
			state();
		}
	});
	return { appendControl(container, item) {
		if (auth.getUser()?.role !== "admin" || auth.getUser().id === item.authorId || item.duplicateOfId) return;
		const button = node("button", "Mudar estado");
		button.type = "button";
		button.addEventListener("click", () => open(item));
		container.append(button);
	} };
}
