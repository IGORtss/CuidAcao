/**
 * Histórico e encerramento
 */
import { adaptHistoryEvent, formatDate } from "../../../servicos/api.js";

const node = (tag, text = "") => {
	const result = document.createElement(tag);
	result.textContent = text;
	return result;
};

const eventDate = (value) => new Intl.DateTimeFormat("pt-BR", {
	timeZone: "America/Sao_Paulo",
	dateStyle: "medium",
	timeStyle: "medium"
}).format(new Date(value));

const entityLabels = {
	occurrence: "Ocorrência",
	contribution: "Contribuição",
	stance: "Manifestação",
	attachment: "Imagem",
	relation: "Vínculo"
};

export function renderHistory(container, events, { audit = false } = {}) {
	const pageSize = 20, totalPages = Math.max(1, Math.ceil(events.length / pageSize));
	let page = totalPages;
	const content = node(audit ? "div" : "ol");
	if (!audit) content.className = "timeline";
	const nav = node("nav");
	nav.className = "history-pagination";
	nav.setAttribute("aria-label", audit ? "Paginação da auditoria" : "Paginação do histórico");
	const summary = node("p");
	summary.setAttribute("role", "status");
	const previous = node("button", "Eventos anteriores"), next = node("button", "Próximos eventos");
	previous.type = next.type = "button";
	nav.append(previous, summary, next);
	container.replaceChildren(content, nav);
	function show() {
		content.replaceChildren();
		if (!audit) content.start = (page - 1) * pageSize + 1;
		for (const source of events.slice((page - 1) * pageSize, page * pageSize)) {
			const event = audit ? adaptHistoryEvent(source) : source;
			if (audit) {
				const entry = node("details"), head = node("summary", `${event.text} · ${eventDate(event.date)} · ${entityLabels[source.entityType] ?? source.entityType} ${source.entityId}`), data = node("pre", JSON.stringify({
					entityType: source.entityType,
					entityId: source.entityId,
					actorId: source.actorId,
					correlationId: source.correlationId,
					reason: source.reason,
					before: source.before,
					after: source.after,
					references: source.references
				}, null, 2));
				entry.append(head, data);
				content.append(entry);
			} else {
				const entry = node("li"), time = node("time", eventDate(event.date));
				time.dateTime = event.date;
				const caption = node("small");
				caption.append(time);
				entry.append(caption, node("p", event.text));
				content.append(entry);
			}
		}
		if (!events.length) content.append(node(audit ? "p" : "li", "Nenhum evento disponível."));
		summary.textContent = `Página ${page} de ${totalPages} · ${events.length} evento(s)`;
		previous.disabled = page === 1;
		next.disabled = page === totalPages;
	}
	previous.addEventListener("click", () => {
		if (page > 1) {
			page--;
			show();
			(previous.disabled ? next : previous).focus();
		}
	});
	next.addEventListener("click", () => {
		if (page < totalPages) {
			page++;
			show();
			(next.disabled ? previous : next).focus();
		}
	});
	show();
}

export function renderClosure(container, item) {
	if (item.statusCode !== "closed") return;
	const section = node("section");
	section.setAttribute("aria-label", "Encerramento da ocorrência");
	section.append(node("h3", "Encerramento revisado na simulação"), node("p", "Resolução relatada e revisada; não equivale a certificação técnica."));
	const closure = item.closure;
	if (!closure) section.append(node("p", "Fundamento público do encerramento indisponível. Consulte o histórico permitido."));
	else {
		section.append(node("p", `${closure.username ?? "Sistema"} · ${eventDate(closure.createdAt)}`), node("p", "Motivo: " + (closure.reason ?? "Não informado.")));
		if (closure.resolution.available) section.append(node("h4", "Complemento de resolução usado como fundamento"), node("p", `Contribuição ${closure.resolution.id} · ${closure.resolution.username} · ${eventDate(closure.resolution.createdAt)}`), node("p", closure.resolution.text));
		else section.append(node("p", "Complemento usado como fundamento indisponível para consulta pública. O estado não foi alterado automaticamente."));
	}
	container.append(section);
}