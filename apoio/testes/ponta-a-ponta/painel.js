import { expect } from "@playwright/test";

// A HUD recolhível é o único ponto de entrada do mapa interativo.
// Estes auxiliares substituem os cliques na antiga barra de navegação.

// Sob `zoom` CSS o Playwright erra as coordenadas do clique; nesses casos
// o teste valida leiaute, não hit-testing, então ativar por evento é legítimo.
async function activate(locator) {
	await locator.scrollIntoViewIfNeeded().catch(() => {});
	const zoomed = await locator.evaluate((node) => {
		const root = node.ownerDocument.documentElement;
		const zoom = getComputedStyle(root).zoom;
		return zoom !== "1" && zoom !== "";
	}).catch(() => false);
	if (zoomed) {
		await locator.dispatchEvent("click");
		return;
	}
	await locator.click();
}

export async function hudAction(page, action) {
	await expect(page.locator("#hud-trigger")).toBeVisible();
	const root = page.locator("#hud");
	const motion = await root.getAttribute("data-motion-state");
	if (motion?.startsWith("closing")) await activate(page.locator("#hud-trigger"));
	if ((await root.getAttribute("data-motion-state"))?.startsWith("opening")) await expect(root).toHaveAttribute("data-motion-state", "open");
	const state = await root.getAttribute("data-state");
	if (state === "closed") await activate(page.locator("#hud-trigger"));
	else if (state === "panel") await activate(page.locator("#hud-back"));
	await expect(page.locator("#hud-menu")).toBeVisible();
	await expect(root).toHaveAttribute("data-motion-state", "open");
	await activate(page.locator(`[data-hud-action="${action}"]`));
}

export async function openFullList(page) {
	await hudAction(page, "occurrences");
	const button = page.getByRole("button", { name: "Abrir lista completa" });
	await activate(button);
	await expect(page.locator("#list-section")).toBeVisible();
}

export async function openAdvancedFilters(page) {
	await hudAction(page, "layers");
	const button = page.getByRole("button", { name: "Filtros avançados" });
	await activate(button);
	await expect(page.locator("#filters-panel")).toBeVisible();
}

export async function openFullProfile(page) {
	await hudAction(page, "account");
	const button = page.getByRole("button", { name: "Abrir perfil completo" });
	await activate(button);
	await expect(page.locator("#account-panel")).toBeVisible();
}

export async function openHistory(page) {
	await hudAction(page, "data");
	await expect(page.locator("#data-summary")).toBeVisible();
}

export async function hudRegister(page) {
	await hudAction(page, "register");
	await expect(page.locator(".occurrence-dialog")).toBeVisible();
}

export async function openCentralFeed(page) {
	await hudAction(page, "central");
	await expect(page.locator("#central")).toBeVisible();
}
