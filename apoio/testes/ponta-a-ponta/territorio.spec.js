import {test,expect} from '@playwright/test';
import { hudAction, openFullList, openAdvancedFilters, openFullProfile, openHistory, hudRegister } from './painel.js';
test.beforeEach(async({page})=>{await page.route('https://server.arcgisonline.com/**',route=>route.abort());});
test('abertura permanente e rolagem normal usam a mesma instância do mapa',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:'Um território em cuidado coletivo.'})).toBeVisible();
 await expect(page.locator('.intro button')).toHaveCount(0);await expect(page.getByRole('link',{name:'Explorar o mapa',exact:true})).toHaveCount(1);
 await expect(page.locator('.card')).toHaveCount(105);await page.evaluate(()=>{window.originalMap=document.getElementById('map');window.originalZoom=document.querySelector('.leaflet-control-zoom');});
 // Sem ilustração: o satélite é o fundo desde o início.
 await expect(page.locator('.cartography')).toHaveCount(0);await expect(page.locator('.map-veil')).toHaveCount(0);
 await expect(page.locator('#map')).toBeVisible();
 const initial=await page.locator('.leaflet-map-pane').getAttribute('style');
 for(const progress of [0,.25,.5,.75,1]){await page.evaluate(value=>{const stage=document.querySelector('.territory-transition');scrollTo(0,stage.offsetTop+(stage.offsetHeight-innerHeight)*value);},progress);await page.waitForTimeout(50);}
 // Câmera fixa: nenhum movimento do mapa durante a apresentação.
 expect(await page.locator('.leaflet-map-pane').getAttribute('style')).toBe(initial);
 await expect(page.locator('.territory-transition')).toHaveClass(/transition-complete/);expect(await page.locator('#map').evaluate(node=>getComputedStyle(node).pointerEvents)).toBe('auto');
 expect(await page.evaluate(()=>window.originalMap===document.getElementById('map')&&window.originalZoom===document.querySelector('.leaflet-control-zoom'))).toBe(true);
 await expect(page.locator('.leaflet-control-attribution')).toContainText('Esri');await expect(page.locator('.simulation')).toContainText('Registros fictícios');
 await page.locator('.leaflet-control-zoom-in').click();await expect(page.locator('.occurrence-marker')).toHaveCount(105);
});
test('atalhos de teclado, mapa direto e registro direto preservam foco e histórico',async({page})=>{
 await page.goto('/');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Ir para o mapa',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(page).toHaveURL(/#map$/);await expect(page.locator('#map')).toBeFocused();
 await page.goto('/#map');await expect(page.locator('#map')).toBeFocused();await expect(page.locator('#map')).toBeInViewport();
 await page.goto('/#list-heading');await expect(page.locator('#list-heading')).toBeFocused();await expect(page.locator('#show-all')).toHaveAttribute('aria-expanded','true');await expect(page.locator('.card').last()).toBeVisible();
 await page.goto('/#ocorrencia=CA-001');await expect(page.locator('#detail-title')).toContainText('Resíduos junto');await page.getByRole('button',{name:'Fechar detalhes'}).click();await expect(page.locator('#list-heading')).toBeFocused();
});
test('navegação da abertura oferece acesso direto à HUD do mapa',async({page})=>{
 await page.goto('/');await page.getByRole('link',{name:'Ir para a HUD do mapa',exact:true}).click();
 await expect(page).toHaveURL(/#map$/);await expect(page.locator('.territory-transition')).toHaveClass(/transition-complete/);
 await expect(page.locator('#hud')).toBeVisible();await expect(page.locator('#map')).not.toHaveAttribute('inert');
 await expect(page.locator('#hud-trigger')).toBeVisible();
});
test('painel tem prévia transparente, expansão e recolhimento sem mudar filtros ou total',async({page})=>{
 await page.goto('/#map');await expect(page.locator('.card')).toHaveCount(105);await expect(page.locator('#explorer')).toBeHidden();await openFullList(page);await expect(page.locator('.card:visible')).toHaveCount(4);await expect(page.locator('#count')).toHaveText('105 registros');await expect(page.locator('.occurrence-marker')).toHaveCount(105);await expect(page.locator('.panel-criteria')).toContainText('Atividades recentes');
 await page.locator('#show-all').click();await expect(page.locator('#show-all')).toHaveAttribute('aria-expanded','true');await expect(page.locator('.card:visible')).toHaveCount(105);await expect(page.locator('#show-all')).toBeFocused();
 await page.locator('#panel-toggle').click();await expect(page.locator('#panel-content')).not.toBeVisible();await expect(page.locator('#panel-toggle')).toBeFocused();await expect(page.locator('.occurrence-marker')).toHaveCount(105);await page.locator('#panel-toggle').click();
 await openAdvancedFilters(page);await page.selectOption('#category','agua');await expect(page.locator('#count')).toHaveText('1 registro');await expect(page.locator('#show-all')).not.toBeVisible();await openFullList(page);await expect(page.locator('.card:visible')).toHaveCount(1);await expect(page.locator('.occurrence-marker')).toHaveCount(1);
});
test('movimento reduzido deixa consulta e mapa utilizáveis sem ilustração',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#map');await expect(page.locator('#map')).toBeFocused();await expect(page.locator('.cartography')).toHaveCount(0);await expect(page.locator('.map-veil')).toHaveCount(0);
 expect(await page.locator('.card').first().evaluate(node=>getComputedStyle(node).transitionDuration)).toBe('0s');
 await expect(page.locator('.occurrence-marker')).toHaveCount(105);
 await openAdvancedFilters(page);await page.selectOption('#category','agua');await expect(page.locator('.card')).toHaveCount(1);await expect(page.locator('.occurrence-marker')).toHaveCount(1);await openFullList(page);const card=page.locator('.card:visible');await card.click();await expect(page.locator('#detail-title')).toContainText('Alteração aparente');await page.keyboard.press('Escape');await expect(card).toBeFocused();
});
test('360px e ampliação 200% conservam leitura e controles sem overflow horizontal',async({page})=>{
 await page.setViewportSize({width:360,height:800});await page.goto('/#map');await expect(page.locator('.card')).toHaveCount(105);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>{document.documentElement.style.zoom='2';});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await openAdvancedFilters(page);await page.locator('#category').selectOption('agua');await expect(page.locator('#count')).toHaveText('1 registro');await openFullList(page);await page.locator('.card:visible').click();await expect(page.locator('#detail-title')).toContainText('Alteração aparente');await expect(page.getByRole('button',{name:'Fechar detalhes'})).toBeVisible();
});
