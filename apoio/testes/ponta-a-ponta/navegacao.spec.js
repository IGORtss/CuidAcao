import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { hudAction, openFullList, openAdvancedFilters, openFullProfile, openHistory } from './painel.js';

const tile = await sharp({create:{width:256,height:256,channels:3,background:'#40574d'}}).png().toBuffer();

test('HUD recolhível organiza pins, painéis e conta sem poluir o mapa', async ({page}, info) => {
  await page.route('https://server.arcgisonline.com/**', route => route.fulfill({contentType:'image/png',body:tile}));
  await page.goto('/');
  const declaredIcons = await page.locator('link[rel="icon"]').evaluateAll(nodes => nodes.map(node => node.sizes.value));
  expect(declaredIcons).toEqual(['32x32','192x192','512x512']);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('sizes','180x180');
  await expect(page.locator('.card')).toHaveCount(105);
  await expect(page.locator('#explorer')).toBeHidden();
  await expect(page.locator('#list-section')).toBeHidden();
  await expect(page.locator('#filters-panel')).toBeHidden();
  // Estado fechado: só o mapa; a HUD e a barra antiga ficam fora da tela.
  await expect(page.locator('#hud')).toBeHidden();
  await expect(page.locator('#hud-menu')).toBeHidden();
  await expect(page.locator('.global-header')).toBeHidden();
  await expect(page.locator('.map-layer-control')).toBeHidden();
  await page.evaluate(() => scrollBy(0,12));
  await expect(page.locator('.territory-transition')).toHaveClass(/transition-complete/);
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#hud-trigger')).toBeVisible();
  await expect(page.locator('#hud-trigger')).toHaveAttribute('aria-expanded','false');
  await expect(page.locator('.occurrence-marker')).toHaveCount(105);
  const triggerIcon = page.locator('#hud-trigger img');
  await expect(triggerIcon).toBeVisible();
  expect(await triggerIcon.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  expect((await triggerIcon.boundingBox()).width).toBeGreaterThan(30);

  // O menu principal abre a partir do ícone, com as ações do sistema.
  await page.locator('#hud-trigger').click();
  await expect(page.locator('#hud-menu')).toBeVisible();
  await expect(page.locator('#hud')).toHaveAttribute('data-motion-state','open');
  await expect(page.locator('#hud-trigger')).toHaveAttribute('aria-expanded','true');
  for (const name of ['Explorar mapa','Central de ocorrências','Registrar ocorrência','Camadas ambientais','Linha do tempo','Lista de ocorrências','Investigar área','Conta / perfil']) {
    await expect(page.locator('#hud-menu').getByRole('button',{name,exact:false})).toBeVisible();
  }
  // Escape fecha e devolve o foco ao ícone.
  await page.keyboard.press('Escape');
  await expect(page.locator('#hud-menu')).toBeHidden();
  await expect(page.locator('#hud-trigger')).toBeFocused();
  // Clique fora do menu fecha sem roubar o foco.
  await page.locator('#hud-trigger').click();
  await expect(page.locator('#hud-menu')).toBeVisible();
  const mapBox = await page.locator('#map').boundingBox();
  await page.locator('#map').click({position:{x: Math.min(600, mapBox.width - 40), y: Math.min(500, mapBox.height - 120)}});
  await expect(page.locator('#hud-menu')).toBeHidden();
  await expect(page.locator('#place-card')).toBeHidden();

  // Ocorrências: painel contextual compacto com busca, contagem e lista resumida.
  await hudAction(page, 'occurrences');
  await expect(page.locator('#hud-menu')).toBeHidden();
  await expect(page.locator('#hud-panel')).toBeVisible();
  await expect(page.locator('#hud-panel-title')).toHaveText('Lista de ocorrências');
  await expect(page.locator('#hud-occ-status')).toContainText('105 registros');
  await expect(page.locator('#hud-fit')).toBeVisible();
  await expect(page.locator('#hud-list .hud-card')).toHaveCount(4);
  await page.locator('#hud-back').click();
  await expect(page.locator('#hud-menu')).toBeVisible();

  // Investigar área: modo compacto com progresso dos vértices.
  await hudAction(page, 'investigate');
  await expect(page.locator('#hud-menu')).toBeHidden();
  await expect(page.locator('#hud-panel')).toBeVisible();
  await expect(page.locator('#hud-panel-title')).toHaveText('Investigar área');
  await expect(page.locator('#hud-vertex-count')).toHaveText('0 de 3 vértices');
  await expect(page.locator('#hud-area-confirm')).toBeDisabled();
  await page.locator('#hud-area-cancel').click();
  await expect(page.locator('#hud-menu')).toBeVisible();

  // Camadas: toggles ambientais e legenda dentro da HUD.
  await hudAction(page, 'layers');
  await expect(page.locator('#hud-panel-title')).toHaveText('Camadas ambientais');
  await expect(page.locator('[data-hud-layer]')).toHaveCount(6);
  await expect(page.locator('.hud-legend')).toContainText('Resíduos');
  await page.keyboard.press('Escape');
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#hud-menu')).toBeHidden();

  // Durante a exploração o ponto de entrada continua alcançável.
  await page.locator('#hud-trigger').click();
  await expect(page.locator('#hud-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('#map').dispatchEvent('pointerdown',{pointerType:'mouse',clientX:200,clientY:300});
  await expect(page.locator('html')).toHaveClass(/map-is-exploring/);
  await expect(page.locator('#hud-trigger')).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerup')));
  await expect.poll(()=>page.locator('html').evaluate(node=>node.classList.contains('map-is-exploring'))).toBe(false);
  await expect(page.locator('.occurrence-marker')).toHaveCount(105);
  await expect(page.locator('.pin.water')).toHaveCount(1);
  await expect(page.locator('.pin.waste')).toHaveCount(104);
  await expect(page.locator('.pin svg')).toHaveCount(105);
  const marker = page.locator('.occurrence-marker[title="Resíduos junto à faixa de areia"]');
  if (info.project.name === 'mobile') await marker.tap();
  else {await marker.hover();await expect(page.locator('.occurrence-preview:not([hidden])')).toContainText('Resíduos junto à faixa de areia');await marker.click();}
  const popup = page.locator('.cpin-card--expanded:not([hidden])');
  await expect(popup).toContainText('Registro simulado');
  await expect(popup).toContainText('Resíduos');
  await popup.getByRole('button',{name:'Ver detalhes'}).click();
  await expect(page.locator('#details')).toBeVisible();
  await expect(page.locator('#map')).toBeVisible();
  await expect(page.locator('#explorer')).toBeHidden();
  const sections = page.getByRole('navigation',{name:'Seções da ocorrência'});
  await expect(sections.getByRole('button')).toHaveCount(4);
  await sections.getByRole('button',{name:'Evidências'}).click();
  await expect(page.locator('#detail-evidence')).toBeFocused();
  await page.getByRole('button',{name:'Fechar detalhes'}).click();

  const firstTitle = await page.locator('.card strong').first().textContent();
  await openAdvancedFilters(page);
  await expect(page.locator('#filters-panel')).toBeVisible();
  expect(await page.locator('#filters-panel').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.locator('#search').fill(firstTitle);
  await expect(page.locator('.card')).toHaveCount(1);
  await page.locator('#reset').click();
  await expect(page.locator('.card')).toHaveCount(105);
  await openFullList(page);
  await expect(page.locator('#filters-panel')).toBeHidden();
  await expect(page.locator('#list-section')).toBeVisible();
  await expect(page.locator('#data-summary')).toBeHidden();
  const listBounds = await page.locator('#explorer').boundingBox();
  expect(listBounds.width).toBeLessThanOrEqual(390);
  expect(listBounds.height).toBeLessThanOrEqual(info.project.name === 'mobile' ? 460 : 620);
  if (info.project.name === 'mobile') { const dock = listBounds.y + listBounds.height - (await page.evaluate(()=>innerHeight)); expect(dock).toBeLessThanOrEqual(0); expect(dock).toBeGreaterThanOrEqual(-12); }
  await page.locator('#panel-toggle').click();
  await expect(page.locator('#panel-content')).toBeHidden();
  await expect(page.locator('.occurrence-marker')).toHaveCount(105);
  await page.locator('#list-close').click();
  await openHistory(page);
  await expect(page.locator('#list-section')).toBeHidden();
  await expect(page.locator('#data-summary')).toBeVisible();
  await expect(page.locator('#data-summary')).toBeInViewport();
  const dataHeading = await page.locator('#data-title').boundingBox();
  const dataClose = await page.locator('#data-close').boundingBox();
  expect(dataClose.x).toBeGreaterThan(dataHeading.x);
  expect(dataClose.y).toBeLessThanOrEqual(dataHeading.y + 8);
  const dataBounds = await page.locator('#explorer').boundingBox();
  expect(dataBounds.height).toBeLessThanOrEqual(info.project.name === 'mobile' ? 460 : 620);
  await expect(page.locator('#data-metrics')).toContainText('105');
  await page.locator('#data-close').click();
  await openFullList(page);
  await expect(page.locator('#data-summary')).toBeHidden();
  await expect(page).toHaveURL(/#map$/);
  await page.locator('#list-close').click();
  await expect(page.locator('#explorer')).toBeHidden();

  await hudAction(page, 'register');
  await expect(page.locator('#explorer')).toBeHidden();
  await expect(page.locator('.occurrence-dialog')).toBeVisible();
  await page.getByRole('button',{name:'Fechar formulário'}).click();
  const username = `perfil_${info.project.name.replaceAll('-','_')}`;
  const password = 'Senha fictícia perfil 123';
  const origin = new URL(page.url()).origin;
  expect((await page.request.post('/api/v1/auth/register',{headers:{origin},data:{username,password}})).status()).toBe(201);
  expect((await page.request.post('/api/v1/auth/login',{headers:{origin},data:{username,password}})).status()).toBe(200);
  await page.reload();
  await expect(page.locator('#session-user')).toHaveText('Conta: '+username);
  await hudAction(page, 'account');
  await expect(page.locator('#hud-menu')).toBeHidden();
  await expect(page.locator('#hud-panel')).toBeVisible();
  await expect(page.locator('#hud-panel')).toContainText('Conta fictícia: '+username);
  await page.getByRole('button',{name:'Abrir perfil completo'}).click();
  await expect(page.locator('#account-panel')).toContainText('Conta fictícia: '+username);
  await expect(page.locator('#account-panel')).toContainText('Acompanhamentos');
  await expect(page.locator('#account-panel')).toContainText('Consultas salvas');
  await expect(page.locator('#account-panel')).toContainText('Atualizações internas');
  await expect(page.getByRole('button',{name:'Administração'})).toHaveCount(0);
});

test('microinterações da HUD são suaves, responsivas e respeitam movimento reduzido', async ({page}, info) => {
  await page.route('https://server.arcgisonline.com/**', route => route.fulfill({contentType:'image/png',body:tile}));
  await page.goto('/');
  await expect(page.locator('.card')).toHaveCount(105);
  await page.evaluate(() => scrollBy(0,12));
  await expect(page.locator('.territory-transition')).toHaveClass(/transition-complete/);
  await expect(page.locator('#hud')).toBeVisible();
  const trigger = page.locator('#hud-trigger');
  const closedBox = await page.locator('#hud').boundingBox();
  expect(closedBox.width).toBe(info.project.name === 'mobile' ? 44 : 56);
  await trigger.click();
  await expect.poll(() => page.locator('#hud').getAttribute('data-motion-state')).toBe('opening-horizontal');
  await expect.poll(async () => page.locator('#hud').getAttribute('data-motion-state')).toMatch(/^(opening-vertical|open)$/);
  const menu = page.locator('#hud-menu');
  await expect(menu).toBeVisible();
  await expect(page.locator('#hud')).toHaveAttribute('data-motion-state','open');
  expect(await menu.locator('button span strong').first().evaluate(node => getComputedStyle(node).opacity)).toBe('1');
  const openBox = await page.locator('#hud').boundingBox();
  expect(openBox.width).toBeGreaterThan(closedBox.width * 2.8);
  expect(openBox.height).toBeGreaterThan(closedBox.height * 4);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();

  await hudAction(page, 'occurrences');
  const panel = page.locator('#hud-panel');
  await expect(panel).toBeVisible();
  await expect(page.locator('#hud')).toHaveAttribute('data-motion-state','open');
  await page.locator('#map').evaluate(mapElement => {
    const pane = mapElement.querySelector('.leaflet-marker-pane');
    window.fadingMarkerEvents = [];
    const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (!node.classList?.contains('is-filtering-out')) return;
      window.fadingMarkerEvents.push({
        animationDuration: getComputedStyle(node).animationDuration,
        ariaHidden: node.getAttribute('aria-hidden'),
        role: node.getAttribute('role'),
        tabIndex: node.getAttribute('tabindex'),
        occurrenceId: node.getAttribute('data-occurrence-id')
      });
    })));
    observer.observe(pane, {childList:true});
  });
  await panel.locator('input[type="search"]').fill('Resíduos junto à faixa de areia');
  await expect(page.locator('#hud-list .hud-card')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.fadingMarkerEvents.length)).toBeGreaterThan(0);
  const fadingMarker = await page.evaluate(() => window.fadingMarkerEvents[0]);
  expect(parseFloat(fadingMarker.animationDuration)).toBeGreaterThanOrEqual(.15);
  expect(fadingMarker.ariaHidden).toBe('true');
  expect(fadingMarker.role).toBeNull();
  expect(fadingMarker.tabIndex).toBeNull();
  expect(fadingMarker.occurrenceId).toBeNull();
  await expect(page.locator('.occurrence-marker:not(.is-filtering-out)')).toHaveCount(1);
  await expect(page.locator('.occurrence-marker.is-filtering-out')).toHaveCount(0);
  expect(parseFloat(await page.locator('.occurrence-marker:not(.is-filtering-out)').evaluate(node => getComputedStyle(node).animationDuration))).toBeGreaterThanOrEqual(.15);
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();

  await openFullList(page);
  await page.locator('#list-close').click();
  await expect(page.locator('#explorer')).toBeHidden();
  const marker = page.locator('.occurrence-marker[title="Resíduos junto à faixa de areia"]');
  expect(parseFloat(await marker.evaluate(node => getComputedStyle(node).animationDuration))).toBeGreaterThanOrEqual(.15);
  expect(parseFloat(await marker.locator('.pin').evaluate(node => getComputedStyle(node).transitionDuration))).toBeGreaterThanOrEqual(.15);
  if (info.project.name === 'desktop') await marker.hover();
  else await marker.tap();
  if (info.project.name === 'desktop') await expect(page.locator('.occurrence-preview:not([hidden])')).toContainText('Resíduos junto à faixa de areia');
  else await expect(page.locator('.cpin-card--expanded:not([hidden])')).toContainText('Resíduos junto à faixa de areia');
  if (info.project.name === 'desktop') await marker.click();
  else await page.locator('.cpin-card--expanded:not([hidden])').getByRole('button',{name:'Ver detalhes'}).click();
  if (info.project.name === 'desktop') await page.locator('.cpin-card--expanded:not([hidden])').getByRole('button',{name:'Ver detalhes'}).click();
  await expect(marker).toHaveClass(/is-selected/);
  await page.getByRole('button',{name:'Fechar detalhes'}).click();
  await expect(marker).not.toHaveClass(/is-selected/);

  await page.emulateMedia({reducedMotion:'reduce'});
  const reducedDuration = await trigger.evaluate(node => parseFloat(getComputedStyle(node).transitionDuration));
  expect(reducedDuration).toBeLessThan(.001);
});

