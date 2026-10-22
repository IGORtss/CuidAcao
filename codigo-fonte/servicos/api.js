/**
 * Clientes HTTP, validação de respostas e rótulos usados pelas telas.
 * Edite este arquivo diretamente. Guia: apoio/documentacao/ESTRUTURA.md.
 *
 * 1. Rótulos, filtros e datas
 * 2. Comunicação HTTP e erros
 * 3. Administração e denúncias
 * 4. Imagens e anexos
 * 5. Cadastro e sessão
 * 6. Comentários, complementos e pedidos
 * 7. Autenticação Google
 * 8. Duplicatas e relações
 * 9. Conversão das respostas da API
 * 10. Criação e edição de ocorrências
 * 11. Consulta de ocorrências
 * 12. Apoios e contestações
 * 13. Mudanças de estado
 */
// ── Rótulos, filtros e datas ──
export const statusLabels = Object.freeze({
	received: "Recebida",
	community_review: "Verificação comunitária",
	confirmed: "Confirmada",
	monitoring: "Acompanhamento",
	closed: "Encerrada",
	discarded: "Descartada"
});
export const categoryLabels = Object.freeze({
	residuos: "Resíduos",
	agua: "Água"
});
export const statuses = Object.values(statusLabels);
export const categories = Object.values(categoryLabels);
export function filterOccurrences(items, category = "", status = "") {
	return items.filter((item) => (!category || item.category === category) && (!status || item.status === status));
}
export function selectedId(hash) {
	const match = /^#ocorrencia=([a-zA-Z0-9-]+)$/.exec(hash);
	return match?.[1] ?? null;
}
export function findOccurrence(items, id) {
	return items.find((item) => item.id === id) ?? null;
}
export function formatDate(value) {
	return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

// ── Comunicação HTTP e erros ──
export var ApiError = class extends Error {
	constructor(message, status = 0) {
		super(message);
		this.status = status;
	}
};
export function createHttpClient(fetchImpl = globalThis.fetch) {
	return async function getJSON(path, { signal } = {}) {
		let response;
		try {
			response = await fetchImpl(path, {
				method: "GET",
				headers: { Accept: "application/json" },
				credentials: "same-origin",
				signal
			});
		} catch (error) {
			if (signal?.aborted || error.name === "AbortError") throw error;
			throw new ApiError("Não foi possível conectar à API. Tente novamente.");
		}
		if (!response.ok) throw new ApiError("Não foi possível concluir a consulta. Tente novamente.", response.status);
		try {
			return await response.json();
		} catch (error) {
			if (signal?.aborted || error.name === "AbortError") throw error;
			throw new ApiError("A API retornou uma resposta inválida. Tente novamente.");
		}
	};
}

// ── Administração e denúncias ──
export function createAdministrationClient(fetchImpl = globalThis.fetch) {
	async function request(path, input) {
		let response, value;
		try {
			response = await fetchImpl("/api/v1" + path, {
				method: input ? "POST" : "GET",
				credentials: "same-origin",
				headers: {
					Accept: "application/json",
					...input ? { "Content-Type": "application/json" } : {}
				},
				...input ? { body: JSON.stringify(input) } : {}
			});
		} catch {
			throw new ApiError("Não foi possível conectar. Consulte o registro antes de repetir o envio.");
		}
		try {
			value = await response.json();
		} catch {
			throw new ApiError("Resposta inválida. Consulte o registro antes de repetir.");
		}
		if (!response.ok) {
			const error = new ApiError(value?.error?.message ?? "Não foi possível concluir a operação.", response.status);
			error.fields = value?.error?.fields ?? {};
			throw error;
		}
		if (!value || !Object.hasOwn(value, "data")) throw new ApiError("Resposta da API incompatível com o contrato.");
		return value;
	}
	const query = (values) => new URLSearchParams(Object.entries(values).filter(([, value]) => value !== "" && value !== undefined)).toString();
	return {
		request,
		list: (values = {}) => request("/occurrences?" + query({
			...values,
			includeHidden: true
		})),
		detail: (id) => request("/occurrences/" + encodeURIComponent(id) + "?includeHidden=true"),
		reports: (values) => request("/reports?" + query(values)),
		requests: (values) => request("/admin/reopen-requests?" + query(values)),
		async children(id, kind) {
			const rows = [];
			let page = 1, total, version;
			do {
				const result = await request(`/occurrences/${encodeURIComponent(id)}/${kind}?includeHidden=true&pageSize=100&page=${page}`);
				if (!Array.isArray(result.data) || result.page !== page || !Number.isSafeInteger(result.total) || result.total < 0 || total !== undefined && total !== result.total || version !== undefined && version !== result.occurrenceVersion) throw new ApiError("O registro mudou durante a consulta. Carregue novamente.");
				total = result.total;
				version = result.occurrenceVersion;
				rows.push(...result.data);
				if (rows.length > total || new Set(rows.map((row) => row.id)).size !== rows.length) throw new ApiError("Consulta duplicada ou inconsistente. Carregue novamente.");
				if (rows.length < total && result.data.length !== 100) throw new ApiError("Consulta incompleta. Carregue novamente.");
				page++;
			} while (rows.length < total);
			return {
				data: rows,
				occurrenceVersion: version
			};
		}
	};
}

// ── Imagens e anexos ──
export function adaptImage(row) {
	const positive = (value) => Number.isSafeInteger(value) && value > 0;
	if (!row || typeof row.id !== "string" || !/^[0-9a-f-]{36}$/.test(row.id) || typeof row.occurrenceId !== "string" || typeof row.createdAt !== "string" || !Number.isFinite(Date.parse(row.createdAt)) || typeof row.available !== "boolean") throw new ApiError("A API retornou um anexo inválido. Confira as imagens antes de repetir.");
	const fields = [
		"caption",
		"mediaType",
		"byteSize",
		"width",
		"height",
		"fileUrl"
	];
	if (row.available) {
		if (typeof row.caption !== "string" || ![
			"image/jpeg",
			"image/png",
			"image/webp"
		].includes(row.mediaType) || !positive(row.byteSize) || !positive(row.width) || !positive(row.height) || row.fileUrl !== `/api/v1/attachments/${row.id}/file`) throw new ApiError("A API retornou uma imagem inválida.");
	} else if (fields.some((key) => row[key] !== null)) throw new ApiError("A API retornou conteúdo indisponível sem ocultar os campos.");
	return {
		id: row.id,
		occurrenceId: row.occurrenceId,
		createdAt: row.createdAt,
		available: row.available,
		...Object.fromEntries(fields.map((key) => [key, row[key]]))
	};
}
export function createAttachmentClient(fetchImpl = globalThis.fetch) {
	async function request(path, options = {}) {
		let response;
		try {
			response = await fetchImpl("/api/v1/" + path, {
				credentials: "same-origin",
				...options
			});
		} catch (error) {
			if (options.signal?.aborted || error.name === "AbortError") throw error;
			throw new ApiError("Não foi possível conectar à API. O envio pode ter sido concluído; confira as imagens do registro antes de repetir.");
		}
		let result;
		try {
			result = await response.json();
		} catch {
			throw new ApiError("Resposta inválida da API. Confira as imagens do registro antes de repetir.");
		}
		if (!response.ok) {
			const error = new ApiError(result?.error?.message ?? "Não foi possível concluir a operação com imagens.", response.status);
			error.fields = result?.error?.fields ?? {};
			throw error;
		}
		if (!Number.isSafeInteger(result?.occurrenceVersion) || result.occurrenceVersion < 1) throw new ApiError("A API retornou uma versão inválida. Confira as imagens antes de repetir.");
		return result;
	}
	return {
		async list(id, { signal } = {}) {
			const data = [], ids = new Set();
			let page = 1, total, version;
			do {
				const result = await request(`occurrences/${encodeURIComponent(id)}/attachments?page=${page}&pageSize=100`, { signal });
				if (!Array.isArray(result.data) || !Number.isSafeInteger(result.total) || result.total < 0 || result.page !== page || result.pageSize !== 100 || !Number.isSafeInteger(result.occurrenceVersion) || total !== undefined && (total !== result.total || version !== result.occurrenceVersion)) throw new ApiError("As imagens mudaram durante a consulta. Tente novamente.");
				total = result.total;
				version = result.occurrenceVersion;
				if (result.data.length !== Math.min(100, Math.max(0, total - (page - 1) * 100))) throw new ApiError("A consulta de imagens está incompleta.");
				for (const row of result.data) {
					const image = adaptImage(row);
					if (image.occurrenceId !== id || ids.has(image.id)) throw new ApiError("A API retornou imagens repetidas ou de outro relato.");
					ids.add(image.id);
					data.push(image);
				}
				page++;
			} while (data.length < total);
			return {
				data,
				occurrenceVersion: version
			};
		},
		async upload(id, expectedVersion, file, caption, contributionId) {
			const data = new FormData();
			data.append("expectedVersion", String(expectedVersion));
			data.append("caption", caption);
			if (contributionId) data.append("contributionId", contributionId);
			data.append("file", file);
			const result = await request(`occurrences/${encodeURIComponent(id)}/attachments`, {
				method: "POST",
				body: data
			});
			const image = adaptImage(result.data);
			if (image.occurrenceId !== id || !image.available) throw new ApiError("A API retornou outro relato ou anexo indisponível.");
			return {
				data: image,
				occurrenceVersion: result.occurrenceVersion
			};
		},
		async withdraw(id, expectedVersion) {
			const result = await request(`attachments/${encodeURIComponent(id)}`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ expectedVersion })
			});
			const image = adaptImage(result.data);
			if (image.id !== id || image.available) throw new ApiError("A API não confirmou a retirada desta imagem.");
			return {
				data: image,
				occurrenceVersion: result.occurrenceVersion
			};
		}
	};
}

