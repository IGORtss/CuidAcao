/**
 * Entrada da interface: monta a página e conecta mapa, filtros, lista e detalhes.
 * Edite este arquivo diretamente. Guia: apoio/documentacao/ESTRUTURA.md.
 *
 * 1. Montagem da página e navegação
 */
import { mountAdministration, mountAdministrativeAction, mountAuth, mountContributionForm, mountHud, mountLinkManagement, mountOccurrenceForm, mountStanceForm, mountTransitionForm, renderAttachments, renderClosure, renderContributions, renderHistory, renderPublicLinks, renderStances } from "../funcionalidades/interface/indice.js";
import "../estilos/base.css";
import "../estilos/cartografia.css";
import "../estilos/painel.css";
import "../estilos/marcador-central.css";
import "../estilos/central.css";
import "../estilos/movimento.css";
import { entrarSuperficie, entrarElementos, guardarSaida, sairElementos, movimentoReduzido } from "../funcionalidades/interface/componentes/movimento.js";
import { categoryLabels, createAttachmentClient, createContributionClient, createOccurrenceClient, createPreferenceClient, createRequestScope, formatDate, selectedId, statusLabels } from "../servicos/api.js";
import { createMap, mountTerritory } from "../funcionalidades/mapa/indice.js";
import { centralPublicationId, collectTimelineRows, mountCentral, paintTimeline } from "../funcionalidades/central/indice.js";
import { occurrenceCard, renderShell } from "./estrutura.js";
import { environmentalPresentation, isCompleteMeasurement } from "../servicos/ambiental.js";
import { areaRelationship, collectionMatches, distanceMeters, explorationURL, historicalSnapshot, readExplorationURL } from "../funcionalidades/exploracao/indice.js";
import "../servicos/firebase/inicializacao.js";

// ── Montagem da página e navegação ──
const app = document.querySelector("#app");
renderShell(app);
const auth = mountAuth(document.querySelector("header"));
const $ = (id) => document.getElementById(id);

