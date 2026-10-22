import assert from "node:assert/strict";
import test from "node:test";
import { classifyPh, environmentalPresentation, isSupportedGeometry, validateEnvironmentalRepresentation } from "../../../codigo-fonte/servicos/ambiental.js";

const point = { type: "Point", coordinates: [-46.18, -23.94] };
const line = { type: "LineString", coordinates: [[-46.18, -23.94], [-46.179, -23.939]] };
const polygon = { type: "Polygon", coordinates: [[[-46.18, -23.94], [-46.179, -23.94], [-46.179, -23.939], [-46.18, -23.94]]] };

test("classifica pH apenas como propriedade química, sem nível de risco", () => {
	assert.equal(classifyPh(6.9).key, "acidic");
	assert.equal(classifyPh(7).key, "neutral");
	assert.equal(classifyPh(7.1).key, "basic");
	assert.equal(classifyPh(-1), null);
	assert.equal(classifyPh(15), null);
});

test("valida ponto, linha e polígono sem fabricar geometria ausente", () => {
	assert.equal(isSupportedGeometry(point), true);
	assert.equal(isSupportedGeometry(line), true);
	assert.equal(isSupportedGeometry(polygon), true);
	assert.equal(environmentalPresentation({ category: "Resíduos" }), null);
	assert.equal(validateEnvironmentalRepresentation({ type: "erosion", geometry: polygon, accuracy: "verified" }), null);
});

test("associa cada problema somente à geometria permitida e diferencia precisão", () => {
	const cases = [
		["water_quality", point, { label: "pH", value: 7.2 }],
		["waste", polygon],
		["erosion", line],
		["apparent_sewage", point],
		["flooding", polygon],
		["vegetation", polygon]
	];
	for (const [type, geometry, measurement] of cases) {
		const representation = { type, geometry, accuracy: type === "flooding" ? "approximate" : "verified", ...(measurement ? { measurement } : {}) };
		const result = environmentalPresentation({ environmentalRepresentation: representation });
		assert.equal(result.type, type);
		assert.equal(result.approximate, type === "flooding");
	}
});
