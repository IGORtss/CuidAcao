const EARTH_RADIUS_METERS = 6371008.8;
const radians = (value) => value * Math.PI / 180;

export function distanceMeters(first, second) {
	const latitudeDelta = radians(second.latitude - first.latitude);
	const longitudeDelta = radians(second.longitude - first.longitude);
	const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
	return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

export function pointInPolygon(point, coordinates) {
	let inside = false;
	for (let index = 0, previous = coordinates.length - 1; index < coordinates.length; previous = index++) {
		const [x, y] = coordinates[index], [previousX, previousY] = coordinates[previous];
		if ((y > point.latitude) !== (previousY > point.latitude) && point.longitude < (previousX - x) * (point.latitude - y) / (previousY - y) + x) inside = !inside;
	}
	return inside;
}

function orientation(a, b, c) {
	const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
	return Math.abs(value) < 1e-10 ? 0 : value > 0 ? 1 : 2;
}
function intersects(a, b, c, d) {
	return orientation(a, b, c) !== orientation(a, b, d) && orientation(c, d, a) !== orientation(c, d, b);
}
function segments(coordinates) {
	return coordinates.slice(1).map((coordinate, index) => [coordinates[index], coordinate]);
}

export function areaRelationship(item, polygon) {
	const pointContained = pointInPolygon({ latitude: item.latitude, longitude: item.longitude }, polygon);
	const geometry = item.environmentalRepresentation?.geometry;
	if (!geometry || geometry.type === "Point") return { pointContained, geometryIntersects: false };
	const lines = geometry.type === "Polygon" ? geometry.coordinates.flatMap((ring) => segments(ring)) : segments(geometry.coordinates);
	const boundary = segments([...polygon, polygon[0]]);
	const anyVertexInside = lines.some(([coordinate]) => pointInPolygon({ latitude: coordinate[1], longitude: coordinate[0] }, polygon));
	const geometryIntersects = !pointContained && (anyVertexInside || lines.some(([a, b]) => boundary.some(([c, d]) => intersects(a, b, c, d))));
	return { pointContained, geometryIntersects };
}

export function historicalSnapshot(items, histories, date) {
	const limit = Date.parse(date);
	return items.flatMap((item) => {
		if (Date.parse(item.createdAt) > limit) return [];
		const transitions = (histories.get(item.id) ?? []).filter((event) => event.action === "transition" && Date.parse(event.date) <= limit).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
		const latest = transitions.at(-1);
		const statusCode = latest?.toStatus ?? "received";
		return [{ ...item, statusCode, historical: true }];
	});
}

export function collectionMatches(kind, item, history = [], now = Date.now()) {
	if (kind === "coast") return /praia|orla|faixa de areia/iu.test(`${item.title} ${item.description} ${item.locationLabel ?? ""}`);
	if (kind === "recurring-waste") return item.categoryCode === "residuos" && Boolean(item.duplicateOfId || history.some((event) => event.action === "duplicate_linked"));
	if (kind === "awaiting-update") return item.statusCode === "monitoring" && now - Math.max(Date.parse(item.createdAt), ...history.map((event) => Date.parse(event.date))) >= 30 * 864e5;
	if (kind === "recently-resolved") return history.some((event) => event.action === "transition" && event.toStatus === "closed" && now - Date.parse(event.date) <= 30 * 864e5);
	return true;
}

const allowedModes = new Set(["occurrences", "measurements"]);
export function readExplorationURL(url = new URL(location.href)) {
	const number = (name, min, max) => {
		const value = Number(url.searchParams.get(name));
		return Number.isFinite(value) && value >= min && value <= max ? value : null;
	};
	const category = ["residuos", "agua"].includes(url.searchParams.get("category")) ? url.searchParams.get("category") : "";
	const status = ["received", "community_review", "confirmed", "monitoring", "closed", "discarded"].includes(url.searchParams.get("status")) ? url.searchParams.get("status") : "";
	const period = ["7", "30", "90"].includes(url.searchParams.get("period")) ? url.searchParams.get("period") : "";
	const mode = allowedModes.has(url.searchParams.get("mode")) ? url.searchParams.get("mode") : "occurrences";
	const search = (url.searchParams.get("q") ?? "").slice(0, 120);
	const collection = ["coast", "recurring-waste", "awaiting-update", "recently-resolved"].includes(url.searchParams.get("collection")) ? url.searchParams.get("collection") : "";
	const layers = new Set((url.searchParams.get("layers") ?? "occurrences,areas,measurements").split(",").filter((value) => ["occurrences", "areas", "measurements"].includes(value)));
	return {
		category,
		status,
		period,
		mode,
		search,
		collection,
		layers,
		view: {
			latitude: number("lat", -23.955, -23.92),
			longitude: number("lng", -46.2, -46.16),
			zoom: number("z", 15, 19)
		}
	};
}

export function explorationURL(state, view, source = new URL(location.href)) {
	const url = new URL(source);
	for (const name of ["q", "category", "status", "period", "mode", "collection", "layers", "lat", "lng", "z"]) url.searchParams.delete(name);
	if (state.search) url.searchParams.set("q", state.search.slice(0, 120));
	if (state.category) url.searchParams.set("category", state.category);
	if (state.status) url.searchParams.set("status", state.status);
	if (state.period) url.searchParams.set("period", state.period);
	if (state.mode !== "occurrences") url.searchParams.set("mode", state.mode);
	if (state.collection) url.searchParams.set("collection", state.collection);
	url.searchParams.set("layers", [...state.layers].sort().join(","));
	url.searchParams.set("lat", view.latitude.toFixed(5));
	url.searchParams.set("lng", view.longitude.toFixed(5));
	url.searchParams.set("z", view.zoom.toFixed(2));
	return url;
}