// ── Cadastro e sessão ──
const messages = {
	400: "Não foi possível enviar os dados.",
	401: "Usuário ou senha inválidos.",
	403: "Origem não permitida. Confira o endereço local da aplicação.",
	409: "Esse apelido já está em uso.",
	422: "Verifique o nome de usuário e a senha.",
	429: "Muitas tentativas. Aguarde um minuto e tente novamente."
};
export function adaptUser(value) {
	if (!value || typeof value.id !== "string" || typeof value.username !== "string" || !/^[a-z0-9_]{3,30}$/.test(value.username) || !["user", "admin"].includes(value.role)) throw new ApiError("A API retornou dados de sessão inválidos.");
	return {
		id: value.id,
		username: value.username,
		role: value.role
	};
}
export function createAuthClient(fetchImpl = globalThis.fetch) {
	async function request(path, { method = "GET", data, signal } = {}) {
		let response;
		try {
			response = await fetchImpl("/api/v1/auth/" + path, {
				method,
				credentials: "same-origin",
				headers: {
					Accept: "application/json",
					...data !== undefined ? { "Content-Type": "application/json" } : {}
				},
				...data !== undefined ? { body: JSON.stringify(data) } : {},
				signal
			});
		} catch (error) {
			if (signal?.aborted || error.name === "AbortError") throw error;
			throw new ApiError("Não foi possível conectar à API. Tente novamente.");
		}
		if (!response.ok) throw new ApiError(messages[response.status] ?? "Não foi possível concluir a autenticação. Tente novamente.", response.status);
		if (response.status === 204) return;
		let result;
		try {
			result = await response.json();
		} catch {
			throw new ApiError("A API retornou uma resposta inválida.");
		}
		return adaptUser(result?.data);
	}
	return {
		register: (data) => request("register", {
			method: "POST",
			data
		}),
		login: (data) => request("login", {
			method: "POST",
			data
		}),
		logout: () => request("logout", {
			method: "POST",
			data: {}
		}),
		async me({ signal } = {}) {
			try {
				return await request("me", { signal });
			} catch (error) {
				if (error.status === 401) return null;
				throw error;
			}
		}
	};
}

