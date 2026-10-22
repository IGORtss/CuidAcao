import { test, expect } from '@playwright/test';
import { hudAction } from './painel.js';

async function iniciar(page) {
  await page.goto('/#map');
  await expect(page.locator('#hud-trigger')).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(105);
}
async function estabilizar(page) {
  await expect.poll(() => page.locator('#hud').evaluate(node => node.getAnimations({subtree:true}).filter(animation => animation.playState === 'running').length)).toBe(0);
}

test('a mesma superfície contrai até o perfil, anima conteúdo e preserva a câmera', async ({page}) => {
  await iniciar(page);
  await hudAction(page, 'layers');
  await estabilizar(page);
  const camera = await page.locator('.leaflet-map-pane').getAttribute('style');
  await page.locator('#hud-back').click();
  await estabilizar(page);
  // Medir quadros reais distingue transformação de uma troca instantânea.
  const samples = await page.evaluate(async () => {
    const root = document.getElementById('hud');
    const heights = [];
    document.querySelector('[data-hud-action="account"]').click();
    const started = performance.now();
    while (performance.now() - started < 500) {
      heights.push(root.getBoundingClientRect().height);
      await new Promise(requestAnimationFrame);
    }
    return heights;
  });
  expect(samples[0] - samples.at(-1)).toBeGreaterThan(100);
  expect(samples.some(height => height > samples.at(-1) + 15 && height < samples[0] - 15)).toBe(true);
  await expect(page.locator('#hud-panel-title')).toBeFocused();
  await expect(page.locator('#hud-panel-title')).toHaveText('Conta / perfil');
  await expect(page.locator('.movimento-saida')).toHaveCount(0);
  expect(await page.locator('.leaflet-map-pane').getAttribute('style')).toBe(camera);
});

test('inverter a navegação durante a expansão não deixa camadas ou foco órfãos', async ({page}) => {
  await iniciar(page);
  await page.locator('#hud-trigger').click();
  await page.keyboard.press('Escape');
  await page.locator('#hud-trigger').click();
  await expect(page.locator('#hud')).toHaveAttribute('data-motion-state', 'open');
  await page.evaluate(() => {
    document.querySelector('[data-hud-action="layers"]').click();
    document.getElementById('hud-back').click();
    document.querySelector('[data-hud-action="account"]').click();
  });
  await estabilizar(page);
  await expect(page.locator('#hud-panel-title')).toHaveText('Conta / perfil');
  await expect(page.locator('#hud-menu')).toBeHidden();
  await expect(page.locator('.movimento-saida')).toHaveCount(0);
  expect(await page.evaluate(() => [...document.querySelectorAll('[id]')].map(node => node.id).filter((id,index,ids) => ids.indexOf(id)!==index))).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.locator('#hud-trigger')).toBeFocused();
  await expect(page.locator('#hud')).toHaveAttribute('data-motion-state', 'closed');
});

test('movimento reduzido troca estados sem interpolação e reage à preferência em tempo real', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await iniciar(page);
  await hudAction(page, 'layers');
  await expect(page.locator('#hud-panel-title')).toBeFocused();
  expect(await page.locator('#hud').evaluate(node => node.getAnimations({subtree:true}).length)).toBe(0);
  await page.locator('#hud-back').click();
  await expect(page.locator('[data-hud-action="layers"]')).toBeFocused();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('[data-hud-action="account"]').click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(() => page.locator('#hud').evaluate(node => node.getAnimations({subtree:true}).filter(animation=>animation.playState==='running').length)).toBe(0);
  await expect(page.locator('.movimento-saida')).toHaveCount(0);
  await expect(page.locator('#hud-panel')).toBeVisible();
});

test('painéis permanecem acessíveis em tela curta e a Central volta ao mesmo mapa', async ({page}) => {
  await page.setViewportSize({width:360,height:520});
  await iniciar(page);
  const camera = await page.locator('.leaflet-map-pane').getAttribute('style');
  await hudAction(page, 'layers');
  await estabilizar(page);
  const bounds = await page.locator('#hud').boundingBox();
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(521);
  await page.getByRole('button', {name:'Filtros avançados', exact:true}).click();
  await expect(page.locator('#filters-panel')).toBeVisible();
  await page.getByRole('button', {name:'Voltar ao menu do CuidAção'}).filter({visible:true}).click();
  await hudAction(page, 'central');
  await expect(page.locator('#central')).toBeVisible();
  await page.locator('#central-close').click();
  await expect(page.locator('#central')).toBeHidden();
  expect(await page.locator('.leaflet-map-pane').getAttribute('style')).toBe(camera);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#hud-trigger')).toBeFocused();
});

test('fechar o detalhe vindo da HUD devolve foco à entrada visível do menu', async ({page}) => {
  await iniciar(page);
  await hudAction(page, 'occurrences');
  await page.locator('#hud-list .hud-card').first().click();
  await expect(page.locator('#details')).toBeVisible();
  await page.getByRole('button', {name:'Fechar detalhes', exact:true}).click();
  await expect(page.locator('#details')).toBeHidden();
  await expect(page.locator('#hud-trigger')).toBeFocused();
});
