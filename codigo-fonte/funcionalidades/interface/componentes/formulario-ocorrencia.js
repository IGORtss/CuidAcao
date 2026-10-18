/**
 * Formulário de ocorrência
 */
import { createOccurrenceWriter, createAttachmentClient, createOccurrenceClient } from "../../../servicos/api.js";
import { createImageFields } from "./anexos.js";

const node = (tag, text = "") => {
	const element = document.createElement(tag);
	element.textContent = text;
	return element;
};

export function mountOccurrenceForm({ auth, map, onSaved, onPersisted = () => {}, getItems = () => [], onSelectExisting = () => {} }) {
	const writer = createOccurrenceWriter(), dialog = node("dialog");
	dialog.className = "occurrence-dialog";
	dialog.setAttribute("aria-labelledby", "occurrence-form-title");
	const head = node("div");
	head.className = "dialog-head";
	const title = node("h2", "Registrar ocorrência");
	title.id = "occurrence-form-title";
	const close = node("button", "Fechar ×");
	close.type = "button";
	close.setAttribute("aria-label", "Fechar formulário");
	head.append(title, close);
	const eyebrow = node("p", "Novo registro · simulação acadêmica");
	eyebrow.className = "occurrence-eyebrow";
	const help = node("p", "Use somente relatos fictícios. Consulte os registros existentes para evitar duplicatas.");
	help.className = "occurrence-help";
	const consult = node("button", "Consultar registros existentes");
	consult.type = "button";
	const message = node("p");
	message.id = "occurrence-message";
	message.tabIndex = -1;
	message.setAttribute("role", "status");
	const form = node("form");
	form.noValidate = true;
	const progress = node("ol");
	progress.className = "occurrence-progress";
	for (const label of ["Problema", "Localização", "Evidências"]) {
		const step = node("li", label);
		step.dataset.stepLabel = "";
		progress.append(step);
	}
	const steps = [0, 1, 2].map((index) => {
		const section = node("section");
		section.className = "occurrence-step";
		section.dataset.step = String(index);
		form.append(section);
		return section;
	});
	const inputs = {}, errors = {};
	function field(key, label, tag = "input", type = "text") {
		const wrapper = node("div"), labelNode = node("label", label), input = node(tag), error = node("small");
		input.id = "occurrence-" + key;
		input.name = key;
		labelNode.htmlFor = input.id;
		if (tag === "input") input.type = type;
		error.id = input.id + "-error";
		input.setAttribute("aria-describedby", error.id);
		wrapper.append(labelNode, input, error);
		steps[key === "category" || key === "title" || key === "description" ? 0 : 1].append(wrapper);
		inputs[key] = input;
		errors[key] = error;
		return input;
	}
	const category = field("category", "Categoria", "select");
	category.append(new Option("Resíduos", "residuos"), new Option("Água", "agua"));
	field("title", "Título (opcional)").maxLength = 100;
	field("description", "Descrição fictícia (20 a 3.000 caracteres)", "textarea").maxLength = 3e3;
	inputs.description.rows = 5;
	field("locationLabel", "Referência local (opcional)").maxLength = 120;
	for (const [key, label, min, max] of [[
		"latitude",
		"Latitude",
		-23.95,
		-23.925
	], [
		"longitude",
		"Longitude",
		-46.195,
		-46.165
	]]) {
		const input = field(key, label, "input", "number");
		input.step = "any";
		input.min = min;
		input.max = max;
		input.required = true;
	}
	const representationWrap = node("div"), representationLabel = node("label", "Representação no mapa"), representation = node("select"), representationHelp = node("small", "Use ponto como padrão. Linha ou área exige geometria explicitamente desenhada e será identificada como aproximada.");
	representation.id = "occurrence-representation";
	representationLabel.htmlFor = representation.id;
	representationWrap.append(representationLabel, representation, representationHelp);
	steps[1].append(representationWrap);
	function representationOptions() {
		const current = representation.value;
		representation.replaceChildren(new Option("Relato pontual", "none"));
		if (category.value === "residuos") representation.append(new Option("Área aproximada de resíduos", "waste"));
		else representation.append(new Option("Ponto de esgoto aparente", "apparent_sewage"), new Option("Trecho aproximado de erosão", "erosion"), new Option("Área aproximada de alagamento", "flooding"));
		if ([...representation.options].some((option) => option.value === current)) representation.value = current;
	}
	representationOptions();
	category.addEventListener("change", representationOptions);
	const mapLabel = node("p", "Clique no mapa principal para marcar o ponto. Você também pode informar as coordenadas abaixo.");
	mapLabel.setAttribute("role", "status");
	mapLabel.className = "location-instruction";
	const nearby = node("div");
	nearby.className = "nearby-suggestions";
	nearby.setAttribute("aria-live", "polite");
	const geometryActions = node("div"), geometryConfirm = node("button", "Confirmar geometria"), geometryClear = node("button", "Limpar desenho");
	geometryConfirm.type = geometryClear.type = "button";
	geometryActions.className = "geometry-draw-actions";
	geometryActions.append(geometryConfirm, geometryClear);
	geometryActions.hidden = true;
	const submit = node("button", "Salvar relato");
	submit.type = "submit";
	const login = node("button", "Entrar para continuar");
	login.type = "button";
	login.hidden = true;
	const reload = node("button", "Recarregar ocorrência para revisão");
	reload.type = "button";
	reload.hidden = true;
	const review = node("div");
	review.hidden = true;
	const accept = node("button", "Revisei; usar esta versão");
	accept.type = "button";
	accept.hidden = true;
	const images = createImageFields(), attachments = createAttachmentClient();
	const finish = node("button", "Ver ocorrência salva");
	finish.type = "button";
	finish.hidden = true;
	steps[1].prepend(mapLabel);
	steps[1].append(geometryActions, nearby);
	steps[2].append(images.element);
	const previous = node("button", "Voltar");
	previous.type = "button";
	const next = node("button", "Continuar");
	next.type = "button";
	const actions = node("div");
	actions.className = "occurrence-actions";
	actions.append(previous, next, submit, login, reload, accept, finish);
	form.append(actions, review);
	dialog.append(head, eyebrow, help, consult, progress, message, form);
	document.body.append(dialog);
	let setMapPoint, draft = null, geometryCoordinates = [], geometryReady = false;
	let item = null, busy = false, conflict = false, latest = null, returnFocus = null, savedForImages = false, currentStep = 0;
	function showStep(index, { focus = true } = {}) {
		currentStep = Math.max(0, Math.min(2, index));
		steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== currentStep; });
		[...progress.children].forEach((label, stepIndex) => {
			label.toggleAttribute("aria-current", stepIndex === currentStep);
			label.classList.toggle("is-complete", stepIndex < currentStep);
		});
		previous.hidden = currentStep === 0;
		next.hidden = currentStep === 2;
		submit.hidden = currentStep !== 2;
		if (currentStep === 1) {
			const latitude = Number(inputs.latitude.value), longitude = Number(inputs.longitude.value);
			const shape = ["waste", "flooding"].includes(representation.value) ? "polygon" : representation.value === "erosion" ? "line" : "point";
			geometryActions.hidden = shape === "point";
			if (shape !== "point") {
				mapLabel.textContent = `Desenhe ${shape === "line" ? "um trecho com pelo menos 2 pontos" : "uma área com pelo menos 3 vértices"}. O primeiro ponto também será a referência do relato.`;
				geometryCoordinates = [];
				geometryReady = false;
				map.beginAreaInvestigation((coordinates) => {
					geometryCoordinates = coordinates;
					if (coordinates[0]) {
						inputs.longitude.value = coordinates[0][0].toFixed(6);
						inputs.latitude.value = coordinates[0][1].toFixed(6);
						showNearby(coordinates[0][1], coordinates[0][0]);
					}
					mapLabel.textContent = `${coordinates.length} ponto${coordinates.length === 1 ? "" : "s"} desenhado${coordinates.length === 1 ? "" : "s"}. Arraste para corrigir e confirme a geometria.`;
				}, { minimum: shape === "line" ? 2 : 3, shape });
			} else setMapPoint = map.beginLocationSelection((lat, lng) => {
				inputs.latitude.value = lat.toFixed(6);
				inputs.longitude.value = lng.toFixed(6);
				mapLabel.textContent = `Ponto marcado: ${lat.toFixed(6)}, ${lng.toFixed(6)}.`;
				showNearby(lat, lng);
			}, Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null);
			if (shape === "point" && Number.isFinite(latitude) && Number.isFinite(longitude)) showNearby(latitude, longitude);
		} else {
			map.endLocationSelection();
			map.cancelAreaInvestigation();
			setMapPoint = null;
		}
		if (focus) (steps[currentStep].querySelector("input, select, textarea, button") ?? next)?.focus();
	}
	geometryConfirm.addEventListener("click", () => {
		const coordinates = map.confirmAreaInvestigation();
		geometryReady = Boolean(coordinates);
		mapLabel.textContent = coordinates ? `Geometria aproximada confirmada com ${coordinates.length} pontos. Você ainda pode voltar e redesenhar antes de salvar.` : "Adicione os pontos mínimos antes de confirmar.";
	});
	geometryClear.addEventListener("click", () => { geometryCoordinates = []; geometryReady = false; map.clearAreaInvestigation(); });
	function showNearby(latitude, longitude) {
		const earth = 6371008.8, radians = (value) => value * Math.PI / 180;
		const distance = (entry) => {
			const lat = radians(entry.latitude - latitude), lng = radians(entry.longitude - longitude);
			const a = Math.sin(lat / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(entry.latitude)) * Math.sin(lng / 2) ** 2;
			return 2 * earth * Math.asin(Math.sqrt(a));
		};
		const candidates = getItems().filter((entry) => entry.categoryCode === inputs.category.value).map((entry) => ({ entry, distance: distance(entry) })).filter((entry) => entry.distance <= 500).sort((a, b) => a.distance - b.distance).slice(0, 3);
		nearby.replaceChildren(node("h3", "Possíveis relatos semelhantes próximos"));
		if (!candidates.length) nearby.append(node("p", "Nenhum relato da mesma categoria foi encontrado em até 500 m. Isso não garante que o problema seja novo."));
		for (const candidate of candidates) {
			const row = node("div"), text = node("p", `${candidate.entry.title} · ${Math.round(candidate.distance)} m`), button = node("button", "Consultar e complementar");
			button.type = "button";
			button.addEventListener("click", () => { hide(); onSelectExisting(candidate.entry); });
			row.append(text, button);
			nearby.append(row);
		}
		if (candidates.length) nearby.append(node("p", "Você pode consultar um registro existente ou continuar criando um relato distinto; nada será mesclado automaticamente."));
	}
	function setMessage(text) {
		message.textContent = text;
		message.focus();
	}
	function state() {
		for (const input of Object.values(inputs)) input.disabled = busy || savedForImages;
		images.setBusy(busy);
		finish.disabled = busy;
		close.disabled = busy;
		consult.disabled = busy;
		submit.disabled = busy || conflict;
		submit.textContent = busy ? "Salvando…" : savedForImages ? "Enviar imagens pendentes" : "Salvar relato";
		reload.disabled = busy;
		accept.disabled = busy;
		previous.disabled = busy;
		next.disabled = busy;
		form.setAttribute("aria-busy", String(busy));
	}
	function clearErrors() {
		for (const key of Object.keys(inputs)) {
			errors[key].textContent = "";
			inputs[key].removeAttribute("aria-invalid");
		}
	}
	function open(value = null, { preset = null } = {}) {
		if (busy) return;
		savedForImages = false;
		finish.hidden = true;
		images.reset();
		item = value;
		returnFocus = document.activeElement;
		conflict = false;
		latest = null;
		reload.hidden = true;
		review.hidden = true;
		accept.hidden = true;
		login.hidden = false;
		login.hidden = !!auth.getUser();
		clearErrors();
		message.textContent = "";
		title.textContent = value ? "Editar relato original" : "Registrar ocorrência";
		const initial = value ?? preset ?? draft;
		for (const key of Object.keys(inputs)) inputs[key].value = initial ? key === "category" ? initial.categoryCode ?? initial.category ?? "residuos" : initial[key] ?? "" : key === "category" ? "residuos" : "";
		nearby.replaceChildren();
		representation.value = "none";
		representationWrap.hidden = Boolean(value);
		geometryCoordinates = [];
		geometryReady = false;
		state();
		dialog.show();
		showStep(0);
	}
	function hide() {
		if (!busy) {
			if (!item && !savedForImages) draft = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value]));
			map.endLocationSelection();
			map.cancelAreaInvestigation();
			dialog.close();
			if (savedForImages) onSaved(item);
		}
	}
	finish.addEventListener("click", hide);
	close.addEventListener("click", hide);
	dialog.addEventListener("cancel", (event) => {
		event.preventDefault();
		hide();
	});
	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape" || !dialog.open || busy || !dialog.contains(document.activeElement)) return;
		event.preventDefault();
		event.stopPropagation();
		hide();
	}, true);
	dialog.addEventListener("close", () => {
		const visible = (node) => node?.isConnected && node.getClientRects().length > 0;
		const fallback = document.getElementById("hud-trigger") ?? document.getElementById("list-heading");
		if (!document.querySelector("#details")?.open) (visible(returnFocus) ? returnFocus : fallback)?.focus();
	});
	consult.addEventListener("click", () => {
		hide();
		location.hash = "list-heading";
	});
	login.addEventListener("click", () => auth.openLogin());
	previous.addEventListener("click", () => showStep(currentStep - 1));
	next.addEventListener("click", () => {
		if (currentStep === 1 && ["waste", "erosion", "flooding"].includes(representation.value) && !geometryReady) {
			setMessage("Confirme a geometria desenhada antes de continuar.");
			return;
		}
		showStep(currentStep + 1);
	});
	for (const key of ["latitude", "longitude"]) inputs[key].addEventListener("change", () => {
		if (inputs.latitude.value && inputs.longitude.value) setMapPoint?.(Number(inputs.latitude.value), Number(inputs.longitude.value));
	});
	representation.addEventListener("change", () => { if (currentStep === 1) showStep(1, { focus: false }); });
	reload.addEventListener("click", async () => {
		busy = true;
		state();
		try {
			latest = await createOccurrenceClient().detail(item.id);
			const currentImages = await attachments.list(item.id);
			review.replaceChildren(node("p", `Imagens atuais: ${currentImages.data.filter((image) => image.available).map((image) => image.caption).join("; ") || "nenhuma"}`));
			review.append(node("p", `Versão atual ${latest.version} · ${latest.status} · ${latest.title}`), node("p", latest.description), node("p", `${latest.category} · ${latest.locationLabel ?? "Sem referência"} · ${latest.latitude}, ${latest.longitude}`));
			review.hidden = false;
			accept.hidden = false;
			setMessage("Compare o registro atual com seu rascunho antes de confirmar a versão.");
		} catch (error) {
			setMessage(error.message);
		} finally {
			busy = false;
			state();
		}
	});
	accept.addEventListener("click", () => {
		item = latest;
		conflict = false;
		reload.hidden = true;
		accept.hidden = true;
		setMessage("Versão revisada. Seu rascunho foi preservado; envie somente após conferir.");
		state();
	});
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (busy || conflict) return;
		clearErrors();
		const data = {
			category: inputs.category.value,
			description: inputs.description.value,
			latitude: inputs.latitude.value === "" ? null : Number(inputs.latitude.value),
			longitude: inputs.longitude.value === "" ? null : Number(inputs.longitude.value)
		};
		if (!item && representation.value !== "none") {
			if (representation.value === "apparent_sewage") data.environmentalRepresentation = { type: "apparent_sewage", accuracy: "approximate", geometry: { type: "Point", coordinates: [data.longitude, data.latitude] } };
			else if (representation.value === "erosion") data.environmentalRepresentation = { type: "erosion", accuracy: "approximate", geometry: { type: "LineString", coordinates: geometryCoordinates } };
			else data.environmentalRepresentation = { type: representation.value, accuracy: "approximate", geometry: { type: "Polygon", coordinates: [[...geometryCoordinates, geometryCoordinates[0]]] } };
		}
		if (inputs.title.value.trim() || item) data.title = inputs.title.value;
		if (inputs.locationLabel.value.trim() || item) data.locationLabel = inputs.locationLabel.value;
		busy = true;
		state();
		message.textContent = "Salvando relato fictício…";
		try {
			if (!savedForImages) {
				const saved = item ? await writer.edit(item.id, item.version, data) : await writer.create(data);
				item = saved;
				draft = null;
				onPersisted(saved);
				if (images.pending().length) {
					savedForImages = true;
					finish.hidden = false;
					title.textContent = "Registro salvo — imagens opcionais";
				}
			}
			if (savedForImages) {
				message.textContent = "Registro salvo. Enviando imagens opcionais…";
				await images.send(attachments, item);
			}
			busy = false;
			dialog.close();
			onSaved(item);
		} catch (error) {
			setMessage((savedForImages ? "Registro salvo; anexo não enviado. " : "") + error.message);
			for (const [key, text] of Object.entries(error.fields ?? {})) if (errors[key]) {
				errors[key].textContent = text;
				inputs[key].setAttribute("aria-invalid", "true");
			}
			const invalidKeys = Object.keys(error.fields ?? {});
			if (invalidKeys.some((key) => ["category", "title", "description"].includes(key))) showStep(0, { focus: false });
			else if (invalidKeys.some((key) => ["locationLabel", "latitude", "longitude"].includes(key))) showStep(1, { focus: false });
			if (error.status === 401) {
				login.hidden = false;
				auth.refresh();
			}
			if (error.status === 409 && item) {
				conflict = true;
				reload.hidden = false;
			}
		} finally {
			busy = false;
			state();
		}
	});
	return {
		open,
		appendEditControl(body, value) {
			if (auth.getUser()?.id !== value.authorId) return;
			const deadline = Date.parse(value.createdAt) + 864e5;
			body.append(node("p", `Edição do autor: somente em Recebida, até ${new Intl.DateTimeFormat("pt-BR", {
				timeZone: "America/Sao_Paulo",
				dateStyle: "short",
				timeStyle: "short"
			}).format(new Date(deadline))}.`));
			if (value.statusCode === "received" && !value.duplicateOfId && Date.now() <= deadline) {
				const edit = node("button", "Editar relato");
				edit.type = "button";
				edit.addEventListener("click", () => open(value));
				body.append(edit);
			} else body.append(node("p", value.duplicateOfId ? "Edição bloqueada pelo vínculo de duplicata. Consulte o registro principal." : [
				"community_review",
				"confirmed",
				"monitoring"
			].includes(value.statusCode) ? "Edição do relato indisponível. Use Acrescentar complemento para novas informações." : "Edição do relato indisponível neste estado ou fora do prazo permitido."));
		}
	};
}