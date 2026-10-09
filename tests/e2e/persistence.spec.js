import {test,expect} from '@playwright/test';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../../server/app.js';
test('cadastro → login → criação → edição → reinício → logout',async({page})=>{
  const folder=mkdtempSync(join(tmpdir(),'cuidacao-flow-')),dbPath=join(folder,'demo.sqlite');
  const origin='http://127.0.0.1:5173';
  let app=await createApp({dbPath,origin}),address=await app.listen({host:'127.0.0.1',port:0});
  try {
    await page.route('https://tile.openstreetmap.org/**',route=>route.abort());
    await page.route('**/api/v1/**',async route=>{
      const request=route.request();
      const response=await route.fetch({url:address+new URL(request.url()).pathname+new URL(request.url()).search,headers:{...request.headers(),...(request.method()!=='GET'?{origin}:{})}});
      await route.fulfill({response});
    });
    await page.goto('/');await expect(page.locator('#account-state')).toContainText('visitante');
    await page.locator('#register-open').click();
    await page.locator('#auth-form [name=username]').fill('morador_teste');
    await page.locator('#auth-form [name=password]').fill('senha_ficticia_apresentacao');
    await page.locator('#auth-form [name=confirmation]').fill('senha_ficticia_apresentacao');
    await page.locator('#auth-form [type=submit]').click();
    await expect(page.locator('#auth-title')).toContainText('Conta criada');
    await page.locator('#auth-form [name=password]').fill('senha_ficticia_apresentacao');
    await page.locator('#auth-form [type=submit]').click();
    await expect(page.locator('#account-state')).toContainText('morador_teste');
    await page.locator('#create-open').click();
    await page.locator('#occurrence-form [name=title]').fill('Relato fictício persistente');
    await page.locator('#occurrence-form [name=description]').fill('Exemplo fictício de resíduos acumulados no local demonstrativo.');
    await page.locator('#occurrence-form [name=latitude]').fill('-23.94');
    await page.locator('#occurrence-form [name=longitude]').fill('-46.18');
    await page.locator('#occurrence-form [type=submit]').click();
    await expect(page.locator('#detail-title')).toHaveText('Relato fictício persistente');
    await expect(page.locator('#details .badge')).toHaveText('Recebida');
    await expect(page.locator('#details .timeline')).toContainText('Registro criado');
    await page.getByRole('button',{name:'Editar meu relato'}).click();
    await page.locator('#occurrence-form [name=title]').fill('Relato editado e persistente');
    await page.locator('#occurrence-form [type=submit]').click();
    await expect(page.locator('#detail-title')).toHaveText('Relato editado e persistente');
    await expect(page.locator('#details .timeline')).toContainText('Relato editado');
    await app.close();app=await createApp({dbPath,origin});address=await app.listen({host:'127.0.0.1',port:0});
    await page.reload();await expect(page.locator('#detail-title')).toHaveText('Relato editado e persistente');
    await expect(page.locator('#account-state')).toContainText('morador_teste');
    await page.locator('#close').click();await page.locator('#logout').click();
    await expect(page.locator('#account-state')).toContainText('visitante');
    await expect(page.locator('#create-open')).toBeHidden();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  } finally {await app.close();rmSync(folder,{recursive:true,force:true});}
});
test('API indisponível mostra erro sem inventar registros',async({page})=>{
  await page.route('**/api/v1/**',route=>route.abort());await page.goto('/');
  await expect(page.locator('#api-error')).toBeVisible();await expect(page.locator('.card')).toHaveCount(0);await expect(page.locator('#api-retry')).toBeVisible();
});
