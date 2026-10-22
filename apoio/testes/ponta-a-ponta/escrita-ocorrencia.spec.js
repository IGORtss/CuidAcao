import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {test,expect} from '@playwright/test';
import { hudAction, openFullList, openAdvancedFilters, openFullProfile, openHistory, hudRegister } from './painel.js';
async function login(page){
  const username='write_'+randomUUID().replaceAll('-','').slice(0,20),password='Senha fictícia E2E 123';
  await page.request.post('/api/v1/auth/register',{headers:{origin:'http://127.0.0.1:5181'},data:{username,password}});
  await page.request.post('/api/v1/auth/login',{headers:{origin:'http://127.0.0.1:5181'},data:{username,password}});
  await page.goto('/#map');await expect(page.locator('#session-user')).toHaveText('Conta: '+username);
}
async function create(page,{withImage=false,failUpload=false}={}){
  await hudAction(page,'register');const form=page.locator('.occurrence-dialog');
  await form.getByLabel('Descrição fictícia').fill('Descrição de um registro inteiramente fictício E2E.');await form.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.locator('#map').click({position:{x:150,y:130}});await expect(form.getByLabel('Latitude',{exact:true})).not.toHaveValue('');
  await form.getByLabel('Latitude',{exact:true}).fill('-23.94');await form.getByLabel('Longitude',{exact:true}).fill('-46.18');await form.getByRole('button',{name:'Continuar',exact:true}).click();
  if(withImage){
    await form.getByRole('button',{name:'Adicionar imagem'}).click();
    await form.getByLabel('Imagem fictícia 1',{exact:true}).setInputFiles({name:'ficticia.png',mimeType:'image/png',buffer:await sharp({create:{width:16,height:12,channels:3,background:'#40574D'}}).png().toBuffer()});
    await form.getByLabel('Legenda da imagem 1',{exact:true}).fill('<img src=x onerror=alert(1)> Legenda inteiramente fictícia');
  }
  let failed=false;
  if(failUpload)await page.route('**/api/v1/occurrences/*/attachments',route=>{if(route.request().method()==='POST'&&!failed){failed=true;return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{code:'INTERNAL_ERROR',message:'Falha simulada no envio.'}})});}return route.continue();});
  let release,started;const gate=new Promise(resolve=>{release=resolve;}),pending=new Promise(resolve=>{started=resolve;});let requests=0;
  await page.route('**/api/v1/occurrences',async route=>{if(route.request().method()!=='POST')return route.continue();requests++;started();await gate;await route.continue();});
  await form.getByRole('button',{name:'Salvar relato',exact:true}).click();await pending;await expect(form.getByRole('button',{name:'Salvando…'})).toBeDisabled();expect(requests).toBe(1);release();
  if(failUpload){
    await expect(form.locator('#occurrence-message')).toContainText('Registro salvo; anexo não enviado.');
    const list=await page.request.get('/api/v1/occurrences?pageSize=100');const author=(await (await page.request.get('/api/v1/auth/me')).json()).data.id;const saved=(await list.json()).data.find(row=>row.authorId===author);expect(saved).toBeTruthy();
    await expect(form.getByLabel('Descrição fictícia')).toHaveValue('Descrição de um registro inteiramente fictício E2E.');
    await expect(form.getByLabel('Legenda da imagem 1',{exact:true})).toHaveValue('<img src=x onerror=alert(1)> Legenda inteiramente fictícia');
    await form.getByRole('button',{name:'Enviar imagens pendentes'}).click();await expect(form).not.toBeVisible();expect(requests).toBe(1);
    const after=await page.request.get('/api/v1/occurrences?pageSize=100');expect((await after.json()).data.filter(row=>row.authorId===saved.authorId)).toHaveLength(1);await page.unroute('**/api/v1/occurrences/*/attachments');
  }
  await expect(form).not.toBeVisible();await page.unroute('**/api/v1/occurrences');await expect(page.locator('#details')).toBeVisible();return page.url().split('ocorrencia=')[1];
}
test.beforeEach(async({page})=>{await page.route('https://server.arcgisonline.com/**',route=>route.abort());});
async function expectListed(page,id){
  let reopen=false;
  if(await page.locator('#details').isVisible()){
    await page.getByRole('button',{name:'Fechar detalhes',exact:true}).click();
    reopen=true;
  }
  if(await page.locator('#explorer').isHidden())await openFullList(page);
  await expect.poll(async()=>{
    const retry=page.locator('#retry');
    if(await retry.isVisible()){
      // A modal makes the list inert. Recover through the available user flow.
      if(await page.locator('#details').isVisible()){await page.getByRole('button',{name:'Fechar detalhes',exact:true}).click();reopen=true;if(await page.locator('#explorer').isHidden())await openFullList(page);}
      await retry.click();
    }
    return page.locator(`.card[data-id="${id}"]`).count();
  },{timeout:10000}).toBe(1);
  if(reopen){await page.locator(`.card[data-id="${id}"]`).click();await expect(page.locator('#details')).toBeVisible();}
}
test('criar com coordenadas manuais, editar e recarregar preserva relato e histórico',async({page})=>{
  await login(page);await openAdvancedFilters(page);await page.selectOption('#category','agua');await expect(page.locator('.card')).toHaveCount(1);const id=await create(page,{withImage:true});await expect(page.locator('#category')).toHaveValue('');await expectListed(page,id);const editedTitle=`Título fictício alterado ${id}`;const details=page.locator('#details');await expect(details).toContainText('Recebida');await expect(details).toContainText('Registro criado');
  await details.getByRole('button',{name:'Editar relato',exact:true}).click();const form=page.locator('.occurrence-dialog');await form.getByLabel('Título (opcional)',{exact:true}).fill(editedTitle);await form.getByLabel('Descrição fictícia').fill('<img src=x onerror=alert(1)> Relato inteiramente fictício.');await form.getByRole('button',{name:'Continuar',exact:true}).click();await form.getByRole('button',{name:'Continuar',exact:true}).click();await form.getByRole('button',{name:'Salvar relato',exact:true}).click();await expect(form).not.toBeVisible();await expect(details.locator('#detail-title')).toHaveText(editedTitle);await expect(details).toContainText('Registro editado');
  await expect(details).toContainText('<img src=x onerror=alert(1)>');await expect(details.locator('img')).toHaveCount(1);await expect(details.getByRole('img',{name:'<img src=x onerror=alert(1)> Legenda inteiramente fictícia',exact:true})).toBeVisible();await expect(details.locator('figcaption')).toHaveText('<img src=x onerror=alert(1)> Legenda inteiramente fictícia');
  await page.reload();await expectListed(page,id);await expect(page.locator(`.occurrence-marker[title="${editedTitle}"]`)).toHaveCount(1);await expect(details.locator('#detail-title')).toHaveText(editedTitle);await expect(details).toContainText(id);await expect(details).toContainText('Registro editado');expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(details.locator('figcaption')).toHaveText('<img src=x onerror=alert(1)> Legenda inteiramente fictícia');await details.getByRole('button',{name:'Retirar imagem'}).click();await expect(details).toContainText('Imagem retirada ou indisponível.');await expect(details.locator('img')).toHaveCount(0);
});
test('erros junto aos campos, conflito exige revisão e sessão perdida preserva rascunho',async({page})=>{
  await login(page);await page.setViewportSize({width:360,height:800});await hudAction(page,'register');await page.evaluate(()=>{document.documentElement.style.zoom='2';});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>{document.documentElement.style.zoom='1';});const form=page.locator('.occurrence-dialog');await form.getByLabel('Descrição fictícia').fill('curto');await form.getByRole('button',{name:'Continuar',exact:true}).click();await form.getByLabel('Latitude',{exact:true}).fill('-23.94');await form.getByLabel('Longitude',{exact:true}).fill('-46.18');await form.getByRole('button',{name:'Continuar',exact:true}).click();await form.getByRole('button',{name:'Salvar relato',exact:true}).click();await expect(form.locator('#occurrence-description-error')).toContainText('20');await expect(form.locator('#occurrence-message')).toBeFocused();await form.getByRole('button',{name:'Fechar formulário'}).click();
  const id=await create(page,{withImage:true,failUpload:true});await page.locator('#details').getByRole('button',{name:'Editar relato',exact:true}).click();await form.getByLabel('Título (opcional)',{exact:true}).fill('Rascunho fictício preservado');await form.getByRole('button',{name:'Continuar',exact:true}).click();await form.getByRole('button',{name:'Continuar',exact:true}).click();
  const response=await page.request.patch('/api/v1/occurrences/'+id,{headers:{origin:'http://127.0.0.1:5181'},data:{expectedVersion:2,changes:{title:'Mudança concorrente fictícia'}}});expect(response.status()).toBe(200);
  await form.getByRole('button',{name:'Salvar relato',exact:true}).click();await expect(form.locator('#occurrence-message')).toContainText('mudou');await expect(form.getByRole('button',{name:'Salvar relato',exact:true})).toBeDisabled();await expect(form.getByLabel('Título (opcional)',{exact:true})).toHaveValue('Rascunho fictício preservado');
  await form.getByRole('button',{name:'Recarregar ocorrência para revisão'}).click();await expect(form).toContainText('Mudança concorrente fictícia');await form.getByRole('button',{name:'Revisei; usar esta versão'}).click();await expect(form.getByRole('button',{name:'Salvar relato',exact:true})).toBeEnabled();
  await page.context().clearCookies();await form.getByRole('button',{name:'Salvar relato',exact:true}).click();await expect(form.locator('#occurrence-message')).toContainText('Entre');await expect(form.getByLabel('Título (opcional)',{exact:true})).toHaveValue('Rascunho fictício preservado');
  await form.getByRole('button',{name:'Entrar para continuar'}).click();await expect(page.locator('.auth-dialog')).toBeVisible();await page.locator('.auth-dialog').getByRole('button',{name:'Fechar autenticação'}).click();await expect(form).toBeVisible();
});
