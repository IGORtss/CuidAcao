import { test, expect } from "@playwright/test";
import { hudAction, openCentralFeed } from "./painel.js";

test.beforeEach(async ({ page }) => {
	await page.route("https://server.arcgisonline.com/**", (route) => route.abort());
});

async function enterMap(page) {
	await page.goto("/");
	await page.evaluate(() => scrollBy(0, 12));
	await expect(page.locator(".territory-transition")).toHaveClass(/transition-complete/);
	await expect(page.locator("#hud-trigger")).toBeVisible();
}

test("ícone da HUD abre o feed geral sem selecionar pin", async ({ page }) => {
	await enterMap(page);
	await page.locator("#hud-trigger").click();
	await expect(page.locator("#hud-menu")).toBeVisible();
	await expect(page.locator("#hud-menu").getByRole("button", { name: "Central de ocorrências" })).toBeVisible();
	await page.locator("#hud-trigger").click();
	await expect(page.locator("#hud-menu")).toBeHidden();

	await openCentralFeed(page);
	await expect(page).toHaveURL(/#central$/);
	await expect(page.locator("#central-title")).toBeFocused();
	await expect(page.locator(".central-card")).toHaveCount(105);
	await expect(page.locator("#central-feed-status")).toContainText("105 publicações");
	// Ordenado pela atividade mais recente: o registro adicional mais novo abre a lista.
	await expect(page.locator(".central-card").first()).toContainText("Registro adicional fictício 101");
	const first = page.locator(".central-card").first();
	await expect(first).toContainText("Recebida");
	await expect(first).toContainText("Atualizada em");
	// Uma publicação por ocorrência, sem duplicadas.
	const ids = await page.locator(".central-card").evaluateAll((cards) => cards.map((card) => card.dataset.id));
	expect(new Set(ids).size).toBe(105);
	// Enriquecimento real: contagens de participação, sem curtidas ou métricas inventadas.
	await expect(first).toContainText(/contribuiç/);
	await expect(page.locator("#central")).not.toContainText("curtir");
	await expect(page.locator("#central")).not.toContainText("pH");
});

test("cartão do feed abre a ocorrência correta", async ({ page }) => {
	await enterMap(page);
	await openCentralFeed(page);
	const first = page.locator(".central-card").first();
	const title = await first.locator("strong").textContent();
	await first.click();
	await expect(page).toHaveURL(/#publicacao=/);
	await expect(page.locator("#central-pub-title")).toHaveText(title);
	await expect(page.locator("#central-pub-title")).toBeFocused();
	await expect(page.locator("#central-publication")).toContainText("Publicação da comunidade");
	// Linha do tempo única: comentários, evidências e mudanças de estado juntos, sem abas.
	await expect(page.locator(".central-timeline")).toBeVisible();
	expect(await page.locator(".central-timeline li").count()).toBeGreaterThan(0);
	// Voltar ao feed preserva a lista.
	await page.getByRole("button", { name: "← Voltar ao feed" }).first().click();
	await expect(page).toHaveURL(/#central$/);
	await expect(page.locator(".central-card")).toHaveCount(105);
	await expect(page.locator("#central-title")).toBeFocused();
});

test("pin abre a publicação da ocorrência sem passar pelo feed", async ({ page }, info) => {
	await enterMap(page);
	const marker = page.locator('.occurrence-marker[title="Resíduos junto à faixa de areia"]');
	if (info.project.name === "mobile") await marker.tap();
	else await marker.click();
	const popup = page.locator(".cpin-card--expanded:not([hidden])");
	await expect(popup).toBeVisible();
	await expect(popup.getByRole("button", { name: "Abrir na Central" })).toBeVisible();
	await popup.getByRole("button", { name: "Abrir na Central" }).click();
	await expect(page).toHaveURL(/#publicacao=CA-001/);
	const publication = page.locator("#central-publication");
	await expect(publication).toContainText("Resíduos junto à faixa de areia");
	// A publicação deixa claro que pertence àquela localização e ocorrência.
	await expect(publication).toContainText("CA-001 no local selecionado no mapa");
	await expect(publication.getByRole("button", { name: "Ver no mapa" })).toBeVisible();
	// Voltar ao mapa preserva centro, zoom e seleção: a ficha continua aberta.
	await publication.getByRole("button", { name: "✕ Voltar ao mapa" }).first().click();
	await expect(page.locator("#central")).toBeHidden();
	await expect(page.locator(".cpin-card--expanded:not([hidden])")).toBeVisible();
	await expect(page.locator(".cpin-card--expanded:not([hidden])")).toContainText("Resíduos junto à faixa de areia");
	await expect(marker).toHaveClass(/is-selected/);
	await expect(page.locator("#hud-trigger")).toBeFocused();
});

test("publicação preserva participação: comentar, evidências e validação", async ({ page }) => {
	await enterMap(page);
	await openCentralFeed(page);
	await page.locator('.central-card[data-id="CA-003"]').click();
	const publication = page.locator("#central-publication");
	await expect(publication).toContainText("Descarte de resíduos em área aberta");
	await expect(publication).toContainText("Linha do tempo");
	await expect(publication.locator(".central-timeline")).toContainText("Mudança de estado");
	await expect(publication.locator(".central-timeline")).toContainText("Complemento — observação");
	// Ações existentes continuam oferecidas, sem curtidas ou mecanismos genéricos.
	await expect(publication.getByRole("button", { name: "Comentar" })).toBeVisible();
	await expect(publication.getByRole("button", { name: "Acrescentar complemento" })).toBeVisible();
	await expect(publication.getByRole("button", { name: "Apoiar" })).toBeVisible();
	await expect(publication.getByRole("button", { name: "Contestar" })).toBeVisible();
	await expect(publication).toContainText("Acompanhar atualizações");
	await expect(publication).not.toContainText("curtir");
	// Teclado: Escape volta ao feed a partir da publicação vinda do feed.
	await page.keyboard.press("Escape");
	await expect(page.locator(".central-card")).toHaveCount(105);
});

test("feed e publicação funcionam por teclado", async ({ page }) => {
	await enterMap(page);
	await openCentralFeed(page);
	const first = page.locator(".central-card").first();
	await first.focus();
	await expect(first).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(page).toHaveURL(/#publicacao=/);
	await expect(page.locator("#central-pub-title")).toBeFocused();
	// Escape volta ao feed a partir da publicação vinda do feed.
	await page.keyboard.press("Escape");
	await expect(page.locator("#central-publication")).toBeHidden();
	await expect(page.locator(".central-card")).toHaveCount(105);
	await page.keyboard.press("Escape");
	await expect(page.locator("#central")).toBeHidden();
	await expect(page.locator("#hud-trigger")).toBeFocused();
	await expect(page).toHaveURL(/#map$/);
});

test("link direto abre a publicação sem pin e mostra indisponibilidade", async ({ page }) => {
	await page.goto("/#publicacao=CA-001");
	await expect(page.locator(".territory-transition")).toHaveClass(/transition-complete/);
	await expect(page.locator("#central")).toBeVisible();
	await expect(page.locator("#central-pub-title")).toContainText("Resíduos junto à faixa de areia");
	await page.goto("/#publicacao=inexistente");
	await expect(page.locator("#central-pub-title")).toHaveText("Publicação não encontrada");
});