// ── Comentários, complementos e pedidos ──
function adaptContributions(row) {
	const fields = [
		"authorId",
		"username",
		"type",
		"kind",
		"text"
	];
	const requestStatus = row?.requestStatus ?? null;
	if (!row || typeof row.id !== "string" || !/^[0-9a-f-]{36}$/.test(row.id) || typeof row.occurrenceId !== "string" || typeof row.available !== "boolean" || !Number.isFinite(Date.parse(row.createdAt)) || !Number.isFinite(Date.parse(row.updatedAt)) || !Array.isArray(row.attachments)) throw new ApiError("A API retornou uma contribuição inválida.");
	if (row.available) {
		if (typeof row.authorId !== "string" || typeof row.username !== "string" || typeof row.text !== "string" || ![
			"comment",
			"supplement",
			"reopen_request"
		].includes(row.type) || row.type === "comment" && (row.kind !== null || row.attachments.length) || row.type === "reopen_request" && (row.kind !== null || ![
			"pending",
			"accepted",
			"rejected",
			"superseded"
		].includes(requestStatus)) || row.type !== "reopen_request" && requestStatus !== null || row.type === "supplement" && !["observation", "resolution"].includes(row.kind)) throw new ApiError("A API retornou conteúdo de contribuição inválido.");
	} else if (fields.some((field) => row[field] !== null) || row.attachments.length || requestStatus !== null) throw new ApiError("A API retornou conteúdo oculto sem protegê-lo.");
	const attachments = row.attachments.map(adaptImage);
	if (attachments.some((image) => image.occurrenceId !== row.occurrenceId) || new Set(attachments.map((image) => image.id)).size !== attachments.length) throw new ApiError("A API retornou imagens inválidas para a contribuição.");
	return {
		id: row.id,
		occurrenceId: row.occurrenceId,
		available: row.available,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		...Object.fromEntries(fields.map((field) => [field, row[field]])),
		attachments,
		requestStatus
	};
}
export function createContributionClient(fetchImpl = globalThis.fetch) {
	async function request(path, options = {}) {
		let response, result;
		try {
			response = await fetchImpl("/api/v1/" + path, {
				credentials: "same-origin",
				...options
			});
		} catch (error) {
			if (options.signal?.aborted || error.name === "AbortError") throw error;
			throw new ApiError("Não foi possível conectar à API. O envio pode ter sido concluído; consulte as contribuições antes de repetir.");
		}
		try {
			result = await response.json();
		} catch {
			throw new ApiError("Resposta inválida da API. Consulte as contribuições antes de repetir.");
		}
		if (!response.ok) {
			const error = new ApiError(result?.error?.message ?? "Não foi possível concluir a contribuição.", response.status);
			error.fields = result?.error?.fields ?? {};
			throw error;
		}
		if (!Number.isSafeInteger(result?.occurrenceVersion) || result.occurrenceVersion < 1) throw new ApiError("A API retornou uma versão inválida. Recarregue as contribuições.");
		return result;
	}
	return {
		async list(id, { signal } = {}) {
			const data = [], ids = new Set();
			let page = 1, total, version;
			do {
				const result = await request(`occurrences/${encodeURIComponent(id)}/contributions?page=${page}&pageSize=100`, { signal });
				if (!Array.isArray(result.data) || !Number.isSafeInteger(result.total) || result.total < 0 || result.page !== page || result.pageSize !== 100 || total !== undefined && (total !== result.total || version !== result.occurrenceVersion)) throw new ApiError("As contribuições mudaram durante a consulta. Tente novamente.");
				total = result.total;
				version = result.occurrenceVersion;
				if (result.data.length !== Math.min(100, Math.max(0, total - (page - 1) * 100))) throw new ApiError("A consulta de contribuições está incompleta.");
				for (const row of result.data) {
					const value = adaptContributions(row);
					if (value.occurrenceId !== id || ids.has(value.id)) throw new ApiError("A API retornou contribuições repetidas ou de outra ocorrência.");
					ids.add(value.id);
					data.push(value);
				}
				page++;
			} while (data.length < total);
			return {
				data,
				occurrenceVersion: version
			};
		},
		async create(id, input) {
			const result = await request(`occurrences/${encodeURIComponent(id)}/contributions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input)
			});
			const data = adaptContributions(result.data);
			if (data.occurrenceId !== id || !data.available) throw new ApiError("A API não confirmou a contribuição desta ocorrência.");
			return {
				data,
				occurrenceVersion: result.occurrenceVersion
			};
		},
		async edit(id, expectedVersion, text) {
			const result = await request(`contributions/${encodeURIComponent(id)}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					expectedVersion,
					text
				})
			});
			const data = adaptContributions(result.data);
			if (data.id !== id || !data.available) throw new ApiError("A API não confirmou a edição desta contribuição.");
			return {
				data,
				occurrenceVersion: result.occurrenceVersion
			};
		}
	};
}

