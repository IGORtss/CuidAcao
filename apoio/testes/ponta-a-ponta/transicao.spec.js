import { test, expect } from '@playwright/test';
import { hudAction, openFullList, openAdvancedFilters, openFullProfile, openHistory, hudRegister } from './painel.js';
import sharp from 'sharp';

const tile = await sharp({create:{width:256,height:256,channels:3,background:'#40574d'}}).png().toBuffer();
async function scroll(page, progress) {
  await page.evaluate(value => {
    const stage = document.querySelector('.territory-transition');
    scrollTo(0, stage.offsetTop + (stage.offsetHeight - innerHeight) * value);
  }, progress);
  await page.waitForTimeout(80);
}
async function opacity(page, selector) {
  return page.locator(selector).evaluate(node => Number(getComputedStyle(node).opacity));
}
async function zoomToLimit(page, selector) {
  const control = page.locator(selector);
  for (let step = 0; step < 12 && !(await control.evaluate(node => node.classList.contains('leaflet-disabled'))); step++) {
    await control.click();
    await page.waitForTimeout(280);
  }
  await expect(control).toHaveClass(/leaflet-disabled/);
}
async function dragMap(page, horizontal, vertical) {
  const bounds = await page.locator('#map').boundingBox();
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + horizontal * bounds.width * .42, y + vertical * bounds.height * .42, {steps:8});
  await page.mouse.up();
  await page.waitForTimeout(120);
}
async function geographicCenter(page) {
  return page.locator('#map').evaluate(map => {
    const bounds = map.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const tile = [...map.querySelectorAll('.leaflet-tile-loaded')].find(image => {
      const box = image.getBoundingClientRect();
      return box.left <= x && box.right >= x && box.top <= y && box.bottom >= y;
    });
    const match = tile?.src.match(/\/tile\/(\d+)\/(\d+)\/(\d+)/);
    if (!tile || !match) return null;
    const box = tile.getBoundingClientRect();
    const [, zoom, tileY, tileX] = match.map(Number);
    const scale = 256 * 2 ** zoom;
    const worldX = tileX * 256 + x - box.left;
    const worldY = tileY * 256 + y - box.top;
    const longitude = worldX / scale * 360 - 180;
    const mercator = Math.PI - 2 * Math.PI * worldY / scale;
    const latitude = 180 / Math.PI * Math.atan(Math.sinh(mercator));
    return {latitude, longitude};
  });
}
async function settledGeographicCenter(page) {
  let center;
  await expect.poll(async () => {
    center = await geographicCenter(page);
    return center !== null;
  }, {timeout:3000}).toBe(true);
  return center;
}

test('estados de interface sobre o mesmo mapa, câmera fixa e sequência única', async ({page}) => {
  let requests = 0;
  await page.route('https://server.arcgisonline.com/**', route => {requests++;return route.fulfill({contentType:'image/png',body:tile});});
  await page.goto('/');
  await expect(page.locator('.card')).toHaveCount(105);
  await expect(page.locator('.territory-transition')).toHaveClass(/tiles-ready/);
  // Sem ilustração: nenhum elemento de arte sobre o mapa.
  await expect(page.locator('.cartography')).toHaveCount(0);
  await expect(page.locator('.map-veil')).toHaveCount(0);
  // O mapa já é o fundo da abertura, com opacidade integral.
  await expect(page.locator('#map')).toBeVisible();
  expect(await opacity(page,'#map')).toBe(1);
  await expect(page.locator('#hud')).toBeHidden();
  const initial = await page.locator('.leaflet-map-pane').getAttribute('style');
  const loaded = requests;
  await expect(page.locator('#map')).toHaveAttribute('inert','');
  await page.evaluate(() => scrollBy(0,12));
  await expect.poll(() => page.locator('.pin').evaluateAll(nodes=>nodes.flatMap(node=>node.getAnimations()).length), {timeout:1600}).toBeGreaterThan(0);
  const animations = await page.locator('.pin').evaluateAll(nodes=>nodes.flatMap(n=>n.getAnimations()).map(a=>({timing:a.effect.getTiming(),keyframes:a.effect.getKeyframes()})));
  await page.waitForTimeout(500);
  // O primeiro gesto alimenta o relógio da transição; a distância não controla as fases.
  expect(await opacity(page,'.opening h1')).toBeLessThan(1);
  expect(await opacity(page,'#map')).toBe(1);
  expect(await page.locator('.territory-transition').evaluate((stage) => document.querySelector('#map').inert === !stage.classList.contains('transition-complete'))).toBe(true);
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  await page.waitForTimeout(180);
  expect(await opacity(page,'.opening h1')).toBeLessThan(.15);
  expect(await opacity(page,'#map')).toBe(1);
  // Nenhuma troca de imagem: mesma câmera e nenhuma requisição nova pela rolagem.
  expect(await page.locator('.leaflet-map-pane').getAttribute('style')).toBe(initial);
  expect(await opacity(page,'#map')).toBe(1);
  await expect(page.locator('.leaflet-marker-pane')).toHaveCSS('visibility','visible');
  expect(animations.length).toBeGreaterThan(0);
  expect(animations.every(a=>a.timing.duration===300 && a.timing.delay<=560)).toBe(true);
  expect(animations[0].keyframes[0].opacity).toBe('0');
  expect(String(animations[0].keyframes[0].transform)).toContain('10px');
  await page.waitForTimeout(420);
  await expect(page.locator('.explorer')).toHaveClass(/transition-tools/);
  await expect(page.locator('#explorer')).toBeHidden();
  await expect(page.locator('#hud-trigger')).toHaveAttribute('aria-expanded','false');
  await expect(page.locator('#map')).not.toHaveAttribute('inert');
  expect(await opacity(page,'.leaflet-control-container')).toBe(1);
  await expect(page.locator('#hud')).toBeVisible();
  await openAdvancedFilters(page);
  await expect(page.locator('#filters-panel')).toBeVisible();
  await expect(page.locator('#explorer')).toBeVisible();
  expect(await page.locator('.leaflet-map-pane').getAttribute('style')).toBe(initial);
  expect(requests).toBe(loaded);
  await page.mouse.wheel(0,-900);
  // A sequência é de execução única: novos gestos não restauram a apresentação.
  expect(await opacity(page,'.opening h1')).toBe(0);
  await expect(page.locator('.territory-transition')).toHaveClass(/transition-complete/);
  await expect.poll(() => page.locator('.pin').evaluateAll(nodes=>nodes.flatMap(n=>n.getAnimations()).length)).toBe(0);
});

