import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {test,expect} from '@playwright/test';
import { hudAction, openFullList, openAdvancedFilters, openFullProfile, openHistory, hudRegister } from './painel.js';
const current=join(process.env.CUIDACAO_E2E_DEMO_DIRECTORY,'current');
const index=()=>JSON.parse(readFileSync(join(current,'scenarios.json'),'utf8'));
async function login(page,username){const account=JSON.parse(readFileSync(join(current,'credentials.json'),'utf8')).find(row=>row.username===username);await openFullProfile(page);await page.locator('#account-panel').getByRole('button',{name:'Entrar',exact:true}).click();const form=page.locator('.auth-dialog');await form.getByLabel(/Apelido público|E-mail ou apelido público/).fill(username);await form.getByLabel('Senha',{exact:true}).fill(account.password);await form.getByRole('button',{name:'Entrar',exact:true}).click();await expect(form).not.toBeVisible();}
async function expectImageLoaded(image){await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate(element=>element.complete&&element.naturalWidth>0),{timeout:15000}).toBe(true);}
const labels={received:'Recebida',community_review:'Verificação comunitária',confirmed:'Confirmada',monitoring:'Acompanhamento',closed:'Encerrada',discarded:'Descartada'};
test('cenários da apresentação: estados, fundamentos, vínculos, imagens e revisão privada',async({page},info)=>{
 test.setTimeout(90000);await page.route('https://server.arcgisonline.com/**',route=>route.abort());
 await page.goto('/#list-heading');await expect(page.locator('.card')).toHaveCount(12);await expect(page.locator('.occurrence-marker')).toHaveCount(12);await expect(page.locator('#tile-error')).toBeVisible();
 const {scenarios}=index();for(const scenario of scenarios.filter(row=>row.visibility==='visible')){
  await page.goto('/#ocorrencia='+scenario.id);await page.reload();const details=page.locator('#details');await expect(page.locator('#detail-title')).toHaveText(scenario.title);await expect(details).toContainText(labels[scenario.status]);await expect(details).toContainText('não descreve fatos reais');await expect(details.locator('.timeline')).toContainText('Registro criado');
  for(const image of await details.locator('img').all())await expectImageLoaded(image);
  if(scenario.key==='community_review'){await expect(details).toContainText('Contestação fictícia');await expect(details).toContainText('Comentário fictício');await expect(details).toContainText('Observação fictícia');await expect(details).toContainText(scenarios.find(row=>row.key==='confirmed').id);}
  if(scenario.key==='closed'){await expect(page.getByRole('region',{name:'Encerramento da ocorrência'})).toContainText('Resolução fictícia');await expect(details).toContainText('Situação do pedido: pendente');await page.screenshot({path:info.outputPath('encerramento-demonstrativo.png'),fullPage:true});}
  if(scenario.key==='duplicate'){await expect(details).toContainText('duplicata');await expect(page.getByRole('button',{name:'Comentar',exact:true})).toHaveCount(0);}
 }
 const hidden=scenarios.find(row=>row.key==='hidden');await page.goto('/#ocorrencia='+hidden.id);await page.reload();await expect(page.locator('#details')).toContainText('não está disponível');await expect(page.locator('#details')).not.toContainText(hidden.title);await page.getByRole('button',{name:'Fechar detalhes',exact:true}).click();
 await login(page,'admin_demo_2');await page.goto('/#administracao');await page.reload();const admin=page.locator('[aria-labelledby="admin-title"]');await admin.getByRole('button',{name:'Denúncias pendentes',exact:true}).click();await expect(admin).toContainText('Denúncia fictícia pendente');await admin.getByRole('button',{name:'Pedidos de reabertura',exact:true}).click();await expect(admin).toContainText('Fato novo fictício');
 await admin.getByRole('button',{name:'Todas as ocorrências',exact:true}).click();await admin.locator('article').filter({hasText:hidden.id}).getByRole('button',{name:'Revisar ocorrência',exact:true}).click();await expect(admin).toContainText(hidden.title);await expect(admin).toContainText('oculto');await expect(admin.getByRole('button',{name:'Restaurar ocorrência',exact:true})).toBeVisible();await expect(admin).toContainText('Auditoria privada');const image=admin.locator('img');await expectImageLoaded(image);await page.screenshot({path:info.outputPath('revisao-demonstrativa.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
