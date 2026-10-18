/**
 * Mapa Leaflet, seleção de coordenadas e estados da abertura.
 * Edite este arquivo diretamente. Guia: apoio/documentacao/ESTRUTURA.md.
 *
 * 1. Mapa de consulta e seleção; enquadramento do território
 * 2. Estados de interface sobre o mesmo mapa
 */
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { environmentalPresentation } from "../../servicos/ambiental.js";

// ── Mapa de consulta e seleção; enquadramento do território ──
const imageryTiles = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const imageryAttribution = "Powered by <a href=\"https://www.esri.com/\">Esri</a> | Vantor, Earthstar Geographics, GIS User Community";
const readableTiles = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const readableAttribution = "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors";
// Limite provisório: caixa ilustrativa WGS84 definida em DOMAIN D02; não é o polígono oficial do Perequê.
const territoryBounds = [[-23.9500, -46.1950], [-23.9250, -46.1650]];
// A margem é derivada da caixa documentada, sem introduzir novas coordenadas territoriais.
const navigationBounds = L.latLngBounds(territoryBounds).pad(.18);
const territoryZoom = { desktopMin: 15.5, mobileMin: 15, max: 19 };
const territoryView = {
	desktop: { center: [-23.9348, -46.1805], zoom: 16.10 },
	mobile: { center: [-23.9348, -46.1815], zoom: 15.54 }
};
function openingView(element) {
	return territoryView[element.getBoundingClientRect().width <= 700 ? "mobile" : "desktop"];
}
function minimumZoom(element) {
	return element.getBoundingClientRect().width <= 700 ? territoryZoom.mobileMin : territoryZoom.desktopMin;
}
function addImagery(map, onTileError) {
	return L.tileLayer(imageryTiles, {
		maxZoom: 19,
		attribution: imageryAttribution
	}).on("tileerror", onTileError).addTo(map);
}