test('camadas da HUD seguem geometrias explícitas, filtros e abrem detalhes', async ({page}) => {
  await page.route('https://server.arcgisonline.com/**', route => route.fulfill({contentType:'image/png',body:tile}));
  const environmentalRepresentations=new Map();
  await page.route('**/api/v1/occurrences?**', async route => {
    const response = await route.fetch();
    const payload = await response.json();
    if (!Array.isArray(payload.data)) return route.fulfill({response,json:payload});
    const types = ['water_quality','waste','erosion','apparent_sewage','flooding','vegetation'];
    payload.data.forEach((item) => {
      let representation=environmentalRepresentations.get(item.id);
      if (!representation && environmentalRepresentations.size<6) {
      const index=environmentalRepresentations.size;
      const x=item.longitude,y=item.latitude,d=.00035;
      const polygon={type:'Polygon',coordinates:[[[x-d,y-d],[x+d,y-d],[x+d,y+d],[x-d,y+d],[x-d,y-d]]]};
      const geometries={water_quality:{type:'Point',coordinates:[x,y]},waste:polygon,erosion:{type:'LineString',coordinates:[[x-d,y-d],[x+d,y+d]]},apparent_sewage:{type:'Point',coordinates:[x,y]},flooding:polygon,vegetation:polygon};
      representation={type:types[index],geometry:geometries[types[index]],accuracy:index===4?'approximate':'verified',...(index===0?{measurement:{label:'pH',value:7.2}}:{})};
      environmentalRepresentations.set(item.id,representation);
      }
      if (representation) item.environmentalRepresentation=representation;
    });
    await route.fulfill({response,json:payload});
  });
  await page.goto('/');
  await page.evaluate(() => scrollBy(0,12));
  await expect(page.locator('.territory-transition')).toHaveClass(/transition-complete/);
  await hudAction(page, 'layers');
  await expect(page.locator('#hud-panel')).toBeVisible();
  await expect(page.locator('[data-hud-layer]')).toHaveCount(6);
  for (const type of ['water_quality','waste','erosion','apparent_sewage','flooding','vegetation']) await expect(page.locator(`.environmental-shape--${type}`)).toHaveCount(1);
  await expect(page.locator('.environmental-shape--approximate')).toHaveCount(1);
  await expect(page.locator('.environmental-shape--verified')).toHaveCount(5);
  await expect(page.locator('.water-measurement-label')).toHaveText('pH 7.2');
  const waterButton = page.locator('[data-hud-layer="water_quality"]');
  await waterButton.click();
  await expect(page.locator('.environmental-shape--water_quality')).toHaveCount(0);
  await waterButton.click();
  const waterShape = page.locator('.environmental-shape--water_quality');
  await expect(waterShape).toHaveCount(1);
  const waterAnimations = await waterShape.evaluate(node => node.getAnimations().map(animation => ({
    duration: animation.effect.getTiming().duration,
    iterations: animation.effect.getTiming().iterations,
    keyframes: animation.effect.getKeyframes()
  })));
  expect(waterAnimations).toHaveLength(1);
  expect(waterAnimations[0].duration).toBe(560);
  expect(waterAnimations[0].iterations).toBe(1);
  expect(waterAnimations[0].keyframes.some(frame => String(frame.transform).includes('1.075'))).toBe(true);
  const floodButton = page.locator('[data-hud-layer="flooding"]');
  await floodButton.click();
  await expect(page.locator('.environmental-shape--flooding')).toHaveCount(0);
  await floodButton.click();
  await expect(page.locator('.environmental-shape--flooding')).toHaveCount(1);
  await page.keyboard.press('Escape');
  const erosionId=await page.locator('.environmental-shape--erosion').getAttribute('data-occurrence-id');
  await hudAction(page, 'occurrences');
  await page.locator('#hud-panel-body input[type="search"]').fill(erosionId);
  await expect(page.locator('.environmental-shape')).toHaveCount(1);
  await expect(page.locator('.environmental-shape--erosion')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.locator('.environmental-shape--erosion').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#details')).toBeVisible();
  await expect(page.locator('#detail-body')).toContainText('Relato original');
});
