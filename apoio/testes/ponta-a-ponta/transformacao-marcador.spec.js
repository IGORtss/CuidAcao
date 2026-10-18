import { test, expect } from "@playwright/test";

const WASTE_TITLE = "Resíduos junto à faixa de areia";
const WATER_TITLE = "Alteração aparente na água";

async function markerGeometry(marker) {
	return marker.evaluate((node) => {
		const rect = (element) => {
			const box = element.getBoundingClientRect();
			return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
		};
		const host = rect(node);
		return {
			anchor: { x: host.left + 17, y: host.top + 34 },
			tip: rect(node.querySelector(".cpin-tip")),
			head: rect(node.querySelector(".cpin-head"))
		};
	});
}

function expectFixedTip(geometry) {
	expect(Math.abs(geometry.tip.left + geometry.tip.width / 2 - geometry.anchor.x)).toBeLessThan(.8);
	expect(Math.abs(geometry.tip.bottom - geometry.anchor.y)).toBeLessThan(.8);
}

async function moveOutside(page) {
	const point = await page.locator("#map").evaluate((map) => {
		const box = map.getBoundingClientRect();
		for (const y of [84, box.height * .28, box.height * .72]) {
			for (const x of [box.width * .5, 80, box.width - 80]) {
				const target = document.elementFromPoint(box.left + x, box.top + y);
				if (target && map.contains(target) && !target.closest(".occurrence-marker,.leaflet-control,.cpin-card")) return { x: box.left + x, y: box.top + y };
			}
		}
		return { x: box.left + 8, y: box.top + box.height / 2 };
	});
	await page.mouse.click(point.x, point.y);
}

async function hoverPreview(page, marker, title) {
	const head = marker.locator(".cpin-head");
	const preview = marker.locator(".cpin-card--preview");
	await head.hover();
	await expect(preview).toBeVisible();
	await expect(preview).toContainText(title);
	await expect(preview).toContainText(/Recebida|Verificação comunitária|Confirmada|Acompanhamento|Encerrada|Descartada/);
	await expect(preview).toContainText("Atualizado em");
	const card = await preview.boundingBox();
	await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
	await page.waitForTimeout(220);
	await expect(preview).toBeVisible();
	await page.mouse.move(12, 120);
	await expect(preview).toBeHidden({ timeout: 1200 });
}

