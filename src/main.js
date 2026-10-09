import './style.css';
import {api, allPages, viewOccurrence} from './services/api.js';
import {mountForms} from './ui/forms.js';
let occurrences = [];
let detailRequest = 0;
import {categories, statuses, filterOccurrences, selectedId, formatDate} from './domain.js';
import {createMap} from './map.js';

const app = document.querySelector('#app');
app.innerHTML = `<a class="skip" href="#list-heading">Ir para ocorrências</a>
<header><a class="brand" href="#">Cuid<span>Ação</span><small>MONITORAMENTO COMUNITÁRIO</small></a><div class="territory">Perequê <span>Guarujá · SP</span></div></header>
<div class="simulation">PROTÓTIPO DE TCC <span>Todos os registros são fictícios e as localizações são ilustrativas.</span></div>
<main><section id="account-controls" aria-label="Conta e registro"></section><p id="api-error" role="alert" hidden></p><button id="api-retry" hidden>Repetir consulta</button><section class="intro"><p class="eyebrow">UM OLHAR PARA O NOSSO BAIRRO</p><h1>O território conta.<br><span>A comunidade acompanha.</span></h1><p>Explore os registros ambientais do Perequê e acompanhe a história de cada ocorrência.</p></section>
<section class="explorer" aria-label="Consulta de ocorrências"><div class="toolbar"><div><label for="category">Categoria</label><select id="category"><option value="">Todas as categorias</option></select></div><div><label for="status">Estado da ocorrência</label><select id="status"><option value="">Todos os estados</option></select></div><button class="secondary" id="reset">Limpar filtros</button></div>
<div class="workspace"><section class="map-section" aria-label="Mapa do Perequê"><div class="map-top"><span>REGISTROS NO TERRITÓRIO</span><button id="fit" class="secondary">Ver todas no mapa</button></div><div id="map" role="region" aria-label="Mapa interativo de ocorrências simuladas"></div><p id="tile-error" role="status" hidden>O fundo do mapa está indisponível. Consulte as ocorrências pela lista.</p><div class="legend"><span><i class="dot waste"></i>Resíduos</span><span><i class="dot water"></i>Água</span><span>Área aproximada de demonstração</span></div></section>
<section class="list-section" aria-labelledby="list-heading"><div class="list-head"><h2 id="list-heading" tabindex="-1">Ocorrências</h2><span id="count" aria-live="polite"></span></div><div id="list"></div><div id="empty" hidden><p>Nenhuma ocorrência corresponde aos filtros.</p><button id="empty-reset">Limpar filtros</button></div></section></div></section>
<p class="context">Relatos da comunidade ajudam a acompanhar o território. Não substituem análises técnicas ou laudos ambientais.</p></main>
<footer><strong>CuidAção</strong><span>Perequê, Guarujá · Demonstração acadêmica</span></footer>
<dialog id="details" aria-labelledby="detail-title"><div class="dialog-head"><span class="eyebrow">OCORRÊNCIA SIMULADA</span><button id="close" class="secondary" aria-label="Fechar detalhes">Fechar ×</button></div><div id="detail-body"></div></dialog>`;
const $ = id => document.getElementById(id);
function el(tag, text, className) { const node = document.createElement(tag); node.textContent = text; if (className) node.className=className; return node; }
for (const value of categories) $('category').append(new Option(value,value));
for (const value of statuses) $('status').append(new Option(value,value));
const map = createMap($('map'), select, () => {$('tile-error').hidden=false;});
let returnFocus = null;
function select(id) { location.hash = `ocorrencia=${id}`; }
function renderList() {
  const items = filterOccurrences(occurrences,$('category').value,$('status').value);
  $('list').replaceChildren(); $('count').textContent = `${items.length} registro${items.length===1?'':'s'}`; $('empty').hidden=items.length>0;
  for (const item of items) {
    const card = document.createElement('button'); card.className='card'; card.dataset.id=item.id;
    card.append(el('span',`${item.id} · ${item.category}`,'card-meta'),el('strong',item.title),el('span',item.status,'badge'),el('span',`${item.locationLabel} →`,'card-location'));
    card.addEventListener('click',()=>select(item.id)); $('list').append(card);
  }
  map.show(items); map.fit();
}
function reset() {$('category').value='';$('status').value='';renderList();}
function changeFilters() {
  const id=selectedId(location.hash);
  if(id && !filterOccurrences(occurrences,$('category').value,$('status').value).some(item=>item.id===id))closeDetails();
  renderList();
}
$('category').addEventListener('change',changeFilters); $('status').addEventListener('change',changeFilters);
$('reset').addEventListener('click',reset); $('empty-reset').addEventListener('click',reset); $('fit').addEventListener('click',map.fit);
async function syncDetails() {
  const request=++detailRequest;
  const id = selectedId(location.hash);
  if (!id && !location.hash.startsWith('#ocorrencia=')) { if ($('details').open) $('details').close(); return; }
  if (!$('details').open) returnFocus=document.activeElement;
  let item=null,detailError=null; const body=$('detail-body');
  try {
    if (id && /^CA-[0-9]{3,6}$/.test(id)) {const response=await api(`/occurrences/${id}`);const events=await allPages(`/occurrences/${id}/history`);item=viewOccurrence(response.data,events);}
  } catch(error) {if(error.status!==404)detailError=error;}
  if(request!==detailRequest)return;
  body.replaceChildren();
  if(detailError){const h=el('h2','Consulta indisponível');h.id='detail-title';const retry=el('button','Repetir consulta da ocorrência');retry.onclick=syncDetails;body.append(h,el('p',detailError.message),retry);}
  else if (!item) {const h=el('h2','Ocorrência não encontrada');h.id='detail-title';body.append(h,el('p','Esse identificador não está disponível na demonstração. Feche os detalhes para voltar ao mapa.'));}
  else {
    map.focus(id);
    const title=el('h2',item.title);title.id='detail-title';
    body.append(el('p',`${item.id} · ${item.category}`,'card-meta'),title,el('span',item.status,'badge'),el('p',item.description,'description'));
    const dl=document.createElement('dl');
    for (const [label,value] of [['Localização ilustrativa',item.locationLabel],['Coordenadas',`${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`],['Registrada em',formatDate(item.createdAt)]]) dl.append(el('dt',label),el('dd',value));
    body.append(dl,el('h3','Evidências'));
    if (!item.evidence.length) body.append(el('p','Nenhuma evidência anexada neste exemplo.'));
    else for (const value of item.evidence) body.append(el('p',value));
    body.append(el('h3','Histórico simulado'));const timeline=document.createElement('ol'); timeline.className='timeline';
    for (const event of item.history) {const li=document.createElement('li');li.append(el('small',formatDate(event.date)),el('p',event.text));timeline.append(li);}body.append(timeline,el('p','Dados fictícios para apresentação do TCC. A confirmação comunitária não equivale a laudo técnico.','detail-note'));
    if (forms.getUser()?.id===item.authorId && item.statusCode==='received' && !item.duplicateOfId && Date.now()-Date.parse(item.createdAt)<=86400000) {
      const edit=el('button','Editar meu relato');edit.onclick=()=>{closeDetails();forms.edit(item);};body.append(edit);
    }
    if(item.duplicateOfId){const link=el('a',`Ver ocorrência principal ${item.duplicateOfId}`);link.href=`#ocorrencia=${item.duplicateOfId}`;body.append(el('p','Este registro é uma duplicata.'),link);}
  }
  if (!$('details').open) $('details').showModal();
}
function closeDetails() { detailRequest++;history.replaceState(null,'',location.pathname+location.search); $('details').close(); }
$('close').addEventListener('click',closeDetails);
$('details').addEventListener('cancel',event=>{event.preventDefault();closeDetails();});
$('details').addEventListener('close',()=>{if(returnFocus?.isConnected) returnFocus.focus();});
window.addEventListener('hashchange',syncDetails);
const forms=mountForms({container:$('account-controls'),onChange:refresh,pickPoint:callback=>map.pickPoint(callback)});
async function refresh(id) {
  $('api-error').hidden=true;$('api-retry').hidden=true;
  try {occurrences=(await allPages('/occurrences')).map(item=>viewOccurrence(item));renderList();if(id){select(id);await syncDetails();}else await syncDetails();}
  catch(error){occurrences=[];renderList();$('api-error').textContent=error.message;$('api-error').hidden=false;$('api-retry').hidden=false;}
}
$('api-retry').onclick=()=>refresh();
refresh();
