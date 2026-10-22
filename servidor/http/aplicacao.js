import { accountService } from "../dominio/contas.js";
import { accountMailer } from "../servicos/email-conta.js";
/**
 * API HTTP: schemas, rotas, configuração do Fastify e respostas de erro.
 * Edite este arquivo diretamente. Guia: apoio/documentacao/ESTRUTURA.md.
 *
 * 1. Rotas: Consulta de ocorrências
 * 2. Rotas: Administração e denúncias
 * 3. Rotas: Imagens e anexos
 * 4. Rotas: Cadastro e sessão
 * 5. Rotas: Comentários, complementos e pedidos
 * 6. Rotas: Autenticação Google
 * 7. Rotas: Duplicatas e relações
 * 8. Rotas: Apoios e contestações
 * 9. Rotas: Mudanças de estado
 * 10. Criação da API e tratamento de erros
 */
import { AuthError, OccurrenceError, QueryError, administrationService, attachmentService, authGuards, authLimits, authService, configuredOrigin, contributionService, firebaseIdentityService, googleService, linkService, maxImageBytes, occurrenceQueries, occurrenceWrites, preferenceService, stanceService, transitionService } from "../dominio/indice.js";
import multipart from "@fastify/multipart";
import { basename, dirname, resolve } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { attachmentStorage, openDatabase } from "../dados/banco-de-dados.js";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { createFirebaseTokenVerifier } from "../servicos/administrador-firebase.js";