// ── Autenticação Google ──
export function createGoogleClient(fetchImpl = globalThis.fetch) {
	async function request(path, data) {
		let response;
		try {
			response = await fetchImpl("/api/v1/auth/google/" + path, {
				method: data === undefined ? "GET" : "POST",
				credentials: "same-origin",
				headers: {
					Accept: "application/json",
					...data === undefined ? {} : { "Content-Type": "application/json" }
				},
				...data === undefined ? {} : { body: JSON.stringify(data) }
			});
		} catch {
			throw new ApiError("Não foi possível conectar à API. Seu rascunho foi mantido; tente novamente.");
		}
		if (response.status === 204) return;
		let result;
		try {
			result = await response.json();
		} catch {
			throw new ApiError("Resposta de autenticação indisponível. Tente novamente.");
		}
		if (!response.ok) throw new ApiError(typeof result?.error?.message === "string" ? result.error.message : "Não foi possível entrar com Google. Tente novamente.", response.status);
		if (["verify", "complete"].includes(path)) {
			if (result?.data?.needsUsername === true && path === "verify") return { needsUsername: true };
			return { user: adaptUser(result?.data?.user) };
		}
		return result.data;
	}
	return {
		config: () => request("config"),
		challenge: () => request("challenge", {}),
		verify: (credential) => request("verify", { credential }),
		complete: (username) => request("complete", { username }),
		cancel: () => request("cancel", {})
	};
}

export function createFirebaseIdentityClient(fetchImpl = globalThis.fetch) {
	async function request(path, data) {
		let response;
		try {
			response = await fetchImpl("/api/v1/auth/firebase/" + path, {
				method: data === undefined ? "GET" : "POST",
				credentials: "same-origin",
				headers: { Accept: "application/json", ...data === undefined ? {} : { "Content-Type": "application/json" } },
				...data === undefined ? {} : { body: JSON.stringify(data) }
			});
		} catch {
			throw new ApiError("Não foi possível conectar à API. Seu rascunho foi mantido; tente novamente.");
		}
		if (response.status === 204) return;
		let result;
		try { result = await response.json(); } catch { throw new ApiError("Resposta de autenticação indisponível. Tente novamente."); }
		if (!response.ok) throw new ApiError(typeof result?.error?.message === "string" ? result.error.message : "Não foi possível entrar com Firebase. Tente novamente.", response.status);
		if (path === "verify" && result?.data?.needsUsername === true) return { needsUsername: true };
		if (["verify", "complete"].includes(path)) return { user: adaptUser(result?.data?.user) };
		return result.data;
	}
	return {
		config: () => request("config"),
		verify: (idToken) => request("verify", { idToken }),
		complete: (username) => request("complete", { username }),
		cancel: () => request("cancel", {})
	};
}
let scriptLoading;
export function loadGoogleIdentity() {
	if (globalThis.google?.accounts?.id) return Promise.resolve(globalThis.google.accounts.id);
	return scriptLoading ??= new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = "https://accounts.google.com/gsi/client";
		script.async = true;
		script.defer = true;
		script.onload = () => {
			clearTimeout(timer);
			if (globalThis.google?.accounts?.id) resolve(globalThis.google.accounts.id);
			else failed();
		};
		const failed = () => {
			clearTimeout(timer);
			script.remove();
			scriptLoading = null;
			reject(new ApiError("Não foi possível carregar o Google. Use usuário e senha ou tente novamente."));
		};
		const timer = setTimeout(failed, 1e4);
		script.onerror = failed;
		document.head.append(script);
	});
}