async function openSelected(page, marker, title, mobile) {
	const head = marker.locator(".cpin-head");
	if (mobile) await head.tap();
	else await head.click();
	const symbolMotion = await marker.locator(".cpin-symbol").evaluate((node) => node.getAnimations().map((animation) => ({
		timing: animation.effect.getTiming(),
		keyframes: animation.effect.getKeyframes()
	})));
	const card = marker.locator(".cpin-card--expanded");
	await expect(card).toBeVisible();
	await expect(card).toContainText(title);
	await expect(card).toContainText("Registro simulado");
	await expect(marker).toHaveClass(/is-selected/);
	await expect.poll(() => head.evaluate((node) => node.getBoundingClientRect().width)).toBeGreaterThan(300);
	await expect.poll(() => head.evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThan(150);
	return { card, symbolMotion };
}

test("pins de resíduos e água desdobram a cabeça em ficha ancorada", async ({ page }, testInfo) => {
	const mobile = testInfo.project.name === "mobile";
	await page.route("https://server.arcgisonline.com/**", (route) => route.abort());
	await page.goto("/#map");
	await expect(page.locator(".occurrence-marker")).toHaveCount(105);

	const waste = page.locator(`.occurrence-marker[title="${WASTE_TITLE}"]`);
	const water = page.locator(`.occurrence-marker[title="${WATER_TITLE}"]`);
	const wasteIdle = await markerGeometry(waste);
	expectFixedTip(wasteIdle);
	expect(Math.abs(wasteIdle.head.width - 40)).toBeLessThan(.8);
	expect(Math.abs(wasteIdle.head.height - 40)).toBeLessThan(.8);
	const idleFloat = await page.locator("#map").evaluate((node) => node.getAnimations().filter((animation) => animation.animationName === "cpin-idle-clock").map((animation) => ({
		timing: animation.effect.getTiming(),
		keyframes: animation.effect.getKeyframes()
	})));
	expect(idleFloat).toHaveLength(1);
	expect(idleFloat[0].timing.duration).toBe(3600);
	expect(idleFloat[0].timing.iterations).toBe(Infinity);

	if (!mobile) await hoverPreview(page, waste, WASTE_TITLE);
	const { card: wasteCard, symbolMotion } = await openSelected(page, waste, WASTE_TITLE, mobile);
	expect(symbolMotion).toHaveLength(1);
	expect(symbolMotion[0].timing.duration).toBe(300);
	expect(symbolMotion[0].keyframes.some((frame) => String(frame.transform).includes("scaleY(0.35)"))).toBe(true);
	const wasteOpen = await markerGeometry(waste);
	expectFixedTip(wasteOpen);
	expect(Math.abs(wasteOpen.anchor.x - wasteIdle.anchor.x)).toBeLessThan(.8);
	expect(Math.abs(wasteOpen.anchor.y - wasteIdle.anchor.y)).toBeLessThan(.8);
	await expect(water.locator(".cpin-head")).toHaveCSS("opacity", "0.45");
	expect(await water.locator(".cpin-head").evaluate((node) => getComputedStyle(node).scale)).toBe("0.8");
	await moveOutside(page);
	await expect(wasteCard).toBeHidden();
	await expect(waste).not.toHaveClass(/is-selected/);
	await expect.poll(() => waste.locator(".cpin-head").evaluate((node) => node.getBoundingClientRect().width)).toBeCloseTo(40, 0);

	const { card: centralCard } = await openSelected(page, waste, WASTE_TITLE, mobile);
	await centralCard.getByText(WASTE_TITLE, { exact: true }).click();
	await expect(page.locator("#central")).toBeVisible();
	await expect(page.locator("#central-pub-title")).toContainText(WASTE_TITLE);
	await page.locator("#central-publication").getByRole("button", { name: /Voltar ao mapa/ }).first().click();
	await expect(page.locator("#central")).toBeHidden();
	await moveOutside(page);
	await expect(centralCard).toBeHidden();

	if (!mobile) await hoverPreview(page, water, WATER_TITLE);
	const waterIdle = await markerGeometry(water);
	expectFixedTip(waterIdle);
	const waterHead = water.locator(".cpin-head");
	if (mobile) await waterHead.tap();
	else await waterHead.click();
	const ringTiming = await water.locator(".cpin-ring").evaluate((node) => node.getAnimations().map((animation) => animation.effect.getTiming()));
	expect(ringTiming).toHaveLength(1);
	expect(ringTiming[0].iterations).toBe(1);
	expect(ringTiming[0].duration).toBe(650);
	const waterCard = water.locator(".cpin-card--expanded");
	await expect(waterCard).toBeVisible();
	await expect(waterCard).toContainText(WATER_TITLE);
	await expect(water).toHaveClass(/is-selected/);
	await expect(waste).not.toHaveClass(/is-selected/);
	const waterOpen = await markerGeometry(water);
	expectFixedTip(waterOpen);
	expect(Math.abs(waterOpen.anchor.x - waterIdle.anchor.x)).toBeLessThan(.8);
	expect(Math.abs(waterOpen.anchor.y - waterIdle.anchor.y)).toBeLessThan(.8);
	await page.waitForTimeout(700);
	expect(await water.locator(".cpin-ring").evaluate((node) => node.getAnimations().length)).toBe(0);
	await waterCard.getByRole("button", { name: "Abrir na Central" }).click();
	await expect(page.locator("#central-pub-title")).toContainText(WATER_TITLE);
	await page.locator("#central-publication").getByRole("button", { name: /Voltar ao mapa/ }).first().click();
	await moveOutside(page);
	await expect(waterCard).toBeHidden();
});

test("toque, teclado, bordas e movimento reduzido preservam conteúdo e âncora", async ({ page }, testInfo) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.route("https://server.arcgisonline.com/**", (route) => route.abort());
	await page.goto("/#map");
	const marker = page.locator(`.occurrence-marker[title="${WATER_TITLE}"]`);
	const before = await markerGeometry(marker);
	if (testInfo.project.name === "mobile") await marker.locator(".cpin-head").tap();
	else {
		await marker.focus();
		await page.keyboard.press("Enter");
	}
	const card = marker.locator(".cpin-card--expanded");
	await expect(card).toBeVisible();
	await expect(card.getByRole("button", { name: "Abrir na Central" })).toBeVisible();
	expect(await marker.locator(".cpin-head").evaluate((node) => node.getAnimations().length)).toBe(0);
	const after = await markerGeometry(marker);
	expectFixedTip(after);
	expect(Math.abs(after.anchor.x - before.anchor.x)).toBeLessThan(.8);
	expect(Math.abs(after.anchor.y - before.anchor.y)).toBeLessThan(.8);
	const mapBox = await page.locator("#map").boundingBox();
	const cardBox = await card.boundingBox();
	expect(cardBox.x).toBeGreaterThanOrEqual(mapBox.x);
	expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(mapBox.x + mapBox.width + .8);
	expect(cardBox.y).toBeGreaterThanOrEqual(mapBox.y);
	expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(mapBox.y + mapBox.height + .8);
	await page.setViewportSize({ width: 360, height: 720 });
	await expect.poll(async () => {
		const box = await card.boundingBox();
		return box.x + box.width;
	}).toBeLessThanOrEqual(360.8);
	await page.keyboard.press("Escape");
	await expect(card).toBeHidden();
	await expect(marker).toHaveAttribute("aria-expanded", "false");
});