// Mantém folhas e diálogos dentro da altura realmente útil também quando o
// navegador está ampliado. CSS zoom altera o box de layout sem alterar dvh.
function syncDialogViewport() {
	const root = document.documentElement;
	const layoutWidth = root.offsetWidth || window.innerWidth;
	const scale = Math.max(1, window.innerWidth / layoutWidth);
	const value = `${window.innerHeight / scale}px`;
	if (root.style.getPropertyValue("--dialog-viewport-height") !== value) root.style.setProperty("--dialog-viewport-height", value);
}
syncDialogViewport();
window.addEventListener("resize", syncDialogViewport);
new ResizeObserver(syncDialogViewport).observe(document.documentElement);
new MutationObserver(syncDialogViewport).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
let activePanel = "";
let panelReturnFocus;
let panelCloseTimer;
const primaryNavIds = ["nav-map", "nav-filters", "nav-occurrences", "nav-register", "nav-data", "nav-account"];
const siteNav = document.querySelector(".site-nav");
function updateNavIndicator() {
	const active = siteNav.querySelector('[aria-current="page"]');
	siteNav.style.setProperty("--nav-indicator-x", active ? `${active.getBoundingClientRect().left - siteNav.getBoundingClientRect().left - siteNav.clientLeft}px` : "0px");
	siteNav.style.setProperty("--nav-indicator-width", active ? `${active.getBoundingClientRect().width}px` : "0px");
}
const navIndicatorObserver = new ResizeObserver(updateNavIndicator);
navIndicatorObserver.observe(siteNav);
siteNav.querySelectorAll(":is(a, button)").forEach((control) => navIndicatorObserver.observe(control));
window.addEventListener("resize", updateNavIndicator);
function setActiveNav(id) {
	for (const navId of primaryNavIds) {
		const control = $(navId);
		if (navId === id) control.setAttribute("aria-current", "page");
		else control.removeAttribute("aria-current");
	}
	updateNavIndicator();
}
function closePrimaryPanel({ restoreFocus = true } = {}) {
	const panel = $("explorer");
	const wasOpen = panel.classList.contains("is-open");
	clearTimeout(panelCloseTimer);
	activePanel = "";
	panel.dataset.panel = "";
	panel.classList.remove("is-open");
	panel.inert = true;
	const hidePanelContent = () => {
		$("filters-panel").hidden = true;
		$("list-section").hidden = true;
		$("data-summary").hidden = true;
		$("panel-content").hidden = true;
	};
	if (wasOpen && !matchMedia("(prefers-reduced-motion: reduce)").matches) panelCloseTimer = setTimeout(hidePanelContent, 250);
	else hidePanelContent();
	for (const id of ["nav-filters", "nav-occurrences", "nav-data"]) $(id).setAttribute("aria-expanded", "false");
	setActiveNav("nav-map");
	if (restoreFocus) panelReturnFocus?.focus({ preventScroll: true });
}
function openPrimaryPanel(mode, trigger, { focus = true } = {}) {
	clearTimeout(panelCloseTimer);
	if (activePanel === mode) {
		closePrimaryPanel();
		return false;
	}
	const previousContent = activePanel ? $({ filters: "filters-panel", occurrences: "list-section", data: "data-summary" }[activePanel]) : null;
	const leavingContent = guardarSaida(previousContent, $("explorer"));
	const motionOrigin = $("hud").getBoundingClientRect();
	if (mode !== "data" && location.hash === "#data-summary") history.replaceState(null, "", location.pathname + location.search + "#map");
	activePanel = mode;
	panelReturnFocus = trigger;
	const panel = $("explorer");
	panel.dataset.panel = mode;
	panel.classList.add("is-open");
	panel.inert = false;
	$("filters-panel").hidden = mode !== "filters";
	$("list-section").hidden = mode !== "occurrences";
	$("data-summary").hidden = mode !== "data";
	$("panel-content").hidden = mode !== "occurrences";
	if (mode === "occurrences") {
		$("panel-toggle").setAttribute("aria-expanded", "true");
		$("panel-toggle").setAttribute("aria-label", "Recolher lista");
	}
	for (const [id, value] of [["nav-filters", mode === "filters"], ["nav-occurrences", mode === "occurrences"], ["nav-data", mode === "data"]]) $(id).setAttribute("aria-expanded", String(value));
	setActiveNav({ filters: "nav-filters", occurrences: "nav-occurrences", data: "nav-data" }[mode]);
	const target = mode === "filters" ? $("search") : mode === "occurrences" ? $("list-heading") : $("data-title");
	if (focus) target.focus({ preventScroll: true });
	entrarSuperficie(panel, motionOrigin);
	entrarElementos($({ filters: "filters-panel", occurrences: "list-section", data: "data-summary" }[mode]));
	sairElementos(leavingContent);
	return true;
}
$("nav-filters").addEventListener("click", (event) => {
	preparePanelInteraction();
	openPrimaryPanel("filters", event.currentTarget);
});
$("nav-occurrences").addEventListener("click", (event) => {
	preparePanelInteraction();
	openPrimaryPanel("occurrences", event.currentTarget);
});
$("filters-close").addEventListener("click", () => closePrimaryPanel());
$("list-close").addEventListener("click", () => closePrimaryPanel());
$("nav-data").addEventListener("click", (event) => {
	preparePanelInteraction();
	const closing = activePanel === "data";
	history.pushState(null, "", closing ? "#map" : "#data-summary");
	openPrimaryPanel("data", event.currentTarget);
});
$("data-close").addEventListener("click", () => {
	closePrimaryPanel();
	history.pushState(null, "", "#map");
});
$("nav-map").addEventListener("click", () => closePrimaryPanel({ restoreFocus: false }));
function preparePanelInteraction() {
	if (!document.querySelector(".territory-transition").classList.contains("transition-complete")) $("nav-map").click();
}
function expandList(expanded) {
	document.querySelector(".panel-criteria").textContent = expanded ? "Todos os registros dos filtros atuais, dos mais recentes aos mais antigos." : "Atividades recentes dos filtros atuais.";
	document.querySelector(".explorer").classList.toggle("list-expanded", expanded);
	$("show-all").setAttribute("aria-expanded", String(expanded));
	$("show-all").textContent = expanded ? "Mostrar somente as mais recentes" : "Consultar todas as ocorrências";
}
$("show-all").addEventListener("click", () => {
	expandList(!document.querySelector(".explorer").classList.contains("list-expanded"));
	$("show-all").focus();
});
$("panel-toggle").addEventListener("click", () => {
	const collapsed = !$("panel-content").hidden;
	$("panel-content").hidden = collapsed;
	$("panel-toggle").setAttribute("aria-expanded", String(!collapsed));
	$("panel-toggle").setAttribute("aria-label", collapsed ? "Mostrar lista" : "Recolher lista");
	$("panel-toggle").textContent = collapsed ? "+" : "−";
});
function syncPanel() {
	const stage = document.querySelector(".territory-transition");
	if (["#list-heading", "#data-summary"].includes(location.hash) && !stage.classList.contains("transition-complete")) {
		queueMicrotask(() => { if (stage.classList.contains("transition-complete")) syncPanel(); });
		return;
	}
	if (location.hash === "#list-heading") {
		openPrimaryPanel("occurrences", $("nav-occurrences"), { focus: false });
		expandList(true);
		$("panel-content").hidden = false;
		$("panel-toggle").setAttribute("aria-expanded", "true");
		$("panel-toggle").setAttribute("aria-label", "Recolher lista");
		$("panel-toggle").textContent = "−";
		$("list-heading").focus({ preventScroll: true });
	}
	else if (location.hash === "#data-summary") openPrimaryPanel("data", $("nav-data"), { focus: false });
	else if (location.hash === "#map") closePrimaryPanel({ restoreFocus: false });
}
window.addEventListener("hashchange", syncPanel);
function el(tag, text, className) {
	const node = document.createElement(tag);
	node.textContent = text;
	if (className) node.className = className;
	return node;
}
for (const [code, label] of Object.entries(categoryLabels)) $("category").append(new Option(label, code));
for (const [code, label] of Object.entries(statusLabels)) $("status").append(new Option(label, code));
const client = createOccurrenceClient();
const preferences = createPreferenceClient();
const listScope = createRequestScope();
const detailScope = createRequestScope();
const restoredState = readExplorationURL();
$("category").value = restoredState.category;
$("status").value = restoredState.status;
$("period").value = restoredState.period;
$("search").value = restoredState.search;
let explorationMode = restoredState.mode;
let contentLayers = restoredState.layers;
let allItems = [], visibleItems = [], selectedArea = null, areaItems = null, activeCollection = restoredState.collection;
const histories = new Map();
let historicalDate = null;
const map = createMap($("map"), select, () => {
	$("tile-error").hidden = false;
}, openPlace, (id) => openCentralPublication(id, "pin"));
document.querySelectorAll("[data-layer-toggle]").forEach((toggle) => toggle.addEventListener("click", () => {
	const enabled = toggle.getAttribute("aria-pressed") === "true";
	toggle.setAttribute("aria-pressed", String(!enabled));
	map.setAreaLayer(toggle.dataset.layerToggle, !enabled);
}));
mountTerritory(document.querySelector(".territory-transition"), document.querySelector(".explorer"), map);
syncPanel();
if (restoredState.view.latitude !== null && restoredState.view.longitude !== null && restoredState.view.zoom !== null) map.setView(restoredState.view);
map.setContentLayers(Object.fromEntries(["occurrences", "areas", "measurements"].map((kind) => [kind, contentLayers.has(kind)])));
document.querySelectorAll("[data-content-layer]").forEach((input) => { input.checked = contentLayers.has(input.dataset.contentLayer); });
document.querySelectorAll("[data-mode]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === explorationMode)));
document.querySelectorAll("[data-collection]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.collection === activeCollection)));
let returnFocus = null;
let currentDetail = null;
let filterRevision = 0;
// Preserva câmera do mapa ao voltar da Central: salva antes de focar o pin
// e restaura ao fechar, salvo se o usuário navegou o mapa nesse intervalo.
let savedMapView = null;
let mapViewDirty = false;
let mapViewGuard = false;
map.onViewportChange(() => {
	if (mapViewGuard) return;
	if (savedMapView) mapViewDirty = true;
});
const occurrenceForm = mountOccurrenceForm({
	auth,
	map,
	getItems: () => allItems,
	onSelectExisting(item) {
		select(item.id, { kind: "nearby", element: $("nav-register") });
	},
	onPersisted(item) {
		const notice = $("creation-notice");
		notice.hidden = false;
		notice.textContent = `Registro ${item.id} salvo. Imagens opcionais são enviadas separadamente.`;
		if (!matches(item)) {
			$("search").value = "";
			$("category").value = "";
			$("status").value = "";
			$("period").value = "";
			filterRevision++;
			notice.textContent += " Filtros limpos para exibir o registro no mapa e na lista.";
		}
		renderList();
		central.noteDataChanged();
	},
	onSaved(item) {
		renderList();
		central.noteDataChanged();
		if (selectedId(location.hash) === item.id) syncDetails();
		else select(item.id);
	}
});
let adminArea;
const administrativeAction = mountAdministrativeAction({
	auth,
	onChanged() {
		renderList();
		syncDetails();
		central.noteDataChanged();
		adminArea?.refresh();
	}
});
const transitionForm = mountTransitionForm({
	auth,
	onChanged() {
		renderList();
		syncDetails();
		central.noteDataChanged();
		adminArea?.refresh();
	}
});
const links = mountLinkManagement({
	auth,
	onChanged() {
		renderList();
		syncDetails();
		central.noteDataChanged();
		adminArea?.refresh();
	}
});
adminArea = mountAdministration({
	links,
	auth,
	action: administrativeAction,
	transitions: transitionForm,
	onChanged() {
		renderList();
		syncDetails();
		central.noteDataChanged();
	}
});
const stanceForm = mountStanceForm({
	auth,
	onChanged() {
		renderList();
		syncDetails();
		central.noteDataChanged();
	}
});
const contributionForm = mountContributionForm({
	auth,
	onChanged() {
		renderList();
		syncDetails();
		central.noteDataChanged();
	}
});
auth.subscribe(() => {
	if (selectedId(location.hash)) syncDetails();
	if ($("account-panel").open) openAccount({ focus: false });
	if (hud?.panel === "account") buildHudAccount(hud.body);
});

// ── HUD recolhível: um ponto de entrada; painéis contextuais sob demanda ──
const hud = mountHud({
	onAction(action) {
		if (action === "register") doHudRegister();
		else if (action === "central") doHudCentral();
		else if (action === "investigate") doHudInvestigate();
		else if (action === "layers") doHudLayers();
		else if (action === "occurrences") doHudOccurrences();
		else if (action === "account") doHudAccount();
		else if (action === "data") doHudData();
	},
	onClosePanel() {
		map.cancelAreaInvestigation();
		hudInvestigating = false;
	}
});
let hudInvestigating = false;
let hudLayerState = {
	water_quality: true,
	waste: true,
	erosion: true,
	apparent_sewage: true,
	flooding: true,
	vegetation: true
};
let hudBaseReadable = false;

// Os painéis completos conservam seus controles e retornam à mesma navegação.
for (const id of ["filters-panel", "list-section", "data-summary"]) {
	const back = el("button", "← Menu", "surface-back");
	back.type = "button";
	back.setAttribute("aria-label", "Voltar ao menu do CuidAção");
	back.addEventListener("click", () => {
		closePrimaryPanel({ restoreFocus: false });
		if (location.hash === "#data-summary") history.replaceState(null, "", "#map");
		hud.openMenu($("hud-trigger"));
	});
	$(id).prepend(back);
}
$("hud").addEventListener("hud-open", () => {
	if (activePanel) closePrimaryPanel({ restoreFocus: false });
	if ($("account-panel").open) closeAccount({ restoreFocus: false });
});

function hudRow(labelText, control) {
	const wrapper = document.createElement("div");
	wrapper.className = "hud-field";
	const label = document.createElement("label");
	label.textContent = labelText;
	const id = `hud-${labelText.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-${Math.floor(Math.random() * 1e4)}`;
	label.htmlFor = id;
	control.id = id;
	wrapper.append(label, control);
	return wrapper;
}

function doHudRegister() {
	stopTimeline();
	preparePanelInteraction();
	closePrimaryPanel({ restoreFocus: false });
	setActiveNav("nav-register");
	document.getElementById("hud-trigger").focus({ preventScroll: true });
	occurrenceForm.open();
}

function doHudCentral() {
	stopTimeline();
	preparePanelInteraction();
	hud.close({ restoreFocus: false });
	closePrimaryPanel({ restoreFocus: false });
	pendingCentralOrigin = null;
	if (location.hash === "#central") syncCentral();
	else location.hash = "#central";
}

function doHudInvestigate() {
	stopTimeline();
	preparePanelInteraction();
	closePrimaryPanel({ restoreFocus: false });
	setActiveNav("nav-register");
	hud.openPanel("investigate", { focus: false });
	buildHudInvestigate(hud.body);
	hudInvestigating = true;
}

function doHudLayers() {
	preparePanelInteraction();
	hud.openPanel("layers", { focus: false });
	buildHudLayers(hud.body);
}

function doHudOccurrences() {
	preparePanelInteraction();
	hud.openPanel("occurrences", { focus: false });
	buildHudOccurrences(hud.body);
}

function doHudAccount() {
	preparePanelInteraction();
	hud.openPanel("account", { focus: false });
	buildHudAccount(hud.body);
}

function doHudData() {
	stopTimeline();
	preparePanelInteraction();
	hud.close({ restoreFocus: false });
	openPrimaryPanel("data", document.getElementById("hud-trigger"));
	history.pushState(null, "", "#data-summary");
}

function buildHudInvestigate(body) {
	body.replaceChildren();
	const hint = el("p", "Toque no mapa para marcar os vértices. Arraste para ajustar o traçado.", "hud-hint");
	const vertices = document.createElement("div");
	vertices.className = "hud-vertices";
	const counter = el("strong", "0 de 3 vértices");
	counter.id = "hud-vertex-count";
	counter.setAttribute("role", "status");
	vertices.append(el("span", "Progresso da área"), counter);
	const actions = document.createElement("div");
	actions.className = "hud-actions";
	const confirm = el("button", "Confirmar área", "primary");
	confirm.id = "hud-area-confirm";
	confirm.disabled = true;
	const clear = el("button", "Limpar", "secondary");
	clear.id = "hud-area-clear";
	const cancel = el("button", "Cancelar", "secondary");
	cancel.id = "hud-area-cancel";
	actions.append(confirm, clear, cancel);
	const summary = el("p", "Nenhuma área confirmada.", "hud-status");
	summary.id = "hud-area-summary";
	summary.setAttribute("role", "status");
	const followRow = document.createElement("div");
	followRow.className = "hud-actions";
	followRow.hidden = true;
	followRow.id = "hud-area-follow-row";
	const openList = el("button", "Abrir lista filtrada", "secondary");
	const follow = el("button", "Acompanhar área", "secondary");
	followRow.append(openList, follow);
	body.append(hint, vertices, actions, summary, followRow);

	map.beginAreaInvestigation((coordinates) => {
		const count = coordinates.length;
		counter.textContent = count < 3 ? `${count} de 3 vértices` : `${count} vértices`;
		confirm.disabled = count < 3;
		if (count >= 3) summary.textContent = `${count} vértices marcados. Confirme ou continue desenhando.`;
	});

	clear.addEventListener("click", () => {
		map.clearAreaInvestigation();
		counter.textContent = "0 de 3 vértices";
		confirm.disabled = true;
		summary.textContent = "Traçado limpo. Marque os vértices novamente.";
		followRow.hidden = true;
	});
	cancel.addEventListener("click", () => {
		map.cancelAreaInvestigation();
		selectedArea = areaItems = null;
		hudInvestigating = false;
		renderList();
		hud.backToMenu();
	});
	confirm.addEventListener("click", () => {
		const polygon = map.confirmAreaInvestigation();
		if (!polygon) {
			summary.textContent = "Marque pelo menos três vértices para confirmar.";
			return;
		}
		selectedArea = polygon;
		const relations = allItems.map((item) => ({ item, ...areaRelationship(item, polygon) })).filter((row) => row.pointContained || row.geometryIntersects);
		areaItems = new Set(relations.map(({ item }) => item.id));
		const contained = relations.filter((row) => row.pointContained).length;
		const intersected = relations.filter((row) => row.geometryIntersects).length;
		summary.textContent = `${contained} ponto${contained === 1 ? "" : "s"} contido${contained === 1 ? "" : "s"}; ${intersected} geometria${intersected === 1 ? "" : "s"} intersecta${intersected === 1 ? "" : "m"} a seleção.`;
		followRow.hidden = false;
		renderList();
	});
	openList.addEventListener("click", () => {
		hud.close({ restoreFocus: false });
		openPrimaryPanel("occurrences", document.getElementById("hud-trigger"), { focus: false });
	});
	follow.addEventListener("click", async () => {
		if (!auth.getUser()) {
			auth.openLogin();
			return;
		}
		try {
			await preferences.createSubscription({ kind: "area", label: "Área investigada no mapa", geometry: { type: "Polygon", coordinates: [[...selectedArea, selectedArea[0]]] } });
			summary.textContent += " Área acompanhada. As atualizações aparecerão na conta.";
		} catch (error) {
			summary.textContent = error.message;
		}
	});
}

function buildHudLayers(body) {
	body.replaceChildren();
	const intro = el("p", "Ative camadas e ajuste o fundo. A legenda acompanha o estado atual.", "hud-hint");
	body.append(intro);

	const pinTitle = el("h3", "Registros por categoria", "hud-section-title");
	const pinGrid = document.createElement("div");
	pinGrid.className = "hud-layer-grid";
	for (const [code, label] of [["residuos", "Resíduos"], ["agua", "Água"]]) {
		const toggle = document.createElement("button");
		toggle.type = "button";
		toggle.className = "hud-toggle";
		const active = $("category").value === code;
		toggle.setAttribute("aria-pressed", String(active));
		const dot = document.createElement("span");
		dot.className = `layer-dot ${code === "agua" ? "pin-water" : "pin-waste"}`;
		dot.setAttribute("aria-hidden", "true");
		toggle.append(dot, document.createTextNode(label));
		toggle.addEventListener("click", () => {
			$("category").value = $("category").value === code ? "" : code;
			filtersChanged();
			buildHudLayers(body);
		});
		pinGrid.append(toggle);
	}
	body.append(pinTitle, pinGrid);

	const envTitle = el("h3", "Camadas ambientais", "hud-section-title");
	const envGrid = document.createElement("div");
	envGrid.className = "hud-layer-grid";
	const envLabels = { water_quality: "Qualidade da água", waste: "Resíduos", erosion: "Erosão", apparent_sewage: "Esgoto aparente", flooding: "Alagamentos", vegetation: "Vegetação" };
	for (const [kind, label] of Object.entries(envLabels)) {
		const toggle = document.createElement("button");
		toggle.type = "button";
		toggle.className = "hud-toggle";
		toggle.dataset.hudLayer = kind;
		toggle.setAttribute("aria-pressed", String(hudLayerState[kind]));
		const dot = document.createElement("span");
		dot.className = `layer-dot ${kind === "water_quality" ? "pin-water" : kind.replaceAll("_", "-")}`;
		if (kind === "waste") dot.className = "layer-dot waste-area";
		if (kind === "erosion") dot.className = "layer-dot erosion";
		if (kind === "apparent_sewage") dot.className = "layer-dot apparent-sewage";
		if (kind === "flooding") dot.className = "layer-dot flooding";
		if (kind === "vegetation") dot.className = "layer-dot vegetation";
		if (kind === "water_quality") dot.className = "layer-dot pin-water";
		dot.setAttribute("aria-hidden", "true");
		toggle.append(dot, document.createTextNode(label));
		toggle.addEventListener("click", () => {
			hudLayerState[kind] = !hudLayerState[kind];
			toggle.setAttribute("aria-pressed", String(hudLayerState[kind]));
			map.setAreaLayer(kind, hudLayerState[kind]);
			const legacy = document.querySelector(`[data-layer-toggle="${kind}"]`);
			if (legacy) legacy.setAttribute("aria-pressed", String(hudLayerState[kind]));
		});
		envGrid.append(toggle);
	}
	body.append(envTitle, envGrid);

	const showTitle = el("h3", "Exibir no mapa", "hud-section-title");
	const showGrid = document.createElement("div");
	showGrid.className = "hud-layer-grid";
	for (const [kind, label] of [["occurrences", "Relatos"], ["areas", "Áreas e linhas"], ["measurements", "Medições"]]) {
		const row = document.createElement("label");
		row.className = "hud-check";
		const input = document.createElement("input");
		input.type = "checkbox";
		input.checked = contentLayers.has(kind);
		input.dataset.hudContentLayer = kind;
		input.addEventListener("change", () => {
			if (input.checked) contentLayers.add(kind);
			else contentLayers.delete(kind);
			map.setContentLayers({ [kind]: input.checked });
			const legacy = document.querySelector(`[data-content-layer="${kind}"]`);
			if (legacy) legacy.checked = input.checked;
		});
		row.append(input, document.createTextNode(label));
		showGrid.append(row);
	}
	body.append(showTitle, showGrid);

	const baseTitle = el("h3", "Fundo do mapa", "hud-section-title");
	const baseRow = document.createElement("div");
	baseRow.className = "hud-actions";
	const baseToggle = el("button", hudBaseReadable ? "Imagem aérea" : "Mapa legível", "secondary");
	baseToggle.setAttribute("aria-pressed", String(hudBaseReadable));
	baseToggle.addEventListener("click", () => {
		hudBaseReadable = !hudBaseReadable;
		baseToggle.setAttribute("aria-pressed", String(hudBaseReadable));
		baseToggle.textContent = hudBaseReadable ? "Imagem aérea" : "Mapa legível";
		map.setBaseLayer(hudBaseReadable ? "readable" : "satellite");
	});
	const home = el("button", "Voltar ao Perequê", "secondary");
	home.addEventListener("click", () => map.setView({ latitude: -23.9348, longitude: -46.1805, zoom: matchMedia("(max-width: 700px)").matches ? 15.54 : 16.1 }, { animate: true }));
	baseRow.append(baseToggle, home);
	body.append(baseTitle, baseRow);

	const opacityLabel = document.createElement("label");
	opacityLabel.className = "hud-check";
	opacityLabel.textContent = "Transparência das áreas";
	const opacity = document.createElement("input");
	opacity.type = "range";
	opacity.min = "0";
	opacity.max = "0.45";
	opacity.step = "0.05";
	opacity.value = $("area-opacity").value;
	opacity.setAttribute("aria-label", "Transparência das áreas");
	opacity.addEventListener("input", () => {
		$("area-opacity").value = opacity.value;
		map.setAreaOpacity(opacity.value);
	});
	body.append(opacityLabel, opacity);

	const legend = document.createElement("div");
	legend.className = "hud-legend";
	legend.setAttribute("aria-label", "Legenda das categorias no mapa");
	const legendRow = document.createElement("div");
	legendRow.append(el("span", "● Resíduos"), el("span", "● Água"));
	legend.append(legendRow, el("small", "Traço contínuo: geometria verificada. Tracejado: aproximada. Ausência de registro não significa ausência de problema."));
	body.append(el("h3", "Legenda", "hud-section-title"), legend);

	const advanced = document.createElement("div");
	advanced.className = "hud-actions";
	const fullFilters = el("button", "Filtros avançados", "secondary");
	fullFilters.addEventListener("click", () => {
		hud.close({ restoreFocus: false });
		openPrimaryPanel("filters", document.getElementById("hud-trigger"));
	});
	advanced.append(fullFilters);
	body.append(advanced);
}

function buildHudOccurrences(body) {
	body.replaceChildren();
	const searchInput = document.createElement("input");
	searchInput.type = "search";
	searchInput.value = $("search").value;
	searchInput.setAttribute("placeholder", "Buscar nos relatos");
	searchInput.setAttribute("aria-label", "Buscar nos relatos");
	body.append(hudRow("Buscar", searchInput));
	let searchTimer;
	searchInput.addEventListener("input", () => {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			$("search").value = searchInput.value;
			filtersChanged();
			refreshHudOccurrences(body, searchInput);
		}, 180);
	});

	const status = el("p", "", "hud-status");
	status.id = "hud-occ-status";
	status.setAttribute("role", "status");
	body.append(status);

	const actions = document.createElement("div");
	actions.className = "hud-actions";
	const fitAll = el("button", "Ver todas no mapa", "primary");
	fitAll.id = "hud-fit";
	const openFull = el("button", "Abrir lista completa", "secondary");
	const clearFilters = el("button", "Limpar filtros", "secondary");
	actions.append(fitAll, openFull, clearFilters);
	body.append(actions);
	fitAll.addEventListener("click", () => map.fit());
	openFull.addEventListener("click", () => {
		hud.close({ restoreFocus: false });
		openPrimaryPanel("occurrences", document.getElementById("hud-trigger"));
	});
	clearFilters.addEventListener("click", () => {
		reset();
		searchInput.value = "";
		refreshHudOccurrences(body, searchInput);
	});

	const list = document.createElement("div");
	list.className = "hud-list";
	list.id = "hud-list";
	body.append(list);
	refreshHudOccurrences(body, searchInput);
}