// ── Duplicatas e relações ──
export function createLinksClient(fetchImpl = globalThis.fetch) {
	async function request(path, { method = "GET", input, signal } = {}) {
		let response, value;
		try {
			response = await fetchImpl("/api/v1/occurrences/" + path, {
				method,
				signal,
				credentials: "same-origin",
				headers: {
					Accept: "application/json",
					...input ? { "Content-Type": "application/json" } : {}
				},
				...input ? { body: JSON.stringify(input) } : {}
			});
		} catch (error) {
			if (error.name === "AbortError") throw error;
			throw new ApiError("Falha de conexão. Consulte os vínculos antes de repetir o envio.");
		}
		try {
			value = await response.json();
		} catch {
			throw new ApiError("Resposta inválida. Consulte antes de repetir.");
		}
		if (!response.ok) {
			const error = new ApiError(value?.error?.message ?? "Não foi possível concluir a operação.", response.status);
			error.fields = value?.error?.fields ?? {};
			throw error;
		}
		return value;
	}
	return {
		async list(id, kind, { privateRead = false, signal } = {}) {
			const rows = [];
			let page = 1, total, version;
			do {
				const value = await request(`${encodeURIComponent(id)}/${kind}?page=${page}&pageSize=100${privateRead ? "&includeHidden=true" : ""}`, { signal });
				if (!Array.isArray(value.data) || value.page !== page || !Number.isSafeInteger(value.total) || value.total < 0 || !Number.isSafeInteger(value.occurrenceVersion) || value.occurrenceVersion < 1 || total !== undefined && total !== value.total || version !== undefined && version !== value.occurrenceVersion) throw new ApiError("Os vínculos mudaram durante a consulta. Recarregue.");
				total = value.total;
				version = value.occurrenceVersion;
				for (const row of value.data) {
					if (typeof row.id !== "string" || typeof row.title !== "string" || typeof row.description !== "string" || !Number.isSafeInteger(row.version) || row.version < 1) throw new ApiError("Vínculo inválido na resposta.");
					rows.push(row);
				}
				if (rows.length > total || new Set(rows.map((row) => row.id)).size !== rows.length || rows.length < total && value.data.length !== 100) throw new ApiError("Consulta incompleta ou repetida. Recarregue.");
				page++;
			} while (rows.length < total);
			return {
				data: rows,
				occurrenceVersion: version
			};
		},
		async change(id, operation, input) {
			const routes = {
				duplicate_linked: ["PUT", "duplicate"],
				duplicate_removed: ["DELETE", "duplicate"],
				relation_added: ["POST", "relations"],
				relation_removed: ["DELETE", "relations/" + encodeURIComponent(input.relatedId)]
			}, [method, path] = routes[operation], { relatedId, ...rest } = input;
			const payload = operation === "relation_added" ? input : rest;
			const value = await request(encodeURIComponent(id) + "/" + path, {
				method,
				input: payload
			});
			if (!value?.data || !value.versions || Object.keys(input.expectedVersions).some((key) => value.versions[key] !== input.expectedVersions[key] + 1)) throw new ApiError("Resposta incompatível. Consulte os vínculos antes de repetir.");
			return value;
		}
	};
}

import { validateEnvironmentalRepresentation } from "./ambiental.js";

