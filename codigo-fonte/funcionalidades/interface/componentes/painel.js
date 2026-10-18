/** HUD orgânica do CuidAção: uma superfície, duas expansões sequenciais. */
const PANEL_META = {
	investigate: { title: "Investigar área", kicker: "SELEÇÃO ESPACIAL" },
	layers: { title: "Camadas ambientais", kicker: "CARTOGRAFIA" },
	occurrences: { title: "Lista de ocorrências", kicker: "CONSULTA" },
	account: { title: "Conta / perfil", kicker: "PERFIL FICTÍCIO" }
};
const CLOSED = "closed", OPENING_HORIZONTAL = "opening-horizontal", OPENING_VERTICAL = "opening-vertical";
const OPEN = "open", CLOSING_VERTICAL = "closing-vertical", CLOSING_HORIZONTAL = "closing-horizontal";

export function mountHud({ onAction, onClosePanel } = {}) {
	const root = document.getElementById("hud"), trigger = document.getElementById("hud-trigger");
	const menu = document.getElementById("hud-menu"), panel = document.getElementById("hud-panel");
	const panelTitle = document.getElementById("hud-panel-title"), panelKicker = document.getElementById("hud-panel-kicker");
	const panelBody = document.getElementById("hud-panel-body"), back = document.getElementById("hud-back");
	const close = document.getElementById("hud-close");
	if (!root || !trigger || !menu || !panel) return null;
	const reduced = matchMedia("(prefers-reduced-motion: reduce)");
	let motionState = CLOSED, view = "closed", activePanel = null, returnFocus = null;
	let requestedOpen = false, transitionToken = 0;

	const waitForTransition = (property, fallback) => new Promise((resolve) => {
		const token = transitionToken;
		let timer;
		const done = () => { root.removeEventListener("transitionend", onEnd); clearTimeout(timer); resolve(token === transitionToken); };
		const onEnd = (event) => { if (event.target === root && event.propertyName === property) done(); };
		root.addEventListener("transitionend", onEnd);
		timer = window.setTimeout(done, fallback);
	});
	function setMotion(next) {
		motionState = next;
		root.dataset.motionState = next;
		root.classList.toggle("is-closed", next === CLOSED);
		root.classList.toggle("is-open", next === OPEN || next.startsWith("opening") || next === CLOSING_VERTICAL);
		root.setAttribute("aria-busy", String(![CLOSED, OPEN].includes(next)));
	}
	function syncDom() {
		root.dataset.state = view;
		root.classList.toggle("has-panel", view === "panel" && Boolean(activePanel));
		trigger.setAttribute("aria-expanded", String(view !== "closed"));
		trigger.setAttribute("aria-label", view === "closed" ? "Abrir menu do CuidAção" : "Fechar menu do CuidAção");
		menu.hidden = view !== "menu";
		menu.inert = motionState !== OPEN || view !== "menu";
		menu.setAttribute("aria-hidden", String(view !== "menu"));
		panel.hidden = !(view === "panel" && activePanel);
		for (const button of menu.querySelectorAll("[data-hud-action]")) {
			const expanded = view === "panel" && activePanel === button.dataset.hudAction;
			if (button.hasAttribute("aria-expanded")) button.setAttribute("aria-expanded", String(expanded));
			button.classList.toggle("is-active", expanded);
		}
		document.body.dataset.hudState = view;
		document.body.dataset.hudPanel = activePanel ?? "";
	}
	async function finishOpening(token) {
		if (!reduced.matches && !await waitForTransition("width", 520)) return;
		if (token !== transitionToken) return;
		if (!requestedOpen) return reconcile();
		setMotion(OPENING_VERTICAL);
		if (!reduced.matches && !await waitForTransition("height", 520)) return;
		if (token !== transitionToken) return;
		if (!requestedOpen) return reconcile();
		setMotion(OPEN); syncDom();
	}
	function openMenu(triggerElement) {
		requestedOpen = true;
		if (view === "panel") { view = "menu"; activePanel = null; onClosePanel?.(); syncDom(); return; }
		if (motionState === OPEN || motionState.startsWith("opening")) return;
		returnFocus = triggerElement ?? document.activeElement;
		view = "menu"; activePanel = null; transitionToken++;
		setMotion(OPENING_HORIZONTAL); syncDom(); finishOpening(transitionToken);
	}
	async function finishClosing(token, restoreFocus) {
		if (!reduced.matches && !await waitForTransition("height", 520)) return;
		if (token !== transitionToken || requestedOpen) return reconcile();
		setMotion(CLOSING_HORIZONTAL);
		if (!reduced.matches && !await waitForTransition("width", 520)) return;
		if (token !== transitionToken || requestedOpen) return reconcile();
		view = "closed"; setMotion(CLOSED); syncDom();
		if (restoreFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
		else if (restoreFocus) trigger.focus({ preventScroll: true });
	}
	function closeHud({ restoreFocus = true } = {}) {
		requestedOpen = false;
		if (motionState === CLOSED || motionState.startsWith("closing")) return;
		activePanel = null; onClosePanel?.(); transitionToken++;
		setMotion(CLOSING_VERTICAL); syncDom(); finishClosing(transitionToken, restoreFocus);
	}
	function reconcile() {
		transitionToken++;
		if (requestedOpen) { view = "menu"; setMotion(OPENING_HORIZONTAL); syncDom(); finishOpening(transitionToken); }
		else { setMotion(CLOSING_VERTICAL); syncDom(); finishClosing(transitionToken, false); }
	}
	function openPanel(name, { focus = true } = {}) {
		if (!PANEL_META[name]) return;
		returnFocus ??= document.activeElement; view = "panel"; activePanel = name;
		panelKicker.textContent = PANEL_META[name].kicker; panelTitle.textContent = PANEL_META[name].title; syncDom();
		if (focus) (panelBody.querySelector("input, select, button:not(#hud-back)") ?? panelTitle).focus({ preventScroll: true });
	}
	function backToMenu() {
		view = "menu"; activePanel = null; onClosePanel?.(); syncDom();
		menu.querySelector("[data-hud-action]")?.focus({ preventScroll: true });
	}
	trigger.addEventListener("click", (event) => {
		event.stopPropagation();
		if (!requestedOpen) openMenu(event.currentTarget); else closeHud({ restoreFocus: false });
	});
	menu.addEventListener("click", (event) => {
		const button = event.target.closest("[data-hud-action]");
		if (!button || motionState !== OPEN) return;
		const action = button.dataset.hudAction;
		if (action === "explore") { closeHud({ restoreFocus: false }); document.getElementById("map")?.focus({ preventScroll: true }); return; }
		if (["register", "central", "data"].includes(action)) closeHud({ restoreFocus: false });
		onAction?.(action, { element: button });
	});
	back.addEventListener("click", backToMenu);
	close.addEventListener("click", () => closeHud());
	document.addEventListener("pointerdown", (event) => {
		if (!requestedOpen || root.contains(event.target) || event.target.closest?.(".occurrence-dialog, dialog[open], .leaflet-popup")) return;
		closeHud({ restoreFocus: false });
	});
	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape" || !requestedOpen || event.target?.closest?.("dialog[open]")) return;
		event.preventDefault(); event.stopPropagation(); closeHud();
	}, true);
	document.addEventListener("keydown", (event) => {
		if (!requestedOpen || event.key !== "Tab" || motionState !== OPEN) return;
		const visible = [...root.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')].filter((node) => node.getClientRects().length > 0);
		if (!visible.length) return;
		const first = visible[0], last = visible.at(-1);
		if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
		else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
	});
	setMotion(CLOSED); syncDom();
	return {
		get state() { return view; }, get motionState() { return motionState; }, get panel() { return activePanel; },
		openMenu, openPanel, backToMenu, close: closeHud, get body() { return panelBody; }
	};
}