function refreshHudOccurrences(body, searchInput) {
	if (hud?.panel !== "occurrences" || !body.isConnected) return;
	const status = body.querySelector("#hud-occ-status");
	const list = body.querySelector("#hud-list");
	if (!status || !list) return;
	const inView = map.itemsInView(visibleItems).length;
	status.textContent = `${visibleItems.length} registro${visibleItems.length === 1 ? "" : "s"} nos filtros · ${inView} neste enquadramento.`;
	list.replaceChildren();
	if (!visibleItems.length) {
		list.append(el("p", "Nenhuma ocorrência corresponde aos filtros.", "hud-hint"));
		return;
	}
	for (const item of visibleItems.slice(0, 4)) {
		const card = document.createElement("button");
		card.type = "button";
		card.className = "hud-card";
		card.dataset.id = item.id;
		card.append(el("strong", item.title), el("small", `${item.id} · ${item.category} · ${item.status}`));
		card.addEventListener("click", () => {
			hud.close({ restoreFocus: false });
			select(item.id, { kind: "hud", element: card });
		});
		list.append(card);
	}
	if (visibleItems.length > 4) list.append(el("p", `Mostrando 4 de ${visibleItems.length}. Abra a lista completa para ver todos.`, "hud-hint"));
}

function buildHudAccount(body) {
	body.replaceChildren();
	const user = auth.getUser();
	if (!user) {
		body.append(el("p", "Acesse sua conta fictícia ou crie um perfil para registrar e participar.", "hud-hint"));
		body.append(el("p", auth.getStatus(), "hud-status"));
		const actions = document.createElement("div");
		actions.className = "hud-actions";
		const login = el("button", "Entrar", "primary");
		const register = el("button", "Criar conta", "secondary");
		const profile = el("button", "Abrir perfil completo", "secondary");
		login.addEventListener("click", (event) => {
			const trigger = document.getElementById("hud-trigger");
			trigger.focus({ preventScroll: true });
			hud.close({ restoreFocus: false });
			auth.openLogin();
		});
		register.addEventListener("click", () => {
			document.getElementById("hud-trigger").focus({ preventScroll: true });
			hud.close({ restoreFocus: false });
			auth.openRegister();
		});
		profile.addEventListener("click", () => {
			hud.close({ restoreFocus: false });
			openAccount();
		});
		actions.append(login, register, profile);
		body.append(actions);
		return;
	}
	body.append(el("p", `Conta fictícia: ${user.username}`, "hud-status"));
	body.append(el("p", user.role === "admin" ? "Perfil administrativo." : "Perfil comunitário.", "hud-hint"));
	const actions = document.createElement("div");
	actions.className = "hud-actions";
	const profile = el("button", "Abrir perfil completo", "primary");
	profile.addEventListener("click", () => {
		hud.close({ restoreFocus: false });
		openAccount();
	});
	const logout = el("button", "Sair", "secondary");
	logout.addEventListener("click", async () => {
		logout.disabled = true;
		await auth.logout();
		buildHudAccount(body);
	});
	actions.append(profile, logout);
	body.append(actions);
}