export function createMap(element, onSelect, onTileError, onPlaceSelect = () => {}, onCentralSelect = () => {}) {
	const initialView = openingView(element);
	const map = L.map(element, {
		// A abertura editorial começa com o mapa imóvel; setInteractive libera ao concluir.
		dragging: false,
		touchZoom: false,
		doubleClickZoom: false,
		scrollWheelZoom: false,
		boxZoom: false,
		keyboard: false,
		tap: false,
		fadeAnimation: false,
		zoomSnap: .01,
		zoomDelta: .5,
		maxBounds: navigationBounds,
		maxBoundsViscosity: .7,
		minZoom: minimumZoom(element),
		maxZoom: territoryZoom.max
	}).setView(initialView.center, initialView.zoom);
	L.control.scale({ imperial: false, position: "topleft", maxWidth: 110 }).addTo(map);
	let currentItems = [];
	let areaOpacity = .18;
	const contentLayers = { occurrences: true, areas: true, measurements: true };
	const areaLayerVisibility = {
		water_quality: true,
		waste: true,
		erosion: true,
		apparent_sewage: true,
		flooding: true,
		vegetation: true
	};
	const areaLayers = Object.fromEntries(Object.keys(areaLayerVisibility).map((kind) => [kind, L.featureGroup().addTo(map)]));
	function animateEnvironmentalShape(element, { pulse = false } = {}) {
		if (!element || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		element.animate(pulse ? [
			{ opacity: 0, transform: "scale(.94)" },
			{ opacity: 1, transform: "scale(1)", offset: .52 },
			{ opacity: 1, transform: "scale(1.075)", offset: .72 },
			{ opacity: 1, transform: "scale(1)" }
		] : [
			{ opacity: 0, transform: "scale(.96)" },
			{ opacity: 1, transform: "scale(1)" }
		], {
			duration: pulse ? 560 : 320,
			easing: pulse ? "cubic-bezier(.2,.72,.25,1)" : "cubic-bezier(.2,.7,.25,1)",
			fill: "backwards"
		});
	}
	function renderEnvironmentalAreas(items, { pulseKind = null } = {}) {
		Object.values(areaLayers).forEach((layer) => layer.clearLayers());
		for (const item of items) {
			const presentation = environmentalPresentation(item);
			const isMeasurement = Boolean(presentation?.measurement);
			if (!presentation || !areaLayerVisibility[presentation.type] || isMeasurement && !contentLayers.measurements || !isMeasurement && !contentLayers.areas) continue;
			const style = {
				className: `environmental-shape environmental-shape--${presentation.type} environmental-shape--${presentation.accuracy}`,
				color: presentation.color,
				weight: presentation.type === "erosion" ? 5 : 1.8,
				opacity: 0.88,
				fillColor: presentation.color,
				fillOpacity: presentation.type === "flooding" ? Math.min(.45, areaOpacity + .06) : areaOpacity,
				interactive: true,
				dashArray: presentation.approximate || presentation.type === "flooding" ? "6 8" : undefined
			};
			let area;
			if (presentation.geometry.type === "Point") {
				const [longitude, latitude] = presentation.geometry.coordinates;
				area = L.circleMarker([latitude, longitude], {
					...style,
					radius: presentation.type === "water_quality" ? 22 : 9
				});
			} else area = L.geoJSON(presentation.geometry, { style });
			const popup = document.createElement("div");
			const label = document.createElement("small");
			label.textContent = `${presentation.label} · ${presentation.approximate ? "geometria aproximada" : "geometria verificada"}`;
			const heading = document.createElement("strong");
			heading.textContent = item.title;
			const location = document.createElement("p");
			location.textContent = item.locationLabel ?? "Localização ilustrativa";
			const note = document.createElement("p");
			note.textContent = presentation.approximate
				? "Traçado aproximado informado no registro; não representa limite verificado da área afetada."
				: "Geometria verificada informada no registro; não constitui avaliação automática de risco.";
			if (presentation.ph) {
				const measurement = document.createElement("p");
				const measuredAt = presentation.measurement.measuredAt ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(presentation.measurement.measuredAt)) : "data não informada";
				const age = presentation.measurement.measuredAt ? (Date.now() - Date.parse(presentation.measurement.measuredAt)) / 864e5 : Infinity;
				measurement.textContent = `pH ${presentation.measurement.value} ${presentation.measurement.unit ?? "(unidade não informada)"} · ${presentation.ph.label} · ${measuredAt} (${age <= 30 ? "recente, até 30 dias" : "antiga, mais de 30 dias"}) · origem: ${presentation.measurement.source ?? "não informada"}. Classificação química, não avaliação de risco.`;
				popup.append(label, heading, location, measurement, note);
			} else popup.append(label, heading, location, note);
			const button = document.createElement("button");
			button.type = "button";
			button.textContent = "Ver detalhes";
			popup.append(button);
			button.addEventListener("click", () => onSelect(item.id, { kind: "map-area", element: button }));
			area.bindPopup(popup, { autoPanPadding: [24, 24] });
			const openDetails = (event) => onSelect(item.id, {
				kind: "map-area",
				element: event.target.getElement?.() ?? null
			});
			if (area.eachLayer) area.eachLayer((layer) => layer.on("click", openDetails));
			else area.on("click", openDetails);
			area.addTo(areaLayers[presentation.type]);
			const shapes = area.eachLayer ? area.getLayers() : [area];
			for (const shape of shapes) {
				const shapeElement = shape.getElement?.();
				if (!shapeElement) continue;
				animateEnvironmentalShape(shapeElement, { pulse: pulseKind === presentation.type });
				shapeElement.dataset.occurrenceId = item.id;
				shapeElement.setAttribute("role", "button");
				shapeElement.setAttribute("tabindex", "0");
				shapeElement.setAttribute("aria-label", `${presentation.label}: ${item.title}; geometria ${presentation.approximate ? "aproximada" : "verificada"}`);
				shapeElement.addEventListener("keydown", (event) => {
					if (!["Enter", " "].includes(event.key)) return;
					event.preventDefault();
					openDetails({ target: shape });
				});
			}
			if (presentation.type === "water_quality") area.bindTooltip(`pH ${presentation.measurement.value}`, {
				permanent: true,
				direction: "center",
				className: "water-measurement-label"
			});
		}
	}
	function setMapHandlers(enabled) {
		for (const handler of [map.dragging, map.touchZoom, map.doubleClickZoom, map.scrollWheelZoom, map.boxZoom, map.keyboard]) {
			if (!handler) continue;
			if (enabled) handler.enable();
			else handler.disable();
		}
		if (map.tap) {
			if (enabled) map.tap.enable();
			else map.tap.disable();
		}
	}
	// Subscribe before adding the layer: cached tiles can finish immediately.
	let settleTiles;
	const tilesReady = new Promise((resolve) => { settleTiles = resolve; });
	const imagery = L.tileLayer(imageryTiles, { maxZoom: 19, attribution: imageryAttribution });
	const readable = L.tileLayer(readableTiles, { maxZoom: 19, attribution: readableAttribution });
	imagery.on("tileerror", onTileError).on("load", () => {
		const tiles = [...imagery.getContainer().querySelectorAll("img")];
		settleTiles(tiles.length > 0 && tiles.every((tile) => tile.complete && tile.naturalWidth > 0));
	}).addTo(map);
	const group = L.featureGroup().addTo(map);
	const markers = new Map();
	const pinStates = new Map();
	let selectedMarkerId = null;
	const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
	const fineHover = () => matchMedia("(hover: hover) and (pointer: fine)").matches;
	const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;"
	}[char]));
	const WATER_SYMBOL = '<path d="M12 3.2c-2.2 3.1-5.4 6.5-5.4 10.3a5.4 5.4 0 0 0 10.8 0C17.4 9.7 14.2 6.3 12 3.2Z"/><path d="M9.4 14.1c.3 1.2 1.1 1.9 2.3 2.1"/>';
	const WASTE_SYMBOL = '<path d="M7.2 8.2h9.6l1.1 10.6H6.1L7.2 8.2Z"/><path d="M9 8.2V6.7a3 3 0 0 1 6 0v1.5M9.7 11.4v4.3M14.3 11.4v4.3"/>';
	const PIN_COLORS = { agua: "#25677b", residuos: "#8a542f" };
	function syncSelectionClass() {
		const hasSelection = selectedMarkerId !== null && markers.has(selectedMarkerId);
		element.classList.toggle("has-selection", hasSelection);
	}
	function applySelection(id) {
		selectedMarkerId = id;
		for (const [markerId, marker] of markers) {
			const active = markerId === id;
			marker.getElement()?.classList.toggle("is-selected", active);
			if (marker.setZIndexOffset) marker.setZIndexOffset(active ? 1000 : 0);
		}
		syncSelectionClass();
	}
	function dropSelectionClasses() {
		selectedMarkerId = null;
		for (const marker of markers.values()) {
			marker.getElement()?.classList.remove("is-selected", "is-previewed");
			if (marker.setZIndexOffset) marker.setZIndexOffset(0);
		}
		syncSelectionClass();
	}
	// Salto com squash & stretch: a cabeça comprime e alonga como objeto
	// flexível (escalas não uniformes nos eixos), sem usar scale() simples.
	// O salto é aplicado apenas ao elemento visual interno (.cpin-head);
	// a ponta (.cpin-tip) nunca é transformada.
	function squashJump(head, distance, duration) {
		if (reducedMotion() || !head?.animate) {
			head.style.transform = "";
			return Promise.resolve();
		}
		const animation = head.animate([
			{ transform: "translateY(0) scaleX(1) scaleY(1)", offset: 0 },
			{ transform: `translateY(${distance * 0.55}px) scaleX(1.14) scaleY(0.86)`, offset: 0.28 },
			{ transform: `translateY(${distance}px) scaleX(0.92) scaleY(1.12)`, offset: 0.58 },
			{ transform: "translateY(0) scaleX(1) scaleY(1)", offset: 1 }
		], { duration, easing: "cubic-bezier(.3,.9,.3,1)" });
		return animation.finished.then(() => {
			head.style.transform = "";
		}).catch(() => {});
	}
	function riseContent(card, baseDelay = 150) {
		const items = [...card.querySelectorAll(".cpin-rise")];
		if (reducedMotion()) return Promise.resolve();
		for (const node of items) node.style.opacity = "0";
		const animations = items.map((node, index) => node.animate([
			{ opacity: 0, transform: "translateY(8px)" },
			{ opacity: 1, transform: "translateY(0)" }
		], { duration: 200, delay: baseDelay + index * 55, easing: "cubic-bezier(.2,.7,.3,1)", fill: "both" }));
		return Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
			for (const node of items) node.style.opacity = "";
		});
	}

	// Geometria do elemento visual interno. O rodapé do head coincide com a
	// ponta, então a borda inferior do head sempre passa pela coordenada.
	const HEAD_COMPACT = { left: -20, top: -50, width: 40, height: 40 };
	const HEAD_PREVIEW = { width: 232 };
	const HEAD_EXPANDED = { width: 520 };
	function compactHeadGeometry() {
		return HEAD_COMPACT;
	}
	function measurePreview(state, maximumWidth = HEAD_PREVIEW.width) {
		const card = state.preview;
		if (!card) return null;
		const width = Math.min(maximumWidth, Math.max(180, map.getSize().x - 32));
		const height = measureCard(card, width);
		return { width, height };
	}
	function measureExpanded(state, maximumWidth = HEAD_EXPANDED.width) {
		const card = state.expanded;
		if (!card) return null;
		const width = Math.min(maximumWidth, Math.max(240, map.getSize().x - 32));
		const height = measureCard(card, width);
		return { width, height };
	}
	function measureCard(card, width) {
		const previousStyle = card.getAttribute("style");
		const wasHidden = card.hidden;
		card.hidden = false;
		card.style.visibility = "hidden";
		card.style.position = "absolute";
		card.style.inset = "auto";
		card.style.left = "0";
		card.style.top = "0";
		card.style.width = `${width}px`;
		card.style.height = "auto";
		const height = Math.max(88, Math.ceil(card.offsetHeight || card.scrollHeight || 120));
		if (previousStyle === null) card.removeAttribute("style");
		else card.setAttribute("style", previousStyle);
		card.hidden = wasHidden;
		return height;
	}
	// Posiciona o head: cima por padrão; com falta de espaço, abre para o
	// lado. O conector curto liga a ponta à ficha aberta.
	function placeHead(state) {
		let measure = state.mode === "expanded" ? measureExpanded(state) : measurePreview(state);
		if (!measure) return null;
		const point = map.latLngToContainerPoint(state.marker.getLatLng());
		const mapSize = map.getSize();
		const margin = 16;
		const gap = 18;
		let { width, height } = measure;
		let place = "top";
		if (point.y - height - gap < margin) {
			const rightSpace = mapSize.x - point.x - gap - margin;
			const leftSpace = point.x - gap - margin;
			place = rightSpace >= leftSpace ? "right" : "left";
			const available = Math.max(180, place === "right" ? rightSpace : leftSpace);
			measure = state.mode === "expanded" ? measureExpanded(state, available) : measurePreview(state, available);
			({ width, height } = measure);
		}
		let geometry;
		if (place === "top") {
			const globalLeft = Math.min(mapSize.x - margin - width, Math.max(margin, point.x - width / 2));
			geometry = { left: globalLeft - point.x, top: -height - gap, width, height };
		} else {
			const globalTop = Math.min(mapSize.y - margin - height, Math.max(margin, point.y - height / 2));
			geometry = {
				left: place === "right" ? gap : -gap - width,
				top: globalTop - point.y,
				width,
				height
			};
		}
		return { geometry, place };
	}
	function applyHeadGeometry(state, geometry) {
		state.head.style.left = `${geometry.left}px`;
		state.head.style.top = `${geometry.top}px`;
		state.head.style.width = `${geometry.width}px`;
		state.head.style.height = `${geometry.height}px`;
	}
	function applyHeadIdleGeometry(state) {
		state.head.classList.remove("is-card");
		state.head.style.transform = "";
		applyHeadGeometry(state, compactHeadGeometry());
	}
	function morphHeadOpen(state, geometry) {
		const head = state.head;
		if (reducedMotion()) {
			head.classList.add("is-card");
			applyHeadGeometry(state, geometry);
			return Promise.resolve();
		}
		const start = {
			left: Number.parseFloat(head.style.left) || HEAD_COMPACT.left,
			top: Number.parseFloat(head.style.top) || HEAD_COMPACT.top,
			width: Number.parseFloat(head.style.width) || HEAD_COMPACT.width,
			height: Number.parseFloat(head.style.height) || HEAD_COMPACT.height
		};
		const alreadyCard = head.classList.contains("is-card");
		head.classList.add("is-card");
		const end = {
			left: geometry.left,
			top: geometry.top,
			width: geometry.width,
			height: geometry.height
		};
		const animation = head.animate([
			{
				left: `${start.left}px`,
				top: `${start.top}px`,
				width: `${start.width}px`,
				height: `${start.height}px`,
				borderRadius: alreadyCard ? "14px" : "50% 50% 44% 44%",
				backgroundColor: alreadyCard ? "#f7f7f4" : state.color
			},
			{
				left: `${end.left}px`,
				top: `${end.top}px`,
				width: `${end.width}px`,
				height: `${end.height}px`,
				borderRadius: "14px",
				backgroundColor: "#f7f7f4"
			}
		], { duration: state.mode === "expanded" ? 360 : 260, easing: "cubic-bezier(.2,.75,.3,1)" });
		return animation.finished.then(() => applyHeadGeometry(state, end)).catch(() => applyHeadGeometry(state, end));
	}
	function morphHeadClosed(state) {
		const head = state.head;
		if (reducedMotion() || !head?.animate) {
			applyHeadIdleGeometry(state);
			return Promise.resolve();
		}
		const start = {
			left: head.style.left || `${HEAD_COMPACT.left}px`,
			top: head.style.top || `${HEAD_COMPACT.top}px`,
			width: head.style.width || "40px",
			height: head.style.height || "40px"
		};
		const end = compactHeadGeometry();
		const animation = head.animate([
			{
				left: start.left,
				top: start.top,
				width: start.width,
				height: start.height,
				borderRadius: "14px",
				backgroundColor: "#f7f7f4"
			},
			{
				left: `${end.left}px`,
				top: `${end.top}px`,
				width: `${end.width}px`,
				height: `${end.height}px`,
				borderRadius: "50% 50% 44% 44%",
				backgroundColor: state.color
			}
		], { duration: 240, easing: "cubic-bezier(.5,0,.7,.4)" });
		return animation.finished.then(() => applyHeadIdleGeometry(state)).catch(() => applyHeadIdleGeometry(state));
	}
	function placeLink(state, place, geometry) {
		const link = state.link;
		link.hidden = false;
		link.className = `cpin-link cpin-link--${place === "top" ? "top" : "side"}`;
		link.style.width = "";
		link.style.height = "";
		link.style.left = "";
		link.style.top = "";
		if (place === "top") {
			const cardBottom = geometry.top + geometry.height;
			link.style.left = "-1px";
			link.style.top = `${cardBottom}px`;
			link.style.height = `${Math.max(18, -cardBottom)}px`;
		} else {
			const cardEdge = place === "right" ? geometry.left : geometry.left + geometry.width;
			link.style.left = `${Math.min(0, cardEdge)}px`;
			link.style.top = "-1px";
			link.style.width = `${Math.abs(cardEdge)}px`;
			link.style.height = "2px";
		}
	}
	function setCardOpen(state, mode) {
		state.preview.classList.toggle("is-open", mode === "preview");
		state.expanded.classList.toggle("is-open", mode === "expanded");
	}
	function clearRises(state) {
		for (const card of [state.preview, state.expanded]) {
			if (!card) continue;
			for (const node of card.querySelectorAll(".cpin-rise")) node.style.opacity = "";
		}
	}
	function closeCardsExcept(exceptId, { instant = false } = {}) {
		const pending = [];
		for (const [otherId, other] of pinStates) {
			if (otherId === exceptId || other.mode === "idle") continue;
			pending.push(closeCard(otherId, { instant: instant || other.mode === "preview" }));
		}
		return Promise.all(pending);
	}
	async function closeCard(id, { instant = false } = {}) {
		const state = pinStates.get(id);
		if (!state || state.mode === "idle") return;
		const token = ++state.cycle;
		state.busy = true;
		try {
			state.head.getAnimations().forEach((running) => running.cancel());
			const activeCard = state.mode === "expanded" ? state.expanded : state.preview;
			activeCard.getAnimations().forEach((running) => running.cancel());
			if (!instant && !reducedMotion()) await morphHeadClosed(state);
			else applyHeadIdleGeometry(state);
			if (token !== state.cycle) return;
			state.preview.hidden = true;
			state.expanded.hidden = true;
			state.link.hidden = true;
			clearRises(state);
			state.mode = "idle";
			state.geometry = null;
			state.marker.getElement()?.classList.remove("is-previewed");
			state.marker.getElement()?.setAttribute("role", "button");
			state.marker.getElement()?.setAttribute("aria-expanded", "false");
			setCardOpen(state, "idle");
			if (selectedMarkerId === id) dropSelectionClasses();
			else if (state.marker.setZIndexOffset) state.marker.setZIndexOffset(0);
		} finally {
			if (state.cycle === token) {
				state.busy = false;
				relayoutOpenCards();
			}
		}
	}
	async function openPreview(id, { animate = true } = {}) {
		const state = pinStates.get(id);
		if (!state || state.mode !== "idle") return;
		const token = ++state.cycle;
		state.busy = true;
		try {
			await closeCardsExcept(id, { instant: true });
			if (token !== state.cycle) return;
			state.mode = "preview";
			state.marker.getElement()?.classList.add("is-previewed");
			if (state.marker.setZIndexOffset) state.marker.setZIndexOffset(700);
			state.expanded.hidden = true;
			state.preview.hidden = false;
			setCardOpen(state, "preview");
			const placed = placeHead(state);
			if (!placed) return;
			state.geometry = placed.geometry;
			state.place = placed.place;
			placeLink(state, placed.place, placed.geometry);
			if (animate && !reducedMotion()) {
				// Salto, mudança de silhueta e conteúdo pertencem ao mesmo gesto.
				await Promise.all([
					squashJump(state.head, -7, 260),
					morphHeadOpen(state, placed.geometry),
					riseContent(state.preview, 105)
				]);
				// Um fechamento pode interromper esta abertura enquanto os itens de
				// texto ainda terminam a animação. Não deixe a operação antiga
				// restaurar a geometria aberta depois do recolhimento.
				if (token !== state.cycle) return;
			} else {
				state.head.classList.add("is-card");
				applyHeadGeometry(state, placed.geometry);
				clearRises(state);
			}
		} finally {
			if (state.cycle === token) {
				state.busy = false;
				relayoutOpenCards();
			}
		}
	}
	async function openExpanded(id, { animate = true } = {}) {
		const state = pinStates.get(id);
		if (!state) return;
		if (state.mode === "expanded") {
			const placed = placeHead(state);
			if (placed) {
				state.geometry = placed.geometry;
				state.place = placed.place;
				applyHeadGeometry(state, placed.geometry);
				placeLink(state, placed.place, placed.geometry);
			}
			return;
		}
		const token = ++state.cycle;
		const fromPreview = state.mode === "preview";
		state.busy = true;
		try {
			await closeCardsExcept(id, {});
			if (token !== state.cycle) return;
			state.head.getAnimations().forEach((running) => running.cancel());
			state.preview.getAnimations().forEach((running) => running.cancel());
			state.expanded.getAnimations().forEach((running) => running.cancel());
			clearRises(state);
			if (fromPreview) {
				state.preview.hidden = true;
				state.mode = "idle";
			}
			state.mode = "expanded";
			state.preview.hidden = true;
			applySelection(id);
			state.marker.getElement()?.setAttribute("role", "group");
			state.marker.getElement()?.setAttribute("aria-expanded", "true");
			state.marker.getElement()?.classList.remove("is-previewed");
			setCardOpen(state, "expanded");
			state.expanded.hidden = false;
			const placed = placeHead(state);
			if (!placed) return;
			state.geometry = placed.geometry;
			state.place = placed.place;
			placeLink(state, placed.place, placed.geometry);
			if (animate && !reducedMotion()) {
				// Anel das ocorrências de água: nasce na coordenada exata.
				if (state.category === "agua" && state.ring?.animate) {
					state.ring.animate([
						{ opacity: 0.75, transform: "scale(.45)" },
						{ opacity: 0, transform: "scale(2.3)" }
					], { duration: 650, easing: "cubic-bezier(.2,.7,.3,1)" });
				}
				// Lixo: o símbolo se abre durante a seleção, sem forma nova.
				if (state.category === "residuos") {
					const symbol = state.head.querySelector(".cpin-symbol");
					if (symbol?.animate) {
						symbol.animate([
							{ opacity: 0.35, transform: "scaleY(.35)", transformOrigin: "50% 0%" },
							{ opacity: 1, transform: "scaleY(1)", transformOrigin: "50% 0%" }
						], { duration: 300, easing: "cubic-bezier(.2,.75,.3,1)" });
					}
				}
				// Salto, alongamento da cabeça e surgimento do conteúdo ocorrem
				// juntos; o texto começa depois do primeiro trecho do movimento.
				await Promise.all([
					squashJump(state.head, fromPreview ? -8 : -12, 360),
					morphHeadOpen(state, placed.geometry),
					riseContent(state.expanded, 120)
				]);
				if (token !== state.cycle) return;
				applyHeadGeometry(state, placed.geometry);
			} else {
				state.head.classList.add("is-card");
				applyHeadGeometry(state, placed.geometry);
				clearRises(state);
			}
		} finally {
			if (state.cycle === token) {
				state.busy = false;
				relayoutOpenCards();
			}
		}
	}
	function relayoutOpenCards() {
		for (const state of pinStates.values()) {
			if (state.mode === "idle" || state.busy) continue;
			const placed = placeHead(state);
			if (placed) {
				state.geometry = placed.geometry;
				state.place = placed.place;
				applyHeadGeometry(state, placed.geometry);
				placeLink(state, placed.place, placed.geometry);
			}
		}
	}
	map.on("move zoom viewreset resize", relayoutOpenCards);
	window.addEventListener("resize", relayoutOpenCards);
	let locationPoint = null;
	let locationHandler = null;
	const stage = element.closest(".territory-transition");
	let explorationTimer;
	const exploring = (active) => {
		clearTimeout(explorationTimer);
		if (active) {
			stage?.classList.add("map-is-exploring");
			document.documentElement.classList.add("map-is-exploring");
		} else explorationTimer = setTimeout(() => {
			stage?.classList.remove("map-is-exploring");
			document.documentElement.classList.remove("map-is-exploring");
		}, 720);
	};
	map.on("movestart zoomstart", () => exploring(true));
	map.on("moveend zoomend", () => exploring(false));
	element.addEventListener("pointerdown", () => exploring(true), { passive: true });
	window.addEventListener("pointerup", () => exploring(false), { passive: true });
	let interactionState;
	let markerPress;
	element.addEventListener("pointerdown", (event) => {
		const node = event.target.closest?.(".occurrence-marker");
		if (node) markerPress = { node, x: event.clientX, y: event.clientY };
	}, true);
	element.addEventListener("click", (event) => {
		if (event.target.closest?.(".cpin-card button")) return;
		const node = event.target.closest?.(".occurrence-marker");
		if (!node) return;
		const moved = markerPress?.node === node && Math.hypot(event.clientX - markerPress.x, event.clientY - markerPress.y) > 5;
		markerPress = undefined;
		if (!moved) {
			const id = node.dataset.occurrenceId;
			if (id) void openExpanded(id);
		}
	}, true);
	let presented = false;
	let presentationRequested = false;
	let presentationImmediate = false;
	let entranceAnimations = [];
	function presentMarkers(immediate = false) {
		if (immediate) entranceAnimations.forEach((animation) => animation.finish());
		presentationRequested = true;
		presentationImmediate ||= immediate;
		if (presented || !markers.size) return;
		presented = true;
		if (presentationImmediate) return;
		const visible = [...markers.values()].filter((marker) => map.getBounds().contains(marker.getLatLng()));
		visible.sort((a, b) => {
			const first = map.latLngToContainerPoint(a.getLatLng());
			const second = map.latLngToContainerPoint(b.getLatLng());
			return first.y - second.y || first.x - second.x;
		});
		entranceAnimations = visible.map((marker, index) => marker.getElement().querySelector(".pin").animate([
			{ opacity: 0, transform: "translateY(10px) scale(.85)" },
			{ opacity: 1, transform: "translateY(0) scale(1)" }
		], { duration: 300, delay: Math.min(index, 7) * 80, easing: "cubic-bezier(.34,1.25,.36,1)", fill: "backwards" }));
	}
	function show(items) {
		currentItems = items;
		if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
			const pane = map.getPane("markerPane");
			for (const marker of markers.values()) {
				const icon = marker.getElement();
				if (!icon || !pane) continue;
				const fadingIcon = icon.cloneNode(true);
				fadingIcon.classList.add("is-filtering-out");
				fadingIcon.classList.remove("is-selected", "is-previewed");
				fadingIcon.setAttribute("aria-hidden", "true");
				fadingIcon.removeAttribute("role");
				fadingIcon.removeAttribute("tabindex");
				fadingIcon.removeAttribute("data-occurrence-id");
				for (const card of fadingIcon.querySelectorAll(".cpin-card")) card.hidden = true;
				const fadingLink = fadingIcon.querySelector(".cpin-link");
				if (fadingLink) fadingLink.hidden = true;
				pane.append(fadingIcon);
				setTimeout(() => fadingIcon.remove(), 200);
			}
		}
		group.clearLayers();
		markers.clear();
		pinStates.clear();
		const selectedSurvives = selectedMarkerId !== null && items.some((entry) => entry.id === selectedMarkerId);
		if (!selectedSurvives) selectedMarkerId = null;
		renderEnvironmentalAreas(items);
		const updatedAt = (value) => `Atualizado em ${new Intl.DateTimeFormat("pt-BR", {
			timeZone: "America/Sao_Paulo",
			dateStyle: "short",
			timeStyle: "short"
		}).format(new Date(value))}`;
		for (const item of contentLayers.occurrences ? items : []) {
			const water = item.category === "Água";
			const categoryCode = water ? "agua" : "residuos";
			const excerpt = item.description.length > 160 ? `${item.description.slice(0, 157)}…` : item.description;
			const locationLabel = item.locationLabel ?? "Localização ilustrativa";
			const icon = L.divIcon({
				className: "occurrence-marker cpin-host",
				html: `<div class="cpin cpin--${categoryCode}">`
					+ `<span class="cpin-ring" aria-hidden="true"></span>`
					+ `<span class="cpin-tip" aria-hidden="true"></span>`
					+ `<div class="cpin-motion"><div class="cpin-head pin ${water ? "water" : "waste"}">`
					+ `<svg class="cpin-shape" viewBox="0 0 24 24" aria-hidden="true"><g class="cpin-symbol">${water ? WATER_SYMBOL : WASTE_SYMBOL}</g></svg>`
					+ `<div class="cpin-card cpin-card--preview occurrence-preview" role="tooltip" hidden><div class="cpin-pad">`
					+ `<small class="cpin-rise">${escapeHtml(item.category)}</small>`
					+ `<strong class="cpin-rise">${escapeHtml(item.title)}</strong>`
					+ `<span class="cpin-state cpin-rise">${escapeHtml(item.status)}</span>`
					+ `<time class="cpin-rise">${escapeHtml(updatedAt(item.updatedAt))}</time>`
					+ `</div></div>`
					+ `<div class="cpin-card cpin-card--expanded" hidden role="group" aria-label="${escapeHtml(item.title)}"><div class="cpin-pad">`
					+ `<small class="cpin-rise">Registro simulado · ${escapeHtml(item.category)}</small>`
					+ `<strong class="cpin-rise">${escapeHtml(item.title)}</strong>`
					+ `<span class="cpin-state cpin-rise">${escapeHtml(item.status)}</span>`
					+ `<time class="cpin-rise">${escapeHtml(updatedAt(item.updatedAt))}</time>`
					+ `<p class="cpin-loc cpin-rise">${escapeHtml(locationLabel)}</p>`
					+ `<p class="cpin-excerpt cpin-rise">${escapeHtml(excerpt)}</p>`
					+ `<div class="cpin-actions cpin-rise"><button type="button" data-act="details">Ver detalhes</button><button type="button" data-act="central">Abrir na Central</button></div>`
					+ `</div></div></div>`
					+ `</div>`
					+ `<span class="cpin-link cpin-link--top" aria-hidden="true" hidden></span>`
					+ `</div>`,
				iconSize: [34, 34],
				iconAnchor: [17, 34]
			});
			const marker = L.marker([item.latitude, item.longitude], {
				icon,
				title: item.title,
				alt: item.title,
				keyboard: true
			}).addTo(group);
			const markerElement = marker.getElement();
			if (markerElement) {
				markerElement.dataset.occurrenceId = item.id;
				markerElement.dataset.category = categoryCode;
				markerElement.setAttribute("role", "button");
				markerElement.setAttribute("aria-expanded", "false");
				markerElement.setAttribute("aria-label", `${item.category}: ${item.title}`);
				const head = markerElement.querySelector(".cpin-head");
				const tip = markerElement.querySelector(".cpin-tip");
				const ring = markerElement.querySelector(".cpin-ring");
				const link = markerElement.querySelector(".cpin-link");
				const preview = markerElement.querySelector(".cpin-card--preview");
				const expanded = markerElement.querySelector(".cpin-card--expanded");
				const pinState = {
					marker, host: markerElement, head, tip, ring, link, preview, expanded,
					category: categoryCode,
					color: PIN_COLORS[categoryCode],
					mode: "idle",
					place: "top",
					geometry: null,
					cycle: 0
				};
				pinStates.set(item.id, pinState);
				// A ficha ampliada conduz à Central daquela ocorrência; os
				// botões preservam os fluxos existentes de detalhe e Central.
				const detailsButton = expanded.querySelector('[data-act="details"]');
				detailsButton.addEventListener("click", (clickEvent) => {
					clickEvent.stopPropagation();
					onSelect(item.id, { kind: "map", element: detailsButton });
				});
				const centralButton = expanded.querySelector('[data-act="central"]');
				centralButton.addEventListener("click", (clickEvent) => {
					clickEvent.stopPropagation();
					onCentralSelect(item.id, { kind: "map", element: centralButton });
				});
				expanded.addEventListener("click", (clickEvent) => {
					if (clickEvent.target.closest("button")) return;
					onCentralSelect(item.id, { kind: "map", element: centralButton });
				});
				preview.addEventListener("click", (clickEvent) => {
					if (clickEvent.target.closest("button")) return;
					void openExpanded(item.id);
				});
				// Hover (ponteiro fino): salto com squash & stretch + ficha
				// compacta ligada ao pin. A saída é conduzida por JS com
				// atraso curto, para não fechar enquanto o cursor viaja
				// do pin para a ficha.
				let previewCloseTimer;
				const armPreviewClose = () => {
					window.clearTimeout(previewCloseTimer);
					previewCloseTimer = window.setTimeout(() => {
						const current = pinStates.get(item.id);
						if (!current || current.mode !== "preview") return;
						if (current.busy) {
							armPreviewClose();
							return;
						}
						void closeCard(item.id, {});
					}, 150);
				};
				markerElement.addEventListener("mouseenter", () => {
					window.clearTimeout(previewCloseTimer);
					if (!fineHover()) return;
					const current = pinStates.get(item.id);
					if (!current || current.mode !== "idle") return;
					void openPreview(item.id);
				});
				markerElement.addEventListener("pointerleave", () => {
					if (!fineHover()) return;
					const current = pinStates.get(item.id);
					if (!current || current.mode !== "preview") return;
					armPreviewClose();
				});
				markerElement.addEventListener("focus", () => {
					const current = pinStates.get(item.id);
					if (!current || current.mode !== "idle") return;
					void openPreview(item.id);
				});
				markerElement.addEventListener("focusout", (keyboardEvent) => {
					const next = keyboardEvent.relatedTarget;
					if (next && markerElement.contains(next)) return;
					const current = pinStates.get(item.id);
					if (!current || current.mode !== "preview") return;
					armPreviewClose();
				});
				markerElement.addEventListener("keydown", (keyboardEvent) => {
					if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
						keyboardEvent.preventDefault();
						void openExpanded(item.id);
					} else if (keyboardEvent.key === "Escape") {
						keyboardEvent.stopPropagation();
						void closeCard(item.id, {});
					}
				});
			}
			markers.set(item.id, marker);
		}
		if (selectedMarkerId !== null && !markers.has(selectedMarkerId)) selectedMarkerId = null;
		syncSelectionClass();
		if (selectedMarkerId !== null) {
			applySelection(selectedMarkerId);
			void openExpanded(selectedMarkerId, { animate: false });
		}
		if (presentationRequested) presentMarkers(presentationImmediate);
	}
	map.on("click", (mapEvent) => {
		if (areaDraft?.drawing) return;
		const target = mapEvent.originalEvent?.target;
		if (target?.closest?.(".occurrence-marker")) return;
		if (selectedMarkerId !== null) {
			const id = selectedMarkerId;
			void closeCard(id, {}).then(() => {
				if (selectedMarkerId === null) map.closePopup();
			});
			return;
		}
		void closeCardsExcept(null, { instant: true });
	});
	function fit() {
		if (group.getLayers().length) map.fitBounds(group.getBounds().pad(.25), {
			maxZoom: 16,
			animate: !matchMedia("(prefers-reduced-motion: reduce)").matches
		});
	}
	let viewportTimer;
	const viewportListeners = new Set();
	map.on("moveend zoomend", () => {
		clearTimeout(viewportTimer);
		viewportTimer = setTimeout(() => {
			const value = view();
			for (const listener of viewportListeners) listener(value);
		}, 180);
	});
	function view() {
		const center = map.getCenter();
		return { latitude: center.lat, longitude: center.lng, zoom: map.getZoom(), bounds: map.getBounds() };
	}
	let areaDraft = null;
	function drawAreaDraft() {
		if (!areaDraft) return;
		if (areaDraft.shape) map.removeLayer(areaDraft.shape);
		const points = areaDraft.markers.map((marker) => marker.getLatLng());
		areaDraft.shape = points.length > 1 ? (areaDraft.shapeKind === "line" ? L.polyline(points, { color: "#F4B942", weight: 4, dashArray: "7 6", className: "investigation-area" }) : L.polygon(points, { color: "#F4B942", weight: 3, fillOpacity: .16, dashArray: "7 6", className: "investigation-area" })).addTo(map) : null;
		areaDraft.onChange(points.map((point) => [point.lng, point.lat]));
	}
	function addAreaPoint(latlng) {
		if (!areaDraft) return;
		if (areaDraft.markers.length >= 50) return;
		const marker = L.marker(latlng, { draggable: true, icon: L.divIcon({ className: "area-vertex", html: "<span aria-hidden=\"true\"></span>", iconSize: [24, 24], iconAnchor: [12, 12] }), title: "Arraste para editar o vértice" }).addTo(map);
		marker.on("drag", drawAreaDraft);
		areaDraft.markers.push(marker);
		drawAreaDraft();
	}
	map.on("click", (event) => {
		if (areaDraft?.drawing) addAreaPoint(event.latlng);
	});
	map.on("contextmenu", (event) => {
		if (!locationHandler && !areaDraft?.drawing) onPlaceSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng }, { kind: "contextmenu", originalEvent: event.originalEvent });
	});
	let longPressTimer, longPressPoint;
	element.addEventListener("pointerdown", (event) => {
		if (event.pointerType === "mouse") return;
		longPressPoint = { x: event.clientX, y: event.clientY };
		longPressTimer = setTimeout(() => {
			const latlng = map.containerPointToLatLng(map.mouseEventToContainerPoint(event));
			onPlaceSelect({ latitude: latlng.lat, longitude: latlng.lng }, { kind: "longpress", originalEvent: event });
		}, 550);
	}, { passive: true });
	element.addEventListener("pointermove", (event) => {
		if (longPressPoint && Math.hypot(event.clientX - longPressPoint.x, event.clientY - longPressPoint.y) > 8) clearTimeout(longPressTimer);
	}, { passive: true });
	element.addEventListener("pointerup", () => { clearTimeout(longPressTimer); longPressPoint = null; }, { passive: true });
	return {
		tilesReady,
		presentMarkers,
		setInteractive(enabled) {
			if (interactionState === enabled) return;
			interactionState = enabled;
			setMapHandlers(enabled);
			element.inert = !enabled;
		},
		show,
		fit,
		getView: view,
		setView(value, { animate = false } = {}) {
			if (Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude) && Number.isFinite(value?.zoom)) map.setView([value.latitude, value.longitude], value.zoom, { animate });
		},
		onViewportChange(listener) {
			viewportListeners.add(listener);
			return () => viewportListeners.delete(listener);
		},
		itemsInView(items = currentItems) {
			const bounds = map.getBounds();
			return items.filter((item) => bounds.contains([item.latitude, item.longitude]));
		},
		refresh: () => map.invalidateSize(),
		beginLocationSelection(onPoint, initialPoint) {
			if (locationHandler) map.off("click", locationHandler);
			map.closePopup();
			element.classList.add("is-selecting-location");
			const setLocationPoint = (latitude, longitude, notify = false) => {
				if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
				locationPoint ??= L.circleMarker([latitude, longitude], {
					radius: 9,
					color: "#102A2D",
					fillColor: "#F7F7F4",
					fillOpacity: 1,
					weight: 3,
					className: "location-selection-marker"
				}).addTo(map);
				locationPoint.setLatLng([latitude, longitude]);
				if (notify) onPoint(latitude, longitude);
			};
			locationHandler = (event) => setLocationPoint(event.latlng.lat, event.latlng.lng, true);
			map.on("click", locationHandler);
			if (initialPoint) setLocationPoint(initialPoint.latitude, initialPoint.longitude);
			setMapHandlers(true);
			element.inert = false;
			return setLocationPoint;
		},
		endLocationSelection() {
			if (locationHandler) map.off("click", locationHandler);
			locationHandler = null;
			if (locationPoint) map.removeLayer(locationPoint);
			locationPoint = null;
			element.classList.remove("is-selecting-location");
		},
		getFocusTarget(id) {
			const state = pinStates.get(id);
			const cardButton = state && state.mode === "expanded"
				? state.expanded.querySelector('[data-act="details"]')
				: null;
			return cardButton ?? markers.get(id)?.getElement();
		},
		focus(id) {
			const marker = markers.get(id);
			if (!marker) return;
			map.panInside(marker.getLatLng(), {
				animate: !matchMedia("(prefers-reduced-motion: reduce)").matches,
				paddingTopLeft: innerWidth > 760 ? [32, 96] : [24, 90],
				paddingBottomRight: innerWidth > 760 ? [430, 32] : [24, 360]
			});
			void openExpanded(id);
		},
		highlight(id, active = true) {
			markers.get(id)?.getElement()?.classList.toggle("is-previewed", active);
		},
		reveal(id) {
			const marker = markers.get(id);
			if (!marker) return;
			map.panInside(marker.getLatLng(), { animate: !matchMedia("(prefers-reduced-motion: reduce)").matches, paddingTopLeft: [24, 96], paddingBottomRight: [24, innerWidth <= 700 ? 480 : 80] });
		},
		clearSelection() {
			selectedMarkerId = null;
			const pending = [];
			for (const [cardId, cardState] of pinStates) {
				if (cardState.mode === "idle") continue;
				pending.push(closeCard(cardId, { instant: reducedMotion() }));
			}
			for (const marker of markers.values()) {
				marker.getElement()?.classList.remove("is-selected", "is-previewed");
				if (marker.setZIndexOffset) marker.setZIndexOffset(0);
			}
			syncSelectionClass();
			return Promise.all(pending);
		},
		setAreaLayer(kind, enabled) {
			if (!Object.hasOwn(areaLayerVisibility, kind)) return;
			areaLayerVisibility[kind] = enabled;
			renderEnvironmentalAreas(currentItems, { pulseKind: enabled && kind === "water_quality" ? kind : null });
		},
		setContentLayers(next) {
			Object.assign(contentLayers, next);
			show(currentItems);
		},
		setAreaOpacity(value) {
			areaOpacity = Math.max(0, Math.min(.45, Number(value)));
			renderEnvironmentalAreas(currentItems);
		},
		setBaseLayer(kind) {
			const satellite = kind !== "readable";
			if (satellite) {
				if (map.hasLayer(readable)) map.removeLayer(readable);
				if (!map.hasLayer(imagery)) imagery.addTo(map);
			} else {
				if (map.hasLayer(imagery)) map.removeLayer(imagery);
				if (!map.hasLayer(readable)) readable.addTo(map);
			}
		},
		beginAreaInvestigation(onChange = () => {}, { minimum = 3, shape = "polygon" } = {}) {
			this.cancelAreaInvestigation();
			areaDraft = { markers: [], shape: null, onChange, drawing: true, minimum, shapeKind: shape };
			element.classList.add("is-drawing-area");
			map.closePopup();
			return areaDraft;
		},
		clearAreaInvestigation() {
			if (!areaDraft) return;
			for (const marker of areaDraft.markers) map.removeLayer(marker);
			if (areaDraft.shape) map.removeLayer(areaDraft.shape);
			areaDraft.markers = [];
			areaDraft.shape = null;
			areaDraft.onChange([]);
		},
		confirmAreaInvestigation() {
			if (!areaDraft || areaDraft.markers.length < areaDraft.minimum) return null;
			areaDraft.drawing = false;
			element.classList.remove("is-drawing-area");
			return areaDraft.markers.map((marker) => [marker.getLatLng().lng, marker.getLatLng().lat]);
		},
		cancelAreaInvestigation() {
			if (!areaDraft) return;
			for (const marker of areaDraft.markers) map.removeLayer(marker);
			if (areaDraft.shape) map.removeLayer(areaDraft.shape);
			areaDraft = null;
			element.classList.remove("is-drawing-area");
		}
	};
}
// ── Estados de interface sobre o mesmo mapa ──
/** Uma única instância Leaflet; a rolagem alterna estados de interface, nunca o mapa. */
export function mountTerritory(stage, explorer, map) {
	const reduced = matchMedia("(prefers-reduced-motion: reduce)");
	const element = stage.querySelector("#map");
	const controls = stage.querySelector(".map-top");
	const message = stage.querySelector("#tile-error");
	let tileState = "loading";
	let frame;
	let automaticStarted = false;
	let automaticProgress = 0;
	let automaticStart = 0;
	let previousScrollY = window.scrollY;
	let lockedScrollY = window.scrollY;
	let touchStartY;
	let pinsPresented = false;
	let presentPinsImmediately = false;
	const clamp = (value) => Math.min(1, Math.max(0, value));
	const startAutomatic = () => {
		if (automaticStarted) return;
		automaticStarted = true;
		lockedScrollY = previousScrollY;
		automaticProgress = reduced.matches ? 1 : 0;
		automaticStart = performance.now();
		schedule();
	};
	const update = (timestamp = performance.now()) => {
		frame = undefined;
		const bounds = stage.getBoundingClientRect();
		const viewport = Math.max(1, window.innerHeight);
		if (automaticStarted && automaticProgress < 1) {
			const elapsed = clamp((timestamp - automaticStart) / 1400);
			const eased = elapsed * elapsed * (3 - 2 * elapsed);
			automaticProgress = eased;
			if (elapsed < 1) frame = requestAnimationFrame(update);
		}
		const progress = automaticProgress;
		const copy = clamp(progress / .3);
		const pins = progress >= .32;
		const ui = clamp((progress - .76) / .24);
		const complete = progress >= 1;
		const passed = bounds.bottom < viewport - 1;
		const root = document.documentElement.style;
		root.setProperty("--copy-opacity", String(1 - copy));
		root.setProperty("--copy-offset", `${reduced.matches ? 0 : copy * 40}px`);
		root.setProperty("--secondary-offset", `${reduced.matches ? 0 : copy * 26}px`);
		root.setProperty("--map-ui-opacity", String(ui));
		root.setProperty("--map-ui-offset", `${reduced.matches ? 0 : (1 - ui) * 6}px`);
		stage.classList.toggle("presentation-cleared", progress >= .3);
		stage.classList.toggle("markers-visible", pins);
		stage.classList.toggle("transition-complete", complete);
		explorer.classList.toggle("transition-tools", progress >= .85 && !passed);
		explorer.classList.toggle("transition-tools-interactive", complete && !passed);
		stage.dataset.phase = progress < .3 ? "editorial" : progress < .32 ? "map" : progress < .76 ? "markers" : "controls";
		controls.inert = !complete;
		map.setInteractive(complete);
		if (pins && !pinsPresented) {
			pinsPresented = true;
			map.presentMarkers(presentPinsImmediately || reduced.matches);
		}
		if (progress > .3 && tileState !== "ready") {
			message.hidden = false;
			message.textContent = tileState === "loading" ? "Carregando imagens de satélite. Abra Ocorrências na navegação para consultar a lista." : "Imagens de satélite indisponíveis. Marcadores disponíveis; abra Ocorrências na navegação para consultar a lista.";
		} else if (tileState === "ready" || progress <= .3) message.hidden = true;
	};
	const schedule = () => {
		if (frame === undefined) frame = requestAnimationFrame(update);
	};
	const direct = () => {
		const target = location.hash === "#map" ? document.getElementById("map") : location.hash === "#list-heading" ? document.getElementById("list-heading") : null;
		const functionalHash = /^#(?:ocorrencia=|publicacao=|central$|administracao$|data-summary$)/.test(location.hash);
		if (target || functionalHash) {
			automaticStarted = true;
			automaticProgress = 1;
			presentPinsImmediately = true;
			if (target?.id === "list-heading") explorer.classList.add("list-expanded");
			if (target?.id === "map") window.scrollTo({ top: stage.offsetTop + stage.offsetHeight - innerHeight, behavior: "instant" });
			else if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
		}
		map.refresh();
		update();
		if (target) {
			// The region itself remains a keyboard destination while imagery loads.
			if (target === element) element.inert = false;
			target.focus({ preventScroll: true });
		}
	};
	document.querySelectorAll("[data-direct]").forEach((link) => link.addEventListener("click", (event) => {
		/** Fragment navigation keeps Back/Forward semantics; direct links skip animation. */
		if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		history.pushState(null, "", link.getAttribute("href"));
		direct();
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	}));
	window.addEventListener("wheel", (event) => {
		if (automaticProgress < 1 && (automaticStarted || event.deltaY > 0)) event.preventDefault();
		if (event.deltaY > 0) startAutomatic();
	}, { passive: false });
	window.addEventListener("touchstart", (event) => {
		touchStartY = event.touches[0]?.clientY;
	}, { passive: true });
	window.addEventListener("touchmove", (event) => {
		const currentY = event.touches[0]?.clientY;
		const movingDown = Number.isFinite(touchStartY) && Number.isFinite(currentY) && touchStartY - currentY > 4;
		if (automaticProgress < 1 && (automaticStarted || movingDown)) event.preventDefault();
		if (movingDown) startAutomatic();
	}, { passive: false });
	window.addEventListener("touchend", () => { touchStartY = undefined; }, { passive: true });
	window.addEventListener("scroll", () => {
		const current = window.scrollY;
		if (!automaticStarted && current > previousScrollY) {
			lockedScrollY = previousScrollY;
			startAutomatic();
		}
		if (automaticStarted && automaticProgress < 1 && current !== lockedScrollY) window.scrollTo(0, lockedScrollY);
		previousScrollY = current;
		schedule();
	}, { passive: true });
	window.addEventListener("resize", schedule);
	window.addEventListener("hashchange", direct);
	reduced.addEventListener("change", schedule);
	window.addEventListener("pageshow", direct);
	const finishTiles = (success) => {
		tileState = success ? "ready" : "failed";
		stage.classList.toggle("tiles-ready", success);
		stage.classList.toggle("tiles-unavailable", !success);
		schedule();
	};
	map.tilesReady.then(finishTiles);
	setTimeout(() => {
		if (tileState === "loading") finishTiles(false);
	}, 3000);
	update();
	direct();
	/** Fragment scrolling can run after module evaluation; settle on the completed map state. */
	requestAnimationFrame(() => requestAnimationFrame(direct));
}
