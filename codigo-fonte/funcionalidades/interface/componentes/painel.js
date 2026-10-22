/** Uma superfície contínua entre o menu e seus painéis contextuais. */
import { entrarElementos, guardarSaida, sairElementos, animar } from "./movimento.js";

const PANEL_META = {
	investigate: { title: "Investigar área", kicker: "SELEÇÃO ESPACIAL", width: 334 },
	layers: { title: "Camadas ambientais", kicker: "CARTOGRAFIA", width: 372 },
	occurrences: { title: "Lista de ocorrências", kicker: "CONSULTA", width: 366 },
	account: { title: "Conta / perfil", kicker: "PERFIL FICTÍCIO", width: 334 }
};

export function mountHud({ onAction, onClosePanel } = {}) {
	const root = document.getElementById("hud"), trigger = document.getElementById("hud-trigger");
	const menu = document.getElementById("hud-menu"), panel = document.getElementById("hud-panel");
	const panelTitle = document.getElementById("hud-panel-title"), panelKicker = document.getElementById("hud-panel-kicker");
	const panelBody = document.getElementById("hud-panel-body"), back = document.getElementById("hud-back");
	const close = document.getElementById("hud-close");
	if (!root || !trigger || !menu || !panel) return null;
	const reduced = matchMedia("(prefers-reduced-motion: reduce)");
	let motionState = "closed", view = "closed", activePanel = null, returnFocus = null;
	let requestedOpen = false, transitionToken = 0, lastAction = null, resizeFrame;
	const timers = new Set();

	function later(callback, delay) {
		if (reduced.matches) { callback(); return; }
		const id = setTimeout(() => { timers.delete(id); callback(); }, delay);
		timers.add(id);
	}
	function invalidate() {
		transitionToken++;
		for (const timer of timers) clearTimeout(timer);
		timers.clear();
		root.querySelectorAll(".movimento-saida").forEach(node => node.remove());
	}
	function setMotion(next) {
		motionState = next;
		root.dataset.motionState = next;
		root.classList.toggle("is-closed", next === "closed");
		root.classList.toggle("is-open", next !== "closed" && next !== "closing-horizontal");
		root.setAttribute("aria-busy", String(next.startsWith("opening")));
	}
	function syncDom() {
		root.dataset.state = view;
		root.dataset.panel = activePanel ?? "";
		root.classList.toggle("has-panel", view === "panel");
		trigger.setAttribute("aria-expanded", String(requestedOpen));
		trigger.setAttribute("aria-label", requestedOpen ? "Fechar menu do CuidAção" : "Abrir menu do CuidAção");
		trigger.setAttribute("aria-controls", view === "panel" ? "hud-panel" : "hud-menu");
		menu.hidden = view !== "menu";
		menu.inert = view !== "menu" || motionState.startsWith("closing");
		panel.hidden = view !== "panel";
		panel.inert = view !== "panel";
		menu.setAttribute("aria-hidden", String(menu.hidden));
		for (const button of menu.querySelectorAll("[data-hud-action]")) {
			const expanded = view === "panel" && activePanel === button.dataset.hudAction;
			if (button.hasAttribute("aria-expanded")) button.setAttribute("aria-expanded", String(expanded));
			button.classList.toggle("is-active", expanded);
		}
		document.body.dataset.hudState = view;
		document.body.dataset.hudPanel = activePanel ?? "";
	}
	function fitSurface() {
		if (!requestedOpen) return;
		const compact = matchMedia("(max-width: 700px)").matches;
		const inset = compact ? 8 : 16;
		const scale = Math.max(1, innerWidth / document.documentElement.offsetWidth);
		const availableWidth = innerWidth / scale - inset * 2;
		const width = Math.min(view === "panel" ? PANEL_META[activePanel].width : 334, availableWidth);
		root.style.setProperty("--hud-open-width", `${width}px`);
		const surface = view === "menu" ? menu : panel;
		// Mede o conteúdo na largura final, independente da superfície em movimento.
		surface.style.width = `${width - 2}px`;
		const height = Math.ceil(surface.offsetHeight + trigger.offsetHeight + 2);
		root.style.setProperty("--hud-open-height", `${Math.min(height, innerHeight / scale - inset * 2)}px`);
	}
	function scheduleFit() {
		cancelAnimationFrame(resizeFrame);
		resizeFrame = requestAnimationFrame(fitSurface);
	}
	new ResizeObserver(scheduleFit).observe(panelBody);
	new ResizeObserver(scheduleFit).observe(menu);
	window.addEventListener("resize", scheduleFit);

	function openMenu(triggerElement) {
		if (view === "panel" && requestedOpen) { backToMenu(); return; }
		if (requestedOpen && !motionState.startsWith("closing")) return;
		invalidate();
		returnFocus = triggerElement ?? document.activeElement;
		root.dispatchEvent(new CustomEvent("hud-open", { bubbles: true }));
		requestedOpen = true; view = "menu"; activePanel = null;
		setMotion("opening-horizontal"); syncDom(); fitSurface();
		later(() => {
			setMotion("opening-vertical");
			entrarElementos(menu);
			later(() => { setMotion("open"); syncDom(); }, 310);
		}, 150);
	}
	function closeHud({ restoreFocus = true } = {}) {
		if (!requestedOpen) return;
		const oldSurface = view === "panel" ? panel : menu;
		invalidate();
		const copy = guardarSaida(oldSurface, root);
		requestedOpen = false;
		activePanel = null; view = "closed";
		onClosePanel?.();
		setMotion("closing-vertical"); syncDom();
		sairElementos(copy, -1);
		if (restoreFocus) (returnFocus?.isConnected ? returnFocus : trigger).focus({ preventScroll: true });
		later(() => {
			setMotion("closing-horizontal");
			later(() => { setMotion("closed"); syncDom(); }, 180);
		}, 230);
	}
	function transformView(next, name, { focus = true } = {}) {
		const fromMenu = view === "menu";
		const oldSurface = fromMenu ? menu : panel;
		invalidate();
		const copy = guardarSaida(oldSurface, root);
		requestedOpen = true; view = next; activePanel = name;
		if (name) {
			panelKicker.textContent = PANEL_META[name].kicker;
			panelTitle.textContent = PANEL_META[name].title;
		} else onClosePanel?.();
		setMotion("open"); syncDom();
		root.dataset.direction = fromMenu ? "forward" : "back";
		sairElementos(copy, fromMenu ? -1 : 1);
		const token = transitionToken;
		// Os construtores existentes preenchem o painel no mesmo ciclo.
		queueMicrotask(() => {
			if (token !== transitionToken) return;
			fitSurface();
			if (next === "panel") {
				entrarElementos(panelBody, 1);
				animar(panel.querySelector(".hud-panel-head"), [
					{ transform: "translateX(24px)", opacity: 0 }, { transform: "none", opacity: 1 }
				], { duration: 320 });
				if (focus) panelTitle.focus({ preventScroll: true });
			} else {
				entrarElementos(menu, -1);
				if (focus) (lastAction?.isConnected ? lastAction : menu.querySelector("button"))?.focus({ preventScroll: true });
			}
		});
	}
	function openPanel(name, { focus = true } = {}) {
		if (!PANEL_META[name]) return;
		returnFocus ??= document.activeElement;
		transformView("panel", name, { focus });
		// O foco deixa o botão oculto também na navegação por teclado.
		if (menu.contains(document.activeElement)) panelTitle.focus({ preventScroll: true });
	}
	function backToMenu() { transformView("menu", null); }
	trigger.addEventListener("click", event => {
		event.stopPropagation();
		if (!requestedOpen) openMenu(event.currentTarget); else closeHud({ restoreFocus: false });
	});
	menu.addEventListener("click", event => {
		const button = event.target.closest("[data-hud-action]");
		if (!button || motionState !== "open") return;
		lastAction = button;
		const action = button.dataset.hudAction;
		if (action === "explore") { closeHud({ restoreFocus: false }); document.getElementById("map")?.focus({ preventScroll: true }); return; }
		// A origem é preservada antes da contração para os painéis externos.
		root.dispatchEvent(new CustomEvent("hud-navigate", { bubbles: true, detail: { action, origin: root.getBoundingClientRect() } }));
		if (["register", "central", "data"].includes(action)) closeHud({ restoreFocus: false });
		onAction?.(action, { element: button });
	});
	back.addEventListener("click", backToMenu);
	close.addEventListener("click", () => closeHud());
	document.addEventListener("pointerdown", event => {
		if (!requestedOpen || root.contains(event.target) || event.target.closest?.(".occurrence-dialog, dialog[open], .leaflet-popup")) return;
		closeHud({ restoreFocus: false });
	});
	document.addEventListener("keydown", event => {
		if (event.key !== "Escape" || !requestedOpen || event.target?.closest?.("dialog[open]")) return;
		event.preventDefault(); event.stopPropagation(); closeHud();
	}, true);
	document.addEventListener("keydown", event => {
		if (!requestedOpen || event.key !== "Tab" || motionState !== "open") return;
		const visible = [...root.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')].filter(node => node.getClientRects().length && !node.closest("[inert]"));
		const first = visible[0], last = visible.at(-1);
		if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
		else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
	});
	reduced.addEventListener("change", () => {
		invalidate();
		setMotion(requestedOpen ? "open" : "closed"); syncDom(); fitSurface();
	});
	setMotion("closed"); syncDom();
	return {
		get state() { return view; }, get motionState() { return motionState; }, get panel() { return activePanel; },
		openMenu, openPanel, backToMenu, close: closeHud, get body() { return panelBody; }
	};
}