$("nav-register").addEventListener("click", () => {
	doHudRegister();
});

// ── Central do CuidAção: área própria de feed + publicação ──
// A Central é uma sobreposição em tela cheia: o mapa permanece montado e
// intocado atrás dela, de modo que centro, zoom e seleção se preservam
// sozinhos ao voltar. Nenhuma chamada aqui move a câmera.
let pendingCentralOrigin = null;
const central = mountCentral({
	auth,
	getFeedItems: () => visibleItems,
	getFilterSummary: centralFilterSummary,
	navigate: (hash) => {
		location.hash = hash;
	},
	closeToMap: closeCentralToMap,
	openFiltersPanel: openFiltersPanelFromCentral,
	viewOnMap: viewOnMapFromCentral,
	reloadList: () => renderList(),
	closeDetails: (options) => closeDetails(options),
	onCreate: () => {
		central.close({ restoreFocus: false });
		history.replaceState(null, "", `${location.pathname}${location.search}#map`);
		preparePanelInteraction();
		closePrimaryPanel({ restoreFocus: false });
		document.getElementById("hud-trigger")?.focus({ preventScroll: true });
		occurrenceForm.open();
	},
	forms: {
		contributionForm,
		stanceForm,
		occurrenceForm,
		transitionForm,
		administrativeAction,
		links
	}
});

function centralFilterSummary() {
	const parts = [];
	if ($("category").value) parts.push(categoryLabels[$("category").value]);
	if ($("status").value) parts.push(statusLabels[$("status").value]);
	const query = $("search").value.trim();
	if (query) parts.push(`busca por “${query.slice(0, 60)}”`);
	if ($("period").value) parts.push(`últimos ${$("period").value} dias`);
	if (explorationMode === "measurements") parts.push("modo: medições");
	if (activeCollection) parts.push(document.querySelector(`[data-collection="${activeCollection}"]`)?.textContent?.trim() ?? activeCollection);
	if (areaItems) parts.push("recorte de área selecionada");
	return { text: parts.length ? `Filtros atuais: ${parts.join(" · ")}.` : "Sem filtros ativos: todas as publicações visíveis." };
}

function openCentralPublication(id, origin = "direct") {
	stopTimeline();
	preparePanelInteraction();
	hud.close({ restoreFocus: false });
	closePrimaryPanel({ restoreFocus: false });
	pendingCentralOrigin = origin;
	if (location.hash === `#publicacao=${id}`) syncCentral();
	else location.hash = `#publicacao=${id}`;
}

function closeCentralToMap() {
	central.close({ restoreFocus: false });
	history.replaceState(null, "", `${location.pathname}${location.search}#map`);
	document.getElementById("hud-trigger")?.focus({ preventScroll: true });
}

function openFiltersPanelFromCentral() {
	hud.close({ restoreFocus: false });
	openPrimaryPanel("filters", document.getElementById("hud-trigger"));
}

function viewOnMapFromCentral(id) {
	central.close({ restoreFocus: false });
	history.replaceState(null, "", `${location.pathname}${location.search}#map`);
	map.focus(id);
	map.getFocusTarget(id)?.focus?.({ preventScroll: true });
}

function syncCentral() {
	const hash = location.hash;
	if (hash === "#central") {
		pendingCentralOrigin = null;
		central.openFeed();
		return;
	}
	const publicationId = centralPublicationId(hash);
	if (publicationId) {
		if (pendingCentralOrigin) central.setOrigin(pendingCentralOrigin);
		else if (!central.isOpen) central.setOrigin("direct");
		pendingCentralOrigin = null;
		central.openPublication(publicationId);
		return;
	}
	pendingCentralOrigin = null;
	if (central.isOpen) {
		const hadFocusInside = document.getElementById("central")?.contains(document.activeElement);
		central.close({ restoreFocus: false });
		if (hadFocusInside) document.getElementById("hud-trigger")?.focus({ preventScroll: true });
	}
}
window.addEventListener("hashchange", syncCentral);
document.querySelector(".occurrence-dialog")?.addEventListener("close", () => setActiveNav("nav-map"));