// ── Conversão das respostas da API ──
const invalid = () => {
	throw new ApiError("Os dados da API não correspondem ao contrato de consulta. Tente novamente.");
};
const isDate = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
export function adaptOccurrence(row) {
	if (!row || typeof row.id !== "string" || typeof row.title !== "string" || typeof row.description !== "string" || !Object.hasOwn(categoryLabels, row.category) || !Object.hasOwn(statusLabels, row.status) || !Number.isFinite(row.latitude) || !Number.isFinite(row.longitude) || !isDate(row.createdAt) || !isDate(row.updatedAt) || row.locationLabel !== null && typeof row.locationLabel !== "string" || row.simulated !== true || !Number.isInteger(row.version) || row.version < 1 || row.duplicateOfId !== null && typeof row.duplicateOfId !== "string") invalid();
	if (row.environmentalRepresentation !== undefined && !validateEnvironmentalRepresentation(row.environmentalRepresentation)) invalid();
	/** Explicit presentation DTO: no private/extra API fields copied into the UI. */
	return {
		id: row.id,
		authorId: row.authorId,
		title: row.title,
		description: row.description,
		categoryCode: row.category,
		statusCode: row.status,
		category: categoryLabels[row.category],
		status: statusLabels[row.status],
		latitude: row.latitude,
		longitude: row.longitude,
		locationLabel: row.locationLabel,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		version: row.version,
		simulated: row.simulated,
		duplicateOfId: row.duplicateOfId,
		...(row.environmentalRepresentation !== undefined ? { environmentalRepresentation: row.environmentalRepresentation } : {})
	};
}
export function adaptDetail(row) {
	const item = adaptOccurrence(row);
	const flagNames = [
		"referencesUnavailable",
		"referencesChanged",
		"relationsRemoved",
		"duplicateTargetUnavailable"
	];
	if (!row.counts || !["support", "contest"].every((key) => Number.isSafeInteger(row.counts[key]) && row.counts[key] >= 0) || !row.flags || !flagNames.every((key) => typeof row.flags[key] === "boolean")) invalid();
	let closure = null;
	if (row.closure != null) {
		const source = row.closure, resolution = source.resolution;
		if (typeof source.eventId !== "string" || !isDate(source.createdAt) || source.username !== null && typeof source.username !== "string" || source.reason !== null && typeof source.reason !== "string" || !resolution || typeof resolution.available !== "boolean") invalid();
		if (resolution.available) {
			if (typeof resolution.id !== "string" || typeof resolution.username !== "string" || typeof resolution.text !== "string" || !isDate(resolution.createdAt)) invalid();
		} else if ([
			"id",
			"username",
			"text",
			"createdAt"
		].some((key) => resolution[key] !== null)) invalid();
		closure = {
			eventId: source.eventId,
			reason: source.reason,
			username: source.username,
			createdAt: source.createdAt,
			resolution: {
				id: resolution.id,
				available: resolution.available,
				username: resolution.username,
				text: resolution.text,
				createdAt: resolution.createdAt
			}
		};
	}
	return {
		...item,
		closure,
		counts: {
			support: row.counts.support,
			contest: row.counts.contest
		},
		flags: Object.fromEntries(flagNames.map((key) => [key, row.flags[key]]))
	};
}
const actions = {
	duplicate_linked: "Vínculo de duplicata criado",
	duplicate_removed: "Vínculo de duplicata removido",
	relation_added: "Relação criada",
	relation_removed: "Relação removida",
	corrected: "Informações corrigidas administrativamente",
	reopen_rejected: "Pedido de reabertura rejeitado",
	reopen_requested: "Reabertura solicitada",
	reopen_accepted: "Pedido de reabertura aceito",
	reopen_superseded: "Pedido de reabertura substituído",
	stance_created: "Manifestação publicada",
	stance_replaced: "Manifestação substituída",
	stance_withdrawn: "Manifestação retirada",
	commented: "Comentário publicado",
	supplemented: "Complemento publicado",
	contribution_edited: "Contribuição editada",
	attachment_added: "Imagem anexada",
	created: "Registro criado",
	edited: "Registro editado",
	transition: "Estado alterado",
	moderated: "Moderação registrada",
	hidden: "Conteúdo ocultado",
	restored: "Conteúdo restaurado",
	withdrawn: "Conteúdo retirado"
};
export function adaptHistoryEvent(row) {
	if (!row || typeof row.id !== "string" || typeof row.action !== "string" || !isDate(row.createdAt) || row.username !== null && typeof row.username !== "string" || row.reason !== null && typeof row.reason !== "string") invalid();
	const from = row.fromStatus ?? null, to = row.toStatus ?? null;
	if (from !== null && !Object.hasOwn(statusLabels, from) || to !== null && !Object.hasOwn(statusLabels, to)) invalid();
	const action = row.action === "transition" && from && to ? `${statusLabels[from]} → ${statusLabels[to]}` : Object.hasOwn(actions, row.action) ? actions[row.action] : `Ação registrada: ${row.action}`;
	return {
		id: row.id,
		action: row.action,
		fromStatus: from,
		toStatus: to,
		username: row.username,
		reason: row.reason,
		date: row.createdAt,
		text: `${action} · ${row.username ?? "Sistema"}${row.reason ? ` — ${row.reason}` : ""}`
	};
}

// ── Criação e edição de ocorrências ──
export function createOccurrenceWriter(fetchImpl = globalThis.fetch) {
	async function send(method, path, data) {
		let response;
		try {
			response = await fetchImpl("/api/v1/occurrences" + path, {
				method,
				credentials: "same-origin",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json"
				},
				body: JSON.stringify(data)
			});
		} catch {
			throw new ApiError("Não foi possível conectar à API. O resultado do envio é incerto; consulte a lista antes de repetir.");
		}
		let result;
		try {
			result = await response.json();
		} catch {
			throw new ApiError("Resposta inválida da API. Consulte a lista antes de repetir.");
		}
		if (!response.ok) {
			const error = new ApiError(result?.error?.message ?? "Não foi possível salvar o relato.", response.status);
			error.fields = result?.error?.fields ?? {};
			throw error;
		}
		return adaptDetail(result.data);
	}
	return {
		create: (data) => send("POST", "", data),
		edit: (id, expectedVersion, changes) => send("PATCH", "/" + encodeURIComponent(id), {
			expectedVersion,
			changes
		})
	};
}

