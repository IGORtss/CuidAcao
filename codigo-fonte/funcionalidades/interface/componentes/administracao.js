/**
 * Administração e denúncias
 */
import { adaptDetail, createAdministrationClient, categoryLabels, formatDate, statusLabels } from "../../../servicos/api.js";

const node = (tag, text = "") => {
	const element = document.createElement(tag);
	element.textContent = text;
	return element;
};

const reportLabels = {
	pending: "pendente",
	dismissed: "improcedente — conteúdo mantido",
	upheld: "procedente — conteúdo ocultado"
};
const targetLabels = {
	occurrence: "ocorrência",
	contribution: "contribuição",
	attachment: "imagem",
	stance: "manifestação"
};
const visibilityLabelsAdministration = {
	visible: "visível",
	hidden: "oculto"
};
const requestLabels = {
	pending: "pendente",
	accepted: "aceito",
	rejected: "rejeitado",
	superseded: "substituído"
};
const contributionLabels = {
	comment: "Comentário",
	supplement: "Complemento",
	reopen_request: "Pedido de reabertura"
};
const button = (text, action) => {
	const result = node("button", text);
	result.type = "button";
	result.addEventListener("click", action);
	return result;
};

export function mountAdministrativeAction({ auth, onChanged }) {
	const client = createAdministrationClient(), dialog = node("dialog");
	dialog.className = "admin-action-dialog";
	dialog.setAttribute("aria-labelledby", "admin-action-title");
	const head = node("div");
	head.className = "dialog-head";
	const title = node("h2");
	title.id = "admin-action-title";
	const close = button("Fechar ação", () => {
		if (!busy) dialog.close();
	});
	head.append(title, close);
	const message = node("p");
	message.id = "admin-action-message";
	message.setAttribute("role", "status");
	message.tabIndex = -1;
	const form = node("form");
	form.noValidate = true;
	const fields = node("div"), label = node("label", "Justificativa (20 a 1.000 caracteres)"), reason = node("textarea");
	reason.id = "admin-action-reason";
	reason.maxLength = 1e3;
	reason.rows = 5;
	label.htmlFor = reason.id;
	reason.setAttribute("aria-describedby", message.id);
	const submit = node("button", "Registrar ação");
	submit.type = "submit";
	const login = button("Entrar para continuar", () => auth.openLogin()), review = node("div"), accept = button("Revisei; usar esta versão", () => {
		item = latest;
		conflict = false;
		accept.hidden = true;
		message.textContent = "Versão revisada. Justificativa preservada; confira antes de enviar.";
		state();
	}), reload = button("Recarregar registro para revisão", async () => {
		busy = true;
		state();
		try {
			const result = await client.request(`/occurrences/${encodeURIComponent(item.id)}${spec.public ? "" : "?includeHidden=true"}`);
			latest = result.data;
			review.textContent = `Versão ${latest.version} · ${statusLabels[latest.status]} · ${latest.visibility ?? "visível"}\n${latest.description}`;
			if (!spec.public) {
				const children = await client.children(item.id, "contributions"), positions = await client.children(item.id, "stances"), images = await client.children(item.id, "attachments");
				if ([
					children,
					positions,
					images
				].some((row) => row.occurrenceVersion !== latest.version)) throw new Error("Registro mudou durante a revisão. Recarregue novamente.");
				for (const row of [
					...children.data,
					...positions.data,
					...images.data
				]) review.append(node("p", `${row.id} · ${row.visibility} · ${row.requestStatus ?? ""} · ${row.text ?? row.reason ?? row.caption ?? ""}`));
				if (spec.reportId) {
					const reports = await client.reports({
						page: 1,
						pageSize: 100
					});
					const report = reports.data.find((row) => row.id === spec.reportId);
					if (report) review.append(node("p", "Decisão atual da denúncia: " + reportLabels[report.status]));
				}
			}
			review.hidden = accept.hidden = false;
			message.textContent = "Compare o registro atual com o rascunho e confirme a revisão.";
		} catch (error) {
			accept.hidden = true;
			message.textContent = error.message;
		} finally {
			busy = false;
			state();
		}
	});
	form.append(fields, label, reason, submit, login, reload, review, accept);
	dialog.append(head, node("p", "Simulação acadêmica. Use motivo público sem reproduzir conteúdo inadequado nem identificar o denunciante. Denúncia é privada e não oculta automaticamente. Ocultação não altera o estado."), message, form);
	document.body.append(dialog);
	let item, spec, busy = false, conflict = false, latest, originFocus;
	function state() {
		for (const field of form.querySelectorAll("input,select,textarea")) field.disabled = busy;
		submit.disabled = busy || conflict;
		submit.textContent = busy ? "Aguarde…" : "Registrar ação";
		for (const control of [
			close,
			login,
			reload,
			accept
		]) control.disabled = busy;
		form.setAttribute("aria-busy", String(busy));
	}
	function open(parent, options) {
		if (busy) return;
		item = { ...parent };
		spec = options;
		conflict = false;
		latest = null;
		originFocus = document.activeElement;
		reason.value = "";
		reason.removeAttribute("aria-invalid");
		message.textContent = "";
		title.textContent = options.title;
		fields.replaceChildren();
		login.hidden = !!auth.getUser();
		reload.hidden = accept.hidden = review.hidden = true;
		if (options.correction) {
			for (const [key, labelText] of [
				["title", "Título corrigido"],
				["category", "Categoria corrigida"],
				["description", "Descrição corrigida"],
				["locationLabel", "Referência local corrigida"],
				["latitude", "Latitude corrigida"],
				["longitude", "Longitude corrigida"]
			]) {
				const caption = node("label", labelText), input = node(key === "description" ? "textarea" : key === "category" ? "select" : "input");
				input.id = "admin-correction-" + key;
				input.name = key;
				input.setAttribute("aria-describedby", message.id);
				caption.htmlFor = input.id;
				if (key === "category") for (const [code, text] of Object.entries(categoryLabels)) input.append(new Option(text, code));
				if (["latitude", "longitude"].includes(key)) {
					input.type = "number";
					input.step = "any";
				}
				input.value = (key === "category" ? parent.categoryCode ?? parent.category : parent[key]) ?? "";
				fields.append(caption, input);
			}
		}
		if (options.decision) {
			const caption = node("label", "Decisão da denúncia"), select = node("select");
			select.id = "admin-report-decision";
			caption.htmlFor = select.id;
			select.append(new Option("Procedente: ocultar conteúdo", "upheld"), new Option("Improcedente: manter conteúdo", "dismissed"));
			fields.append(caption, select);
		}
		state();
		dialog.showModal();
		reason.focus();
	}
	dialog.addEventListener("cancel", (event) => {
		event.preventDefault();
		if (!busy) dialog.close();
	});
	dialog.addEventListener("close", () => originFocus?.isConnected && originFocus.focus());
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (busy || conflict) return;
		for (const input of form.querySelectorAll("[aria-invalid]")) input.removeAttribute("aria-invalid");
		busy = true;
		state();
		try {
			const input = {
				expectedVersion: item.version,
				reason: reason.value,
				...spec.input
			};
			if (spec.correction) input.changes = Object.fromEntries([...fields.querySelectorAll("[name]")].map((element) => [element.name, ["latitude", "longitude"].includes(element.name) ? Number(element.value) : element.value]));
			if (spec.decision) input.decision = fields.querySelector("select").value;
			await client.request(spec.path, input);
			busy = false;
			dialog.close();
			onChanged();
		} catch (error) {
			message.textContent = error.message + " " + Object.values(error.fields ?? {}).join(" ");
			message.focus();
			for (const key of Object.keys(error.fields ?? {})) {
				const input = key === "reason" ? reason : Array.from(fields.querySelectorAll("[name]")).find((input) => input.name === key);
				input?.setAttribute("aria-invalid", "true");
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
	const own = node("dialog");
	own.className = "admin-dialog";
	own.setAttribute("aria-labelledby", "own-reports-title");
	const ownTitle = node("h2", "Minhas denúncias");
	ownTitle.id = "own-reports-title";
	const ownBody = node("div");
	own.append(ownTitle, button("Fechar minhas denúncias", () => own.close()), ownBody);
	document.body.append(own);
	let ownPage = 1, ownGeneration = 0;
	async function loadOwn() {
		const run = ++ownGeneration;
		ownBody.replaceChildren(node("p", "Carregando denúncias privadas…"));
		try {
			const result = await client.reports({
				page: ownPage,
				pageSize: 20
			});
			if (run !== ownGeneration || !own.open) return;
			ownBody.replaceChildren(node("p", `${result.total} denúncia(s) · Página ${ownPage}`));
			for (const row of result.data) ownBody.append(node("p", `${targetLabels[row.targetType]} · ${reportLabels[row.status]} · ${formatDate(row.createdAt)}`), node("p", row.reason), node("p", row.decisionReason ?? "Aguardando revisão independente."));
			const previous = button("Página anterior", () => {
				ownPage--;
				loadOwn();
			}), next = button("Próxima página", () => {
				ownPage++;
				loadOwn();
			});
			previous.disabled = ownPage <= 1;
			next.disabled = ownPage * 20 >= result.total;
			ownBody.append(previous, next);
		} catch (error) {
			if (run === ownGeneration) ownBody.replaceChildren(node("p", error.message), button("Tentar novamente", loadOwn));
		}
	}
	const ownNav = button("Minhas denúncias", () => {
		ownPage = 1;
		own.showModal();
		loadOwn();
	});
	ownNav.className = "secondary";
	(document.querySelector("#account-actions") ?? document.querySelector(".site-nav")).append(ownNav);
	auth.subscribe(() => {
		ownNav.hidden = !auth.getUser();
		ownGeneration++;
		if (own.open) {
			ownBody.replaceChildren();
			if (auth.getUser()) loadOwn();
			else own.close();
		}
	});
	ownNav.hidden = !auth.getUser();
	own.addEventListener("close", () => {
		ownGeneration++;
		ownBody.replaceChildren();
		ownNav.focus();
	});
	return {
		open,
		appendReport(container, parent, type, id) {
			const control = button("Denunciar " + {
				occurrence: "ocorrência",
				contribution: "contribuição",
				stance: "manifestação",
				attachment: "imagem"
			}[type], () => open(parent, {
				title: "Denunciar conteúdo",
				public: true,
				path: "/reports",
				input: {
					targetType: type,
					targetId: id
				}
			}));
			container.append(control);
		}
	};
}

export function mountAdministration({ auth, action, transitions, links, onChanged }) {
	const client = createAdministrationClient(), dialog = node("dialog");
	dialog.className = "admin-dialog";
	dialog.setAttribute("aria-labelledby", "admin-title");
	const head = node("div");
	head.className = "dialog-head";
	const title = node("h2", "Área administrativa");
	title.id = "admin-title";
	const close = button("Fechar administração", () => dialog.close());
	head.append(title, close);
	const message = node("p");
	message.setAttribute("role", "status");
	message.tabIndex = -1;
	const tabs = node("nav");
	tabs.setAttribute("aria-label", "Filas administrativas");
	const filters = node("form");
	filters.className = "toolbar";
	const category = node("select"), status = node("select"), visibility = node("select");
	category.id = "admin-category";
	status.id = "admin-status";
	visibility.id = "admin-visibility";
	for (const [element, text, choices] of [
		[
			category,
			"Categoria",
			categoryLabels
		],
		[
			status,
			"Estado",
			statusLabels
		],
		[
			visibility,
			"Visibilidade",
			{
				visible: "Visível",
				hidden: "Oculto"
			}
		]
	]) {
		const label = node("label", text);
		label.htmlFor = element.id;
		element.append(new Option("Todos", ""));
		for (const [code, value] of Object.entries(choices)) element.append(new Option(value, code));
		const wrap = node("div");
		wrap.append(label, element);
		filters.append(wrap);
		element.addEventListener("change", () => {
			page = 1;
			load();
		});
	}
	const contents = node("div"), pages = node("nav");
	pages.setAttribute("aria-label", "Paginação administrativa");
	dialog.append(head, node("p", "Simulação acadêmica · Conteúdo privado para revisão independente. Visibilidade é separada do estado."), tabs, filters, message, contents, pages);
	document.body.append(dialog);
	const nav = button("Administração", () => open());
	nav.className = "secondary";
	(document.querySelector("#account-actions") ?? document.querySelector(".site-nav")).append(nav);
	let queue = "received", page = 1, currentId = null, generation = 0, originFocus;
	const queues = {
		received: "Recebidas",
		community_review: "Verificação",
		all: "Todas as ocorrências",
		reports: "Denúncias pendentes",
		requests: "Pedidos de reabertura"
	};
	for (const [code, label] of Object.entries(queues)) tabs.append(button(label, () => {
		queue = code;
		page = 1;
		currentId = null;
		status.value = ["received", "community_review"].includes(code) ? code : "";
		load();
	}));
	function open() {
		originFocus = document.activeElement;
		if (!dialog.open) dialog.showModal();
		currentId = null;
		load();
	}
	function authState() {
		nav.hidden = auth.getUser()?.role !== "admin";
		if (dialog.open) {
			generation++;
			contents.replaceChildren();
			pages.replaceChildren();
			if (auth.getUser()?.role !== "admin") {
				message.textContent = "Acesso exclusivo de administradores. Entre com uma conta autorizada.";
				contents.append(button("Entrar", () => auth.openLogin()));
			} else load();
		}
	}
	auth.subscribe(authState);
	authState();
	window.addEventListener("hashchange", () => {
		if (location.hash === "#administracao") open();
	});
	if (location.hash === "#administracao") open();
	dialog.addEventListener("close", () => {
		generation++;
		contents.replaceChildren();
		pages.replaceChildren();
		if (location.hash === "#administracao") history.replaceState(null, "", location.pathname + location.search);
		originFocus?.isConnected && originFocus.focus();
	});
	const eligible = (parent, row = parent) => auth.getUser()?.id !== parent.authorId && auth.getUser()?.id !== (row.authorId ?? row.userId ?? row.uploaderId);
	function moderation(container, parent, type, row) {
		if (!eligible(parent, row)) {
			container.append(node("small", "Outro administrador deve revisar este conteúdo."));
			return;
		}
		container.append(button(row.visibility === "hidden" ? "Restaurar " + targetLabels[type] : "Ocultar " + targetLabels[type], () => action.open(parent, {
			title: row.visibility === "hidden" ? "Restaurar conteúdo" : "Ocultar conteúdo",
			path: "/moderation",
			input: {
				targetType: type,
				targetId: row.id,
				action: row.visibility === "hidden" ? "restore" : "hide"
			}
		})));
	}
	async function detail(id) {
		currentId = id;
		const run = ++generation;
		contents.replaceChildren();
		pages.replaceChildren();
		message.textContent = "Carregando revisão…";
		filters.hidden = true;
		try {
			const [result, contributions, stances, images, audit] = await Promise.all([
				client.detail(id),
				client.children(id, "contributions"),
				client.children(id, "stances"),
				client.children(id, "attachments"),
				client.children(id, "history")
			]);
			if (run !== generation || !dialog.open) return;
			// Projeção adaptada para os componentes de revisão (statusCode,
			// closure, contagens), preservando os campos privados da consulta
			// administrativa (visibilidade, autoria e vínculo).
			const parent = { ...result.data, ...adaptDetail(result.data) };
			if ([
				contributions,
				stances,
				images
			].some((rows) => rows.occurrenceVersion !== parent.version)) throw new Error("Registro mudou durante a consulta. Recarregue.");
			message.textContent = "";
			contents.append(button("Voltar à fila", () => {
				currentId = null;
				load();
			}), node("h3", parent.id + " · " + parent.title), node("p", `${parent.category} · ${parent.status} · ${visibilityLabelsAdministration[parent.visibility]} · versão ${parent.version}`), node("p", parent.description), node("p", `${parent.latitude}, ${parent.longitude} · ${parent.locationLabel ?? ""}`));
			if (Object.values(parent.flags).some(Boolean)) contents.append(node("p", "Revisão pendente: referência alterada, oculta, retirada ou vínculo removido. Estado não alterado automaticamente."));
			links.append(contents, parent, { onNavigate: detail });
			renderClosure(contents, parent);
			moderation(contents, parent, "occurrence", parent);
			if (parent.duplicateOfId) contents.append(node("p", "Correção e transições bloqueadas pelo vínculo de duplicata; desvincule antes de corrigir ou mudar estado."));
			if (eligible(parent) && !parent.duplicateOfId) contents.append(button("Corrigir informações", () => action.open(parent, {
				title: "Correção administrativa",
				path: "/occurrences/" + id + "/corrections",
				correction: true
			})));
			if (parent.visibility === "visible") transitions.appendControl(contents, parent);
			function renderImage(container, row) {
				const figure = node("figure"), img = node("img");
				img.src = row.fileUrl;
				img.alt = row.caption;
				img.loading = "lazy";
				figure.append(node("p", `Imagem · ${visibilityLabelsAdministration[row.visibility]}${row.withdrawnAt ? " · retirada" : ""}`), img, node("figcaption", row.caption));
				moderation(figure, parent, "attachment", row);
				container.append(figure);
			}
			contents.append(node("h3", "Imagens do relato"));
			for (const row of images.data) renderImage(contents, row);
			contents.append(node("h3", "Contribuições para revisão"));
			for (const row of contributions.data) {
				const article = node("article");
				article.className = "contribution";
				article.append(node("h4", `${contributionLabels[row.type]} · ${{
					observation: "observação",
					resolution: "informação de resolução"
				}[row.kind] ?? requestLabels[row.requestStatus] ?? ""} · ${visibilityLabelsAdministration[row.visibility]}`), node("p", `${row.username} · ${formatDate(row.createdAt)}`), node("p", row.text));
				moderation(article, parent, "contribution", row);
				if (row.type === "reopen_request" && row.requestStatus === "pending" && eligible(parent, row)) article.append(button("Rejeitar pedido", () => action.open(parent, {
					title: "Rejeitar pedido de reabertura",
					path: "/contributions/" + row.id + "/reopen-decision",
					input: { decision: "rejected" }
				})));
				for (const image of row.attachments) renderImage(article, image);
				contents.append(article);
			}
			contents.append(node("h3", "Manifestações para revisão"));
			for (const row of stances.data) {
				const article = node("article");
				article.append(node("h4", `${row.type === "support" ? "Apoio" : "Contestação"} · ${visibilityLabelsAdministration[row.visibility]} · ${row.active ? "ativa" : "retirada"}`), node("p", `${row.username} · ${formatDate(row.createdAt)}`), node("p", row.reason));
				moderation(article, parent, "stance", row);
				contents.append(article);
			}
			contents.append(node("h3", "Auditoria privada"));
			const timeline = node("section");
			contents.append(timeline);
			renderHistory(timeline, audit.data, { audit: true });
			contents.append(button("Recarregar revisão", () => detail(id)));
		} catch (error) {
			if (run !== generation) return;
			message.textContent = error.message;
			contents.replaceChildren(button("Tentar revisão novamente", () => detail(id)));
			if (error.status === 401) contents.append(button("Entrar", () => auth.openLogin()));
		}
	}
	async function load() {
		if (currentId) return detail(currentId);
		const run = ++generation;
		contents.replaceChildren();
		pages.replaceChildren();
		filters.hidden = ["reports", "requests"].includes(queue);
		message.textContent = "Carregando fila…";
		try {
			const result = queue === "reports" ? await client.reports({
				status: "pending",
				page,
				pageSize: 20
			}) : queue === "requests" ? await client.requests({
				page,
				pageSize: 20
			}) : await client.list({
				category: category.value,
				status: status.value || (queue === "received" || queue === "community_review" ? queue : ""),
				visibility: visibility.value,
				includeDuplicates: true,
				page,
				pageSize: 20
			});
			if (run !== generation || !dialog.open) return;
			message.textContent = `${result.total} registro(s) · Página ${page}`;
			if (!result.data.length) contents.append(node("p", "Nenhuma pendência nesta consulta."));
			for (const row of result.data) {
				const article = node("article");
				article.className = "contribution";
				if (queue === "reports") {
					article.append(node("h3", "Denúncia · " + targetLabels[row.targetType]), node("p", row.reason), node("p", `Criada em ${formatDate(row.createdAt)} · ${reportLabels[row.status]}`), button("Revisar conteúdo denunciado", () => detail(row.occurrenceId)));
					if (auth.getUser()?.id === row.reporterId) article.append(node("p", "Outro administrador deve revisar sua denúncia."));
					else article.append(button("Decidir denúncia", async () => {
						try {
							const result = await client.detail(row.occurrenceId);
							const children = row.targetType === "occurrence" ? null : await client.children(row.occurrenceId, row.targetType === "contribution" ? "contributions" : row.targetType === "stance" ? "stances" : "attachments");
							let target = row.targetType === "occurrence" ? result.data : children.data.find((item) => item.id === row.targetId);
							if (row.targetType === "attachment" && !target) {
								const contributions = await client.children(row.occurrenceId, "contributions");
								target = contributions.data.flatMap((item) => item.attachments).find((item) => item.id === row.targetId);
							}
							if (!target || !eligible(result.data, target)) throw new Error("Outro administrador deve revisar conteúdo de sua autoria.");
							action.open(result.data, {
								title: "Decidir denúncia",
								path: "/reports/" + row.id + "/decision",
								decision: true,
								reportId: row.id
							});
						} catch (error) {
							message.textContent = error.message;
						}
					}));
				} else if (queue === "requests") article.append(node("h3", "Pedido · " + row.occurrenceId), node("p", `${row.username} · ${visibilityLabelsAdministration[row.visibility]} · ${requestLabels[row.requestStatus]}`), node("p", row.text), button("Revisar pedido", () => detail(row.occurrenceId)));
				else article.append(node("h3", row.id + " · " + row.title), node("p", `${categoryLabels[row.category]} · ${statusLabels[row.status]} · ${visibilityLabelsAdministration[row.visibility]}`), button("Revisar ocorrência", () => detail(row.id)));
				contents.append(article);
			}
			const previous = button("Página anterior", () => {
				page--;
				load();
			}), next = button("Próxima página", () => {
				page++;
				load();
			});
			previous.disabled = page <= 1;
			next.disabled = page * 20 >= result.total;
			pages.append(previous, next);
		} catch (error) {
			if (run !== generation) return;
			message.textContent = error.message;
			contents.append(button("Tentar fila novamente", load));
			if (error.status === 401) contents.append(button("Entrar", () => auth.openLogin()));
		}
	}
	return {
		refresh() {
			if (dialog.open) load();
		},
		open
	};
}

// Import renderClosure from history component
import { renderClosure, renderHistory } from "./historico.js";