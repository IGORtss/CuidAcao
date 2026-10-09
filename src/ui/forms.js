import {api} from '../services/api.js';
export function mountForms({container,onChange,pickPoint}) {
  const controls=document.createElement('div');
  controls.innerHTML=`<p id="account-state" role="status">Consultando sessão…</p><button id="login-open">Entrar</button> <button id="register-open">Criar conta</button> <button id="logout" hidden>Sair</button> <button id="create-open" hidden>Registrar ocorrência</button><p id="account-error" role="alert"></p>`;
  container.append(controls);
  const auth=document.createElement('dialog');
  auth.innerHTML=`<h2 id="auth-title">Entrar</h2><p>Simulação acadêmica: use um nome fictício e uma senha exclusiva para este protótipo.</p><form id="auth-form"><label>Nome de usuário <input name="username" required minlength="3" maxlength="30" autocomplete="username"></label><label>Senha <input type="password" name="password" required minlength="12" maxlength="128" autocomplete="current-password"></label><label id="confirm-label" hidden>Confirmar senha <input type="password" name="confirmation" autocomplete="new-password"></label><p id="auth-error" role="alert"></p><button type="submit">Entrar</button> <button type="button" id="auth-close">Fechar</button></form>`;
  auth.setAttribute('aria-labelledby','auth-title');
  const editor=document.createElement('dialog');
  editor.innerHTML=`<h2 id="editor-title">Registrar ocorrência</h2><p>Dados fictícios · Área aproximada de demonstração. Este recorte não é o limite oficial do Perequê.</p><form id="occurrence-form"><label>Categoria <select name="category"><option value="residuos">Resíduos</option><option value="agua">Água</option></select></label><label>Título (opcional) <input name="title" minlength="5" maxlength="100"></label><label>Descrição <textarea name="description" required minlength="20" maxlength="3000"></textarea></label><label>Referência do local (opcional) <input name="locationLabel" maxlength="120"></label><label>Latitude <input type="number" name="latitude" step="any" required min="-23.95" max="-23.925"></label><label>Longitude <input type="number" name="longitude" step="any" required min="-46.195" max="-46.165"></label><button type="button" id="pick-point">Escolher ponto no mapa</button><p id="point-status" role="status"></p><p>Antes de registrar, consulte a lista para verificar se já existe um relato sobre o mesmo problema. O envio de imagens será implementado na próxima etapa.</p><p id="editor-error" role="alert"></p><button type="submit">Salvar ocorrência</button> <button type="button" id="editor-close">Fechar</button></form>`;
  editor.setAttribute('aria-labelledby','editor-title');document.body.append(auth,editor);
  const $=id=>document.getElementById(id),authForm=$('auth-form'),form=$('occurrence-form');
  let user=null,mode='login',editing=null,originFocus=null,pending=false,resumeEditor=false;
  function message(target,error) {target.textContent=[error.message,...Object.values(error.fields??{})].join(' ');}
  function updateUser(value) {
    user=value;$('account-state').textContent=user ? `Conta fictícia: ${user.username} · ${user.role==='admin'?'Administrador':'Usuário'}`:'Consulta pública · visitante';
    $('login-open').hidden=!!user;$('register-open').hidden=!!user;$('logout').hidden=!user;$('create-open').hidden=!user;
  }
  function openAuth(value) {
    mode=value;originFocus=document.activeElement;$('auth-error').textContent='';
    $('auth-title').textContent=value==='register'?'Criar conta':'Entrar';authForm.querySelector('[type=submit]').textContent=$('auth-title').textContent;
    $('confirm-label').hidden=value!=='register';authForm.elements.confirmation.required=value==='register';
    authForm.elements.password.autocomplete=value==='register'?'new-password':'current-password';
    auth.showModal();
  }
  $('login-open').onclick=()=>openAuth('login');$('register-open').onclick=()=>openAuth('register');$('auth-close').onclick=()=>auth.close();
  auth.addEventListener('close',()=>{authForm.elements.password.value='';authForm.elements.confirmation.value='';if(originFocus?.isConnected)originFocus.focus();});
  authForm.onsubmit=async event=>{
    event.preventDefault();if(pending)return;
    $('auth-error').textContent='';
    if (mode==='register' && authForm.elements.password.value!==authForm.elements.confirmation.value) {message($('auth-error'),new Error('As senhas precisam ser iguais.'));return;}
    pending=true;const button=authForm.querySelector('[type=submit]');button.disabled=true;
    try {
      const response=await api(`/auth/${mode}`,{method:'POST',body:{username:authForm.elements.username.value,password:authForm.elements.password.value}});
      if (mode==='register') {
        authForm.elements.username.value=response.data.username;authForm.elements.password.value='';authForm.elements.confirmation.value='';
        mode='login';$('auth-title').textContent='Conta criada. Entre para continuar.';button.textContent='Entrar';$('confirm-label').hidden=true;authForm.elements.confirmation.required=false;authForm.elements.password.autocomplete='current-password';authForm.elements.password.focus();
      } else {updateUser(response.data);auth.close();if(resumeEditor){resumeEditor=false;editor.showModal();$('editor-error').textContent='Sessão recuperada. Revise seu rascunho e envie novamente.';}else await onChange();}
    } catch(error) {message($('auth-error'),error);} finally {pending=false;button.disabled=false;}
  };
  $('logout').onclick=async()=>{
    if(pending)return;pending=true;$('logout').disabled=true;
    try {await api('/auth/logout',{method:'POST',body:{}});updateUser(null);await onChange();}catch(error){message($('account-error'),error);}finally{pending=false;$('logout').disabled=false;}
  };
  function openEditor(item=null) {
    editing=item;originFocus=document.activeElement;form.reset();$('editor-error').textContent='';$('point-status').textContent='';
    $('editor-title').textContent=item?'Editar relato':'Registrar ocorrência';
    if(item) for(const key of ['category','title','description','locationLabel','latitude','longitude'])form.elements[key].value=key==='category'?item.categoryCode:item[key];
    editor.showModal();
  }
  $('create-open').onclick=()=>openEditor();$('editor-close').onclick=()=>editor.close();
  editor.addEventListener('close',()=>{if(originFocus?.isConnected)originFocus.focus();});
  $('pick-point').onclick=()=>{
    editor.close();$('account-state').textContent='Clique no mapa para escolher o ponto da ocorrência.';
    pickPoint(({lat,lng})=>{
      form.elements.latitude.value=lat.toFixed(6);form.elements.longitude.value=lng.toFixed(6);updateUser(user);$('point-status').textContent='Ponto selecionado. Confira as coordenadas e a área permitida.';editor.showModal();
    });
  };
  form.onsubmit=async event=>{
    event.preventDefault();if(pending)return;pending=true;const button=form.querySelector('[type=submit]');button.disabled=true;$('editor-error').textContent='';
    const input={};
    for(const key of ['category','title','description','locationLabel'])if(form.elements[key].value!=='' || key==='description')input[key]=form.elements[key].value;
    for(const key of ['latitude','longitude'])input[key]=Number(form.elements[key].value);
    try {
      const response=await api(editing?`/occurrences/${editing.id}`:'/occurrences',{method:editing?'PATCH':'POST',body:editing?{expectedVersion:editing.version,changes:input}:input});
      editor.close();await onChange(response.data.id);
    }catch(error){
      message($('editor-error'),error);
      if(error.status===401) {updateUser(null);resumeEditor=true;editor.close();openAuth('login');$('auth-error').textContent='Sua sessão expirou. Entre novamente; seu rascunho foi preservado na memória desta página.';}
      if(error.status===409) $('editor-error').textContent+=' Feche e consulte a versão atual antes de editar novamente.';
    }finally{pending=false;button.disabled=false;}
  };
  api('/auth/me').then(async response=>{updateUser(response.data);await onChange();}).catch(error=>{updateUser(null);if(error.status!==401)message($('account-error'),error);});
  return {edit:openEditor,getUser:()=>user};
}
