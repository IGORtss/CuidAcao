/**
 * Duplicatas e relações
 */
import { createLinksClient, createAdministrationClient, statusLabels } from "../../../servicos/api.js";

const visibilityLabels = {
	visible: "visível",
	hidden: "oculto"
};
const node = (tag, text = "") => {
	const result = document.createElement(tag);
	result.textContent = text;
	return result;
};
const button = (text, action) => {
	const result = node("button", text);
	result.type = "button";
	result.addEventListener("click", action);
	return result;
};

export async function renderPublicLinks(container, parent, { signal, onDuplicate } = {}) {
	const client = createLinksClient();
	container.replaceChildren(node("p", "Carregando vínculos…"));
	try {
		const [duplicates, relations] = await Promise.all(["duplicates", "relations"].map((kind) => client.list(parent.id, kind, { signal })));
		if (signal?.aborted) return;
		if ([duplicates, relations].some((value) => value.occurrenceVersion !== parent.version)) throw new Error("Os vínculos mudaram. Reabra os detalhes.");
		container.replaceChildren(node("h3", "Ocorrências relacionadas"), node("p", "Relações conectam problemas distintos; cada registro mantém estado e participações próprios."));
		for (const row of relations.data) {
			const link = node("a", `${row.id} · ${row.title} · ${statusLabels[row.status]}`);
			link.href = "#ocorrencia=" + row.id;
			const entry = node("p");
			entry.append(link);
			container.append(entry);
		}
		if (!relations.data.length) container.append(node("p", "Nenhuma relação pública."));
		container.append(node("h3", "Relatos duplicados"), node("p", "Mesmo fato, sem soma de apoios ou transferência de contribuições. Conteúdo identificado pela ocorrência de origem."));
		for (const row of duplicates.data) {
			const article = node("article"), link = node("a", `${row.id} · ${row.title} · ${statusLabels[row.status]}`);
			link.href = "#ocorrencia=" + row.id;
			article.append(link, node("p", row.description));
			if (onDuplicate) {
				const content = node("div"), control = button("Consultar conteúdo de " + row.id, async () => {
					if (control.disabled) return;
					control.disabled = true;
					try {
						await onDuplicate(content, row.id);
					} finally {
						control.disabled = false;
					}
				});
				article.append(control, content);
			}
			container.append(article);
		}
		if (!duplicates.data.length) container.append(node("p", "Nenhum relato duplicado público."));
	} catch (error) {
		if (signal?.aborted) return;
		container.replaceChildren(node("p", error.message), button("Tentar vínculos novamente", () => renderPublicLinks(container, parent, {
			signal,
			onDuplicate
		})));
	}
}

