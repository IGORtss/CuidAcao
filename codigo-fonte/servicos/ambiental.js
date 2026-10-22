export const ENVIRONMENTAL_TYPES = Object.freeze({
	water_quality: { label: "Qualidade da água", geometry: ["Point"], color: "#54c7ce" },
	waste: { label: "Resíduos", geometry: ["Polygon", "MultiPolygon"], color: "#d7a64a" },
	erosion: { label: "Erosão", geometry: ["LineString", "MultiLineString"], color: "#e37d5c" },
	apparent_sewage: { label: "Esgoto aparente", geometry: ["Point"], color: "#9b72cf" },
	flooding: { label: "Alagamentos", geometry: ["Polygon", "MultiPolygon"], color: "#4d9ddd" },
	vegetation: { label: "Vegetação", geometry: ["Polygon", "MultiPolygon"], color: "#5ba66b" }
});

const PH_SCALE = Object.freeze([
	{ test: (value) => value < 7, key: "acidic", label: "Abaixo de 7 · ácido", color: "#d98b67" },
	{ test: (value) => value === 7, key: "neutral", label: "7 · neutro", color: "#64b9ae" },
	{ test: (value) => value > 7, key: "basic", label: "Acima de 7 · básico", color: "#718fc7" }
]);

export function classifyPh(value) {
	if (!Number.isFinite(value) || value < 0 || value > 14) return null;
	return PH_SCALE.find((range) => range.test(value)) ?? null;
}

function validPosition(position) {
	return Array.isArray(position)
		&& position.length >= 2
		&& Number.isFinite(position[0])
		&& Number.isFinite(position[1])
		&& position[0] >= -180 && position[0] <= 180
		&& position[1] >= -90 && position[1] <= 90;
}

function validLine(line) {
	return Array.isArray(line) && line.length >= 2 && line.every(validPosition);
}

function validRing(ring) {
	return validLine(ring)
		&& ring.length >= 4
		&& ring[0][0] === ring.at(-1)[0]
		&& ring[0][1] === ring.at(-1)[1];
}

export function isSupportedGeometry(geometry) {
	if (!geometry || typeof geometry !== "object") return false;
	if (geometry.type === "Point") return validPosition(geometry.coordinates);
	if (geometry.type === "LineString") return validLine(geometry.coordinates);
	if (geometry.type === "MultiLineString") return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0 && geometry.coordinates.every(validLine);
	if (geometry.type === "Polygon") return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0 && geometry.coordinates.every(validRing);
	if (geometry.type === "MultiPolygon") return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0
		&& geometry.coordinates.every((polygon) => Array.isArray(polygon) && polygon.length > 0 && polygon.every(validRing));
	return false;
}

export function isSupportedAreaGeometry(geometry) {
	return isSupportedGeometry(geometry) && ["Polygon", "MultiPolygon"].includes(geometry.type);
}

export function validateEnvironmentalRepresentation(value) {
	if (!value || typeof value !== "object" || !Object.hasOwn(ENVIRONMENTAL_TYPES, value.type)) return null;
	const spec = ENVIRONMENTAL_TYPES[value.type];
	if (!isSupportedGeometry(value.geometry) || !spec.geometry.includes(value.geometry.type)) return null;
	if (!["approximate", "verified"].includes(value.accuracy)) return null;
	if (value.type === "water_quality") {
		if (!value.measurement || value.measurement.label !== "pH" || !classifyPh(value.measurement.value)) return null;
		if (value.measurement.unit !== undefined && value.measurement.unit !== "pH") return null;
		if (value.measurement.measuredAt !== undefined && !Number.isFinite(Date.parse(value.measurement.measuredAt))) return null;
		if (value.measurement.source !== undefined && (typeof value.measurement.source !== "string" || !value.measurement.source.trim())) return null;
		if (value.measurement.stationId !== undefined && (typeof value.measurement.stationId !== "string" || !value.measurement.stationId.trim())) return null;
	} else if (value.measurement !== undefined) return null;
	return value;
}

export function isCompleteMeasurement(value) {
	const representation = validateEnvironmentalRepresentation(value);
	return Boolean(representation?.type === "water_quality"
		&& representation.measurement.unit
		&& representation.measurement.measuredAt
		&& representation.measurement.source);
}

export function environmentalPresentation(item) {
	const representation = validateEnvironmentalRepresentation(item.environmentalRepresentation);
	if (!representation) return null;
	const spec = ENVIRONMENTAL_TYPES[representation.type];
	const ph = representation.type === "water_quality" ? classifyPh(representation.measurement.value) : null;
	return {
		...representation,
		label: spec.label,
		color: ph?.color ?? spec.color,
		ph,
		approximate: representation.accuracy === "approximate"
	};
}

export { PH_SCALE };
