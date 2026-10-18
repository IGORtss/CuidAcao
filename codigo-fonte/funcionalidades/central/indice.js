/**
 * Central do CuidAção: área social comunitária sobre as ocorrências existentes.
 *
 * A Central não recria dados nem ações: o feed lista as mesmas ocorrências da
 * consulta (uma publicação por ocorrência, sem duplicadas, ordenadas pela
 * atividade mais recente) e a publicação reutiliza os renderizadores e
 * formulários existentes (comentários, complementos, evidências, apoios e
 * contestações, vínculos, encerramento e histórico). Entradas: ícone da HUD
 * (feed geral) e ficha do pin no mapa (publicação direta da ocorrência).
 */

import {
	createAttachmentClient,
	createContributionClient,
	createOccurrenceClient,
	createPreferenceClient,
	createStanceClient,
	formatDate
} from "../../servicos/api.js";
import { renderAttachments } from "../interface/componentes/anexos.js";
import { renderContributions } from "../interface/componentes/contribuicoes.js";
import { renderClosure, renderHistory } from "../interface/componentes/historico.js";
import { renderPublicLinks } from "../interface/componentes/vinculos.js";
import { renderStances } from "../interface/componentes/manifestacoes.js";

const EXCERPT_LENGTH = 140;

// ── Funções puras (testáveis sem DOM) ──

/** Uma publicação por ocorrência, ordenada pela atividade mais recente. */
export function sortFeedItems(items) {
	return [...items].sort((first, second) => {
		const byActivity = Date.parse(second.updatedAt) - Date.parse(first.updatedAt);
		if (byActivity !== 0) return byActivity;
		return first.id < second.id ? -1 : first.id > second.id ? 1 : 0;
	});
}

export function excerpt(text, max = EXCERPT_LENGTH) {
	const value = String(text ?? "").trim();
	if ([...value].length <= max) return value;
	return `${[...value].slice(0, max - 1).join("")}…`;
}

export function formatCounts(comments, evidence) {
	const commentLabel = comments === 1 ? "1 contribuição" : `${comments} contribuições`;
	const evidenceLabel = evidence === 1 ? "1 evidência" : `${evidence} evidências`;
	return `${commentLabel} · ${evidenceLabel}`;
}

export function formatValidation(support, contest) {
	if (!support && !contest) return "Sem validação da comunidade ainda";
	const parts = [];
	parts.push(support === 1 ? "1 apoio" : `${support} apoios`);
	parts.push(contest === 1 ? "1 contestação" : `${contest} contestações`);
	return parts.join(" · ");
}

/** Linha do tempo única: comentários, evidências, validação comunitária e mudanças de estado em ordem cronológica. */
export function collectTimelineRows({ contributions = [], attachments = [], stances = [], events = [] } = {}) {
	const rows = [];
	for (const row of contributions) {
		if (!row.available) continue;
		if (row.type === "comment") rows.push({ date: row.createdAt, kind: "comment", label: "Comentário", username: row.username, text: row.text });
		else if (row.type === "supplement") rows.push({ date: row.createdAt, kind: "comment", label: row.kind === "resolution" ? "Complemento — resolução" : "Complemento — observação", username: row.username, text: row.text });
		else if (row.type === "reopen_request") rows.push({ date: row.createdAt, kind: "comment", label: "Pedido de reabertura", username: row.username, text: row.text });
	}
	for (const image of attachments) {
		if (!image.available) continue;
		rows.push({ date: image.createdAt, kind: "evidence", label: "Evidência", username: null, text: image.caption ?? "Imagem anexada ao relato.", attachmentId: image.id });
	}
	for (const stance of stances) {
		if (!stance.available || !stance.active) continue;
		rows.push({
			date: stance.createdAt,
			kind: "validation",
			label: stance.type === "support" ? "Apoio da comunidade" : "Contestação da comunidade",
			username: stance.username,
			text: stance.reason
		});
	}
	for (const event of events) {
		if (event.action === "transition") rows.push({ date: event.date, kind: "transition", label: "Mudança de estado", username: event.username ?? null, text: event.text });
		else if (event.action === "created") rows.push({ date: event.date, kind: "transition", label: "Relato publicado", username: event.username ?? null, text: event.text });
	}
	rows.sort((first, second) => Date.parse(first.date) - Date.parse(second.date));
	return rows;
}