export function mountLinkManagement({ auth, onChanged }) {
	const client = createLinksClient(), admin = createAdministrationClient(), dialog = node("dialog");
	dialog.className = "link-action-dialog";
	dialog.setAttribute("aria-labelledby", "link-action-title");
	const title = node("h2", "Gerenciar vínculos"), message = node("p");
	title.id = "link-action-title";
	message.id = "link-message";
	message.setAttribute("role", "status");
	message.tabIndex = -1;
	const form = node("form");
	form.noValidate = true;
	const destinationLabel = node("label", "Identificador do destino"), destination = node("input");
	destination.id = "link-destination";
	destinationLabel.htmlFor = destination.id;
	destination.placeholder = "CA-000001";
	destination.setAttribute("aria-describedby", message.id);
	const preview = node("div"), effect = node("p"), reasonLabel = node("label", "Justificativa (20 a 1.000 caracteres)"), reason = node("textarea");
	reason.id = "link-reason";
	reasonLabel.htmlFor = reason.id;
	reason.rows = 5;
	reason.maxLength = 1e3;
	reason.setAttribute("aria-describedby", message.id);
	const choose = button("Consultar destino", inspect), review = button("Recarregar ambos para revisão", inspect), accept = button("Revisei os dois registros; usar estas versões", () => {
		conflict = false;
		accept.hidden = true;
		message.textContent = "Versões revisadas. Justificativa preservada; confira o efeito antes de enviar.";
		state();
	});
	const submit = node("button", "Registrar vínculo");
	submit.type = "submit";
	const close = button("Fechar vínculo", () => {
		if (!busy) dialog.close();
	}), login = button("Entrar para continuar", () => auth.openLogin());
	form.append(destinationLabel, destination, choose, preview, effect, reasonLabel, reason, submit, review, accept, login);
	dialog.append(title, close, node("p", "Simulação acadêmica · Ação exclusiva de administrador independente."), message, form);
	document.body.append(dialog);
	let parent, other, operation, busy = false, conflict = false, originFocus;
	function state() {
		for (const field of form.querySelectorAll("input,textarea")) field.disabled = busy;
		for (const control of [
			close,
			choose,
			review,
			accept,
			login
		]) control.disabled = busy;
		submit.disabled = busy || conflict || !other;
		submit.textContent = busy ? "Aguarde…" : operation?.endsWith("removed") ? "Remover vínculo" : "Registrar vínculo";
		form.setAttribute("aria-busy", String(busy));
	}
	async function inspect() {
		if (busy) return;
		busy = true;
		state();
		try {
			const [left, right] = await Promise.all([admin.detail(parent.id), admin.detail(destination.value.trim())]);
			parent = left.data;
			other = right.data;
			preview.replaceChildren(...[parent, other].map((row) => node("p", `${row.id} · ${row.title} · ${statusLabels[row.status]} · ${visibilityLabels[row.visibility]} · versão ${row.version}\n${row.description}\n${row.locationLabel ?? "Referência local não informada"} · ${row.latitude}, ${row.longitude} · autoria ${row.authorId} · ${row.createdAt}`)));
			if (conflict) {
				accept.hidden = false;
				message.textContent = "Compare ambos com o rascunho e confirme a revisão.";
			} else message.textContent = "Confira o destino e o efeito da ação antes de registrar.";
		} catch (error) {
			other = null;
			message.textContent = error.message;
			if (error.status === 401) {
				login.hidden = false;
				auth.refresh();
			}
		} finally {
			busy = false;
			state();
		}
	}
	function open(row, action, target) {
		if (busy) return;
		parent = { ...row };
		other = null;
		operation = action;
		conflict = false;
		originFocus = document.activeElement;
		reason.value = "";
		reason.removeAttribute("aria-invalid");
		message.textContent = "";
		preview.replaceChildren();
		destination.value = target ?? "";
		destination.readOnly = !!target;
		choose.hidden = !!target;
		review.hidden = accept.hidden = login.hidden = true;
		effect.textContent = {
			duplicate_linked: "Confirme na justificativa que os relatos representam o mesmo fato no mesmo local e contexto temporal. A origem mantém dados e estado, sai do mapa/lista padrão e bloqueia edição, transições e novas participações. A principal deve ser a mais antiga. Não há soma de contagens.",
			duplicate_removed: "Remove somente o vínculo de duplicata; recupera as operações no estado preservado. Não altera relatos, contribuições ou contagens.",
			relation_added: "Relaciona fatos distintos, sem unificar estados nem participações. Relação simétrica entre registros visíveis, não descartados e sem duplicata.",
			relation_removed: "Remove somente a relação. Os fatos e contribuições permanecem salvos. Ambos devem estar visíveis, não descartados e sem duplicata."
		}[action];
		state();
		dialog.showModal();
		reason.focus();
		if (target) inspect();
	}
	destination.addEventListener("input", () => {
		other = null;
		preview.replaceChildren();
		accept.hidden = true;
		state();
	});
	dialog.addEventListener("cancel", (event) => {
		event.preventDefault();
		if (!busy) dialog.close();
	});
	dialog.addEventListener("close", () => originFocus?.isConnected && originFocus.focus());
	auth.subscribe(() => {
		if (!dialog.open) return;
		if (auth.getUser()?.role !== "admin") {
			preview.replaceChildren(node("p", "Consulta privada exige administrador. Rascunho preservado."));
			other = null;
			conflict = true;
			accept.hidden = true;
			login.hidden = false;
			review.hidden = true;
		} else if (conflict) {
			review.hidden = false;
			message.textContent = "Recarregue ambos os registros e confirme a revisão antes de continuar.";
		}
		state();
	});
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (busy || conflict || !other) return;
		reason.removeAttribute("aria-invalid");
		busy = true;
		state();
		try {
			const expectedVersions = {
				[parent.id]: parent.version,
				[other.id]: other.version
			};
			await client.change(parent.id, operation, {
				expectedVersions,
				reason: reason.value,
				...operation === "duplicate_linked" ? { principalId: other.id } : operation.startsWith("relation_") ? { relatedId: other.id } : {}
			});
			busy = false;
			dialog.close();
			onChanged();
		} catch (error) {
			message.textContent = error.message + " " + Object.values(error.fields ?? {}).join(" ");
			message.focus();
			if (error.fields?.reason) reason.setAttribute("aria-invalid", "true");
			if (error.status === 409) {
				conflict = true;
				review.hidden = false;
			}
			if (error.status === 401) {
				login.hidden = false;
				auth.refresh();
			}
		} finally {
			busy = false;
			state();
		}
	});
	return {
		async append(container, row, { onNavigate } = {}) {
			const section = node("section");
			section.setAttribute("aria-label", "Gestão de vínculos");
			container.append(section);
			try {
				const [duplicates, relations] = await Promise.all(["duplicates", "relations"].map((kind) => client.list(row.id, kind, { privateRead: true })));
				if (!section.isConnected || auth.getUser()?.role !== "admin") return;
				if ([duplicates, relations].some((result) => result.occurrenceVersion !== row.version)) throw new Error("Vínculos mudaram. Recarregue a revisão.");
				section.append(node("h3", "Gestão de vínculos"));
				const independent = auth.getUser()?.id !== row.authorId;
				if (independent) {
					if (row.duplicateOfId) section.append(button("Desvincular duplicata", () => open(row, "duplicate_removed", row.duplicateOfId)));
					else section.append(button("Vincular como duplicata", () => open(row, "duplicate_linked")), button("Relacionar ocorrência", () => open(row, "relation_added")));
				}
				if (row.duplicateOfId) section.append(button("Revisar principal " + row.duplicateOfId, () => onNavigate(row.duplicateOfId)));
				for (const [kind, result] of [["duplicates", duplicates], ["relations", relations]]) {
					section.append(node("h4", kind === "duplicates" ? "Duplicatas deste registro" : "Ocorrências relacionadas"));
					for (const target of result.data) {
						section.append(node("p", `${target.id} · ${target.title} · ${statusLabels[target.status]} · ${visibilityLabels[target.visibility]}`), button("Revisar vínculo " + target.id, () => onNavigate(target.id)));
						if (independent && kind === "relations") section.append(button("Remover relação com " + target.id, () => open(row, "relation_removed", target.id)));
					}
					if (!result.data.length) section.append(node("p", "Nenhum vínculo nesta seção."));
				}
			} catch (error) {
				if (section.isConnected) section.replaceChildren(node("p", error.message));
			}
		},
		open
	};
}