// ── Rotas: Consulta de ocorrências ──
const categories = ["residuos", "agua"];
const statuses = [
	"received",
	"community_review",
	"confirmed",
	"monitoring",
	"closed",
	"discarded"
];
const objectOccurrences = (properties, required = Object.keys(properties)) => ({
	type: "object",
	properties,
	required,
	additionalProperties: false
});
const textOccurrences = { type: "string" };
const nullableText = { anyOf: [textOccurrences, { type: "null" }] };
const timestamp = {
	type: "string",
	format: "date-time"
};
const positiveOccurrences = {
	type: "integer",
	minimum: 1
};
const count = {
	type: "integer",
	minimum: 0
};
const toggleOccurrences = {
	type: "string",
	enum: ["true", "false"]
};
/** Valide a forma textual antes de converter para Number: sem decimais, espaços, */
/** expoentes, valores repetidos na consulta ou arredondamento silencioso de inteiros grandes. */
const page = {
	type: "string",
	pattern: "^[1-9][0-9]*$",
	maxLength: 13,
	default: "1"
};
const pageSize = {
	type: "string",
	pattern: "^(?:[1-9]|[1-9][0-9]|100)$",
	default: "20"
};
const paginationOccurrences = {
	page,
	pageSize
};
const commonQuery = { includeHidden: toggleOccurrences };
const paramsOccurrences = objectOccurrences({ id: {
	type: "string",
	pattern: "^CA-(?:[0-9]{3}|[0-9]{6,})$",
	maxLength: 100
} });
const occurrenceProperties = {
	id: textOccurrences,
	authorId: textOccurrences,
	title: textOccurrences,
	description: textOccurrences,
	category: {
		type: "string",
		enum: categories
	},
	latitude: { type: "number" },
	longitude: { type: "number" },
	locationLabel: nullableText,
	status: {
		type: "string",
		enum: statuses
	},
	simulated: { type: "boolean" },
	version: positiveOccurrences,
	duplicateOfId: nullableText,
	closureReason: { anyOf: [{ const: "resolved" }, { type: "null" }] },
	discardReason: { anyOf: [{
		type: "string",
		enum: ["invalid", "out_of_scope"]
	}, { type: "null" }] },
	createdAt: timestamp,
	updatedAt: timestamp
};
occurrenceProperties.environmentalRepresentation = { type: "object", additionalProperties: true };
const occurrence = objectOccurrences(occurrenceProperties, Object.keys(occurrenceProperties).filter((key) => key !== "environmentalRepresentation"));
const closure = { anyOf: [{ type: "null" }, objectOccurrences({
	eventId: textOccurrences,
	reason: nullableText,
	username: nullableText,
	createdAt: timestamp,
	resolution: objectOccurrences({
		id: nullableText,
		available: { type: "boolean" },
		username: nullableText,
		text: nullableText,
		createdAt: { anyOf: [timestamp, { type: "null" }] }
	})
})] };
const detailProperties = {
	...occurrence.properties,
	closure,
	counts: objectOccurrences({
		support: count,
		contest: count
	}),
	flags: objectOccurrences({
		referencesUnavailable: { type: "boolean" },
		referencesChanged: { type: "boolean" },
		relationsRemoved: { type: "boolean" },
		duplicateTargetUnavailable: { type: "boolean" }
	})
};
const detail = objectOccurrences(detailProperties, Object.keys(detailProperties).filter((key) => key !== "environmentalRepresentation"));
export const detailSchema = detail;
const adminDetailProperties = {
	...detail.properties,
	visibility: {
		type: "string",
		enum: ["visible", "hidden"]
	}
};
export const adminDetailSchema = objectOccurrences(adminDetailProperties, Object.keys(adminDetailProperties).filter((key) => key !== "environmentalRepresentation"));
const nullableStatus = { anyOf: [{
	type: "string",
	enum: statuses
}, { type: "null" }] };
const event = objectOccurrences({
	id: textOccurrences,
	action: textOccurrences,
	createdAt: timestamp,
	username: nullableText,
	reason: nullableText,
	fromStatus: nullableStatus,
	toStatus: nullableStatus
});
const listOccurrences = (item) => objectOccurrences({
	data: {
		type: "array",
		items: item
	},
	page: positiveOccurrences,
	pageSize: {
		...positiveOccurrences,
		maximum: 100
	},
	total: count
});
export const errorSchema = objectOccurrences({ error: objectOccurrences({
	code: textOccurrences,
	message: textOccurrences,
	fields: {
		type: "object",
		additionalProperties: textOccurrences
	},
	requestId: textOccurrences
}, ["code", "message"]) });
const errorsOccurrences = {
	400: errorSchema,
	403: errorSchema,
	404: errorSchema,
	422: errorSchema,
	500: errorSchema
};
const normalizedOccurrences = (query) => ({
	...query,
	page: Number(query.page),
	pageSize: Number(query.pageSize)
});
export function occurrenceRoutes(app, queries, writes, admin) {
	const adminRead = async (request, reply) => {
		reply.header("cache-control", "no-store");
		if (request.query.includeHidden === "true") await app.requireAdmin(request);
	};
	const auditEvent = objectOccurrences({
		...event.properties,
		entityType: textOccurrences,
		entityId: textOccurrences,
		actorId: nullableText,
		before: {},
		after: {},
		references: {
			type: "array",
			items: {}
		},
		correlationId: nullableText
	});
	const adminOccurrenceProperties = {
		...occurrence.properties,
		visibility: {
			type: "string",
			enum: ["visible", "hidden"]
		}
	};
	const adminOccurrence = objectOccurrences(adminOccurrenceProperties, Object.keys(adminOccurrenceProperties).filter((key) => key !== "environmentalRepresentation"));
	const input = {
		category: {
			type: "string",
			enum: categories
		},
		description: { type: "string" },
		latitude: { type: "number" },
		longitude: { type: "number" },
		title: { type: "string" },
		locationLabel: { type: "string" },
		environmentalRepresentation: { type: "object", additionalProperties: true }
	};
	const entry = async (request, reply) => {
		reply.header("cache-control", "no-store");
		await app.requireOrigin(request);
		await app.requireSession(request);
		if (!/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"] ?? "")) throw new AuthError(415, "UNSUPPORTED_MEDIA_TYPE", "Envie os dados em formato JSON.");
	};
	const writeResponse = {
		...errorsOccurrences,
		401: errorSchema,
		409: errorSchema,
		413: errorSchema,
		415: errorSchema
	};
	app.post("/api/v1/occurrences", {
		bodyLimit: 24e3,
		onRequest: entry,
		schema: {
			querystring: objectOccurrences({}, []),
			body: objectOccurrences(input, [
				"category",
				"description",
				"latitude",
				"longitude"
			]),
			response: {
				201: objectOccurrences({
					data: detail,
					occurrenceVersion: positiveOccurrences
				}),
				...writeResponse
			}
		}
	}, async (request, reply) => {
		const id = writes.create(request.user, request.body), result = queries.detail(id, {});
		return reply.code(201).send({
			...result,
			occurrenceVersion: result.data.version
		});
	});
	app.patch("/api/v1/occurrences/:id", {
		bodyLimit: 24e3,
		onRequest: entry,
		schema: {
			params: paramsOccurrences,
			querystring: objectOccurrences({}, []),
			body: objectOccurrences({
				expectedVersion: {
					...positiveOccurrences,
					maximum: Number.MAX_SAFE_INTEGER
				},
				changes: {
					...objectOccurrences(input, []),
					minProperties: 1
				}
			}),
			response: {
				200: objectOccurrences({
					data: detail,
					occurrenceVersion: positiveOccurrences
				}),
				...writeResponse
			}
		}
	}, async (request) => {
		const id = writes.edit(request.user, request.params.id, request.body), result = queries.detail(id, {});
		return {
			...result,
			occurrenceVersion: result.data.version
		};
	});
	app.get("/api/v1/occurrences", {
		preValidation: adminRead,
		schema: {
			querystring: objectOccurrences({
				...commonQuery,
				...paginationOccurrences,
				category: {
					type: "string",
					enum: categories
				},
				status: {
					type: "string",
					enum: statuses
				},
				includeDuplicates: toggleOccurrences,
				visibility: {
					type: "string",
					enum: ["visible", "hidden"]
				}
			}, []),
			response: {
				200: listOccurrences({ anyOf: [occurrence, adminOccurrence] }),
				...errorsOccurrences
			}
		}
	}, async (request) => {
		if (request.query.visibility && request.query.includeHidden !== "true") throw new AuthError(403, "FORBIDDEN", "Filtro de visibilidade exclusivo da consulta administrativa.");
		return request.query.includeHidden === "true" ? admin.list(request.user, normalizedOccurrences(request.query)) : queries.list(normalizedOccurrences(request.query));
	});
	app.get("/api/v1/occurrences/:id", {
		preValidation: adminRead,
		schema: {
			params: paramsOccurrences,
			querystring: objectOccurrences(commonQuery, []),
			response: {
				200: objectOccurrences({ data: { anyOf: [detail, adminDetailSchema] } }),
				401: errorSchema,
				...errorsOccurrences
			}
		}
	}, async (request) => request.query.includeHidden === "true" ? admin.detail(request.user, request.params.id) : queries.detail(request.params.id, request.query));
	app.get("/api/v1/occurrences/:id/history", {
		preValidation: adminRead,
		schema: {
			params: paramsOccurrences,
			querystring: objectOccurrences({
				...commonQuery,
				...paginationOccurrences
			}, []),
			response: {
				200: listOccurrences({ anyOf: [event, auditEvent] }),
				401: errorSchema,
				...errorsOccurrences
			}
		}
	}, async (request) => request.query.includeHidden === "true" ? admin.history(request.user, request.params.id, normalizedOccurrences(request.query)) : queries.history(request.params.id, normalizedOccurrences(request.query)));
}

// ── Rotas: Administração e denúncias ──
const objectAdministration = (properties, required = Object.keys(properties)) => ({
	type: "object",
	properties,
	required,
	additionalProperties: false
});
const textAdministration = { type: "string" };
const nullableAdministration = (value) => ({ anyOf: [value, { type: "null" }] });
const positiveAdministration = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const dateAdministration = {
	type: "string",
	format: "date-time"
};
const uuid = {
	type: "string",
	format: "uuid"
};
const pagination = {
	page: {
		type: "string",
		pattern: "^[1-9][0-9]*$",
		maxLength: 13,
		default: "1"
	},
	pageSize: {
		type: "string",
		pattern: "^(?:[1-9]|[1-9][0-9]|100)$",
		default: "20"
	}
};
const paramsAdministration = objectAdministration({ id: uuid });
const target = {
	targetType: {
		type: "string",
		enum: [
			"occurrence",
			"contribution",
			"attachment",
			"stance"
		]
	},
	targetId: {
		type: "string",
		maxLength: 100
	}
};
const common = {
	expectedVersion: positiveAdministration,
	reason: textAdministration
};
const report = objectAdministration({
	id: textAdministration,
	occurrenceId: textAdministration,
	reporterId: textAdministration,
	targetType: textAdministration,
	targetId: textAdministration,
	reason: textAdministration,
	status: {
		type: "string",
		enum: [
			"pending",
			"dismissed",
			"upheld"
		]
	},
	reviewerId: nullableAdministration(textAdministration),
	decisionReason: nullableAdministration(textAdministration),
	decidedAt: nullableAdministration(dateAdministration),
	createdAt: dateAdministration,
	updatedAt: dateAdministration,
	occurrenceVersion: positiveAdministration
}, [
	"id",
	"occurrenceId",
	"reporterId",
	"targetType",
	"targetId",
	"reason",
	"status",
	"reviewerId",
	"decisionReason",
	"decidedAt",
	"createdAt",
	"updatedAt"
]);
const errorsAdministration = Object.fromEntries([
	400,
	401,
	403,
	404,
	409,
	413,
	415,
	422,
	500
].map((code) => [code, errorSchema]));
const write = (item) => ({
	200: objectAdministration({
		data: item,
		occurrenceVersion: positiveAdministration
	}),
	...errorsAdministration
});
const list = (item) => objectAdministration({
	data: {
		type: "array",
		items: item
	},
	page: positiveAdministration,
	pageSize: positiveAdministration,
	total: {
		type: "integer",
		minimum: 0
	}
});
const normalized = (q) => ({
	...q,
	page: Number(q.page),
	pageSize: Number(q.pageSize)
});
export function administrationRoutes(app, service) {
	const entry = (admin = false, writing = true) => async (request, reply) => {
		reply.header("cache-control", "no-store");
		if (writing) await app.requireOrigin(request);
		await (admin ? app.requireAdmin : app.requireSession)(request);
		if (writing && !/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"] ?? "")) throw new OccurrenceError(415, "UNSUPPORTED_MEDIA_TYPE", "Envie JSON.");
	};
	app.post("/api/v1/reports", {
		onRequest: entry(),
		bodyLimit: 8192,
		schema: {
			querystring: objectAdministration({}, []),
			body: objectAdministration({
				...common,
				...target
			}),
			response: {
				201: objectAdministration({
					data: report,
					occurrenceVersion: positiveAdministration
				}),
				...errorsAdministration
			}
		}
	}, async (request, reply) => reply.code(201).send(service.report(request.user, request.body)));
	app.get("/api/v1/reports", {
		onRequest: entry(false, false),
		schema: {
			querystring: objectAdministration({
				...pagination,
				status: {
					type: "string",
					enum: [
						"pending",
						"dismissed",
						"upheld"
					]
				}
			}, []),
			response: {
				200: list(report),
				...errorsAdministration
			}
		}
	}, async (request) => service.reports(request.user, normalized(request.query)));
	app.post("/api/v1/reports/:id/decision", {
		onRequest: entry(true),
		bodyLimit: 8192,
		schema: {
			params: paramsAdministration,
			querystring: objectAdministration({}, []),
			body: objectAdministration({
				...common,
				decision: {
					type: "string",
					enum: ["upheld", "dismissed"]
				}
			}),
			response: write(report)
		}
	}, async (request) => service.decide(request.user, request.params.id, request.body));
	app.post("/api/v1/moderation", {
		onRequest: entry(true),
		bodyLimit: 8192,
		schema: {
			querystring: objectAdministration({}, []),
			body: objectAdministration({
				...common,
				...target,
				action: {
					type: "string",
					enum: ["hide", "restore"]
				}
			}),
			response: write(objectAdministration({
				id: textAdministration,
				occurrenceId: textAdministration,
				visibility: {
					type: "string",
					enum: ["visible", "hidden"]
				}
			}))
		}
	}, async (request) => service.moderate(request.user, request.body));
	app.post("/api/v1/occurrences/:id/corrections", {
		onRequest: entry(true),
		bodyLimit: 32e3,
		schema: {
			params: objectAdministration({ id: {
				type: "string",
				pattern: "^CA-(?:[0-9]{3}|[0-9]{6,})$",
				maxLength: 100
			} }),
			querystring: objectAdministration({}, []),
			body: objectAdministration({
				...common,
				changes: {
					...objectAdministration({
						category: {
							type: "string",
							enum: ["residuos", "agua"]
						},
						description: textAdministration,
						latitude: { type: "number" },
						longitude: { type: "number" },
						title: textAdministration,
						locationLabel: textAdministration
					}, []),
					minProperties: 1
				}
			}),
			response: write(adminDetailSchema)
		}
	}, async (request) => service.correct(request.user, request.params.id, request.body));
	app.post("/api/v1/contributions/:id/reopen-decision", {
		onRequest: entry(true),
		bodyLimit: 8192,
		schema: {
			params: paramsAdministration,
			querystring: objectAdministration({}, []),
			body: objectAdministration({
				...common,
				decision: { const: "rejected" }
			}),
			response: write(objectAdministration({
				id: textAdministration,
				occurrenceId: textAdministration,
				requestStatus: { const: "rejected" }
			}))
		}
	}, async (request) => service.reject(request.user, request.params.id, request.body));
	app.get("/api/v1/admin/reopen-requests", {
		onRequest: entry(true, false),
		schema: {
			querystring: objectAdministration(pagination, []),
			response: {
				200: list(objectAdministration({
					id: textAdministration,
					occurrenceId: textAdministration,
					authorId: textAdministration,
					username: textAdministration,
					text: textAdministration,
					visibility: textAdministration,
					requestStatus: textAdministration,
					createdAt: dateAdministration,
					updatedAt: dateAdministration,
					occurrenceVersion: positiveAdministration,
					occurrenceVisibility: textAdministration,
					occurrenceStatus: textAdministration,
					duplicateOfId: nullableAdministration(textAdministration)
				})),
				...errorsAdministration
			}
		}
	}, async (request) => service.reopenRequests(request.user, normalized(request.query)));
}

// ── Rotas: Imagens e anexos ──
const objectAttachments = (properties, required = Object.keys(properties)) => ({
	type: "object",
	properties,
	required,
	additionalProperties: false
});
const textAttachments = { type: "string" };
const positiveAttachments = {
	type: "integer",
	minimum: 1
};
const nullableAttachments = (value) => ({ anyOf: [value, { type: "null" }] });
const paramsAttachments = objectAttachments({ id: {
	type: "string",
	pattern: "^CA-(?:[0-9]{3}|[0-9]{6,})$",
	maxLength: 100
} });
const attachmentParams = objectAttachments({ id: {
	type: "string",
	format: "uuid"
} });
export const attachmentSchema = objectAttachments({
	id: textAttachments,
	occurrenceId: textAttachments,
	createdAt: {
		type: "string",
		format: "date-time"
	},
	available: { type: "boolean" },
	caption: nullableAttachments(textAttachments),
	mediaType: nullableAttachments(textAttachments),
	byteSize: nullableAttachments(positiveAttachments),
	width: nullableAttachments(positiveAttachments),
	height: nullableAttachments(positiveAttachments),
	fileUrl: nullableAttachments(textAttachments),
	visibility: {
		type: "string",
		enum: ["visible", "hidden"]
	},
	withdrawnAt: nullableAttachments(textAttachments),
	contributionId: nullableAttachments(textAttachments),
	uploaderId: textAttachments
}, [
	"id",
	"occurrenceId",
	"createdAt",
	"available",
	"caption",
	"mediaType",
	"byteSize",
	"width",
	"height",
	"fileUrl"
]);
const errorsAttachments = {
	400: errorSchema,
	401: errorSchema,
	403: errorSchema,
	404: errorSchema,
	409: errorSchema,
	413: errorSchema,
	415: errorSchema,
	422: errorSchema,
	500: errorSchema
};
const itemAttachments = attachmentSchema;
const writtenAttachments = objectAttachments({
	data: itemAttachments,
	occurrenceVersion: positiveAttachments
});
const toggle = {
	type: "string",
	enum: ["true", "false"]
};
const limits = {
	files: 1,
	fileSize: maxImageBytes,
	fields: 3,
	fieldSize: 1024,
	fieldNameSize: 50,
	parts: 4,
	headerPairs: 100
};
export function attachmentRoutes(app, service, admin) {
	const adminRead = async (request, reply) => {
		reply.header("cache-control", "no-store");
		if (request.query.includeHidden === "true") await app.requireAdmin(request);
	};
	const entry = (type) => async (request, reply) => {
		reply.header("cache-control", "no-store");
		await app.requireOrigin(request);
		await app.requireSession(request);
		if (!request.headers["content-type"]?.toLowerCase().startsWith(type)) throw new OccurrenceError(415, "UNSUPPORTED_MEDIA_TYPE", type === "application/json" ? "Envie JSON." : "Envie a imagem como multipart/form-data.");
	};
	app.get("/api/v1/occurrences/:id/attachments", {
		preValidation: adminRead,
		schema: {
			params: paramsAttachments,
			querystring: objectAttachments({
				includeHidden: toggle,
				page: {
					type: "string",
					pattern: "^[1-9][0-9]*$",
					maxLength: 13,
					default: "1"
				},
				pageSize: {
					type: "string",
					pattern: "^(?:[1-9]|[1-9][0-9]|100)$",
					default: "20"
				}
			}, []),
			response: {
				200: objectAttachments({
					data: {
						type: "array",
						items: itemAttachments
					},
					page: positiveAttachments,
					pageSize: positiveAttachments,
					total: {
						type: "integer",
						minimum: 0
					},
					occurrenceVersion: positiveAttachments
				}),
				...errorsAttachments
			}
		}
	}, async (request) => request.query.includeHidden === "true" ? admin.attachments(request.user, request.params.id, {
		...request.query,
		page: Number(request.query.page),
		pageSize: Number(request.query.pageSize)
	}) : service.list(request.params.id, {
		...request.query,
		page: Number(request.query.page),
		pageSize: Number(request.query.pageSize)
	}));
	app.get("/api/v1/attachments/:id/file", {
		preValidation: adminRead,
		schema: {
			params: attachmentParams,
			querystring: objectAttachments({ includeHidden: toggle }, []),
			response: errorsAttachments
		}
	}, async (request, reply) => {
		/** Em cada requisição, leia o arquivo somente após validar o pai e o anexo. */
		const result = service.file(request.params.id, request.query, request.user);
		return reply.header("cache-control", "no-store").header("x-content-type-options", "nosniff").header("content-disposition", "inline").type(result.mediaType).send(result.buffer);
	});
	app.post("/api/v1/occurrences/:id/attachments", {
		onRequest: entry("multipart/form-data"),
		schema: {
			params: paramsAttachments,
			querystring: objectAttachments({}, []),
			response: {
				201: writtenAttachments,
				...errorsAttachments
			}
		}
	}, async (request, reply) => {
		const fields = Object.create(null);
		let buffer;
		try {
			for await (const part of request.parts({ limits })) {
				if (part.type === "file") {
					if (part.fieldname !== "file" || buffer) throw new OccurrenceError(422, "VALIDATION_ERROR", "Envie somente uma imagem no campo file.");
					buffer = await part.toBuffer();
					if (part.file.truncated) throw new OccurrenceError(413, "IMAGE_TOO_LARGE", "Cada imagem pode ter no máximo 5 MiB.");
				} else {
					if (![
						"caption",
						"expectedVersion",
						"contributionId"
					].includes(part.fieldname) || Object.hasOwn(fields, part.fieldname) || part.valueTruncated) throw new OccurrenceError(422, "VALIDATION_ERROR", "Campo inválido, repetido ou não permitido.");
					fields[part.fieldname] = part.value;
				}
			}
		} catch (error) {
			if (error instanceof OccurrenceError) throw error;
			if (error instanceof app.multipartErrors.RequestFileTooLargeError) throw new OccurrenceError(413, "IMAGE_TOO_LARGE", "Cada imagem pode ter no máximo 5 MiB.");
			if (error instanceof app.multipartErrors.FilesLimitError || error instanceof app.multipartErrors.FieldsLimitError || error instanceof app.multipartErrors.PartsLimitError) throw new OccurrenceError(422, "VALIDATION_ERROR", "Envie uma imagem, legenda e versão, sem campos extras.");
			throw new OccurrenceError(400, "INVALID_MULTIPART", "Formulário de imagem inválido ou incompleto.");
		}
		if (Object.hasOwn(fields, "contributionId") && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fields.contributionId)) throw new OccurrenceError(422, "VALIDATION_ERROR", "Identificador de complemento inválido.");
		if (!/^[1-9][0-9]*$/.test(fields.expectedVersion ?? "")) throw new OccurrenceError(422, "VALIDATION_ERROR", "Informe a versão da ocorrência.", { expectedVersion: "Versão obrigatória." });
		return reply.code(201).send(await service.upload(request.user, request.params.id, {
			buffer,
			caption: fields.caption,
			contributionId: fields.contributionId ?? null,
			expectedVersion: Number(fields.expectedVersion),
			recheckSession: async () => {
				await app.requireSession(request);
				return request.user;
			}
		}));
	});
	app.delete("/api/v1/attachments/:id", {
		bodyLimit: 2048,
		onRequest: entry("application/json"),
		schema: {
			params: attachmentParams,
			querystring: objectAttachments({}, []),
			body: objectAttachments({ expectedVersion: {
				...positiveAttachments,
				maximum: Number.MAX_SAFE_INTEGER
			} }),
			response: {
				200: writtenAttachments,
				...errorsAttachments
			}
		}
	}, async (request) => service.withdraw(request.user, request.params.id, request.body.expectedVersion));
}

// ── Rotas: Cadastro e sessão ──
const objectAuth = (properties, required = Object.keys(properties)) => ({
	type: "object",
	properties,
	required,
	additionalProperties: false
});
const credentials = objectAuth({
	username: {
		type: "string",
		minLength: 3,
		maxLength: 30,
		pattern: "^[A-Za-z0-9_]+$"
	},
	password: {
		type: "string",
		minLength: 8,
		maxLength: 128
	}
});
const registrationCredentials = objectAuth({ ...credentials.properties, email: { type: "string", minLength: 3, maxLength: 254 } }, ["username", "password"]);
const loginCredentials = objectAuth({ ...credentials.properties, username: { type: "string", minLength: 3, maxLength: 254 } });
const user = objectAuth({
	id: { type: "string" },
	username: { type: "string" },
	role: {
		type: "string",
		enum: ["user", "admin"]
	}
});
const response = {
	200: objectAuth({ data: user }),
	400: errorSchema,
	401: errorSchema,
	403: errorSchema,
	409: errorSchema,
	413: errorSchema,
	415: errorSchema,
	422: errorSchema,
	429: errorSchema,
	500: errorSchema
};
export function authRoutes(app, auth, now, limits = authLimits(now)) {
	const guards = authGuards(auth);
	app.decorateRequest("user", null);
	app.decorate("requireSession", guards.requireSession);
	app.decorate("requireAdmin", guards.requireAdmin);
	app.decorate("requireOrigin", guards.requireOrigin);
	app.addHook("onReady", async () => {
		await auth.ready();
	});
	app.addHook("onClose", async () => limits.close());
	const entry = (optional) => async (request, reply) => {
		reply.header("cache-control", "no-store");
		await guards.requireOrigin(request);
		const type = request.headers["content-type"];
		if ((!optional || type || Number(request.headers["content-length"]) > 0 || request.headers["transfer-encoding"]) && !/^application\/json(?:\s*;|$)/i.test(type ?? "")) throw new AuthError(415, "UNSUPPORTED_MEDIA_TYPE", "Envie os dados em formato JSON.");
	};
	const schema = {
		body: credentials,
		querystring: objectAuth({}),
		response
	};
	app.post("/api/v1/auth/register", {
		bodyLimit: 8192,
		onRequest: entry(false),
		preValidation: async (request, reply) => limits.take("register", request.ip, null, reply),
		schema: {
			...schema,
			body: registrationCredentials,
			response: {
				...response,
				201: objectAuth({ data: user })
			}
		}
	}, async (request, reply) => reply.code(201).send({ data: await auth.register(request.body) }));
	app.post("/api/v1/auth/login", {
		bodyLimit: 8192,
		onRequest: entry(false),
		preValidation: async (request, reply) => limits.take("login", request.ip, typeof request.body?.username === "string" ? request.body.username.trim().toLowerCase().slice(0, 254) : "", reply),
		schema: { ...schema, body: loginCredentials }
	}, async (request, reply) => {
		const result = await auth.login(request.body, request.headers.cookie);
		return reply.header("set-cookie", result.cookie).send({ data: result.user });
	});
	app.get("/api/v1/auth/me", {
		schema: {
			querystring: objectAuth({}),
			response
		},
		onRequest: async (_request, reply) => {
			reply.header("cache-control", "no-store");
		},
		preHandler: guards.requireSession
	}, async (request) => ({ data: request.user }));
	app.post("/api/v1/auth/logout", {
		onRequest: entry(true),
		preValidation: async (request) => {
			if (request.body === undefined) request.body = {};
		},
		schema: {
			body: objectAuth({}),
			querystring: objectAuth({}),
			response
		}
	}, async (request, reply) => {
		return reply.header("set-cookie", auth.logout(request.headers.cookie)).code(204).send();
	});
}

// ── Rotas: Comentários, complementos e pedidos ──
const objectContributions = (properties, required = Object.keys(properties)) => ({
	type: "object",
	properties,
	required,
	additionalProperties: false
});
const textContributions = { type: "string" };
const nullableContributions = (value) => ({ anyOf: [value, { type: "null" }] });
const dateContributions = {
	type: "string",
	format: "date-time"
};
const positiveContributions = {
	type: "integer",
	minimum: 1
};
const versionContributions = {
	...positiveContributions,
	maximum: Number.MAX_SAFE_INTEGER
};
const paramsContributions = objectContributions({ id: {
	type: "string",
	pattern: "^CA-(?:[0-9]{3}|[0-9]{6,})$",
	maxLength: 100
} });
const contributionParams = objectContributions({ id: {
	type: "string",
	format: "uuid"
} });
const itemContributions = objectContributions({
	id: textContributions,
	occurrenceId: textContributions,
	authorId: nullableContributions(textContributions),
	username: nullableContributions(textContributions),
	type: nullableContributions({
		type: "string",
		enum: [
			"comment",
			"supplement",
			"reopen_request"
		]
	}),
	kind: nullableContributions({
		type: "string",
		enum: ["observation", "resolution"]
	}),
	text: nullableContributions(textContributions),
	requestStatus: nullableContributions({
		type: "string",
		enum: [
			"pending",
			"accepted",
			"rejected",
			"superseded"
		]
	}),
	available: { type: "boolean" },
	createdAt: dateContributions,
	updatedAt: dateContributions,
	attachments: {
		type: "array",
		items: attachmentSchema
	},
	visibility: {
		type: "string",
		enum: ["visible", "hidden"]
	}
}, [
	"id",
	"occurrenceId",
	"authorId",
	"username",
	"type",
	"kind",
	"text",
	"requestStatus",
	"available",
	"createdAt",
	"updatedAt",
	"attachments"
]);
const errorsContributions = Object.fromEntries([
	400,
	401,
	403,
	404,
	409,
	413,
	415,
	422,
	500
].map((status) => [status, errorSchema]));
const writtenContributions = objectContributions({
	data: itemContributions,
	occurrenceVersion: positiveContributions
});
export function contributionRoutes(app, service, admin) {
	const adminRead = async (request, reply) => {
		reply.header("cache-control", "no-store");
		if (request.query.includeHidden === "true") await app.requireAdmin(request);
	};
	const entry = async (request, reply) => {
		reply.header("cache-control", "no-store");
		await app.requireOrigin(request);
		await app.requireSession(request);
		if (!/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"] ?? "")) throw new OccurrenceError(415, "UNSUPPORTED_MEDIA_TYPE", "Envie os dados em formato JSON.");
	};
	app.get("/api/v1/occurrences/:id/contributions", {
		preValidation: adminRead,
		schema: {
			params: paramsContributions,
			querystring: objectContributions({
				page: {
					type: "string",
					pattern: "^[1-9][0-9]*$",
					maxLength: 13,
					default: "1"
				},
				pageSize: {
					type: "string",
					pattern: "^(?:[1-9]|[1-9][0-9]|100)$",
					default: "20"
				},
				includeHidden: {
					type: "string",
					enum: ["true", "false"]
				}
			}, []),
			response: {
				200: objectContributions({
					data: {
						type: "array",
						items: itemContributions
					},
					page: positiveContributions,
					pageSize: positiveContributions,
					total: {
						type: "integer",
						minimum: 0
					},
					occurrenceVersion: positiveContributions
				}),
				...errorsContributions
			}
		}
	}, async (request) => request.query.includeHidden === "true" ? admin.contributions(request.user, request.params.id, {
		...request.query,
		page: Number(request.query.page),
		pageSize: Number(request.query.pageSize)
	}) : service.list(request.params.id, {
		...request.query,
		page: Number(request.query.page),
		pageSize: Number(request.query.pageSize)
	}));
	app.post("/api/v1/occurrences/:id/contributions", {
		bodyLimit: 24e3,
		onRequest: entry,
		schema: {
			params: paramsContributions,
			querystring: objectContributions({}, []),
			body: objectContributions({
				expectedVersion: versionContributions,
				type: {
					type: "string",
					enum: [
						"comment",
						"supplement",
						"reopen_request"
					]
				},
				kind: {
					type: "string",
					enum: ["observation", "resolution"]
				},
				text: textContributions
			}, [
				"expectedVersion",
				"type",
				"text"
			]),
			response: {
				201: writtenContributions,
				...errorsContributions
			}
		}
	}, async (request, reply) => reply.code(201).send(service.create(request.user, request.params.id, request.body)));
	app.patch("/api/v1/contributions/:id", {
		bodyLimit: 24e3,
		onRequest: entry,
		schema: {
			params: contributionParams,
			querystring: objectContributions({}, []),
			body: objectContributions({
				expectedVersion: versionContributions,
				text: textContributions
			}),
			response: {
				200: writtenContributions,
				...errorsContributions
			}
		}
	}, async (request) => service.edit(request.user, request.params.id, request.body));
}

// ── Rotas: Autenticação Google ──
const objectGoogle = (properties) => ({
	type: "object",
	properties,
	required: Object.keys(properties),
	additionalProperties: false
});
export function googleRoutes(app, service, now, limits = authLimits(now)) {
	app.addHook("onClose", async () => limits.close());
	app.get("/api/v1/auth/google/config", async (_request, reply) => reply.header("cache-control", "no-store").send({ data: service.configuration() }));
	const send = (reply, result) => {
		reply.header("cache-control", "no-store");
		if (result.cookies.length) reply.header("set-cookie", result.cookies);
		return reply.send({ data: result.data });
	};
	for (const [name, body, operation] of [
		[
			"challenge",
			objectGoogle({}),
			(request) => service.challenge(request.headers.cookie)
		],
		[
			"verify",
			objectGoogle({ credential: {
				type: "string",
				minLength: 1,
				maxLength: 8192
			} }),
			(request) => service.verify(request.body.credential, request.headers.cookie)
		],
		[
			"complete",
			objectGoogle({ username: {
				type: "string",
				minLength: 3,
				maxLength: 30,
				pattern: "^[A-Za-z0-9_]+$"
			} }),
			(request) => service.complete(request.body.username, request.headers.cookie)
		],
		[
			"cancel",
			objectGoogle({}),
			(request) => service.cancel(request.headers.cookie)
		]
	]) app.post("/api/v1/auth/google/" + name, {
		bodyLimit: 12288,
		schema: {
			body,
			querystring: objectGoogle({})
		},
		onRequest: async (request, reply) => {
			reply.header("cache-control", "no-store");
			await app.requireOrigin(request);
			if (!/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"] ?? "")) throw new AuthError(415, "UNSUPPORTED_MEDIA_TYPE", "Envie os dados em formato JSON.");
			if (name !== "cancel") limits.take(name === "complete" ? "register" : "login", request.ip, "google_" + name, reply);
		}
	}, async (request, reply) => {
		const result = await operation(request);
		if (name === "cancel") return reply.header("set-cookie", result.cookies).code(204).send();
		return send(reply, result);
	});
}

// ── Rotas: Autenticação Firebase ──
export function firebaseAuthRoutes(app, service, now, limits = authLimits(now)) {
	app.addHook("onClose", async () => limits.close());
	app.get("/api/v1/auth/firebase/config", async (_request, reply) => reply.header("cache-control", "no-store").send({ data: service.configuration() }));
	const send = (reply, result) => {
		reply.header("cache-control", "no-store");
		if (result.cookies.length) reply.header("set-cookie", result.cookies);
		return reply.send({ data: result.data });
	};
	for (const [name, body, operation] of [
		["verify", objectGoogle({ idToken: { type: "string", minLength: 1, maxLength: 8192 } }), (request) => service.verify(request.body.idToken, request.headers.cookie)],
		["complete", objectGoogle({ username: { type: "string", minLength: 3, maxLength: 30, pattern: "^[A-Za-z0-9_]+$" } }), (request) => service.complete(request.body.username, request.headers.cookie)],
		["cancel", objectGoogle({}), (request) => service.cancel(request.headers.cookie)]
	]) app.post("/api/v1/auth/firebase/" + name, {
		bodyLimit: 12288,
		schema: { body, querystring: objectGoogle({}) },
		onRequest: async (request, reply) => {
			reply.header("cache-control", "no-store");
			await app.requireOrigin(request);
			if (!/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"] ?? "")) throw new AuthError(415, "UNSUPPORTED_MEDIA_TYPE", "Envie os dados em formato JSON.");
			if (name !== "cancel") limits.take(name === "complete" ? "register" : "login", request.ip, "firebase_" + name, reply);
		}
	}, async (request, reply) => {
		const result = await operation(request);
		if (name === "cancel") return reply.header("set-cookie", result.cookies).code(204).send();
		return send(reply, result);
	});
}

// ── Rotas: Duplicatas e relações ──
const objectLinks = (properties, required = Object.keys(properties)) => ({
	type: "object",
	properties,
	required,
	additionalProperties: false
});
const textLinks = { type: "string" };
const positiveLinks = {
	type: "integer",
	minimum: 1
};
const id = {
	...textLinks,
	pattern: "^CA-(?:[0-9]{3}|[0-9]{6,})$",
	maxLength: 100
};
const errorsLinks = Object.fromEntries([
	400,
	401,
	403,
	404,
	409,
	413,
	415,
	422,
	500
].map((code) => [code, errorSchema]));
const versions = {
	type: "object",
	minProperties: 2,
	maxProperties: 2,
	propertyNames: id,
	additionalProperties: {
		...positiveLinks,
		maximum: Number.MAX_SAFE_INTEGER
	}
};
const itemLinks = objectLinks({
	id: textLinks,
	title: textLinks,
	description: textLinks,
	status: textLinks,
	version: positiveLinks,
	createdAt: textLinks,
	duplicateOfId: { anyOf: [textLinks, { type: "null" }] },
	visibility: {
		type: "string",
		enum: ["visible", "hidden"]
	}
}, [
	"id",
	"title",
	"description",
	"status",
	"version",
	"createdAt",
	"duplicateOfId"
]);
export function linkRoutes(app, service) {
	const read = async (req, reply) => {
		reply.header("cache-control", "no-store");
		if (req.query.includeHidden === "true") await app.requireAdmin(req);
	};
	const write = async (req, reply) => {
		reply.header("cache-control", "no-store");
		await app.requireOrigin(req);
		await app.requireAdmin(req);
		if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] ?? "")) throw new OccurrenceError(415, "UNSUPPORTED_MEDIA_TYPE", "Envie os dados em formato JSON.");
	};
	for (const kind of ["duplicates", "relations"]) app.get("/api/v1/occurrences/:id/" + kind, {
		preValidation: read,
		schema: {
			params: objectLinks({ id }),
			querystring: objectLinks({
				page: {
					...textLinks,
					pattern: "^[1-9][0-9]*$",
					maxLength: 13,
					default: "1"
				},
				pageSize: {
					...textLinks,
					pattern: "^(?:[1-9]|[1-9][0-9]|100)$",
					default: "20"
				},
				includeHidden: {
					...textLinks,
					enum: ["true", "false"]
				}
			}, []),
			response: {
				200: objectLinks({
					data: {
						type: "array",
						items: itemLinks
					},
					page: positiveLinks,
					pageSize: positiveLinks,
					total: {
						type: "integer",
						minimum: 0
					},
					occurrenceVersion: positiveLinks
				}),
				...errorsLinks
			}
		}
	}, (req) => service.list(req.user, req.params.id, kind, {
		...req.query,
		page: Number(req.query.page),
		pageSize: Number(req.query.pageSize)
	}));
	for (const [method, path, operation, destination] of [
		[
			"put",
			"duplicate",
			"duplicate_linked",
			"principalId"
		],
		[
			"delete",
			"duplicate",
			"duplicate_removed",
			null
		],
		[
			"post",
			"relations",
			"relation_added",
			"relatedId"
		],
		[
			"delete",
			"relations/:relatedId",
			"relation_removed",
			null
		]
	]) {
		app[method]("/api/v1/occurrences/:id/" + path, {
			bodyLimit: 8192,
			onRequest: write,
			schema: {
				params: objectLinks({
					id,
					...path.includes(":relatedId") ? { relatedId: id } : {}
				}),
				querystring: objectLinks({}, []),
				body: objectLinks({
					expectedVersions: versions,
					reason: textLinks,
					...destination ? { [destination]: id } : {}
				}),
				response: {
					200: objectLinks({
						data: {
							type: "object",
							additionalProperties: true
						},
						versions
					}),
					...errorsLinks
				}
			}
		}, (req) => service.change(req.user, req.params.id, operation, {
			...req.body,
			...req.params.relatedId ? { relatedId: req.params.relatedId } : {}
		}));
	}
}

// ── Rotas: Apoios e contestações ──
const objectStances = (properties, required = Object.keys(properties)) => ({
	type: "object",
	properties,
	required,
	additionalProperties: false
});
const textStances = { type: "string" };
const nullable = (value) => ({ anyOf: [value, { type: "null" }] });
const positiveStances = {
	type: "integer",
	minimum: 1
};
const version = {
	...positiveStances,
	maximum: Number.MAX_SAFE_INTEGER
};
const date = {
	type: "string",
	format: "date-time"
};
const params = objectStances({ id: {
	type: "string",
	pattern: "^CA-(?:[0-9]{3}|[0-9]{6,})$",
	maxLength: 100
} });
const positionType = {
	type: "string",
	enum: ["support", "contest"]
};
const item = objectStances({
	id: textStances,
	occurrenceId: textStances,
	userId: nullable(textStances),
	username: nullable(textStances),
	type: nullable(positionType),
	reason: nullable(textStances),
	active: { type: "boolean" },
	available: { type: "boolean" },
	createdAt: date,
	updatedAt: date,
	visibility: {
		type: "string",
		enum: ["visible", "hidden"]
	}
}, [
	"id",
	"occurrenceId",
	"userId",
	"username",
	"type",
	"reason",
	"active",
	"available",
	"createdAt",
	"updatedAt"
]);
const errors = Object.fromEntries([
	400,
	401,
	403,
	404,
	409,
	413,
	415,
	422,
	500
].map((status) => [status, errorSchema]));
const written = objectStances({
	data: item,
	occurrenceVersion: positiveStances
});
export function stanceRoutes(app, service, admin) {
	const adminRead = async (request, reply) => {
		reply.header("cache-control", "no-store");
		if (request.query.includeHidden === "true") await app.requireAdmin(request);
	};
	const entry = async (request, reply) => {
		reply.header("cache-control", "no-store");
		await app.requireOrigin(request);
		await app.requireSession(request);
		if (!/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"] ?? "")) throw new OccurrenceError(415, "UNSUPPORTED_MEDIA_TYPE", "Envie os dados em formato JSON.");
	};
	app.get("/api/v1/occurrences/:id/stances", {
		preValidation: adminRead,
		schema: {
			params,
			querystring: objectStances({
				page: {
					type: "string",
					pattern: "^[1-9][0-9]*$",
					maxLength: 13,
					default: "1"
				},
				pageSize: {
					type: "string",
					pattern: "^(?:[1-9]|[1-9][0-9]|100)$",
					default: "20"
				},
				includeHidden: {
					type: "string",
					enum: ["true", "false"]
				}
			}, []),
			response: {
				200: objectStances({
					data: {
						type: "array",
						items: item
					},
					page: positiveStances,
					pageSize: positiveStances,
					total: {
						type: "integer",
						minimum: 0
					},
					counts: objectStances({
						support: {
							type: "integer",
							minimum: 0
						},
						contest: {
							type: "integer",
							minimum: 0
						}
					}),
					occurrenceVersion: positiveStances
				}),
				...errors
			}
		}
	}, async (request, reply) => {
		reply.header("cache-control", "no-store");
		return request.query.includeHidden === "true" ? admin.stances(request.user, request.params.id, {
			...request.query,
			page: Number(request.query.page),
			pageSize: Number(request.query.pageSize)
		}) : service.list(request.params.id, {
			...request.query,
			page: Number(request.query.page),
			pageSize: Number(request.query.pageSize)
		});
	});
	app.put("/api/v1/occurrences/:id/stance", {
		bodyLimit: 8192,
		onRequest: entry,
		schema: {
			params,
			querystring: objectStances({}, []),
			body: objectStances({
				expectedVersion: version,
				type: positionType,
				reason: textStances
			}),
			response: {
				200: written,
				...errors
			}
		}
	}, async (request) => service.set(request.user, request.params.id, request.body));
	app.delete("/api/v1/occurrences/:id/stance", {
		bodyLimit: 2048,
		onRequest: entry,
		schema: {
			params,
			querystring: objectStances({}, []),
			body: objectStances({ expectedVersion: version }),
			response: {
				200: written,
				...errors
			}
		}
	}, async (request) => service.withdraw(request.user, request.params.id, request.body));
}

// ── Rotas: Mudanças de estado ──
const object = (properties, required = Object.keys(properties)) => ({
	type: "object",
	properties,
	required,
	additionalProperties: false
});
const text = { type: "string" };
const positive = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
export function transitionRoutes(app, service, queries) {
	const entry = async (request, reply) => {
		reply.header("cache-control", "no-store");
		await app.requireOrigin(request);
		await app.requireAdmin(request);
		if (!/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"] ?? "")) throw new OccurrenceError(415, "UNSUPPORTED_MEDIA_TYPE", "Envie os dados em formato JSON.");
	};
	app.post("/api/v1/occurrences/:id/transitions", {
		bodyLimit: 1048576,
		onRequest: entry,
		schema: {
			params: object({ id: {
				type: "string",
				pattern: "^CA-(?:[0-9]{3}|[0-9]{6,})$",
				maxLength: 100
			} }),
			querystring: object({}, []),
			body: object({
				expectedVersion: positive,
				to: {
					type: "string",
					enum: [
						"received",
						"community_review",
						"confirmed",
						"monitoring",
						"closed",
						"discarded"
					]
				},
				reason: text,
				supportRefs: {
					type: "array",
					items: object({
						type: {
							type: "string",
							enum: [
								"stance",
								"contribution",
								"occurrence"
							]
						},
						id: text
					})
				},
				contestAssessments: {
					type: "array",
					items: object({
						stanceId: {
							type: "string",
							format: "uuid"
						},
						assessment: text
					})
				},
				updateId: {
					type: "string",
					format: "uuid"
				},
				reopenRequestId: {
					type: "string",
					format: "uuid"
				},
				closureReason: { const: "resolved" },
				discardReason: {
					type: "string",
					enum: ["invalid", "out_of_scope"]
				}
			}, [
				"expectedVersion",
				"to",
				"reason"
			]),
			response: {
				200: object({
					data: detailSchema,
					occurrenceVersion: positive
				}),
				...Object.fromEntries([
					400,
					401,
					403,
					404,
					409,
					413,
					415,
					422,
					500
				].map((code) => [code, errorSchema]))
			}
		}
	}, async (request) => {
		const result = service.transition(request.user, request.params.id, request.body);
		return {
			...queries.detail(request.params.id, {}),
			...result
		};
	});
}

// ── Rotas: Preferências privadas de exploração ──
export function preferenceRoutes(app, service) {
	const uuid = { type: "string", format: "uuid" };
	const subscription = object({
		id: uuid,
		kind: { type: "string", enum: ["occurrence", "place", "area"] },
		occurrenceId: { anyOf: [text, { type: "null" }] },
		label: text,
		geometry: { anyOf: [{ type: "object", additionalProperties: true }, { type: "null" }] },
		radiusMeters: { anyOf: [{ const: 500 }, { type: "null" }] },
		createdAt: timestamp,
		updatedAt: timestamp
	});
	const savedQuery = object({ id: uuid, name: text, query: { type: "object", additionalProperties: true }, createdAt: timestamp, updatedAt: timestamp });
	const notification = object({
		eventId: uuid,
		subscriptionId: uuid,
		subscriptionKind: { type: "string", enum: ["occurrence", "place", "area"] },
		subscriptionLabel: text,
		occurrenceId: text,
		title: text,
		action: text,
		reason: nullableText,
		createdAt: timestamp,
		read: { type: "boolean" }
	});
	const params = object({ id: uuid });
	const eventParams = object({ eventId: uuid });
	const read = async (request, reply) => {
		reply.header("cache-control", "no-store");
		await app.requireSession(request);
	};
	const write = async (request, reply) => {
		await read(request, reply);
		await app.requireOrigin(request);
		if (!/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"] ?? "")) throw new AuthError(415, "UNSUPPORTED_MEDIA_TYPE", "Envie os dados em formato JSON.");
	};
	const responses = { 401: errorSchema, 403: errorSchema, 404: errorSchema, 409: errorSchema, 415: errorSchema, 422: errorSchema, 500: errorSchema };
	app.get("/api/v1/account/subscriptions", { onRequest: read, schema: { querystring: object({}, []), response: { 200: object({ data: { type: "array", items: subscription } }), ...responses } } }, async (request) => ({ data: service.listSubscriptions(request.user) }));
	app.post("/api/v1/account/subscriptions", {
		bodyLimit: 8192,
		onRequest: write,
		schema: {
			querystring: object({}, []),
			body: object({ kind: { type: "string", enum: ["occurrence", "place", "area"] }, occurrenceId: text, label: text, geometry: { type: "object", additionalProperties: true }, radiusMeters: { type: "integer" } }, ["kind", "label"]),
			response: { 201: object({ data: subscription }), ...responses }
		}
	}, async (request, reply) => reply.code(201).send({ data: service.createSubscription(request.user, request.body) }));
	app.delete("/api/v1/account/subscriptions/:id", { onRequest: write, schema: { params, querystring: object({}, []), body: object({}, []), response: { 204: { type: "null" }, ...responses } } }, async (request, reply) => {
		service.deleteSubscription(request.user, request.params.id);
		return reply.code(204).send();
	});
	app.get("/api/v1/account/saved-queries", { onRequest: read, schema: { querystring: object({}, []), response: { 200: object({ data: { type: "array", items: savedQuery } }), ...responses } } }, async (request) => ({ data: service.listQueries(request.user) }));
	app.post("/api/v1/account/saved-queries", {
		bodyLimit: 8192,
		onRequest: write,
		schema: { querystring: object({}, []), body: object({ name: text, query: { type: "object", additionalProperties: true } }), response: { 201: object({ data: savedQuery }), ...responses } }
	}, async (request, reply) => reply.code(201).send({ data: service.createQuery(request.user, request.body) }));
	app.delete("/api/v1/account/saved-queries/:id", { onRequest: write, schema: { params, querystring: object({}, []), body: object({}, []), response: { 204: { type: "null" }, ...responses } } }, async (request, reply) => {
		service.deleteQuery(request.user, request.params.id);
		return reply.code(204).send();
	});
	app.get("/api/v1/account/notifications", { onRequest: read, schema: { querystring: object({}, []), response: { 200: object({ data: { type: "array", items: notification } }), ...responses } } }, async (request) => ({ data: service.notifications(request.user) }));
	app.post("/api/v1/account/notifications/:eventId/read", { onRequest: write, schema: { params: eventParams, querystring: object({}, []), body: object({}, []), response: { 204: { type: "null" }, ...responses } } }, async (request, reply) => {
		service.markRead(request.user, request.params.eventId);
		return reply.code(204).send();
	});
}

// ── Criação da API e tratamento de erros ──
export function createApp({ db, databasePath, uploadDirectory, logger = false, google = {}, firebase = {}, accountMail = undefined, webOrigin = process.env.CUIDACAO_WEB_ORIGIN ?? "http://localhost:5173", now = Date.now } = {}) {
	configuredOrigin(webOrigin);
	const safeLogger = logger ? {
		...typeof logger === "object" ? logger : {},
		serializers: {
			req: (request) => ({ method: request.method }),
			res: (response) => ({ statusCode: response.statusCode }),
			err: () => ({ message: "Erro interno." })
		},
		redact: {
			paths: [
				"req.body",
				"req.headers.cookie",
				"req.headers.authorization",
				"res.headers[\"set-cookie\"]"
			],
			remove: true
		}
	} : false;
	const app = Fastify({
		logger: safeLogger,
		exposeHeadRoutes: false,
		genReqId: () => randomUUID(),
		requestIdHeader: false,
		routerOptions: { onBadUrl(_path, _request, response) {
			response.writeHead(400, { "content-type": "application/json; charset=utf-8" });
			response.end(JSON.stringify({ error: {
				code: "INVALID_REQUEST",
				message: "Requisição inválida."
			} }));
		} },
		ajv: { customOptions: {
			removeAdditional: false,
			coerceTypes: false
		} }
	});
	const ownedDatabase = !db;
	const database = db ?? openDatabase(databasePath);
	if (ownedDatabase) app.addHook("onClose", async () => database.close());
	app.setErrorHandler((error, request, reply) => {
		if (error.validation) {
			const fields = {};
			for (const failure of error.validation) {
				const field = failure.params.additionalProperty || failure.params.missingProperty || failure.instancePath.split("/").filter(Boolean).at(-1) || error.validationContext;
				Object.defineProperty(fields, field, {
					value: "Valor inválido ou campo não permitido.",
					enumerable: true,
					configurable: true
				});
			}
			return reply.code(422).send({ error: {
				code: "VALIDATION_ERROR",
				message: request.url.startsWith("/api/v1/auth/") ? "Dados de autenticação inválidos." : "Dados ou parâmetros da ocorrência inválidos.",
				fields
			} });
		}
		if (error instanceof QueryError || error instanceof AuthError || error instanceof OccurrenceError) return reply.code(error.statusCode).send({ error: {
			code: error.code,
			message: error.message,
			...error.fields ? { fields: error.fields } : {}
		} });
		if ([
			"FST_ERR_CTP_INVALID_JSON_BODY",
			"FST_ERR_CTP_EMPTY_JSON_BODY",
			"FST_ERR_CTP_INVALID_CONTENT_LENGTH"
		].includes(error.code)) return reply.code(400).send({ error: {
			code: "INVALID_REQUEST",
			message: "JSON inválido."
		} });
		if (error.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE") return reply.code(415).send({ error: {
			code: "UNSUPPORTED_MEDIA_TYPE",
			message: "Tipo de conteúdo não permitido."
		} });
		if (error.code === "FST_ERR_CTP_BODY_TOO_LARGE") return reply.code(413).send({ error: {
			code: "PAYLOAD_TOO_LARGE",
			message: "Corpo da requisição excede o limite."
		} });
		if (error.code === "FST_ERR_BAD_URL") return reply.code(400).send({ error: {
			code: "INVALID_REQUEST",
			message: "Requisição inválida."
		} });
		/** Do not trust DB errors' statusCode or return their message/stack/SQL. */
		request.log.error({ requestId: request.id }, "Falha interna na consulta.");
		return reply.code(500).send({ error: {
			code: "INTERNAL_ERROR",
			message: "Não foi possível concluir a consulta.",
			requestId: request.id
		} });
	});
	app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: {
		code: "NOT_FOUND",
		message: "Recurso indisponível."
	} }));
	const auth = authService(database, {
		webOrigin,
		now
	}), limits = authLimits(now);
	authRoutes(app, auth, now, limits);
	accountRoutes(app, accountService(database, {origin: auth.origin, now, sendMail: accountMail === undefined ? accountMailer() : accountMail}), limits);
	googleRoutes(app, googleService(database, auth, {
		...google,
		now
	}), now, limits);
	const firebaseProjectId = firebase.projectId ?? process.env.CUIDACAO_FIREBASE_PROJECT_ID ?? "";
	const verifyToken = firebase.verifyToken ?? createFirebaseTokenVerifier(firebaseProjectId);
	firebaseAuthRoutes(app, firebaseIdentityService(database, auth, {
		projectId: firebaseProjectId,
		verifyToken,
		now
	}), now, limits);
	preferenceRoutes(app, preferenceService(database, { now }));
	const queries = occurrenceQueries(database), admin = administrationService(database, {
		now,
		queries
	});
	occurrenceRoutes(app, queries, occurrenceWrites(database, { now }), admin);
	administrationRoutes(app, admin);
	linkRoutes(app, linkService(database, { now }));
	contributionRoutes(app, contributionService(database, { now }), admin);
	stanceRoutes(app, stanceService(database, { now }), admin);
	transitionRoutes(app, transitionService(database, { now }), occurrenceQueries(database));
	const temporaryUploads = !uploadDirectory && database.name === ":memory:" ? mkdtempSync(resolve(tmpdir(), "cuidacao-uploads-")) : null;
	const storage = attachmentStorage(uploadDirectory ?? temporaryUploads ?? resolve(dirname(database.name), "uploads", basename(database.name) + ".files"));
	const attachments = attachmentService(database, storage, {
		now,
		admin
	});
	app.addHook("onReady", async () => attachments.initialize());
	if (temporaryUploads) app.addHook("onClose", async () => rmSync(temporaryUploads, {
		recursive: true,
		force: true
	}));
	app.register(multipart, { limits: {
		files: 1,
		fileSize: 5 * 1024 * 1024,
		fields: 3,
		fieldSize: 1024,
		parts: 4
	} });
	app.register(async (scoped) => attachmentRoutes(scoped, attachments, admin));
	return app;
}


