/** Recuperação e verificação compartilham o diálogo e os campos existentes. */
const node = (tag,text='') => {const element=document.createElement(tag);element.textContent=text;return element;};
export function mountAccountEmail({onReset} = {}) {
 const dialog=node('dialog');dialog.className='auth-dialog';dialog.setAttribute('aria-labelledby','account-email-title');
 const head=node('div');head.className='dialog-head';const title=node('h2');title.id='account-email-title';
 const close=node('button','Fechar ×');close.type='button';close.className='secondary';close.setAttribute('aria-label','Fechar gerenciamento de conta');head.append(title,close);
 const message=node('p');message.setAttribute('role','status');message.tabIndex=-1;
 const form=node('form');
 function field(id,label,type,autocomplete) {const wrap=node('div'),caption=node('label',label),input=node('input');caption.htmlFor=id;input.id=id;input.type=type;input.autocomplete=autocomplete;input.required=true;wrap.append(caption,input);form.append(wrap);return input;}
 const email=field('account-recovery-email','E-mail da conta','email','email');email.maxLength=254;
 const password=field('account-new-password','Nova senha','password','new-password');password.minLength=8;password.maxLength=128;
 const confirmation=field('account-new-confirmation','Confirmar nova senha','password','new-password');confirmation.maxLength=128;
 const submit=node('button');submit.type='submit';form.append(submit);dialog.append(head,message,form);document.body.append(dialog);
 let mode='request',token=null,busy=false,origin=null;
 async function request(path,data) {
  let response;
  try {response=await fetch('/api/v1/auth/'+path,{method:data===undefined?'GET':'POST',credentials:'same-origin',headers:data===undefined?{Accept:'application/json'}:{'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});}
  catch {throw new Error('Não foi possível conectar à API. Tente novamente.');}
  if (!response.ok) {let body;try{body=await response.json();}catch{}throw new Error(body?.error?.message??'Não foi possível concluir. Tente novamente.');}
  return response.status===204?null:(await response.json()).data;
 }
 function status(text,error=false) {message.textContent=text;message.setAttribute('role',error?'alert':'status');if(error)message.focus();}
 function setBusy(value) {busy=value;for(const control of [...form.elements,close])control.disabled=value;form.setAttribute('aria-busy',String(value));}
 async function open(next='request',value=null) {
  if(busy)return;
  mode=next;token=value;origin=document.activeElement;password.value='';confirmation.value='';email.value='';status('');
  title.textContent=mode==='reset'?'Redefinir senha':mode==='verify'?'Verificar e-mail':mode==='account'?'E-mail da conta':'Recuperar senha';
  email.parentElement.hidden=mode!=='request';email.required=mode==='request';
  for(const input of [password,confirmation]) {input.parentElement.hidden=mode!=='reset';input.required=mode==='reset';}
  submit.textContent=mode==='reset'?'Salvar nova senha':mode==='verify'?'Confirmar e-mail':mode==='account'?'Enviar verificação':'Solicitar recuperação';
  submit.hidden=false;if(!dialog.open)dialog.showModal();
  if(mode==='request')email.focus();else submit.focus();
  if(mode==='account'||mode==='request') {
   setBusy(true);
   try {
    const info=await request(mode==='account'?'account':'account/config');
    if(mode==='account') {status(info.email?`${info.email} · ${info.verified?'Verificado':'Ainda não verificado'}`:'Conta sem e-mail local. Contas Google são gerenciadas no Google.');submit.hidden=!info.email||info.verified;}
    if(!info.emailEnabled) {submit.hidden=true;status('Envio de e-mail indisponível nesta instalação. Cadastro e login continuam disponíveis.');}
   } catch(error){submit.hidden=true;status(error.message,true);}finally{setBusy(false);}
  }
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  if(mode==='reset'&&password.value!==confirmation.value){status('As senhas não coincidem.',true);return;}
  setBusy(true);
  try {
   if(mode==='request')await request('password/request',{email:email.value});
   if(mode==='reset')await request('password/reset',{token,password:password.value});
   if(mode==='verify')await request('email/verify',{token});
   if(mode==='account')await request('email/request',{});
   status(mode==='request'?'Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha.':mode==='reset'?'Senha alterada. Entre novamente com a nova senha.':mode==='verify'?'E-mail verificado.':'Solicitação de verificação enviada ao serviço de e-mail.');
   if(mode==='reset'){token=null;password.value='';confirmation.value='';onReset?.();}
   submit.hidden=true;
  }catch(error){status(error.message,true);}finally{setBusy(false);}
 });
 close.addEventListener('click',()=>{if(!busy)dialog.close();});
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 dialog.addEventListener('close',()=>{token=null;password.value='';confirmation.value='';origin?.isConnected&&origin.focus();});
 const match=location.hash.match(/^#account-(reset|verify)=([A-Za-z0-9_-]{43})$/);
 if(match){history.replaceState(null,'',location.pathname+location.search+'#map');queueMicrotask(()=>open(match[1],match[2]));}
 return {openRecovery:()=>open('request'),openAccount:()=>open('account')};
}
