import { test } from "node:test";
import assert from "node:assert/strict";
import {
	centralPublicationId,
	collectTimelineRows,
	excerpt,
	formatCounts,
	formatValidation,
	sortFeedItems
} from "../../../codigo-fonte/funcionalidades/central/indice.js";

test("feed ordena pela atividade mais recente, com desempate por id", () => {
	const items = [
		{ id: "CA-003", updatedAt: "2026-10-01T12:03:00.000Z" },
		{ id: "CA-001", updatedAt: "2026-10-02T12:00:00.000Z" },
		{ id: "CA-002", updatedAt: "2026-10-02T12:00:00.000Z" }
	];
	const sorted = sortFeedItems(items);
	assert.deepEqual(sorted.map((item) => item.id), ["CA-001", "CA-002", "CA-003"]);
	assert.deepEqual(items.map((item) => item.id), ["CA-003", "CA-001", "CA-002"]);
});

test("trecho do relato é curto e preserva textos curtos", () => {
	assert.equal(excerpt("relato curto"), "relato curto");
	const long = `x${"y".repeat(200)}`;
	const short = excerpt(long);
	assert.ok(short.endsWith("…"));
	assert.ok([...short].length <= 140);
});

test("contagens usam singular e plural em português", () => {
	assert.equal(formatCounts(1, 1), "1 contribuição · 1 evidência");
	assert.equal(formatCounts(0, 2), "0 contribuições · 2 evidências");
	assert.equal(formatCounts(3, 0), "3 contribuições · 0 evidências");
});

test("linha do tempo única reúne comentários, evidências, validação e transições em ordem", () => {
	const rows = collectTimelineRows({
		contributions: [
			{ available: true, type: "comment", username: "moradora", text: "Vi hoje.", createdAt: "2026-10-03T10:00:00.000Z" },
			{ available: true, type: "supplement", kind: "resolution", username: "morador", text: "Retirado.", createdAt: "2026-10-04T10:00:00.000Z" },
			{ available: false, type: "comment", username: null, text: null, createdAt: "2026-10-05T10:00:00.000Z" }
		],
		attachments: [
			{ available: true, caption: "Foto da faixa de areia.", createdAt: "2026-10-02T10:00:00.000Z" },
			{ available: false, caption: null, createdAt: "2026-10-06T10:00:00.000Z" }
		],
		stances: [
			{ available: true, active: true, type: "support", username: "vizinha", reason: "Passei pelo local e confirmei o relato com observação própria do ponto.", createdAt: "2026-10-03T15:00:00.000Z" },
			{ available: true, active: false, type: "contest", username: "retirado", reason: "Posição retirada, sem efeito na validação.", createdAt: "2026-10-03T16:00:00.000Z" }
		],
		events: [
			{ action: "transition", date: "2026-10-01T10:00:00.000Z", text: "Recebida → Verificação comunitária" },
			{ action: "commented", date: "2026-10-03T10:00:00.000Z", text: "Comentário publicado" }
		]
	});
	assert.deepEqual(rows.map((row) => row.label), ["Mudança de estado", "Evidência", "Comentário", "Apoio da comunidade", "Complemento — resolução"]);
	assert.deepEqual(rows.map((row) => row.kind), ["transition", "evidence", "comment", "validation", "comment"]);
	assert.equal(rows[2].username, "moradora");
});

test("validação resume apoios e contestações sem inventar métricas", () => {
	assert.equal(formatValidation(0, 0), "Sem validação da comunidade ainda");
	assert.equal(formatValidation(1, 0), "1 apoio · 0 contestações");
	assert.equal(formatValidation(2, 1), "2 apoios · 1 contestação");
});

test("identificador de publicação só aceita o hash dedicado", () => {
	assert.equal(centralPublicationId("#publicacao=CA-001"), "CA-001");
	assert.equal(centralPublicationId("#central"), null);
	assert.equal(centralPublicationId("#ocorrencia=CA-001"), null);
	assert.equal(centralPublicationId("#publicacao="), null);
});