function accountRoutes(app, service, limits) {
 const shape = properties => ({type:"object",properties,required:Object.keys(properties),additionalProperties:false});
 const text = {type:"string",maxLength:254};
 app.get("/api/v1/auth/account/config", async (_request,reply)=>reply.header("cache-control","no-store").send({data:service.configuration()}));
 app.get("/api/v1/auth/account", {preHandler:app.requireSession}, async(request,reply)=>reply.header("cache-control","no-store").send({data:service.status(request.user)}));
 for (const [path,body,authenticated,operation] of [
  ["password/request",shape({email:text}),false,request=>service.requestReset(request.body.email)],
  ["password/reset",shape({token:text,password:{type:"string",minLength:8,maxLength:128}}),false,request=>service.reset(request.body.token,request.body.password)],
  ["email/request",shape({}),true,request=>service.requestVerification(request.user)],
  ["email/verify",shape({token:text}),false,request=>service.verify(request.body.token)]
 ]) app.post("/api/v1/auth/"+path,{bodyLimit:8192,
  onRequest:async(request,reply)=>{reply.header("cache-control","no-store");await app.requireOrigin(request);if(!/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"]??""))throw new AuthError(415,"UNSUPPORTED_MEDIA_TYPE","Envie os dados em formato JSON.");},
  preValidation:async(request,reply)=>limits.take(path,request.ip,null,reply),
  ...(authenticated?{preHandler:app.requireSession}:{}), schema:{body,querystring:shape({})}
 },async(request,reply)=>{await operation(request);return reply.code(204).send();});
}
