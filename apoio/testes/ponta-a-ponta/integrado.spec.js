import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {test,expect,devices} from '@playwright/test';
import { hudAction, openFullList, openAdvancedFilters, openFullProfile, openHistory, hudRegister } from './painel.js';

// Cada banco isolado por dispositivo executa uma jornada completa. Nenhuma escrita
// direta na API substitui cadastro, contribuições ou decisões administrativas.
test('ciclo integrado entre cinco contas, upload parcial e decisões distintas de reabertura',async({browser},info)=>{
 test.setTimeout(120000);
 const mobile=info.project.name.endsWith('mobile'),origin=info.project.use.baseURL;
 const accounts=JSON.parse(readFileSync(process.env[`CUIDACAO_E2E_INTEGRATED_${mobile?'MOBILE':'DESKTOP'}_CREDENTIALS`],'utf8'));
 const contexts=[];
 async function actor(account,register=false){
  const context=await browser.newContext({...devices[mobile?'Pixel 7':'Desktop Chrome'],baseURL:origin});contexts.push(context);
  await context.route('https://server.arcgisonline.com/**',route=>route.abort());
  const page=await context.newPage();await page.goto('/#map');
  const nav=page.locator('.auth-nav'),auth=page.locator('.auth-dialog');
  await openFullProfile(page);await page.locator('#account-panel').getByRole('button',{name:register?'Criar conta':'Entrar',exact:true}).click();
  await auth.getByLabel('Nome de usuário fictício').fill(account.username);await auth.getByLabel('Senha',{exact:true}).fill(account.password);
  if(register){await auth.getByLabel('Confirmar senha').fill(account.password);await auth.getByRole('button',{name:'Criar conta',exact:true}).click();await expect(auth.locator('#auth-message')).toContainText('Conta criada');await auth.getByLabel('Senha',{exact:true}).fill(account.password);}
  await auth.getByRole('button',{name:'Entrar',exact:true}).click();await expect(auth).not.toBeVisible();await expect(nav.locator('#session-user')).toHaveText('Conta: '+account.username);return page;
 }
 const get=async(page,path)=>{const response=await page.request.get('/api/v1/'+path);expect(response.status()).toBe(200);return response.json();};
 const detail=async(page,id)=>{await page.goto('/#ocorrencia='+id);await page.reload();await expect(page.locator('#details')).toBeVisible();await expect(page.locator('#details')).toContainText(id);};
 async function contribution(page,id,type,text,kind){
  await detail(page,id);await page.getByRole('button',{name:type==='comment'?'Comentar':type==='reopen_request'?'Pedir reabertura':'Acrescentar complemento',exact:true}).click();const form=page.locator('.contribution-dialog');
  if(kind)await form.getByLabel('Tipo de complemento').selectOption(kind);
  await form.getByLabel('Texto fictício da contribuição').fill(text);await form.getByRole('button',{name:'Publicar contribuição',exact:true}).click();await expect(form).not.toBeVisible();
  const rows=(await get(page,`occurrences/${id}/contributions?pageSize=100`)).data.filter(row=>row.text===text);expect(rows).toHaveLength(1);return rows[0];
 }
 async function transition(page,id,to,configure=async()=>{}){
  await detail(page,id);await page.getByRole('button',{name:'Mudar estado',exact:true}).click();const form=page.locator('.transition-dialog');await expect(form.locator('#transition-message')).toContainText('Requisitos carregados');
  await form.getByLabel('Novo estado').selectOption(to);await form.getByLabel('Justificativa da mudança').fill('Revisão integrada fictícia, independente dos autores e participantes.');await configure(form);
  await form.getByRole('button',{name:'Registrar mudança',exact:true}).click();await expect(form).not.toBeVisible();expect((await get(page,'occurrences/'+id)).data.status).toBe(to);
 }
 try{
  const fictitious=()=>({username:'fluxo_'+randomUUID().replaceAll('-','').slice(0,18),password:randomUUID()+'aA1!'});
  const authorAccount=fictitious(),observerAccount=fictitious(),challengerAccount=fictitious();
  const author=await actor(authorAccount,true),observer=await actor(observerAccount,true),challenger=await actor(challengerAccount,true);
  const administrator=await actor(accounts.find(row=>row.username==='admin_demo_1')),reviewer=await actor(accounts.find(row=>row.username==='admin_demo_2'));
  const png=await sharp({create:{width:16,height:12,channels:3,background:'#40574d'}}).png().toBuffer();
  await hudAction(author,'register');const form=author.locator('.occurrence-dialog');
  const title='Ciclo integrado fictício '+(mobile?'mobile':'desktop'),description='<b>Relato fictício do ciclo integrado com localização manual.</b>';
  await form.getByLabel('Título (opcional)',{exact:true}).fill(title);await form.getByLabel('Categoria',{exact:true}).selectOption('agua');await form.getByLabel('Descrição fictícia').fill(description);await form.getByRole('button',{name:'Continuar',exact:true}).click();await form.getByLabel('Latitude',{exact:true}).fill('-23.94');await form.getByLabel('Longitude',{exact:true}).fill('-46.18');await form.getByRole('button',{name:'Continuar',exact:true}).click();
  for(let index=1;index<=2;index++){await form.getByRole('button',{name:'Adicionar imagem',exact:true}).click();await form.getByLabel('Imagem fictícia '+index,{exact:true}).setInputFiles({name:'ficticia.png',mimeType:'image/png',buffer:png});await form.getByLabel('Legenda da imagem '+index,{exact:true}).fill('Imagem fictícia integrada '+index);}
  let creations=0,uploads=0;
  await author.route('**/api/v1/occurrences',route=>{if(route.request().method()==='POST')creations++;return route.continue();});
  await author.route('**/api/v1/occurrences/*/attachments',route=>{if(route.request().method()==='POST'&&++uploads===2)return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{message:'Falha simulada na segunda imagem.'}})});return route.continue();});
  await form.getByRole('button',{name:'Salvar relato',exact:true}).click();await expect(form.locator('#occurrence-message')).toContainText('Registro salvo; anexo não enviado.');await expect(form.getByLabel('Descrição fictícia')).toHaveValue(description);
  const root=(await get(author,'occurrences?pageSize=100')).data.find(row=>row.title===title);expect(root).toBeTruthy();const id=root.id;
  expect((await get(author,`occurrences/${id}/attachments`)).data).toHaveLength(1);
  await form.getByRole('button',{name:'Enviar imagens pendentes',exact:true}).click();await expect(form).not.toBeVisible();expect(creations).toBe(1);expect(uploads).toBe(3);await author.unroute('**/api/v1/occurrences');await author.unroute('**/api/v1/occurrences/*/attachments');
  const images=(await get(author,`occurrences/${id}/attachments`)).data;expect(images).toHaveLength(2);for(const image of images)expect((await author.request.get(image.fileUrl)).status()).toBe(200);
  await expect(author.locator('#details')).toContainText(description);await expect(author.locator('#details b')).toHaveCount(0);
    await author.getByRole('button',{name:'Fechar detalhes',exact:true}).click();await openFullList(author);await expect(author.locator(`.card[data-id="${id}"]`)).toBeVisible();await author.locator(`.card[data-id="${id}"]`).click();await expect(author.locator('#detail-title')).toHaveText(title);await author.getByRole('button',{name:'Fechar detalhes',exact:true}).click();await author.getByRole('button',{name:'Fechar ocorrências',exact:true}).click();
  await author.locator(`.occurrence-marker[title="${title}"]`).click();await author.getByRole('button',{name:'Ver detalhes',exact:true}).click();await expect(author.locator('#detail-title')).toHaveText(title);await detail(observer,id);
  await transition(administrator,id,'community_review');
  const comment=await contribution(observer,id,'comment','<i>Comentário fictício de outra conta no fluxo integrado.</i>');
  const observation=await contribution(observer,id,'supplement','Observação fictícia independente sobre a situação no local.','observation');
  for(const [page,type,reason] of [[observer,'Apoiar','Apoio fictício independente para revisão integrada.'],[challenger,'Contestar','Contestação fictícia independente a ser examinada.']]){
   await detail(page,id);await page.getByRole('button',{name:type,exact:true}).click();const stance=page.locator('.stance-dialog');await stance.getByLabel('Justificativa fictícia').fill(reason);await stance.getByRole('button',{name:'Salvar posição',exact:true}).click();await expect(stance).not.toBeVisible();
  }
  const positions=await get(observer,`occurrences/${id}/stances`);expect(positions.data).toHaveLength(2);expect((await get(observer,'occurrences/'+id)).data.status).toBe('community_review');
  await transition(administrator,id,'confirmed',async dialog=>{await dialog.locator('input[type=checkbox]').first().check();await dialog.getByLabel(/Parecer sobre contestação/).fill('Parecer fictício individual após comparar a contestação e o suporte.');});
  await transition(administrator,id,'monitoring',dialog=>dialog.getByLabel('Complemento de atualização').selectOption(observation.id));
  const resolution=await contribution(observer,id,'supplement','Informação fictícia de resolução observada durante acompanhamento.','resolution');expect((await get(observer,'occurrences/'+id)).data.status).toBe('monitoring');
  await transition(administrator,id,'closed',dialog=>dialog.getByLabel('Complemento de resolução').selectOption(resolution.id));
  await detail(author,id);await expect(author.getByRole('region',{name:'Encerramento da ocorrência'})).toContainText(resolution.text);await expect(author.getByRole('region',{name:'Encerramento da ocorrência'})).toContainText('admin_demo_1');await expect(author.locator('.timeline')).toContainText('Acompanhamento → Encerrada');
  const closed=(await get(author,'occurrences/'+id)).data;expect(closed.closure.resolution.id).toBe(resolution.id);expect(closed.closureReason).toBe('resolved');expect((await get(author,`occurrences/${id}/contributions`)).data.find(row=>row.id===comment.id).text).toBe(comment.text);
  const request=await contribution(observer,id,'reopen_request','Fato novo fictício após encerramento para nova revisão independente.');expect((await get(observer,'occurrences/'+id)).data.status).toBe('closed');
  await transition(administrator,id,'community_review',dialog=>dialog.getByLabel('Pedido com fato novo').selectOption(request.id));expect((await get(observer,`occurrences/${id}/contributions`)).data.find(row=>row.id===request.id).requestStatus).toBe('accepted');
  // Um registro separado, já encerrado, exercita a rejeição sem encerrar novamente
  // nem sobrescrever a primeira solicitação. Outro administrador toma as decisões.
  const rejected=await contribution(challenger,'CA-004','reopen_request','Outro fato novo fictício em cenário separado de rejeição.');
  await reviewer.goto('/#administracao');await reviewer.reload();const admin=reviewer.locator('[aria-labelledby="admin-title"]');await admin.getByRole('button',{name:'Pedidos de reabertura',exact:true}).click();await admin.locator('article').filter({hasText:rejected.text}).getByRole('button',{name:'Revisar pedido',exact:true}).click();await admin.getByRole('button',{name:'Rejeitar pedido',exact:true}).click();const action=reviewer.locator('.admin-action-dialog');await action.getByLabel('Justificativa').fill('Rejeição fictícia independente após revisar o fato novo apresentado.');await action.getByRole('button',{name:'Registrar ação',exact:true}).click();await expect(action).not.toBeVisible();
  expect((await get(challenger,'occurrences/CA-004')).data.status).toBe('closed');expect((await get(challenger,'occurrences/CA-004/contributions')).data.find(row=>row.id===rejected.id).requestStatus).toBe('rejected');
  await author.context().clearCookies();await detail(author,id);await expect(author.getByRole('button',{name:'Mudar estado',exact:true})).toHaveCount(0);await expect(author.locator('#details')).toContainText(comment.text);await expect(author.locator('#details i')).toHaveCount(0);await expect(author.locator('#details')).toContainText('Encerrada → Verificação comunitária');expect((await get(author,`occurrences/${id}/attachments`)).data).toHaveLength(2);
 }finally{await Promise.all(contexts.map(context=>context.close()));}
});