export function centralPublicationId(hash) {
	const match = /^#publicacao=([A-Za-z0-9-]+)$/.exec(hash);
	return match?.[1] ?? null;
}

// ── Apresentação da linha do tempo (mesma linguagem visual do detalhe) ──

function el(tag, text, className) {
	const node = document.createElement(tag);
	node.textContent = text;
	if (className) node.className = className;
	return node;
}

function formatTimelineDate(value) {
	return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function paintTimeline(list, rows, { highlightLatest = false } = {}) {
	list.replaceChildren();
	if (!rows.length) {
		list.append(el("li", "Nenhum comentário, evidência, validação ou mudança de estado registrada."));
		return;
	}
	for (const [index, row] of rows.entries()) {
		const entry = el("li", "", row.kind === "comment" ? "tl-comment" : row.kind === "evidence" ? "tl-evidence" : row.kind === "validation" ? "tl-validation" : "tl-transition");
		if (highlightLatest && index === rows.length - 1 && rows.length > 1) entry.classList.add("tl-latest");
		const kind = el("span", row.label, "tl-kind");
		entry.append(kind);
		if (row.username) entry.append(el("span", `por ${row.username}`, "tl-author"));
		const text = el("p", row.text, "tl-text");
		entry.append(text);
		const time = document.createElement("time");
		time.dateTime = row.date;
		time.classList.add("tl-time");
		time.textContent = formatTimelineDate(row.date);
		entry.append(time);
		list.append(entry);
	}
}

// ── Central ──

export function mountCentral({
	auth,
	getFeedItems,
	getFilterSummary,
	navigate,
	closeToMap,
	openFiltersPanel,
	viewOnMap,
	reloadList,
	closeDetails,
	onCreate,
	forms
}) {
	const section = document.getElementById("central");
	const scroller = document.getElementById("central-scroll");
	const feedView = document.getElementById("central-feed");
	const feedList = document.getElementById("central-feed-list");
	const feedStatus = document.getElementById("central-feed-status");
	const feedFilters = document.getElementById("central-feed-filters");
	const feedEmpty = document.getElementById("central-feed-empty");
	const feedCreate = document.getElementById("central-feed-create");
	const publicationView = document.getElementById("central-publication");
	if (!section || !scroller || !feedView || !feedList || !publicationView) return null;

	const occurrenceClient = createOccurrenceClient();
	const attachmentClient = createAttachmentClient();
	const contributionClient = createContributionClient();
	const stanceClient = createStanceClient();
	const inertTargets = [".global-header", ".territory-transition", ".map-interface", "#hud"]
		.map((selector) => document.querySelector(selector))
		.filter(Boolean);

	let mode = null; // null | "feed" | "publication"
	let returnFocus = null;
	let origin = "feed"; // de onde veio a publicação aberta: "feed" | "pin" | "direct"
	let currentPublicationId = null;
	let feedGeneration = 0;
	let publicationGeneration = 0;
	let feedAbort = null;
	let publicationAbort = null;
	const enrichmentCache = new Map();
	const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

	function setInert(active) {
		for (const target of inertTargets) target.inert = active;
	}

	function rememberFocus() {
		if (!returnFocus?.isConnected) returnFocus = document.activeElement;
	}

	function restoreFocus(fallback) {
		const target = returnFocus?.isConnected ? returnFocus : fallback?.isConnected ? fallback : document.getElementById("hud-trigger");
		returnFocus = null;
		(target?.isConnected ? target : document.getElementById("central-title"))?.focus({ preventScroll: true });
	}

	function showSection() {
		rememberFocus();
		section.hidden = false;
		setInert(true);
	}

	function hideSection() {
		section.hidden = true;
		setInert(false);
	}

	function focusTitle(id) {
		document.getElementById(id)?.focus({ preventScroll: true });
		scroller.scrollTop = 0;
	}

	// ── Feed geral ──

	let pendingAction = null; // "comment" | "evidence" | "validate" | null

	function cardMedia(item, media) {
		const cached = enrichmentCache.get(item.id);
		if (cached?.thumb) {
			const image = document.createElement("img");
			image.src = cached.thumb.src;
			image.alt = cached.thumb.alt;
			image.loading = "lazy";
			image.addEventListener("error", () => {
				media.replaceChildren(el("span", "Imagem indisponível.", "central-card-noimage"));
			});
			media.replaceChildren(image);
			media.closest(".central-card")?.classList.add("has-image");
		} else if (cached) {
			media.replaceChildren(el("span", "Sem imagem anexada.", "central-card-noimage"));
		}
	}

	function cardCounts(item, counts) {
		const cached = enrichmentCache.get(item.id);
		if (!cached || cached.failed) {
			counts.textContent = cached?.failed ? "Contribuições indisponíveis no momento." : "";
			return;
		}
		counts.textContent = `${formatCounts(cached.comments, cached.evidence)} · ${formatValidation(cached.support, cached.contest)}`;
	}

	function cardAuthor(item, node) {
		const cached = enrichmentCache.get(item.id);
		if (!cached || cached.failed) {
			node.textContent = cached?.failed
				? `Registro ${item.id} · Atualizada em ${formatDate(item.updatedAt)}`
				: `Registro ${item.id} · Atualizada em ${formatDate(item.updatedAt)}`;
			return;
		}
		node.textContent = cached.author
			? `por ${cached.author} · Atualizada em ${formatDate(item.updatedAt)}`
			: `Registro ${item.id} · Atualizada em ${formatDate(item.updatedAt)}`;
	}

	function cardRecent(item, node) {
		const cached = enrichmentCache.get(item.id);
		if (!cached || cached.failed || !cached.recent) {
			node.hidden = true;
			return;
		}
		node.hidden = false;
		node.replaceChildren(
			el("span", `${cached.recent.label} · ${cached.recent.username} · ${formatDate(cached.recent.date)}`, "central-card-recent-meta"),
			el("span", excerpt(cached.recent.text, 110), "central-card-recent-text")
		);
	}

	function openFromFeed(item, action = null) {
		origin = "feed";
		pendingAction = action;
		navigate(`#publicacao=${item.id}`);
	}

	function buildCard(item, index) {
		const wrapper = document.createElement("li");
		wrapper.className = "central-feed-item";
		const card = document.createElement("button");
		card.type = "button";
		card.className = `central-card ${item.categoryCode === "agua" ? "central-card-water" : "central-card-waste"}`;
		card.dataset.id = item.id;
		const media = el("span", "Carregando imagem…", "central-card-media");
		media.setAttribute("aria-hidden", "true");
		const body = el("span", "", "central-card-body");
		const meta = el("span", `${item.id} · ${item.category}`, "card-meta");
		const author = el("span", `Registro ${item.id} · ${formatDate(item.updatedAt)}`, "central-card-author");
		const title = el("strong", item.title);
		const badges = el("span", "", "central-card-badges");
		badges.append(el("span", item.status, "badge"));
		const text = el("span", excerpt(item.description), "central-card-excerpt");
		const location = el("span", `📍 ${item.locationLabel ?? "Perequê · localização ilustrativa"}`, "central-card-location");
		const counts = el("span", "", "central-card-counts");
		body.append(meta, author, title, badges, text, location, counts);
		card.append(media, body);
		card.setAttribute("aria-label", `${item.title}. ${item.category}, ${item.status}. ${excerpt(item.description)}`);
		card.addEventListener("click", () => openFromFeed(item));
		wrapper.append(card);
		const recent = el("p", "", "central-card-recent");
		recent.hidden = true;
		wrapper.append(recent);
		const actions = el("div", "", "central-card-actions");
		const commentBtn = el("button", "Comentar", "secondary");
		commentBtn.type = "button";
		commentBtn.addEventListener("click", () => openFromFeed(item, "comment"));
		const evidenceBtn = el("button", "Anexar evidência", "secondary");
		evidenceBtn.type = "button";
		evidenceBtn.addEventListener("click", () => openFromFeed(item, "evidence"));
		const validateBtn = el("button", "Validar", "secondary");
		validateBtn.type = "button";
		validateBtn.addEventListener("click", () => openFromFeed(item, "validate"));
		const mapBtn = el("button", "Ver no mapa", "secondary");
		mapBtn.type = "button";
		mapBtn.addEventListener("click", () => viewOnMap(item.id));
		actions.append(commentBtn, evidenceBtn, validateBtn, mapBtn);
		wrapper.append(actions);
		cardMedia(item, media);
		cardCounts(item, counts);
		cardAuthor(item, author);
		cardRecent(item, recent);
		return wrapper;
	}

	async function enrich(item, signal) {
		if (enrichmentCache.has(item.id)) return enrichmentCache.get(item.id);
		try {
			const [attachments, contributions, stances, history] = await Promise.all([
				attachmentClient.list(item.id, { signal }),
				contributionClient.list(item.id, { signal }),
				stanceClient.list(item.id, { signal }),
				occurrenceClient.history(item.id, { signal })
			]);
			const availableContributions = contributions.data.filter((row) => row.available);
			const availableEvidence = attachments.data.filter((image) => image.available);
			const created = history.find((event) => event.action === "created") ?? null;
			const timelineCandidates = [
				...availableContributions.map((row) => ({ date: row.createdAt, label: row.type === "comment" ? "Comentário" : "Complemento", username: row.username, text: row.text })),
				...stances.data.filter((row) => row.available && row.active).map((row) => ({ date: row.createdAt, label: row.type === "support" ? "Apoio" : "Contestação", username: row.username, text: row.reason }))
			].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
			const value = {
				thumb: attachments.data.find((image) => image.available) ?? null,
				comments: availableContributions.length,
				evidence: availableEvidence.length,
				support: stances.counts?.support ?? 0,
				contest: stances.counts?.contest ?? 0,
				author: created?.username ?? null,
				recent: timelineCandidates[0] ?? null
			};
			enrichmentCache.set(item.id, value.thumb ? {
				...value,
				thumb: { src: `/api/v1/attachments/${encodeURIComponent(value.thumb.id)}/file`, alt: value.thumb.caption }
			} : value);
		} catch (error) {
			if (signal?.aborted) throw error;
			enrichmentCache.set(item.id, { failed: true });
		}
		return enrichmentCache.get(item.id);
	}

	function observeCards(items, generation, controller) {
		const cards = [...feedList.querySelectorAll(".central-feed-item")];
		const queue = items.slice();
		let active = 0;
		const pump = () => {
			if (controller.signal.aborted || generation !== feedGeneration) return;
			while (active < 4 && queue.length) {
				const item = queue.shift();
				active++;
				enrich(item, controller.signal).then(() => {
					active--;
					if (generation !== feedGeneration || controller.signal.aborted) return;
					const card = feedList.querySelector(`.central-card[data-id="${CSS.escape(item.id)}"]`);
					if (card) {
						const wrapper = card.closest(".central-feed-item");
						cardMedia(item, card.querySelector(".central-card-media"));
						cardCounts(item, card.querySelector(".central-card-counts"));
						const author = card.querySelector(".central-card-author");
						if (author) cardAuthor(item, author);
						if (wrapper) cardRecent(item, wrapper.querySelector(".central-card-recent"));
					}
					pump();
				}).catch(() => {
					active--;
					pump();
				});
			}
		};
		if (!("IntersectionObserver" in window)) {
			queue.splice(12);
			pump();
			return;
		}
		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				const id = entry.target.querySelector(".central-card")?.dataset.id;
				observer.unobserve(entry.target);
				const item = items.find((row) => row.id === id);
				if (!item || enrichmentCache.has(item.id)) continue;
				queue.unshift(item);
				pump();
			}
		}, { root: scroller, rootMargin: "200px" });
		for (const card of cards) observer.observe(card);
		controller.signal.addEventListener("abort", () => observer.disconnect(), { once: true });
	}

	function renderFeed() {
		const generation = ++feedGeneration;
		feedAbort?.abort();
		const controller = new AbortController();
		feedAbort = controller;
		const items = sortFeedItems(getFeedItems());
		const summary = getFilterSummary();
		feedFilters.textContent = summary.text;
		feedList.replaceChildren();
		feedEmpty.hidden = true;
		if (!items.length) {
			feedStatus.textContent = "Nenhuma publicação corresponde aos filtros atuais.";
			feedEmpty.hidden = false;
			return;
		}
		feedStatus.textContent = items.length === 1
			? "1 publicação da comunidade."
			: `${items.length} publicações da comunidade, da atividade mais recente para a mais antiga.`;
		for (const [index, item] of items.entries()) feedList.append(buildCard(item, index));
		if (generation === feedGeneration) observeCards(items, generation, controller);
	}

	function openFeed({ focus = true } = {}) {
		closeDetails({ keepHash: true, keepSelection: true });
		mode = "feed";
		currentPublicationId = null;
		publicationGeneration++;
		feedView.hidden = false;
		publicationView.hidden = true;
		showSection();
		renderFeed();
		if (focus) focusTitle("central-title");
	}

	// ── Publicação completa ──

	function backRow() {
		const row = el("div", "", "central-back-row");
		const toFeed = el("button", "← Voltar ao feed");
		toFeed.type = "button";
		toFeed.addEventListener("click", () => navigate("#central"));
		const toMap = el("button", "✕ Voltar ao mapa", "secondary");
		toMap.type = "button";
		toMap.addEventListener("click", closeToMap);
		row.append(toFeed, toMap);
		return row;
	}

	function publicationHeader(item, counts, latestEvent) {
		const header = el("section", "", "central-summary");
		header.setAttribute("aria-label", "Resumo da ocorrência");
		header.append(el("p", "Central do CuidAção · Publicação da comunidade · registro fictício", "card-meta"));
		const title = el("h2", item.title);
		title.id = "central-pub-title";
		title.tabIndex = -1;
		header.append(title);
		header.append(el("p", item.description, "central-pub-report"));
		const badges = el("p", "", "central-pub-badges");
		badges.append(el("span", item.category, "badge"), document.createTextNode(" "), el("span", item.status, "badge"));
		if (item.duplicateOfId) badges.append(document.createTextNode(" "), el("span", "Duplicata vinculada", "badge"));
		header.append(badges);
		const info = document.createElement("dl");
		info.className = "central-pub-meta";
		for (const [label, value] of [
			["Local no Perequê", item.locationLabel ?? "Perequê · ponto ilustrativo"],
			["Coordenadas", `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`],
			["Publicada em", formatDate(item.createdAt)],
			["Última atividade", latestEvent ? `${latestEvent.label} · ${formatDate(latestEvent.date)}` : formatDate(item.updatedAt)]
		]) info.append(el("dt", label), el("dd", value));
		header.append(info);
		if (counts) header.append(el("p", `Confirmação comunitária: ${formatValidation(counts.support, counts.contest)}`, "central-pub-counts"));
		return header;
	}

	function mapStrip(item) {
		const strip = el("p", "", "central-map-strip");
		const place = el("span", `Ocorrência ${item.id} · ${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)} · mesma posição do pin no mapa.`);
		const viewButton = el("button", "Ver no mapa", "secondary");
		viewButton.type = "button";
		viewButton.addEventListener("click", () => viewOnMap(item.id));
		strip.append(place, document.createTextNode(" "), viewButton);
		return strip;
	}

	function updateBar(item, version) {
		const bar = el("div", "", "central-update-bar");
		bar.setAttribute("aria-label", "Adicionar atualização a esta ocorrência");
		bar.append(el("strong", "Adicionar atualização"));
		const row = el("div", "", "central-update-actions");
		const comment = el("button", "Adicionar comentário", "primary");
		comment.type = "button";
		comment.setAttribute("aria-label", "Adicionar comentário à linha do tempo");
		comment.addEventListener("click", () => forms.contributionForm.open({ ...item, version }, null, "comment"));
		const evidence = el("button", "Anexar evidência", "secondary");
		evidence.type = "button";
		evidence.addEventListener("click", () => forms.contributionForm.open({ ...item, version }, null, "supplement"));
		const validate = el("button", "Validar com justificativa", "secondary");
		validate.type = "button";
		validate.setAttribute("aria-label", "Validar com justificativa na linha do tempo");
		validate.addEventListener("click", () => forms.stanceForm.open({ ...item, version }));
		row.append(comment, evidence, validate);
		bar.append(row);
		bar.append(el("p", "O comentário ou a evidência entra na linha do tempo e atualiza o cartão no feed. A validação exige justificativa e não gera laudo.", "central-note"));
		return bar;
	}

	function participationRow(item) {
		const row = el("div", "", "central-actions");
		const follow = el("button", "Acompanhar atualizações", "secondary");
		follow.type = "button";
		follow.addEventListener("click", async () => {
			if (!auth.getUser()) {
				auth.openLogin();
				return;
			}
			follow.disabled = true;
			try {
				await createPreferenceClient().createSubscription({ kind: "occurrence", occurrenceId: item.id, label: item.title });
				follow.textContent = "Acompanhando";
			} catch (error) {
				follow.disabled = false;
				follow.textContent = error.message;
			}
		});
		row.append(follow);
		forms.occurrenceForm.appendEditControl(row, item);
		forms.transitionForm.appendControl(row, item);
		forms.administrativeAction.appendReport(row, item, "occurrence", item.id);
		return row;
	}

	async function openPublication(id, { focus = true, keepScroll = false } = {}) {
		const generation = ++publicationGeneration;
		publicationAbort?.abort();
		const controller = new AbortController();
		publicationAbort = controller;
		const { signal } = controller;
		mode = "publication";
		currentPublicationId = id;
		feedView.hidden = true;
		publicationView.hidden = false;
		showSection();
		const scrollTop = keepScroll ? scroller.scrollTop : 0;
		publicationView.replaceChildren(backRow(), el("p", "Carregando publicação…", "central-status"));
		if (!keepScroll) scroller.scrollTop = 0;
		try {
			const [item, events] = await Promise.all([
				occurrenceClient.detail(id, { signal }),
				occurrenceClient.history(id, { signal })
			]);
			if (generation !== publicationGeneration || signal.aborted) return;
			closeDetails({ keepHash: true, keepSelection: true });
			publicationView.replaceChildren();
			publicationView.append(backRow());
			if (origin === "pin") {
				const banner = el("p", `Esta publicação corresponde à ocorrência ${item.id} no local selecionado no mapa (${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}). Você chegou pelo pin.`, "central-pin-banner");
				publicationView.append(banner);
			}
			const childChanged = () => {
				reloadList();
				noteDataChanged();
				openPublication(item.id, { focus: false, keepScroll: true });
			};
			const contributionVersion = { ...item };
			publicationView.append(mapStrip(item));
			const timelineSection = el("section", "", "central-timeline-section");
			timelineSection.setAttribute("aria-label", "Linha do tempo da ocorrência");
			const timelineHeading = el("h3", "Linha do tempo: o que a comunidade já fez aqui");
			const timelineNote = el("p", "Comentários, evidências, validação comunitária e mudanças de estado em ordem cronológica, sem abas.", "central-note");
			const timeline = el("ol", "", "central-timeline");
			timeline.append(el("li", "Carregando linha do tempo…"));
			timelineSection.append(timelineHeading, timelineNote, timeline);
			let timelineRows = [];
			try {
				const [contributions, attachments, stances] = await Promise.all([
					contributionClient.list(item.id, { signal }),
					attachmentClient.list(item.id, { signal }),
					stanceClient.list(item.id, { signal })
				]);
				if (generation !== publicationGeneration || signal.aborted) return;
				timelineRows = collectTimelineRows({ contributions: contributions.data, attachments: attachments.data, stances: stances.data, events });
				paintTimeline(timeline, timelineRows, { highlightLatest: true });
				contributionVersion.version = contributions.occurrenceVersion;
			} catch (timelineError) {
				if (!signal.aborted) {
					timeline.replaceChildren();
					timeline.append(el("li", "Não foi possível carregar a linha do tempo única. Use as seções detalhadas abaixo."));
				}
			}
			const latest = timelineRows.length ? timelineRows[timelineRows.length - 1] : null;

			publicationView.append(publicationHeader(item, item.counts, latest), participationRow(item));
			publicationView.append(updateBar(item, contributionVersion.version ?? item.version));
			publicationView.append(timelineSection);

			publicationView.append(renderClosureSection(item));
			const linksSection = el("section", "");
			publicationView.append(linksSection);
			renderPublicLinks(linksSection, item, {
				signal,
				onDuplicate: async (container, duplicateId) => {
					try {
						const originItem = await occurrenceClient.detail(duplicateId, { signal });
						if (signal.aborted) return;
						container.replaceChildren(
							el("h4", `Conteúdo da origem ${duplicateId}`),
							el("p", `${originItem.title} · ${originItem.status}`),
							el("p", originItem.description)
						);
					} catch (error) {
						if (!signal.aborted) container.replaceChildren(el("p", error.message));
					}
				}
			});
			const stances = el("section", "");
			stances.setAttribute("aria-label", "Verificação comunitária");
			const evidence = el("section", "");
			evidence.setAttribute("aria-label", "Evidências fictícias");
			const discussion = el("section", "");
			discussion.setAttribute("aria-label", "Discussão e contribuições");
			const historySection = el("section", "");
			publicationView.append(el("h3", "Verificação comunitária"), stances);
			renderStances(stances, item, { auth, signal, form: forms.stanceForm, reportForm: forms.administrativeAction });
			publicationView.append(el("h3", "Evidências"), evidence);
			renderAttachments(evidence, item, { auth, signal, reportForm: forms.administrativeAction, onChanged: childChanged });
			publicationView.append(el("h3", "Discussão e contribuições"), discussion);
			renderContributions(discussion, item, { auth, signal, form: forms.contributionForm, reportForm: forms.administrativeAction, onChanged: childChanged });
			publicationView.append(el("h3", "Histórico da ocorrência"), historySection);
			renderHistory(historySection, events);
			publicationView.append(el("p", "Dados fictícios para apresentação do TCC. A confirmação comunitária não equivale a laudo técnico.", "detail-note"));
			publicationView.append(backRow());
			if (!reducedMotion()) {
				publicationView.classList.remove("is-entering");
				void publicationView.offsetWidth;
				publicationView.classList.add("is-entering");
			}
			if (keepScroll) scroller.scrollTop = scrollTop;
			if (focus) focusTitle("central-pub-title");
			const action = pendingAction;
			pendingAction = null;
			if (action && !signal.aborted) {
				if (action === "comment") forms.contributionForm.open({ ...item, version: contributionVersion.version ?? item.version }, null, "comment");
				else if (action === "evidence") forms.contributionForm.open({ ...item, version: contributionVersion.version ?? item.version }, null, "supplement");
				else if (action === "validate") forms.stanceForm.open({ ...item, version: contributionVersion.version ?? item.version });
			}
		} catch (error) {
			if (generation !== publicationGeneration || signal?.aborted) return;
			publicationView.replaceChildren();
			publicationView.append(backRow());
			const title = el("h2", [404, 422].includes(error.status) ? "Publicação não encontrada" : "Não foi possível carregar a publicação");
			title.id = "central-pub-title";
			title.tabIndex = -1;
			publicationView.append(title, el("p", [404, 422].includes(error.status) ? "Esse identificador não está disponível." : error.message));
			if (![404, 422].includes(error.status)) {
				const retry = el("button", "Tentar novamente", "secondary");
				retry.type = "button";
				retry.addEventListener("click", () => openPublication(id, { focus: false }));
				publicationView.append(retry);
			}
			if (focus) focusTitle("central-pub-title");
		}
	}

	function renderClosureSection(item) {
		const container = document.createElement("div");
		renderClosure(container, item);
		return container;
	}

	function close({ restoreFocus = true } = {}) {
		if (!mode) return;
		mode = null;
		currentPublicationId = null;
		pendingAction = null;
		feedGeneration++;
		publicationGeneration++;
		feedAbort?.abort();
		publicationAbort?.abort();
		hideSection();
		if (restoreFocus) {
			if (document.activeElement && section.contains(document.activeElement)) restoreFocus(document.getElementById("hud-trigger"));
			else returnFocus = null;
		} else returnFocus = null;
	}

	function refreshCurrent() {
		if (mode === "publication" && currentPublicationId) openPublication(currentPublicationId, { focus: false, keepScroll: true });
		else if (mode === "feed") renderFeed();
	}

	function noteDataChanged() {
		enrichmentCache.clear();
		refreshCurrent();
	}

	// Teclado: Escape volta (publicação → destino de origem; feed → mapa),
	// sem interferir com diálogos modais abertos sobre a Central.
	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape" || !mode) return;
		if (event.target?.closest?.("dialog[open]") || document.querySelector("dialog[open]")) return;
		if (!section.contains(event.target) && document.activeElement && !section.contains(document.activeElement)) return;
		event.preventDefault();
		event.stopPropagation();
		if (mode === "publication" && origin === "feed") navigate("#central");
		else closeToMap();
	}, true);

	section.querySelector("#central-close")?.addEventListener("click", closeToMap);
	section.querySelector("#central-feed-adjust")?.addEventListener("click", () => {
		close({ restoreFocus: false });
		openFiltersPanel();
	});
	feedCreate?.addEventListener("click", () => {
		if (typeof onCreate === "function") onCreate();
	});

	if (!reducedMotion()) {
		scroller.addEventListener("scroll", () => {
			section.classList.toggle("is-scrolled", scroller.scrollTop > 8);
		}, { passive: true });
	}

	return {
		openFeed,
		openPublication,
		close,
		refreshCurrent,
		noteDataChanged,
		setOrigin(value) {
			origin = value;
		},
		get isOpen() {
			return mode !== null;
		},
		get isFeedOpen() {
			return mode === "feed";
		}
	};
}