test('primeiro scroll dispara apresentação, pins e HUD automaticamente', async ({page}) => {
  await page.route('https://server.arcgisonline.com/**', route => route.fulfill({contentType:'image/png',body:tile}));
  await page.goto('/');
  await expect(page.locator('.territory-transition')).toHaveClass(/tiles-ready/);
  await expect(page.locator('#hud')).toBeHidden();
  const initial = await page.locator('.leaflet-map-pane').getAttribute('style');
  await page.evaluate(() => scrollBy(0, 12));
  await page.waitForTimeout(620);
  await expect(page.locator('.territory-transition')).toHaveAttribute('data-phase','markers');
  await expect(page.locator('.opening')).toHaveCSS('visibility','hidden');
  await expect(page.locator('.leaflet-marker-pane')).toHaveCSS('visibility','visible');
  expect(await page.locator('.pin').evaluateAll(nodes=>nodes.flatMap(node=>node.getAnimations()).length)).toBeGreaterThan(0);
  await expect(page.locator('.territory-transition')).toHaveClass(/transition-complete/, {timeout:2000});
  await expect(page.locator('#map')).not.toHaveAttribute('inert');
  await expect.poll(() => opacity(page,'.leaflet-control-container')).toBe(1);
  await expect(page.locator('#hud')).toBeVisible();
  expect(await page.locator('.leaflet-map-pane').getAttribute('style')).toBe(initial);
});

test('navegação interativa respeita zoom e limites territoriais provisórios', async ({page}) => {
  await page.route('https://server.arcgisonline.com/**', route => route.fulfill({contentType:'image/png',body:tile}));
  await page.goto('/#map');
  await expect(page.locator('#map')).not.toHaveAttribute('inert');
  await zoomToLimit(page, '.leaflet-control-zoom-out');
  await zoomToLimit(page, '.leaflet-control-zoom-in');
  const before = await settledGeographicCenter(page);
  await dragMap(page, .35, 0);
  expect(await settledGeographicCenter(page)).not.toEqual(before);
  for (let attempt = 0; attempt < 5; attempt++) await dragMap(page, 1, 1);
  let center = await settledGeographicCenter(page);
  expect(center.latitude).toBeGreaterThanOrEqual(-23.9500);
  expect(center.longitude).toBeGreaterThanOrEqual(-46.1950);
  for (let attempt = 0; attempt < 10; attempt++) await dragMap(page, -1, -1);
  center = await settledGeographicCenter(page);
  expect(center.latitude).toBeLessThanOrEqual(-23.9250);
  expect(center.longitude).toBeLessThanOrEqual(-46.1650);
});

test('falha de tiles mantém consulta, marcadores e mapa funcional', async ({page}) => {
  let release;
  const pending = new Promise(resolve => {release=resolve;});
  await page.route('https://server.arcgisonline.com/**',async route=>{await pending;await route.abort();});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  // A abertura já mostra o mapa mesmo com tiles pendentes.
  await expect(page.locator('#map')).toBeVisible();
  await expect(page.locator('.cartography')).toHaveCount(0);
  await scroll(page,.7);
  await expect(page.locator('.leaflet-marker-pane')).toHaveCSS('visibility','visible');
  await expect(page.locator('#tile-error')).toContainText('Carregando');
  release();
  await expect(page.locator('.territory-transition')).toHaveClass(/tiles-unavailable/);
  await scroll(page,1);
  await expect(page.locator('#map')).not.toHaveAttribute('inert');
  await expect(page.locator('.leaflet-tile-pane')).toHaveCSS('visibility','hidden');
  await expect(page.locator('#tile-error')).toContainText('indisponíveis');
  await openAdvancedFilters(page);
  await page.selectOption('#category','agua');
  await expect(page.locator('.card')).toHaveCount(1);
});

test('marcador recriado por atualização de dados continua abrindo o popup', async ({page}) => {
  await page.route('https://server.arcgisonline.com/**', route => route.abort());
  await page.goto('/#map');
  await openAdvancedFilters(page);
  await page.selectOption('#category','agua');
  await expect(page.locator('.occurrence-marker')).toHaveCount(1);
  await page.locator('.occurrence-marker').click();
  await expect(page.getByRole('button',{name:'Ver detalhes',exact:true})).toBeVisible();
});
