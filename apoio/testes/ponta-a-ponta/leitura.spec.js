import {test,expect} from '@playwright/test';
import { hudAction, openFullList, openAdvancedFilters, openFullProfile, openHistory, hudRegister } from './painel.js';
test.beforeEach(async({page})=>{await page.route('https://server.arcgisonline.com/**',route=>route.abort());});
test('consulta todas as páginas, mapa e lista coerentes, filtros e tiles',async({page})=>{
 await page.goto('/#map');await expect(page.locator('.card')).toHaveCount(105);await expect(page.locator('.occurrence-marker')).toHaveCount(105);await expect(page.locator('#count')).toHaveText('105 registros');await openAdvancedFilters(page);
 const first=await page.request.get('/api/v1/occurrences?pageSize=100');const data=await first.json();expect(data.data).toHaveLength(100);expect(data.total).toBe(105);expect(data.data.some(row=>row.id==='CA-001')).toBe(false);
 await page.selectOption('#category','agua');await expect(page.locator('.card')).toHaveCount(1);await expect(page.locator('.occurrence-marker')).toHaveCount(1);await expect(page.locator('#count')).toHaveText('1 registro');
 await page.selectOption('#status','closed');await expect(page.locator('#empty')).toBeVisible();await expect(page.locator('.occurrence-marker')).toHaveCount(0);await page.locator('#empty-reset').click();await expect(page.locator('.card')).toHaveCount(105);await expect(page.locator('#tile-error')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
test('mapa, detalhes e retorno de foco',async({page})=>{
 await page.goto('/#map');await expect(page.locator('.card')).toHaveCount(105);await page.locator('.occurrence-marker[title="Resíduos junto à faixa de areia"]').click();const button=page.getByRole('button',{name:'Ver detalhes',exact:true});await button.click();await expect(page.locator('#detail-title')).toContainText('Resíduos junto');await expect(page).toHaveURL(/#ocorrencia=CA-001/);await expect(page.locator('.timeline li')).toHaveCount(2);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(button).toBeFocused();
});
test('URL direta fora do filtro, fechar preserva filtro e Voltar/Avançar',async({page})=>{
 await page.goto('/#map');await openAdvancedFilters(page);await page.selectOption('#category','agua');await expect(page.locator('.card')).toHaveCount(1);await page.evaluate(()=>{location.hash='ocorrencia=CA-001';});await expect(page.locator('#detail-title')).toContainText('Resíduos junto');await page.getByRole('button',{name:'Fechar detalhes'}).click();await expect(page.locator('#category')).toHaveValue('agua');await expect(page.locator('.card')).toHaveCount(1);
 await openFullList(page);const card=page.locator('.card:visible').first();await card.focus();await page.keyboard.press('Enter');await expect(page.locator('#detail-title')).toContainText('Alteração aparente');await page.goBack();await expect(page.getByRole('dialog')).not.toBeVisible();await expect(card).toBeFocused();await page.goForward();await expect(page.locator('#detail-title')).toContainText('Alteração aparente');await page.reload();await expect(page.locator('#detail-title')).toContainText('Alteração aparente');
 await page.goto('/#ocorrencia=inexistente');await expect(page.locator('#detail-title')).toHaveText('Ocorrência não encontrada');
});
test('API indisponível exige nova tentativa manual, sem fixtures',async({page})=>{
 await page.route('**/api/**',route=>route.abort());await page.goto('/#map');await expect(page.locator('#retry')).toBeVisible();await expect(page.locator('#list-status')).toContainText('API');await expect(page.locator('.card')).toHaveCount(0);await expect(page.locator('.occurrence-marker')).toHaveCount(0);await expect(page.locator('#empty')).not.toBeVisible();await expect(page.locator('#count')).toHaveText('—');await page.unroute('**/api/**');await page.locator('#retry').click();await expect(page.locator('.card')).toHaveCount(105);
});
test('falha na segunda página não apresenta resultado parcial',async({page})=>{
 await page.route('**/api/v1/occurrences?**',route=>new URL(route.request().url()).searchParams.get('page')==='2'?route.fulfill({status:500,body:'internal'}):route.continue());await page.goto('/#map');await expect(page.locator('#retry')).toBeVisible();await expect(page.locator('.card')).toHaveCount(0);await expect(page.locator('.occurrence-marker')).toHaveCount(0);await page.unroute('**/api/v1/occurrences?**');await page.locator('#retry').click();await expect(page.locator('.card')).toHaveCount(105);
});
test('filtros rápidos não aceitam resposta antiga',async({page})=>{
 await page.goto('/#map');await expect(page.locator('.card')).toHaveCount(105);await openAdvancedFilters(page);
 let release,started;const gate=new Promise(resolve=>{release=resolve;});const pending=new Promise(resolve=>{started=resolve;});
 let intercepted=false;await page.route('**/api/v1/occurrences?**',async route=>{if(intercepted)return route.continue();intercepted=true;started();await gate;try{await route.continue();}catch{ /* Cancelled requests may already be gone. */ }});
 await page.selectOption('#category','residuos');await pending;await page.selectOption('#category','agua');await expect(page.locator('.card')).toHaveCount(1);release();await page.unrouteAll({behavior:'wait'});await expect(page.locator('.card')).toHaveCount(1);await expect(page.locator('#count')).toHaveText('1 registro');await expect(page.locator('.card')).toContainText('Alteração aparente');
});
test('falha no histórico não reutiliza conteúdo anterior e permite tentar novamente',async({page})=>{
 await page.route('**/api/v1/occurrences/*/history?**',route=>route.abort());await page.goto('/#ocorrencia=CA-001');await expect(page.locator('#detail-title')).toHaveText('Não foi possível carregar a ocorrência');await expect(page.locator('.timeline li')).toHaveCount(0);await page.unroute('**/api/v1/occurrences/*/history?**');await page.getByRole('dialog').getByRole('button',{name:'Tentar novamente'}).click();await expect(page.locator('#detail-title')).toContainText('Resíduos junto');
});
test('filtro que exclui a seleção limpa detalhes e preserva o filtro',async({page})=>{
 await page.goto('/#ocorrencia=CA-001');await expect(page.locator('#detail-title')).toContainText('Resíduos junto');
 // O filtro atua sobre a seleção mesmo com o detalhe aberto; a categoria permanece operável sem abrir painéis.
 await page.evaluate(()=>{const category=document.getElementById('category');category.value='agua';category.dispatchEvent(new Event('change'));});
 await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page).not.toHaveURL(/#ocorrencia=/);await expect(page.locator('#category')).toHaveValue('agua');await expect(page.locator('.card')).toHaveCount(1);
});
