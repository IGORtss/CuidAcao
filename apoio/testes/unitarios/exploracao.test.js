import test from "node:test";
import assert from "node:assert/strict";
import { areaRelationship, collectionMatches, distanceMeters, explorationURL, historicalSnapshot, pointInPolygon, readExplorationURL } from "../../../codigo-fonte/funcionalidades/exploracao/indice.js";

test("distância e relação espacial distinguem ponto contido de geometria que intersecta", () => {
	assert.ok(distanceMeters({ latitude: -23.934, longitude: -46.18 }, { latitude: -23.935, longitude: -46.18 }) > 100);
	const polygon = [[-46.181, -23.935], [-46.179, -23.935], [-46.179, -23.933], [-46.181, -23.933]];
	assert.equal(pointInPolygon({ latitude: -23.934, longitude: -46.18 }, polygon), true);
	assert.deepEqual(areaRelationship({ latitude: -23.934, longitude: -46.18 }, polygon), { pointContained: true, geometryIntersects: false });
	const item = { latitude: -23.94, longitude: -46.19, environmentalRepresentation: { geometry: { type: "LineString", coordinates: [[-46.182, -23.934], [-46.178, -23.934]] } } };
	assert.deepEqual(areaRelationship(item, polygon), { pointContained: false, geometryIntersects: true });
});

test("reconstituição histórica não projeta estado atual e coleções têm critério explícito", () => {
	const item = { id: "CA-1", createdAt: "2026-01-01T00:00:00Z", statusCode: "closed", categoryCode: "residuos", title: "Praia", description: "", locationLabel: "Orla" };
	const histories = new Map([[item.id, [{ action: "transition", fromStatus: "received", toStatus: "monitoring", date: "2026-02-01T00:00:00Z" }, { action: "transition", fromStatus: "monitoring", toStatus: "closed", date: "2026-03-01T00:00:00Z" }]]]);
	assert.equal(historicalSnapshot([item], histories, "2026-02-15T00:00:00Z")[0].statusCode, "monitoring");
	assert.equal(collectionMatches("coast", item), true);
	assert.equal(collectionMatches("recurring-waste", item), false);
});

test("URL compartilhável valida limites e restaura somente estado público", () => {
	const url = explorationURL({ search: "praia", category: "agua", status: "monitoring", period: "30", mode: "measurements", collection: "coast", layers: new Set(["measurements"]) }, { latitude: -23.934, longitude: -46.18, zoom: 16 }, new URL("https://example.test/#map"));
	const state = readExplorationURL(url);
	assert.equal(state.category, "agua");
	assert.equal(state.mode, "measurements");
	assert.equal(state.search, "praia");
	assert.equal(state.collection, "coast");
	assert.deepEqual([...state.layers], ["measurements"]);
	assert.equal(readExplorationURL(new URL("https://example.test/?lat=0&z=99&category=private")).view.latitude, null);
});