// ── Consulta de ocorrências ──
export function createOccurrenceClient(fetchImpl) {
	const getJSON = createHttpClient(fetchImpl);
	async function allPages(path, filters, { signal } = {}) {
		const items = [];
		const ids = new Set();
		let total;
		let page = 1;
		do {
			signal?.throwIfAborted();
			const query = new URLSearchParams({
				...filters,
				page: String(page),
				pageSize: "100"
			});
			const result = await getJSON(`${path}?${query}`, { signal });
			if (!result || !Array.isArray(result.data) || !Number.isSafeInteger(result.total) || result.total < 0 || result.page !== page || result.pageSize !== 100 || total !== undefined && result.total !== total) {
				throw new ApiError("A consulta mudou ou retornou uma página inválida. Tente novamente.");
			}
			total = result.total;
			const expected = Math.min(100, Math.max(0, total - (page - 1) * 100));
			if (result.data.length !== expected) throw new ApiError("A consulta retornou uma página incompleta. Tente novamente.");
			for (const item of result.data) {
				if (!item || typeof item.id !== "string" || ids.has(item.id)) throw new ApiError("A consulta retornou registros repetidos ou inválidos. Tente novamente.");
				ids.add(item.id);
				items.push(item);
			}
			page++;
		} while (items.length < total);
		return items;
	}
	return {
		async list({ category = "", status = "", includeDuplicates = false, signal } = {}) {
			const filters = {};
			if (category) filters.category = category;
			if (status) filters.status = status;
			if (includeDuplicates) filters.includeDuplicates = "true";
			return (await allPages("/api/v1/occurrences", filters, { signal })).map(adaptOccurrence);
		},
		async detail(id, { signal } = {}) {
			const result = await getJSON(`/api/v1/occurrences/${encodeURIComponent(id)}`, { signal });
			const item = adaptDetail(result?.data);
			if (item.id !== id) throw new ApiError("A API retornou outro identificador. Tente novamente.");
			return item;
		},
		async history(id, { signal } = {}) {
			return (await allPages(`/api/v1/occurrences/${encodeURIComponent(id)}/history`, {}, { signal })).map(adaptHistoryEvent);
		}
	};
}

// ── Preferências, consultas salvas e notificações internas ──
export function createPreferenceClient(fetchImpl = globalThis.fetch) {
	async function request(path, { method = "GET", input, signal } = {}) {
		let response, value;
		try {
			response = await fetchImpl("/api/v1/account" + path, {
				method,
				credentials: "same-origin",
				headers: { Accept: "application/json", ...method === "GET" ? {} : { "Content-Type": "application/json" } },
				...method === "GET" ? {} : { body: JSON.stringify(input ?? {}) },
				signal
			});
		} catch (error) {
			if (signal?.aborted || error.name === "AbortError") throw error;
			throw new ApiError("Não foi possível conectar às preferências. Consulte a conta antes de repetir.");
		}
		if (response.status === 204) return null;
		try { value = await response.json(); } catch { throw new ApiError("A API retornou uma preferência inválida."); }
		if (!response.ok) {
			const error = new ApiError(value?.error?.message ?? "Não foi possível salvar a preferência.", response.status);
			error.fields = value?.error?.fields ?? {};
			throw error;
		}
		if (!value || !Object.hasOwn(value, "data")) throw new ApiError("Resposta de preferências incompatível com o contrato.");
		return value.data;
	}
	return {
		listSubscriptions: ({ signal } = {}) => request("/subscriptions", { signal }),
		createSubscription: (input) => request("/subscriptions", { method: "POST", input }),
		removeSubscription: (id) => request(`/subscriptions/${encodeURIComponent(id)}`, { method: "DELETE" }),
		listQueries: ({ signal } = {}) => request("/saved-queries", { signal }),
		createQuery: (name, query) => request("/saved-queries", { method: "POST", input: { name, query } }),
		removeQuery: (id) => request(`/saved-queries/${encodeURIComponent(id)}`, { method: "DELETE" }),
		notifications: ({ signal } = {}) => request("/notifications", { signal }),
		markRead: (id) => request(`/notifications/${encodeURIComponent(id)}/read`, { method: "POST", input: {} })
	};
}
/** Abort saves work; the generation check also guards late responses that ignored it. */
export function createRequestScope() {
	let generation = 0;
	let controller;
	return {
		begin() {
			controller?.abort();
			controller = new AbortController();
			const request = ++generation, current = controller;
			return {
				signal: current.signal,
				isCurrent: () => request === generation && !current.signal.aborted
			};
		},
		cancel() {
			generation++;
			controller?.abort();
		}
	};
}