let selectedPlace = null;
function nearbyItems(point, radius = 500) {
	return allItems.map((item) => ({ item, distance: distanceMeters(point, item) })).filter((entry) => entry.distance <= radius).sort((a, b) => a.distance - b.distance);
}
function openPlace(point, context = {}) {
	if (!Number.isFinite(point?.latitude) || !Number.isFinite(point?.longitude)) return;
	selectedPlace = point;
	const nearby = nearbyItems(point);
	const measurement = nearby.find(({ item }) => isCompleteMeasurement(item.environmentalRepresentation));
	$("place-coordinates").textContent = `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)} · coordenada aproximada do clique`;
	const summary = $("place-summary");
	summary.replaceChildren(el("p", nearby.length ? `${nearby.length} registro${nearby.length === 1 ? "" : "s"} em até 500 m. O mais próximo está a ${Math.round(nearby[0].distance)} m.` : "Nenhum registro em até 500 m. Ausência de registro não significa ausência de problema."));
	if (measurement) {
		const value = measurement.item.environmentalRepresentation.measurement;
		summary.append(el("p", `Medição próxima, não feita neste ponto: ${value.value} ${value.unit}, a ${Math.round(measurement.distance)} m, em ${formatDate(value.measuredAt)}, origem ${value.source}${value.stationId ? `, estação ${value.stationId}` : ""}. Série histórica: somente um dado disponível nesta estação.`));
	} else summary.append(el("p", "Última medição próxima: Sem dados."));
	$("place-card").hidden = false;
	$("place-card").dataset.context = context.kind ?? "click";
	if (["contextmenu", "longpress"].includes(context.kind)) $("place-title").textContent = "Ações neste local";
	else $("place-title").textContent = "Ponto no Perequê";
}
$("place-close").addEventListener("click", () => { $("place-card").hidden = true; selectedPlace = null; });
$("place-nearby").addEventListener("click", () => {
	areaItems = new Set(nearbyItems(selectedPlace).map(({ item }) => item.id));
	renderList();
	openPrimaryPanel("occurrences", $("place-nearby"), { focus: false });
});
$("place-register").addEventListener("click", () => {
	if (!selectedPlace) return;
	$("place-card").hidden = true;
	occurrenceForm.open(null, { preset: selectedPlace });
});
$("place-copy").addEventListener("click", async () => {
	if (!selectedPlace) return;
	const value = `${selectedPlace.latitude.toFixed(6)}, ${selectedPlace.longitude.toFixed(6)}`;
	try { await navigator.clipboard.writeText(value); $("place-feedback").textContent = "Localização copiada."; }
	catch { $("place-feedback").textContent = `Copie a localização: ${value}`; }
});
$("place-follow").addEventListener("click", async () => {
	if (!auth.getUser()) { auth.openLogin(); return; }
	try {
		await preferences.createSubscription({ kind: "place", label: `Lugar ${selectedPlace.latitude.toFixed(4)}, ${selectedPlace.longitude.toFixed(4)}`, geometry: { type: "Point", coordinates: [selectedPlace.longitude, selectedPlace.latitude] }, radiusMeters: 500 });
		$("place-feedback").textContent = "Lugar acompanhado. As atualizações aparecerão na conta.";
	} catch (error) { $("place-feedback").textContent = error.message; }
});
function beginAreaInvestigation() {
	$("place-card").hidden = true;
	doHudInvestigate();
}
$("place-investigate").addEventListener("click", beginAreaInvestigation);
$("area-clear").addEventListener("click", () => {
	map.clearAreaInvestigation();
	selectedArea = areaItems = null;
	renderList();
});
$("area-cancel").addEventListener("click", () => {
	map.cancelAreaInvestigation();
	selectedArea = areaItems = null;
	hudInvestigating = false;
	renderList();
	if (hud.panel === "investigate") hud.backToMenu();
});
$("area-confirm").addEventListener("click", () => {
	const polygon = map.confirmAreaInvestigation();
	if (!polygon) {
		$("area-summary").textContent = "Marque pelo menos três vértices para confirmar.";
		return;
	}
	selectedArea = polygon;
	areaItems = new Set(allItems.filter((item) => areaRelationship(item, polygon).pointContained || areaRelationship(item, polygon).geometryIntersects).map((item) => item.id));
	renderList();
});
$("area-list").addEventListener("click", () => openPrimaryPanel("occurrences", $("area-list"), { focus: false }));
$("area-follow").addEventListener("click", async () => {
	if (!auth.getUser()) { auth.openLogin(); return; }
	if (!Array.isArray(selectedArea) || selectedArea.length < 3) {
		$("area-summary").textContent = "Confirme uma área com pelo menos três vértices antes de acompanhar.";
		return;
	}
	try {
		await preferences.createSubscription({ kind: "area", label: "Área investigada no mapa", geometry: { type: "Polygon", coordinates: [[...selectedArea, selectedArea[0]]] } });
	} catch (error) {
		$("area-summary").append(el("p", error.message));
	}
});
const accountScope = createRequestScope();
function closeAccount({ restoreFocus = true } = {}) {
	accountScope.cancel();
	if ($("account-panel").open) $("account-panel").close();
	$("nav-account").setAttribute("aria-expanded", "false");
	setActiveNav("nav-map");
	if (restoreFocus) ($("hud-trigger") ?? $("nav-account")).focus({ preventScroll: true });
}
function launchAuth(method) {
	closeAccount();
	queueMicrotask(() => auth[method]());
}
async function openAccount({ focus = true } = {}) {
	if (!$("account-panel").open) {
		preparePanelInteraction();
		closePrimaryPanel({ restoreFocus: false });
		$("account-panel").show();
	}
	$("nav-account").setAttribute("aria-expanded", "true");
	setActiveNav("nav-account");
	const user = auth.getUser();
	const body = $("account-body");
	if (!user) {
		const intro = el("p", "Acesse sua conta fictícia ou crie um perfil para registrar e participar.");
		const status = el("p", auth.getStatus(), "account-status");
		status.setAttribute("role", "status");
		const actions = el("div", "", "profile-auth-actions");
		const login = el("button", "Entrar");
		const register = el("button", "Criar conta", "secondary");
		login.addEventListener("click", () => launchAuth("openLogin"));
		register.addEventListener("click", () => launchAuth("openRegister"));
		actions.append(login, register);
		body.replaceChildren(intro, status, actions);
		if (focus) $("account-title").focus({ preventScroll: true });
		return;
	}
	const request = accountScope.begin();
	const logout = el("button", "Sair", "secondary profile-logout");
	logout.addEventListener("click", async () => {
		logout.disabled = true;
		await auth.logout();
		closeAccount();
	});
	body.replaceChildren(el("p", `Conta fictícia: ${user.username}`, "profile-identity"), el("p", user.role === "admin" ? "Perfil administrativo" : "Perfil comunitário"), logout, el("p", "Carregando registros criados…"));
	if (focus) $("account-title").focus({ preventScroll: true });
	try {
		const [items, subscriptions, queries, notifications] = await Promise.all([
			client.list({ signal: request.signal }),
			preferences.listSubscriptions({ signal: request.signal }),
			preferences.listQueries({ signal: request.signal }),
			preferences.notifications({ signal: request.signal })
		]);
		if (!request.isCurrent()) return;
		const own = items.filter((item) => item.authorId === user.id);
		const list = el("div", "", "account-occurrences");
		if (!own.length) list.append(el("p", "Nenhuma ocorrência criada por esta conta."));
		for (const item of own) {
			const button = el("button", `${item.title} · ${item.status}`, "secondary");
			button.addEventListener("click", () => {
				closeAccount();
				select(item.id, { kind: "account", element: $("nav-account") });
			});
			list.append(button);
		}
		const followed = el("div", "", "account-preferences");
		if (!subscriptions.length) followed.append(el("p", "Nenhum lugar, área ou ocorrência acompanhada."));
		for (const entry of subscriptions) {
			const row = el("div", ""), label = el("span", `${entry.label} · ${entry.kind === "place" ? "raio de 500 m" : entry.kind === "area" ? "área desenhada" : "ocorrência"}`), remove = el("button", "Remover", "secondary");
			remove.addEventListener("click", async () => { await preferences.removeSubscription(entry.id); openAccount({ focus: false }); });
			row.append(label, remove); followed.append(row);
		}
		const saved = el("div", "", "account-preferences");
		if (!queries.length) saved.append(el("p", "Nenhuma consulta salva."));
		for (const entry of queries) {
			const row = el("div", ""), apply = el("button", entry.name), remove = el("button", "Remover", "secondary");
			apply.addEventListener("click", () => { applySavedQuery(entry.query); closeAccount(); });
			remove.addEventListener("click", async () => { await preferences.removeQuery(entry.id); openAccount({ focus: false }); });
			row.append(apply, remove); saved.append(row);
		}
		const notices = el("div", "", "account-notifications");
		if (!notifications.length) notices.append(el("p", "Nenhuma atualização nos acompanhamentos."));
		for (const notice of notifications.slice(0, 12)) {
			const button = el("button", `${notice.read ? "Lida" : "Nova"} · ${notice.title}: ${notice.action}`, notice.read ? "secondary" : "");
			button.addEventListener("click", async () => { if (!notice.read) await preferences.markRead(notice.eventId); closeAccount(); select(notice.occurrenceId, { kind: "account", element: $("nav-account") }); });
			notices.append(button);
		}
		body.replaceChildren(el("p", `Conta fictícia: ${user.username}`, "profile-identity"), el("p", user.role === "admin" ? "Perfil administrativo" : "Perfil comunitário"), logout, el("h3", "Ocorrências criadas"), list, el("h3", "Acompanhamentos"), followed, el("h3", "Consultas salvas"), saved, el("h3", "Atualizações internas"), notices);
	} catch (error) {
		if (request.isCurrent()) body.replaceChildren(el("p", error.message));
	}
}
$("nav-account").addEventListener("click", () => {
	if ($("account-panel").open) closeAccount();
	else openAccount();
});
$("account-close").addEventListener("click", closeAccount);
$("account-panel").addEventListener("cancel", (event) => {
	event.preventDefault();
	closeAccount();
});
$("account-actions").addEventListener("click", (event) => {
	if (event.target.closest("button")) closeAccount({ restoreFocus: false });
});
document.addEventListener("pointerdown", (event) => {
	if ($("account-panel").open && !$("account-panel").contains(event.target) && !$("nav-account").contains(event.target)) closeAccount({ restoreFocus: false });
});
function select(id, source) {
	returnFocus = {
		id,
		...source
	};
	location.hash = `ocorrencia=${id}`;
}
function matches(item) {
	const query = $("search").value.trim().toLocaleLowerCase("pt-BR");
	const days = Number($("period").value);
	const searchable = `${item.id} ${item.title} ${item.description} ${item.locationLabel ?? ""}`.toLocaleLowerCase("pt-BR");
	return (!$("category").value || item.categoryCode === $("category").value)
		&& (!$("status").value || item.statusCode === $("status").value)
		&& (!query || searchable.includes(query))
		&& (!days || Date.parse(item.createdAt) >= Date.now() - days * 864e5)
		&& (explorationMode !== "measurements" || isCompleteMeasurement(item.environmentalRepresentation))
		&& (!areaItems || areaItems.has(item.id))
		&& (!activeCollection || collectionMatches(activeCollection, item, histories.get(item.id), Date.now()));
}
function queryState() {
	return { search: $("search").value.trim(), category: $("category").value, status: $("status").value, period: $("period").value, mode: explorationMode, collection: activeCollection, layers: [...contentLayers] };
}
function applySavedQuery(query) {
	$("search").value = typeof query?.search === "string" ? query.search.slice(0, 200) : "";
	$("category").value = Object.hasOwn(categoryLabels, query?.category) ? query.category : "";
	$("status").value = Object.hasOwn(statusLabels, query?.status) ? query.status : "";
	$("period").value = ["7", "30", "90"].includes(String(query?.period)) ? String(query.period) : "";
	explorationMode = ["occurrences", "measurements"].includes(query?.mode) ? query.mode : "occurrences";
	activeCollection = ["", "coast", "recurring-waste", "awaiting-update", "recently-resolved"].includes(query?.collection) ? query.collection : "";
	contentLayers = new Set(Array.isArray(query?.layers) ? query.layers.filter((kind) => ["occurrences", "areas", "measurements"].includes(kind)) : ["occurrences", "areas", "measurements"]);
	document.querySelectorAll("[data-mode]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === explorationMode)));
	document.querySelectorAll("[data-content-layer]").forEach((input) => { input.checked = contentLayers.has(input.dataset.contentLayer); });
	map.setContentLayers(Object.fromEntries(["occurrences", "areas", "measurements"].map((kind) => [kind, contentLayers.has(kind)])));
	filtersChanged();
}
function renderFilterContext(items) {
	const withoutCategory = allItems.filter((item) => {
		const selected = $("category").value;
		$("category").value = "";
		const result = matches(item);
		$("category").value = selected;
		return result;
	});
	$("category-counts").textContent = Object.entries(categoryLabels).map(([code, label]) => `${label}: ${withoutCategory.filter((item) => item.categoryCode === code).length}`).join(" · ");
	const chips = $("filter-chips"); chips.replaceChildren();
	for (const [key, label] of [[$("search").value.trim() && "search", `Busca: ${$("search").value.trim()}`], [$("category").value && "category", categoryLabels[$("category").value]], [$("status").value && "status", statusLabels[$("status").value]], [$("period").value && "period", `Últimos ${$("period").value} dias`], [explorationMode === "measurements" && "mode", "Modo: medições"], [activeCollection && "collection", activeCollection && document.querySelector(`[data-collection="${activeCollection}"]`)?.textContent], [areaItems && "area", areaItems && "Área selecionada"]]) {
		if (!key) continue;
		const button = el("button", `${label} ×`); button.type = "button";
		button.addEventListener("click", () => {
			if (key === "search") $("search").value = "";
			else if (["category", "status", "period"].includes(key)) $(key).value = "";
			else if (key === "mode") { explorationMode = "occurrences"; document.querySelectorAll("[data-mode]").forEach((entry) => entry.setAttribute("aria-pressed", String(entry.dataset.mode === explorationMode))); }
			else if (key === "collection") activeCollection = "";
			else if (key === "area") { areaItems = selectedArea = null; map.cancelAreaInvestigation(); hudInvestigating = false; }
			filtersChanged();
		});
		chips.append(button);
	}
}
function renderData(items) {
	const values = [
		["Registros", items.length],
		["Água", items.filter((item) => item.categoryCode === "agua").length],
		["Resíduos", items.filter((item) => item.categoryCode === "residuos").length],
		["Em acompanhamento", items.filter((item) => item.statusCode === "monitoring").length]
	];
	$("data-metrics").replaceChildren(...values.map(([label, value]) => {
		const row = document.createElement("div");
		row.append(el("dt", label), el("dd", String(value)));
		return row;
	}));
	const followup = $("followup-list");
	followup.replaceChildren();
	const monitored = items.filter((item) => item.statusCode === "monitoring").slice(0, 4);
	if (!monitored.length) followup.append(el("p", "Nenhum registro em acompanhamento nos filtros atuais."));
	for (const item of monitored) {
		const button = el("button", "");
		button.append(el("span", item.title), el("small", item.category));
		button.addEventListener("click", () => select(item.id, { kind: "data", element: button }));
		followup.append(button);
	}
}
let timelineTimer = null;
function stopTimeline() {
	clearInterval(timelineTimer);
	timelineTimer = null;
	$("timeline-play").textContent = "Reproduzir";
}
async function loadHistories() {
	if (!allItems.length) return;
	$("timeline-note").textContent = "Carregando eventos públicos…";
	const missing = allItems.filter((item) => !histories.has(item.id));
	const results = await Promise.allSettled(missing.map(async (item) => [item.id, await client.history(item.id)]));
	for (const result of results) if (result.status === "fulfilled") histories.set(...result.value);
	const failed = results.filter((result) => result.status === "rejected").length;
	const transitions = [...histories.values()].flat().filter((event) => event.action === "transition").length;
	$("timeline-note").textContent = failed ? `${failed} histórico${failed === 1 ? "" : "s"} não puderam ser carregados; a reprodução está incompleta.` : transitions ? `A reprodução usa ${transitions} mudança${transitions === 1 ? "" : "s"} de estado registrada${transitions === 1 ? "" : "s"} no histórico público fictício.` : "Não há mudanças de estado suficientes para uma reprodução histórica; somente a data de criação pode ser reconstruída.";
	configureTimeline();
}
function timelineExtent() {
	const dates = allItems.flatMap((item) => [Date.parse(item.createdAt), ...(histories.get(item.id) ?? []).map((event) => Date.parse(event.date))]).filter(Number.isFinite);
	return dates.length ? [Math.min(...dates), Math.max(Date.now(), ...dates)] : [Date.now(), Date.now()];
}
function configureTimeline() {
	const [minimum, maximum] = timelineExtent();
	$("timeline-date").min = String(minimum);
	$("timeline-date").max = String(maximum);
	$("timeline-date").step = String(864e5);
	$("timeline-date").value = String(historicalDate ? Date.parse(historicalDate) : maximum);
	$("timeline-output").textContent = historicalDate ? formatDate(historicalDate) : "Atual";
	const iso = (value) => new Date(value).toISOString().slice(0, 10);
	if (!$("compare-a").value) $("compare-a").value = iso(minimum);
	if (!$("compare-b").value) $("compare-b").value = iso(maximum);
}
$("nav-data").addEventListener("click", () => { if (activePanel === "data") loadHistories().catch((error) => { $("timeline-note").textContent = error.message; }); });
$("timeline-date").addEventListener("input", () => {
	stopTimeline();
	historicalDate = new Date(Number($("timeline-date").value)).toISOString();
	$("timeline-output").textContent = formatDate(historicalDate);
	renderList();
});
$("timeline-now").addEventListener("click", () => { stopTimeline(); historicalDate = null; configureTimeline(); renderList(); });
$("timeline-play").addEventListener("click", () => {
	if (timelineTimer) { stopTimeline(); return; }
	const [minimum, maximum] = timelineExtent(), step = Math.max(864e5, Math.round((maximum - minimum) / 24));
	let cursor = historicalDate ? Date.parse(historicalDate) : minimum;
	$("timeline-play").textContent = "Pausar";
	timelineTimer = setInterval(() => {
		cursor += step;
		if (cursor >= maximum) { stopTimeline(); historicalDate = null; configureTimeline(); renderList(); return; }
		historicalDate = new Date(cursor).toISOString();
		$("timeline-date").value = String(cursor);
		$("timeline-output").textContent = formatDate(historicalDate);
		renderList();
	}, Number($("timeline-speed").value));
});
$("timeline-speed").addEventListener("change", () => { if (timelineTimer) { stopTimeline(); $("timeline-play").click(); } });
document.querySelectorAll("[data-collection]").forEach((button) => button.addEventListener("click", async () => {
	stopTimeline();
	await loadHistories();
	activeCollection = activeCollection === button.dataset.collection ? "" : button.dataset.collection;
	document.querySelectorAll("[data-collection]").forEach((entry) => entry.setAttribute("aria-pressed", String(entry.dataset.collection === activeCollection)));
	const rules = {
		coast: "Termos explícitos praia, orla ou faixa de areia no relato ou referência.",
		"recurring-waste": "Resíduos ligados como duplicata no histórico; proximidade não é usada como prova.",
		"awaiting-update": "Em acompanhamento sem evento público nos últimos 30 dias.",
		"recently-resolved": "Mudança registrada para Encerrada nos últimos 30 dias."
	};
	$("collection-rule").textContent = activeCollection ? rules[activeCollection] : "Cada coleção aplica critérios explícitos; proximidade sozinha nunca comprova recorrência.";
	renderList();
}));
let comparisonSide = "A";
function updateComparison() {
	const first = new Date(`${$("compare-a").value}T23:59:59Z`), second = new Date(`${$("compare-b").value}T23:59:59Z`);
	if (!Number.isFinite(first.valueOf()) || !Number.isFinite(second.valueOf())) return;
	const firstItems = historicalSnapshot(allItems, histories, first).filter(matches), secondItems = historicalSnapshot(allItems, histories, second).filter(matches);
	$("compare-summary").textContent = `Período A: ${firstItems.length} registros até ${formatDate(first)} · Período B: ${secondItems.length} registros até ${formatDate(second)}. Estados: A ${firstItems.filter((item) => item.statusCode === "monitoring").length} em acompanhamento; B ${secondItems.filter((item) => item.statusCode === "monitoring").length}.`;
}
$("compare-toggle").addEventListener("click", async () => {
	await loadHistories();
	const active = $("compare-toggle").getAttribute("aria-pressed") !== "true";
	$("compare-toggle").setAttribute("aria-pressed", String(active));
	$("compare-toggle").textContent = active ? "Encerrar comparação" : "Comparar";
	$("compare-side").disabled = !active;
	if (!active) { historicalDate = null; renderList(); return; }
	comparisonSide = "A";
	const picked = new Date(`${$("compare-a").value}T23:59:59Z`);
	if (!Number.isFinite(picked.valueOf())) {
		$("compare-summary").textContent = "Escolha uma data válida para comparar.";
		$("compare-toggle").setAttribute("aria-pressed", "false");
		$("compare-toggle").textContent = "Comparar";
		$("compare-side").disabled = true;
		return;
	}
	historicalDate = picked.toISOString();
	updateComparison(); renderList();
});
$("compare-side").addEventListener("click", () => {
	comparisonSide = comparisonSide === "A" ? "B" : "A";
	$("compare-side").textContent = `Exibindo ${comparisonSide} · alternar para ${comparisonSide === "A" ? "B" : "A"}`;
	const picked = new Date(`${$(comparisonSide === "A" ? "compare-a" : "compare-b").value}T23:59:59Z`);
	if (!Number.isFinite(picked.valueOf())) {
		$("compare-summary").textContent = "Escolha uma data válida para comparar.";
		return;
	}
	historicalDate = picked.toISOString();
	renderList();
});
$("compare-a").addEventListener("change", updateComparison);
$("compare-b").addEventListener("change", updateComparison);
async function renderList() {
	const request = listScope.begin();
	$("show-all").hidden = true;
	$("list").replaceChildren();
	map.show([]);
	$("count").textContent = "—";
	$("empty").hidden = true;
	$("retry").hidden = true;
	$("list-status").hidden = false;
	$("list-status").textContent = "Carregando ocorrências…";
	$("list").setAttribute("aria-busy", "true");
	try {
		const loaded = await client.list({ includeDuplicates: activeCollection === "recurring-waste", signal: request.signal });
		if (!request.isCurrent()) return;
		allItems = loaded;
		const temporal = historicalDate ? historicalSnapshot(loaded, histories, historicalDate).map((item) => ({ ...item, status: statusLabels[item.statusCode] })) : loaded;
		const items = temporal.filter(matches);
		visibleItems = items;
		for (const [index, item] of items.entries()) {
			const card = occurrenceCard(item, index, el);
			card.addEventListener("pointerenter", () => map.highlight(item.id, true));
			card.addEventListener("pointerleave", () => map.highlight(item.id, false));
			card.addEventListener("focus", () => map.highlight(item.id, true));
			card.addEventListener("blur", () => map.highlight(item.id, false));
			card.classList.toggle("is-selected", currentDetail?.id === item.id);
			card.addEventListener("click", () => select(item.id, {
				kind: "card",
				element: card
			}));
			$("list").append(card);
		}
		$("show-all").hidden = items.length <= 4;
		map.show(items);
		if (activePanel === "filters" && items.length === 1) map.reveal(items[0].id);
		// Keep the opening camera fixed; explicit "Ver todas" still fits filtered points.
		if (currentDetail) map.focus(currentDetail.id);
		$("count").textContent = `${items.length} registro${items.length === 1 ? "" : "s"}`;
		renderData(items);
		renderFilterContext(items);
		updateViewportSummary();
		if (hud?.panel === "occurrences") refreshHudOccurrences(hud.body, hud.body.querySelector("input[type=search]"));
		$("empty").hidden = items.length > 0;
		$("list-status").hidden = true;
	} catch (error) {
		if (!request.isCurrent()) return;
		if (!activePanel) openPrimaryPanel("occurrences", $("nav-occurrences"), { focus: false });
		$("list-status").textContent = error.message;
		$("retry").hidden = false;
	} finally {
		if (request.isCurrent()) $("list").setAttribute("aria-busy", "false");
	}
}
function filtersChanged() {
	filterRevision++;
	if (currentDetail && !matches(currentDetail)) closeDetails();
	renderList();
}
function reset() {
	$("search").value = "";
	$("category").value = "";
	$("status").value = "";
	$("period").value = "";
	activeCollection = "";
	areaItems = selectedArea = null;
	map.cancelAreaInvestigation();
	hudInvestigating = false;
	if (hud?.panel === "investigate") hud.backToMenu();
	filtersChanged();
}
let searchTimer;
$("search").addEventListener("input", () => {
	clearTimeout(searchTimer);
	searchTimer = setTimeout(filtersChanged, 180);
});
$("category").addEventListener("change", filtersChanged);
$("status").addEventListener("change", filtersChanged);
$("period").addEventListener("change", filtersChanged);
document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
	explorationMode = button.dataset.mode;
	document.querySelectorAll("[data-mode]").forEach((entry) => entry.setAttribute("aria-pressed", String(entry === button)));
	filtersChanged();
}));
document.querySelectorAll("[data-content-layer]").forEach((input) => input.addEventListener("change", () => {
	if (input.checked) contentLayers.add(input.dataset.contentLayer); else contentLayers.delete(input.dataset.contentLayer);
	map.setContentLayers({ [input.dataset.contentLayer]: input.checked });
	updateViewportSummary();
}));
$("area-opacity").addEventListener("input", () => map.setAreaOpacity($("area-opacity").value));
$("reset").addEventListener("click", reset);
$("empty-reset").addEventListener("click", reset);
$("fit").addEventListener("click", map.fit);
$("list-fit").addEventListener("click", map.fit);
$("retry").addEventListener("click", renderList);
function updateViewportSummary() {
	const count = map.itemsInView(visibleItems).length;
	$("viewport-summary").querySelector("span").textContent = count ? `${count} ocorrência${count === 1 ? "" : "s"} neste enquadramento` : "Nenhuma ocorrência atende aos critérios nesta área";
}
map.onViewportChange(updateViewportSummary);
$("viewport-summary").addEventListener("click", () => openPrimaryPanel("occurrences", $("viewport-summary"), { focus: false }));
$("territory-home").addEventListener("click", () => map.setView({ latitude: -23.9348, longitude: -46.1805, zoom: matchMedia("(max-width: 700px)").matches ? 15.54 : 16.1 }, { animate: true }));
$("base-layer").addEventListener("click", () => {
	const readable = $("base-layer").getAttribute("aria-pressed") !== "true";
	$("base-layer").setAttribute("aria-pressed", String(readable));
	$("base-layer").querySelector("span").textContent = readable ? "Imagem aérea" : "Mapa legível";
	map.setBaseLayer(readable ? "readable" : "satellite");
});
$("share-view").addEventListener("click", async () => {
	const url = explorationURL({ ...queryState(), layers: contentLayers }, map.getView());
	try { await navigator.clipboard.writeText(url.href); $("share-feedback").textContent = "Link da visão copiado."; }
	catch { $("share-feedback").textContent = `Copie este link: ${url.href}`; }
});
$("save-query").addEventListener("click", async () => {
	if (!auth.getUser()) { auth.openLogin(); return; }
	const name = window.prompt("Nome da consulta salva:", "Minha consulta do Perequê")?.trim();
	if (!name) return;
	try { await preferences.createQuery(name, queryState()); $("share-feedback").textContent = "Consulta salva na conta."; }
	catch (error) { $("share-feedback").textContent = error.message; }
});
async function syncDetails() {
	const request = detailScope.begin(), revision = filterRevision;
	const id = selectedId(location.hash), body = $("detail-body");
	const wasOpen = $("details").open;
	currentDetail = null;
	if (!id && !location.hash.startsWith("#ocorrencia=")) {
		// Sem ocorrência selecionada: encerra o ciclo do diálogo. A ficha do
		// pin no mapa tem seleção própria e não é desfeita por hashes de
		// navegação (Central, mapa, filtros) quando nenhum detalhe a gerou.
		const hadDialog = wasOpen;
		if ($("details").open) $("details").close();
		if (hadDialog) {
			if (savedMapView && !mapViewDirty) {
				mapViewGuard = true;
				map.setView(savedMapView, { animate: false });
				setTimeout(() => { mapViewGuard = false; }, 300);
			}
			map.clearSelection();
		}
		savedMapView = null;
		mapViewDirty = false;
		currentDetail = null;
		return;
	}
	if (!$("details").open && !returnFocus) returnFocus = { element: document.activeElement };
	body.replaceChildren();
	const title = el("h2", "Carregando ocorrência…");
	title.id = "detail-title";
	body.append(title);
	body.setAttribute("aria-busy", "true");
	if (!$("details").open) $("details").show();
	try {
		const [item, events] = await Promise.all([client.detail(id, { signal: request.signal }), client.history(id, { signal: request.signal })]);
		if (!request.isCurrent()) return;
		if (revision !== filterRevision && !matches(item)) {
			closeDetails();
			return;
		}
		currentDetail = item;
		if (!savedMapView) {
			savedMapView = map.getView();
			mapViewDirty = false;
		}
		mapViewGuard = true;
		map.focus(id);
		setTimeout(() => { mapViewGuard = false; }, 400);
		body.replaceChildren();
		title.textContent = item.title;
		// ── Central de Denúncias e Interações: resumo dedicado da ocorrência ──
		const centralSummary = el("section", "", "central-summary");
		centralSummary.setAttribute("aria-label", "Resumo da ocorrência");
		const centralKicker = el("p", "Central de Denúncias e Interações · registro fictício", "card-meta");
		const centralTitle = el("h3", item.title);
		const centralBadges = el("p", "");
		centralBadges.append(el("span", item.category, "badge"), document.createTextNode(" "), el("span", item.status, "badge"));
		const centralDl = document.createElement("dl");
		for (const [label, value] of [
			["Estado", item.status],
			["Localização ilustrativa", item.locationLabel ?? "Não informada"],
			["Coordenadas", `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`],
			["Atualizada em", formatDate(item.updatedAt)]
		]) centralDl.append(el("dt", label), el("dd", value));
		centralSummary.append(centralKicker, centralTitle, centralBadges, centralDl);
		const updateActions = el("div", "", "central-actions");
		const addUpdate = el("button", "Adicionar atualização");
		addUpdate.type = "button";
		const commentChoice = el("button", "Comentar atualização", "secondary");
		commentChoice.type = "button";
		const evidenceChoice = el("button", "Anexar evidência", "secondary");
		evidenceChoice.type = "button";
		commentChoice.hidden = evidenceChoice.hidden = true;
		addUpdate.addEventListener("click", () => {
			const expanded = commentChoice.hidden;
			commentChoice.hidden = evidenceChoice.hidden = !expanded;
			addUpdate.setAttribute("aria-expanded", String(expanded));
			if (expanded) commentChoice.focus();
		});
		commentChoice.addEventListener("click", () => contributionForm.open({ ...item, version: item.version }, null, "comment"));
		evidenceChoice.addEventListener("click", () => contributionForm.open({ ...item, version: item.version }, null, "supplement"));
		updateActions.append(addUpdate, commentChoice, evidenceChoice);
		const environmental = environmentalPresentation(item);
		const illustrativeNote = el("p", environmental
			? `Camada ambiental: ${environmental.label}, geometria ${environmental.approximate ? "aproximada" : "verificada"} informada no registro.`
			: "Camada ambiental: este registro possui apenas coordenadas; o pin não representa extensão afetada.", "map-illustration-note");
		const relatoHeading = el("h3", "Relato original");
		relatoHeading.id = "detail-report";
		body.append(el("p", `${item.id} · ${item.category}`, "card-meta"), title, el("span", item.status, "badge"), centralSummary, updateActions);
		const sectionNav = el("nav", "", "detail-section-nav");
		sectionNav.setAttribute("aria-label", "Seções da ocorrência");
		body.append(sectionNav, relatoHeading, illustrativeNote, el("p", item.description, "description"));
		const dl = document.createElement("dl");
		for (const [label, value] of [
			["Localização ilustrativa", item.locationLabel ?? "Não informada"],
			["Coordenadas", `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`],
			["Registrada em", formatDate(item.createdAt)]
		]) dl.append(el("dt", label), el("dd", value));
		const contextActions = el("div", "", "detail-context-actions");
		if (["community_review", "confirmed", "monitoring"].includes(item.statusCode) && !item.duplicateOfId) {
			const observed = el("button", "Também observei isso");
			observed.addEventListener("click", () => contributionForm.open(item, null, "supplement"));
			contextActions.append(observed);
		}
		const follow = el("button", "Acompanhar atualizações", "secondary");
		follow.addEventListener("click", async () => {
			if (!auth.getUser()) { auth.openLogin(); return; }
			follow.disabled = true;
			try { await preferences.createSubscription({ kind: "occurrence", occurrenceId: item.id, label: item.title }); follow.textContent = "Acompanhando"; }
			catch (error) { follow.disabled = false; follow.textContent = error.message; }
		});
		contextActions.append(follow);
		occurrenceForm.appendEditControl(body, item);
		transitionForm.appendControl(body, item);
		administrativeAction.appendReport(body, item, "occurrence", item.id);
		body.append(dl, contextActions);
		// ── Linha do tempo única: comentários + evidências + mudanças de estado ──
		const unifiedSection = el("section", "");
		unifiedSection.setAttribute("aria-label", "Linha do tempo da ocorrência");
		const unifiedHeading = el("h3", "Linha do tempo");
		unifiedHeading.id = "detail-timeline";
		unifiedSection.append(unifiedHeading, el("p", "Comentários, evidências e mudanças de estado em ordem cronológica, sem abas."));
		const unifiedList = el("ol", "", "central-timeline");
		unifiedList.append(el("li", "Carregando linha do tempo…"));
		unifiedSection.append(unifiedList);
		body.append(unifiedSection);
		(async () => {
			try {
				const contributionClient = createContributionClient();
				const attachmentClient = createAttachmentClient();
				const [contributionResult, attachmentResult] = await Promise.all([
					contributionClient.list(item.id, { signal: request.signal }),
					attachmentClient.list(item.id, { signal: request.signal })
				]);
				if (!request.isCurrent() || request.signal.aborted) return;
				paintTimeline(unifiedList, collectTimelineRows({ contributions: contributionResult.data, attachments: attachmentResult.data, events }));
			} catch (timelineError) {
				if (!request.signal.aborted) {
					unifiedList.replaceChildren();
					unifiedList.append(el("li", "Não foi possível carregar a linha do tempo única. Use as seções detalhadas abaixo."));
				}
			}
		})();
		renderClosure(body, item);
		if (item.duplicateOfId) {
			const note = el("p", "Esta ocorrência é uma duplicata. ");
			if (item.flags.duplicateTargetUnavailable) note.append(el("span", "Registro principal indisponível."));
			else {
				const link = el("a", `Consultar ${item.duplicateOfId}`);
				link.href = `#ocorrencia=${item.duplicateOfId}`;
				note.append(link);
			}
			body.append(note);
		}
		if (item.flags.referencesUnavailable || item.flags.referencesChanged || item.flags.relationsRemoved) body.append(el("p", "Há referências indisponíveis, alteradas ou removidas. A decisão requer revisão."));
		const linkSection = el("section", "");
		body.append(linkSection);
		renderPublicLinks(linkSection, item, {
			signal: request.signal,
			onDuplicate: async (container, id) => {
				try {
					const origin = await client.detail(id, { signal: request.signal });
					if (request.signal.aborted) return;
					container.replaceChildren(el("h4", "Conteúdo da origem " + id));
					const images = el("section", ""), discussion = el("section", ""), positions = el("section", "");
					container.append(images, discussion, positions);
					renderAttachments(images, origin, {
						auth,
						signal: request.signal,
						onChanged() {
							renderList();
							syncDetails();
						}
					});
					renderContributions(discussion, origin, {
						auth,
						signal: request.signal,
						form: contributionForm,
						onChanged() {
							renderList();
							syncDetails();
						}
					});
					renderStances(positions, origin, {
						auth,
						signal: request.signal,
						form: stanceForm
					});
				} catch (error) {
					if (!request.signal.aborted) container.replaceChildren(el("p", error.message));
				}
			}
		});
		const evidence = el("section", "");
		evidence.className = "attachment-gallery";
		evidence.setAttribute("aria-label", "Evidências fictícias");
		const contributions = el("section", "");
		contributions.setAttribute("aria-label", "Discussão e contribuições");
		const stances = el("section", "");
		stances.setAttribute("aria-label", "Verificação comunitária");
		body.append(el("h3", "Verificação comunitária"), stances);
		renderStances(stances, item, {
			auth,
			signal: request.signal,
			form: stanceForm,
			reportForm: administrativeAction
		});
		const evidenceHeading = el("h3", "Evidências");
		evidenceHeading.id = "detail-evidence";
		const discussionHeading = el("h3", "Discussão e contribuições");
		discussionHeading.id = "detail-discussion";
		const historyHeading = el("h3", "Histórico simulado");
		historyHeading.id = "detail-history";
		body.append(evidenceHeading, evidence, discussionHeading, contributions, historyHeading);
		for (const [label, heading] of [["Relato", relatoHeading], ["Evidências", evidenceHeading], ["Discussão", discussionHeading], ["Histórico", historyHeading]]) {
			heading.tabIndex = -1;
			const button = el("button", label, "secondary");
			button.addEventListener("click", () => {
				for (const item of sectionNav.children) item.removeAttribute("aria-current");
				button.setAttribute("aria-current", "true");
				heading.scrollIntoView({ block: "start", behavior: movimentoReduzido() ? "instant" : "smooth" });
				heading.focus({ preventScroll: true });
			});
			sectionNav.append(button);
		}
		renderContributions(contributions, item, {
			auth,
			signal: request.signal,
			form: contributionForm,
			reportForm: administrativeAction,
			onChanged() {
				renderList();
				syncDetails();
			}
		});
		renderAttachments(evidence, item, {
			auth,
			signal: request.signal,
			reportForm: administrativeAction,
			onChanged() {
				renderList();
				syncDetails();
			}
		});
		const timeline = el("section", "");
		body.append(timeline);
		renderHistory(timeline, events);
		body.append(el("p", "Dados fictícios para apresentação do TCC. A confirmação comunitária não equivale a laudo técnico.", "detail-note"));
	} catch (error) {
		if (!request.isCurrent()) return;
		body.replaceChildren();
		title.textContent = [404, 422].includes(error.status) ? "Ocorrência não encontrada" : "Não foi possível carregar a ocorrência";
		body.append(title, el("p", [404, 422].includes(error.status) ? "Esse identificador não está disponível." : error.message));
		if (![404, 422].includes(error.status)) {
			const retry = el("button", "Tentar novamente", "secondary");
			retry.addEventListener("click", syncDetails);
			body.append(retry);
		}
	} finally {
		if (request.isCurrent()) body.setAttribute("aria-busy", "false");
	}
}
function closeDetails({ keepHash = false, keepSelection = false } = {}) {
	if (!keepHash) history.replaceState(null, "", location.pathname + location.search);
	detailScope.cancel();
	currentDetail = null;
	// A Central abre por cima do mapa sem mover a câmera nem desfazer a
	// ficha consultada; nesses casos a seleção é preservada e a restauração
	// pendente do diálogo é abandonada (a câmera atual é a consultada).
	if (!keepSelection) {
		map.clearSelection();
		// Volta ao mesmo ponto do mapa: restaura a câmera anterior à seleção,
		// exceto se o usuário navegou o mapa enquanto a Central estava aberta.
		if (savedMapView && !mapViewDirty) {
			mapViewGuard = true;
			map.setView(savedMapView, { animate: false });
			setTimeout(() => { mapViewGuard = false; }, 300);
		}
	}
	savedMapView = null;
	mapViewDirty = false;
	if ($("details").open) $("details").close();
}
$("close").addEventListener("click", closeDetails);
$("details").addEventListener("cancel", (event) => {
	event.preventDefault();
	closeDetails();
});
window.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && $("details").open && !document.querySelector("dialog:modal")) closeDetails();
});
$("details").addEventListener("close", () => {
	if ($("details").open) return;
	const target = returnFocus?.kind === "map" ? map.getFocusTarget(returnFocus.id) : returnFocus?.element?.isConnected ? returnFocus.element : Array.from($("list").children).find((card) => card.dataset.id === returnFocus?.id);
	const reachable = target && target !== document.body && target.getClientRects().length && !target.closest("[hidden], [inert]");
	(reachable ? target : activePanel === "occurrences" ? $("list-heading") : $("hud-trigger")).focus({ preventScroll: true });
	returnFocus = null;
});
window.addEventListener("hashchange", syncDetails);
renderList();
syncDetails();
syncCentral();
