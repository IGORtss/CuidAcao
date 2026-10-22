import {randomUUID} from 'node:crypto';
import {test,expect} from '@playwright/test';
import { hudAction, openFullList, openAdvancedFilters, openFullProfile, openHistory, hudRegister } from './painel.js';
test.beforeEach(async({page})=>{await page.route('https://server.arcgisonline.com/**',route=>route.abort());});
async function profileAction(page,name){await openFullProfile(page);const profile=page.locator('#account-panel');await expect(profile).toBeVisible();await profile.getByRole('button',{name,exact:true}).click();}
test('cadastro → login incorreto/correto → recarregar → logout, consulta preservada',async({page})=>{
 const username='demo_'+randomUUID().replaceAll('-','').slice(0,20),password='Senha fictícia E2E 123';
 await page.goto('/#map');await expect(page.locator('.card')).toHaveCount(105);const nav=page.locator('.auth-nav');
 await profileAction(page,'Criar conta');const dialog=page.locator('.auth-dialog');await expect(dialog).toBeVisible();
 await dialog.getByLabel(/Apelido público|E-mail ou apelido público/).fill(username.toUpperCase());await dialog.getByLabel('Senha',{exact:true}).fill(password);await dialog.getByLabel('Confirmar senha').fill(password);
 await dialog.getByRole('button',{name:'Criar conta',exact:true}).click();await expect(dialog.locator('#auth-message')).toHaveText('Conta criada. Entre com seu nome de usuário e senha.');await expect(dialog.locator('#auth-title')).toHaveText('Entrar');await expect(dialog.getByLabel(/Apelido público|E-mail ou apelido público/)).toHaveValue(username);await expect(nav.locator('#session-user')).toHaveCount(0);
 await dialog.getByLabel('Senha',{exact:true}).fill('Senha incorreta fictícia');await dialog.getByRole('button',{name:'Entrar',exact:true}).click();await expect(dialog.locator('#auth-message')).toHaveText('Usuário ou senha inválidos.');await expect(dialog.getByLabel(/Apelido público|E-mail ou apelido público/)).toHaveValue(username);
 await dialog.getByLabel('Senha',{exact:true}).fill(password);await dialog.getByRole('button',{name:'Entrar',exact:true}).click();await expect(dialog).not.toBeVisible();await expect(nav.locator('#session-user')).toHaveText('Conta: '+username);await expect(page.locator('#hud-trigger')).toBeFocused();
 const session=(await page.context().cookies()).find(value=>value.name==='cuidacao_session');expect(session.httpOnly).toBe(true);expect(session.sameSite).toBe('Lax');expect(await page.evaluate(()=>document.cookie.includes('cuidacao_session'))).toBe(false);
 expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);expect(page.url()).not.toContain(password);
 await page.reload();await expect(nav.locator('#session-user')).toHaveText('Conta: '+username);await expect(page.locator('.card')).toHaveCount(105);
 await page.context().clearCookies();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(nav.locator('#session-user')).toHaveCount(0);await expect(nav).toContainText('Sua sessão expirou ou foi encerrada.');await expect(page.locator('.card')).toHaveCount(105);
 await profileAction(page,'Entrar');await dialog.getByLabel(/Apelido público|E-mail ou apelido público/).fill(username);await dialog.getByLabel('Senha',{exact:true}).fill(password);await dialog.getByRole('button',{name:'Entrar',exact:true}).click();await expect(nav.locator('#session-user')).toHaveText('Conta: '+username);
 await profileAction(page,'Sair');await expect(nav.locator('#session-user')).toHaveCount(0);await expect(page.locator('#hud-trigger')).toBeFocused();await expect(page.locator('.card')).toHaveCount(105);
 await page.reload();await openFullProfile(page);await expect(page.locator('#account-panel').getByRole('button',{name:'Entrar',exact:true})).toBeEnabled();await expect(nav.locator('#session-user')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
test('confirmação local, envio único e falha de autenticação não quebram consulta',async({page})=>{
 await page.goto('/#map');await expect(page.locator('.card')).toHaveCount(105);await profileAction(page,'Criar conta');const dialog=page.locator('.auth-dialog');
 await dialog.getByLabel(/Apelido público|E-mail ou apelido público/).fill('demo_'+randomUUID().replaceAll('-','').slice(0,20));await dialog.getByLabel('Senha',{exact:true}).fill('Senha fictícia E2E 123');await dialog.getByLabel('Confirmar senha').fill('Outra senha fictícia');await dialog.getByRole('button',{name:'Criar conta',exact:true}).click();await expect(dialog.locator('#auth-message')).toHaveText('As senhas não coincidem.');await expect(dialog.locator('#auth-message')).toBeFocused();
 await dialog.getByLabel('Confirmar senha').fill('Senha fictícia E2E 123');let release,started;const gate=new Promise(resolve=>{release=resolve;}),pending=new Promise(resolve=>{started=resolve;});let requests=0;
 await page.route('**/api/v1/auth/register',async route=>{requests++;started();await gate;await route.abort();});
 await dialog.getByRole('button',{name:'Criar conta',exact:true}).click();await pending;await expect(dialog.getByRole('button',{name:'Aguarde…'})).toBeDisabled();await expect(dialog.getByRole('button',{name:'Fechar autenticação'})).toBeDisabled();expect(requests).toBe(1);release();await expect(dialog.locator('#auth-message')).toContainText('conectar à API');
 await dialog.getByRole('button',{name:'Fechar autenticação'}).click();await expect(page.locator('.card')).toHaveCount(105);await expect(page.locator('#count')).toHaveText('105 registros');
});

test('cadastro e entrada simples não apresentam Google nem e-mail',async({page})=>{
 await page.goto('/#map');await profileAction(page,'Entrar');const dialog=page.locator('.auth-dialog');
 for(const mode of ['login','register']){
  if(mode==='register')await dialog.getByRole('button',{name:'Criar conta',exact:true}).click();
  await expect(dialog.getByLabel('Apelido público')).toBeVisible();
  await expect(dialog.getByLabel('Senha',{exact:true})).toBeVisible();
  await expect(dialog.locator('input[type="email"]')).toHaveCount(0);
  await expect(dialog.getByRole('button',{name:/Google|Esqueci minha senha/})).toHaveCount(0);
 }
});
