import {test,expect} from '@playwright/test';
import { hudAction, openFullList, openAdvancedFilters, openFullProfile, openHistory, hudRegister } from './painel.js';

test.beforeEach(async({page})=>{await page.route('https://server.arcgisonline.com/**',route=>route.abort());});
async function bounded(dialog){
 await dialog.evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished.catch(()=>undefined))));
 const geometry=await dialog.evaluate(element=>{const r=element.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight,scroll:element.scrollWidth,client:element.clientWidth};});
 expect(geometry.left).toBeGreaterThanOrEqual(0);expect(geometry.top).toBeGreaterThanOrEqual(0);expect(geometry.right).toBeLessThanOrEqual(geometry.width);expect(geometry.bottom).toBeLessThanOrEqual(geometry.height);expect(geometry.scroll).toBeLessThanOrEqual(geometry.client);
 expect(await dialog.page().evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}

test('abertura usa o satélite permanente, sem ilustração nem véu legado',async({page})=>{
 await page.goto('/');await expect(page.locator('.card')).toHaveCount(105);
 await expect(page.locator('.cartography')).toHaveCount(0);await expect(page.locator('.map-veil')).toHaveCount(0);
 await expect(page.locator('#map')).toBeVisible();
 await expect(page.locator('.leaflet-tile-pane')).toBeAttached();
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#map');await expect(page.locator('#map')).toBeFocused();
});

test('360/390px a 200%: cadastro e criação cabem, controles são alcançáveis e foco retorna',async({page})=>{
 for(const width of [360,390]){
  await page.setViewportSize({width,height:800});await page.goto('/?viewport='+width+'#map');await expect(page.locator('#nav-account')).toBeEnabled();await page.evaluate(()=>document.documentElement.style.zoom='2');
  await openFullProfile(page);const profile=page.locator('#account-panel');await bounded(profile);const auth=page.locator('.auth-dialog');await profile.getByRole('button',{name:'Entrar',exact:true}).click();await bounded(auth);await auth.getByRole('button',{name:'Criar conta',exact:true}).click();await expect(auth.getByLabel('Confirmar senha')).toBeVisible();await bounded(auth);await auth.getByLabel('Nome de usuário fictício').fill('aa');await auth.getByRole('button',{name:'Criar conta',exact:true}).click();await expect(auth.getByLabel('Nome de usuário fictício')).toHaveAttribute('aria-invalid','true');await expect(auth.locator('#auth-message')).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('#hud-trigger')).toBeFocused();
  await hudAction(page,'register');const form=page.locator('.occurrence-dialog');await bounded(form);await expect(page.locator('#map')).toBeVisible();await form.getByLabel('Descrição fictícia').fill('Rascunho fictício acessível com coordenadas manuais.');await form.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.locator('#map')).toHaveClass(/is-selecting-location/);await page.locator('#map').click({position:{x:80,y:100}});await expect(form.getByLabel('Latitude',{exact:true})).not.toHaveValue('');await form.getByLabel('Latitude',{exact:true}).fill('-23.94');await form.getByLabel('Longitude',{exact:true}).fill('-46.18');await form.getByRole('button',{name:'Continuar',exact:true}).click();await expect(form.getByLabel('Descrição fictícia')).toHaveValue('Rascunho fictício acessível com coordenadas manuais.');
  await page.setViewportSize({width,height:420});await bounded(form);await form.getByRole('button',{name:'Adicionar imagem'}).click();await form.getByLabel('Legenda da imagem 1',{exact:true}).fill('Legenda fictícia preservada em tela reduzida.');await bounded(form);await page.keyboard.press('Escape');await expect(page.locator('#hud-trigger')).toBeFocused();await page.setViewportSize({width,height:800});
 }
});

test('diálogos de participação/denúncia ampliados e entrada sobre rascunho mantêm foco e texto',async({page})=>{
 for(const width of [360,390]){
  await page.setViewportSize({width,height:800});await page.goto('/?participacao='+width+'#ocorrencia=CA-001');await expect(page.locator('#detail-title')).toContainText('Resíduos junto');await expect(page.getByRole('button',{name:'Comentar',exact:true})).toBeVisible();await page.evaluate(()=>document.documentElement.style.zoom='2');await bounded(page.locator('#details'));
  for(const [label,selector,close] of [['Comentar','.contribution-dialog','Fechar contribuição'],['Acrescentar complemento','.contribution-dialog','Fechar contribuição'],['Apoiar','.stance-dialog','Fechar manifestação'],['Denunciar ocorrência','.admin-action-dialog','Fechar ação']]){
   const origin=page.locator('#details').getByRole('button',{name:label,exact:true});await origin.click();const dialog=page.locator(selector);await bounded(dialog);
   const draft='Informação fictícia preservada ao consultar a entrada.';const text=dialog.locator('textarea').first();await text.fill(draft);
   if(label==='Comentar'){await dialog.getByRole('button',{name:'Entrar para continuar'}).click();await bounded(page.locator('.auth-dialog'));await page.getByRole('button',{name:'Fechar autenticação'}).click();await expect(text).toHaveValue(draft);await expect(dialog.getByRole('button',{name:'Entrar para continuar'})).toBeFocused();}
   await dialog.getByRole('button',{name:close,exact:true}).click();await expect(origin).toBeFocused();
  }
 }
});

test('marcador por toque/clique abre prévia utilizável em 360/390px sem sobrepor os controles',async({page},info)=>{
 for(const width of [360,390]){
  await page.setViewportSize({width,height:800});await page.goto('/?mapa='+width+'#map');await expect(page.locator('.occurrence-marker')).toHaveCount(105);const marker=page.locator('.occurrence-marker[title="Resíduos junto à faixa de areia"]');
  if(info.project.name==='mobile')await marker.tap();else await marker.click();
  const button=page.getByRole('button',{name:'Ver detalhes',exact:true});await expect(button).toBeVisible();const map=await page.locator('#map').boundingBox(),control=await button.boundingBox();expect(control.x).toBeGreaterThanOrEqual(map.x);expect(control.x+control.width).toBeLessThanOrEqual(map.x+map.width);expect(control.y).toBeGreaterThanOrEqual(map.y);expect(control.y+control.height).toBeLessThanOrEqual(map.y+map.height);
  await button.click();await expect(page.locator('#detail-title')).toContainText('Resíduos junto');// Ao fechar o detalhe, a ficha do pin já está recolhendo: o foco vai para o
// marcador permanente, que permanece acessível durante todo o recolhimento.
await page.keyboard.press('Escape');await expect(button).toBeHidden();await expect(marker).toBeFocused();
 }
});