// ── Apoios e contestações ──
function adapt(row) {
	const fields = [
		"userId",
		"username",
		"type",
		"reason"
	];
	if (!row || typeof row.id !== "string" || !/^[0-9a-f-]{36}$/.test(row.id) || typeof row.occurrenceId !== "string" || typeof row.available !== "boolean" || typeof row.active !== "boolean" || !Number.isFinite(Date.parse(row.createdAt)) || !Number.isFinite(Date.parse(row.updatedAt))) throw new ApiError("A API retornou uma manifestação inválida.");
	if (row.available) {
		if (typeof row.userId !== "string" || typeof row.username !== "string" || !["support", "contest"].includes(row.type) || typeof row.reason !== "string" || [...row.reason.trim()].length < 20 || [...row.reason.trim()].length > 1e3) throw new ApiError("A API retornou uma justificativa inválida.");
	} else if (fields.some((field) => row[field] !== null)) throw new ApiError("A API retornou conteúdo oculto sem protegê-lo.");
	return {
		id: row.id,
		occurrenceId: row.occurrenceId,
		available: row.available,
		active: row.active,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		...Object.fromEntries(fields.map((field) => [field, row[field]]))
	};
}
export function createStanceClient(fetchImpl = globalThis.fetch) {
	async function request(path, options = {}) {
		let response, result;
		try {
			response = await fetchImpl("/api/v1/" + path, {
				credentials: "same-origin",
				...options
			});
		} catch (error) {
			if (options.signal?.aborted || error.name === "AbortError") throw error;
			throw new ApiError("Não foi possível conectar à API. Consulte sua posição antes de repetir o envio.");
		}
		try {
			result = await response.json();
		} catch {
			throw new ApiError("Resposta inválida da API. Consulte sua posição antes de repetir o envio.");
		}
		if (!response.ok) {
			const error = new ApiError(result?.error?.message ?? "Não foi possível concluir a manifestação.", response.status);
			error.fields = result?.error?.fields ?? {};
			throw error;
		}
		if (!Number.isSafeInteger(result?.occurrenceVersion) || result.occurrenceVersion < 1) throw new ApiError("A API retornou uma versão inválida.");
		return result;
	}
	return {
		async list(id, { signal } = {}) {
			const data = [], ids = new Set(), users = new Set();
			let page = 1, total, version, counts;
			do {
				const result = await request(`occurrences/${encodeURIComponent(id)}/stances?page=${page}&pageSize=100`, { signal });
				if (!Array.isArray(result.data) || !Number.isSafeInteger(result.total) || result.total < 0 || result.page !== page || result.pageSize !== 100 || !result.counts || !["support", "contest"].every((key) => Number.isSafeInteger(result.counts[key]) && result.counts[key] >= 0) || total !== undefined && (total !== result.total || version !== result.occurrenceVersion || counts.support !== result.counts.support || counts.contest !== result.counts.contest)) throw new ApiError("As manifestações mudaram durante a consulta. Tente novamente.");
				total = result.total;
				version = result.occurrenceVersion;
				counts = {
					support: result.counts.support,
					contest: result.counts.contest
				};
				if (result.data.length !== Math.min(100, Math.max(0, total - (page - 1) * 100))) throw new ApiError("A consulta de manifestações está incompleta.");
				for (const row of result.data) {
					const value = adapt(row);
					if (value.occurrenceId !== id || !value.active || ids.has(value.id) || value.available && users.has(value.userId)) throw new ApiError("A API retornou manifestações inconsistentes.");
					ids.add(value.id);
					if (value.available) users.add(value.userId);
					data.push(value);
				}
				page++;
			} while (data.length < total);
			if (["support", "contest"].some((type) => data.filter((row) => row.available && row.type === type).length !== counts[type])) throw new ApiError("As contagens de manifestações estão inconsistentes.");
			return {
				data,
				counts,
				occurrenceVersion: version
			};
		},
		async set(id, input) {
			const result = await request(`occurrences/${encodeURIComponent(id)}/stance`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input)
			}), data = adapt(result.data);
			if (data.occurrenceId !== id || !data.available || !data.active) throw new ApiError("A API não confirmou sua posição nesta ocorrência.");
			return {
				data,
				occurrenceVersion: result.occurrenceVersion
			};
		},
		async withdraw(id, expectedVersion) {
			const result = await request(`occurrences/${encodeURIComponent(id)}/stance`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ expectedVersion })
			}), data = adapt(result.data);
			if (data.occurrenceId !== id || !data.available || data.active) throw new ApiError("A API não confirmou a retirada da sua posição.");
			return {
				data,
				occurrenceVersion: result.occurrenceVersion
			};
		}
	};
}

// ── Mudanças de estado ──
export function createTransitionClient(fetchImpl = globalThis.fetch) {
	return { async transition(id, input) {
		let response, value;
		try {
			response = await fetchImpl(`/api/v1/occurrences/${encodeURIComponent(id)}/transitions`, {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input)
			});
		} catch {
			throw new ApiError("Não foi possível conectar à API. Consulte o estado e histórico antes de repetir.");
		}
		try {
			value = await response.json();
		} catch {
			throw new ApiError("Resposta inválida. Consulte o estado e histórico antes de repetir.");
		}
		if (!response.ok) {
			const error = new ApiError(value?.error?.message ?? "Não foi possível mudar o estado.", response.status);
			error.fields = value?.error?.fields ?? {};
			throw error;
		}
		const data = adaptDetail(value?.data);
		if (data.id !== id || value.occurrenceVersion !== data.version || data.statusCode !== input.to) throw new ApiError("A API não confirmou a mudança desta ocorrência.");
		return {
			data,
			occurrenceVersion: value.occurrenceVersion
		};
	} };
}
