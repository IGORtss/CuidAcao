import './style.css';
import {categoryLabels, statusLabels, selectedId, formatDate} from './domain.js';
import {createOccurrenceClient, createRequestScope} from './services/occurrences.js';
import {createMap} from './map.js';

const app = document.querySelector('#app');
app.innerHTML = `<a class="skip" href="#list-heading">Ir para ocorrências</a>
<header><a class="brand" href="#">Cuid<span>Ação</span><small>MONITORAMENTO COMUNITÁRIO</small></a><div class="territory">Perequê <span>Guarujá · SP</span></div></header>
<div class="simulation">PROTÓTIPO DE TCC <span>Todos os registros são fictícios e as localizações são ilustrativas.</span></div>
<main><section class="intro"><p class="eyebrow">UM OLHAR PARA O NOSSO BAIRRO</p><h1>O território conta.<br><span>A comunidade acompanha.</span></h1><p>Explore os registros ambientais do Perequê e acompanhe a história de cada ocorrência.</p></section>
<section class="explorer" aria-label="Consulta de ocorrências"><div class="toolbar"><div><label for="category">Categoria</label><select id="category"><option value="">Todas as categorias</option></select></div><div><label for="status">Estado da ocorrência</label><select id="status"><option value="">Todos os estados</option></select></div><button class="secondary" id="reset">Limpar filtros</button></div>
<div class="workspace"><section class="map-section" aria-label="Mapa do Perequê"><div class="map-top"><span>REGISTROS NO TERRITÓRIO</span><button id="fit" class="secondary">Ver todas no mapa</button></div><div id="map" role="region" aria-label="Mapa interativo de ocorrências simuladas"></div><p id="tile-error" role="status" hidden>O fundo do mapa está indisponível. Consulte as ocorrências pela lista.</p><div class="legend"><span><i class="dot waste"></i>Resíduos</span><span><i class="dot water"></i>Água</span><span>Localizações ilustrativas</span></div></section>
<section class="list-section" aria-labelledby="list-heading"><div class="list-head"><h2 id="list-heading" tabindex="-1">Ocorrências</h2><span id="count" aria-live="polite"></span></div><p id="list-status" role="status" hidden></p><button id="retry" class="secondary" hidden>Tentar novamente</button><div id="list"></div><div id="empty" hidden><p>Nenhuma ocorrência corresponde aos filtros.</p><button id="empty-reset">Limpar filtros</button></div></section></div></section>
<p class="context">Relatos da comunidade ajudam a acompanhar o território. Não substituem análises técnicas ou laudos ambientais.</p></main>
<footer><strong>CuidAção</strong><span>Perequê, Guarujá · Demonstração acadêmica</span></footer>
<dialog id="details" aria-labelledby="detail-title"><div class="dialog-head"><span class="eyebrow">OCORRÊNCIA SIMULADA</span><button id="close" class="secondary" aria-label="Fechar detalhes">Fechar ×</button></div><div id="detail-body"></div></dialog>`;
const $ = id => document.getElementById(id);
function el(tag, text, className) { const node = document.createElement(tag); node.textContent = text; if (className) node.className=className; return node; }
for (const [code,label] of Object.entries(categoryLabels)) $('category').append(new Option(label,code));
for (const [code,label] of Object.entries(statusLabels)) $('status').append(new Option(label,code));
const client=createOccurrenceClient();
const listScope=createRequestScope(), detailScope=createRequestScope();
const map=createMap($('map'),select,()=>{$('tile-error').hidden=false;});
let returnFocus=null, currentDetail=null, filterRevision=0;
function select(id,source) {returnFocus={id,...source};location.hash=`ocorrencia=${id}`;}
function matches(item) {return (!$('category').value || item.categoryCode===$('category').value) && (!$('status').value || item.statusCode===$('status').value);}
async function renderList() {
  const request=listScope.begin();
  $('list').replaceChildren();map.show([]);$('count').textContent='—';$('empty').hidden=true;$('retry').hidden=true;
  $('list-status').hidden=false;$('list-status').textContent='Carregando ocorrências…';$('list').setAttribute('aria-busy','true');
  try {
    const items=await client.list({category:$('category').value,status:$('status').value,signal:request.signal});
    if(!request.isCurrent())return;
    for(const item of items) {
      const card=el('button','', 'card');card.dataset.id=item.id;
      card.append(el('span',`${item.id} · ${item.category}`,'card-meta'),el('strong',item.title),el('span',item.status,'badge'),el('span',`${item.locationLabel??'Localização ilustrativa'} →`,'card-location'));
      card.addEventListener('click',()=>select(item.id,{kind:'card',element:card}));$('list').append(card);
    }
    map.show(items);map.fit();if(currentDetail)map.focus(currentDetail.id);
    $('count').textContent=`${items.length} registro${items.length===1?'':'s'}`;$('empty').hidden=items.length>0;$('list-status').hidden=true;
  } catch(error) {
    if(!request.isCurrent())return;
    $('list-status').textContent=error.message;$('retry').hidden=false;
  } finally {if(request.isCurrent())$('list').setAttribute('aria-busy','false');}
}
function filtersChanged() {filterRevision++;if(currentDetail && !matches(currentDetail))closeDetails();renderList();}
function reset() {$('category').value='';$('status').value='';filtersChanged();}
$('category').addEventListener('change',filtersChanged);$('status').addEventListener('change',filtersChanged);
$('reset').addEventListener('click',reset);$('empty-reset').addEventListener('click',reset);$('fit').addEventListener('click',map.fit);$('retry').addEventListener('click',renderList);
async function syncDetails() {
  const request=detailScope.begin(), revision=filterRevision;
  const id=selectedId(location.hash), body=$('detail-body');currentDetail=null;
  if(!id && !location.hash.startsWith('#ocorrencia=')) {if($('details').open)$('details').close();return;}
  if(!$('details').open && !returnFocus)returnFocus={element:document.activeElement};
  body.replaceChildren();const title=el('h2','Carregando ocorrência…');title.id='detail-title';body.append(title);body.setAttribute('aria-busy','true');
  if(!$('details').open)$('details').showModal();
  try {
    const [item,events]=await Promise.all([client.detail(id,{signal:request.signal}),client.history(id,{signal:request.signal})]);
    if(!request.isCurrent())return;
    if(revision!==filterRevision && !matches(item)){closeDetails();return;}
    currentDetail=item;map.focus(id);body.replaceChildren();title.textContent=item.title;
    body.append(el('p',`${item.id} · ${item.category}`,'card-meta'),title,el('span',item.status,'badge'),el('p',item.description,'description'));
    const dl=document.createElement('dl');
    for(const [label,value] of [['Localização ilustrativa',item.locationLabel??'Não informada'],['Coordenadas',`${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`],['Registrada em',formatDate(item.createdAt)]])dl.append(el('dt',label),el('dd',value));
    body.append(dl,el('p',`Apoios: ${item.counts.support} · Contestações: ${item.counts.contest}`));
    if(item.duplicateOfId) {
      const note=el('p','Esta ocorrência é uma duplicata. ');
      if(item.flags.duplicateTargetUnavailable)note.append(el('span','Registro principal indisponível.'));
      else {const link=el('a',`Consultar ${item.duplicateOfId}`);link.href=`#ocorrencia=${item.duplicateOfId}`;note.append(link);}body.append(note);
    }
    if(item.flags.referencesUnavailable || item.flags.referencesChanged || item.flags.relationsRemoved)body.append(el('p','Há referências indisponíveis, alteradas ou removidas. A decisão requer revisão.'));
    body.append(el('h3','Evidências'),el('p','A consulta de anexos ainda não está disponível nesta etapa.'),el('h3','Histórico simulado'));
    const timeline=el('ol','','timeline');
    for(const event of events){const li=el('li','');li.append(el('small',formatDate(event.date)),el('p',event.text));timeline.append(li);}
    body.append(timeline,el('p','Dados fictícios para apresentação do TCC. A confirmação comunitária não equivale a laudo técnico.','detail-note'));
  } catch(error) {
    if(!request.isCurrent())return;
    body.replaceChildren();title.textContent=[404,422].includes(error.status)?'Ocorrência não encontrada':'Não foi possível carregar a ocorrência';body.append(title,el('p',[404,422].includes(error.status)?'Esse identificador não está disponível.':error.message));
    if(![404,422].includes(error.status)){const retry=el('button','Tentar novamente','secondary');retry.addEventListener('click',syncDetails);body.append(retry);}
  } finally {if(request.isCurrent())body.setAttribute('aria-busy','false');}
}
function closeDetails() {history.replaceState(null,'',location.pathname+location.search);detailScope.cancel();currentDetail=null;$('details').close();}
$('close').addEventListener('click',closeDetails);
$('details').addEventListener('cancel',event=>{event.preventDefault();closeDetails();});
$('details').addEventListener('close',()=>{
  if($('details').open)return;
  const target=returnFocus?.element?.isConnected?returnFocus.element:returnFocus?.kind==='map'?map.getFocusTarget(returnFocus.id):Array.from($('list').children).find(card=>card.dataset.id===returnFocus?.id);
  (target && target!==document.body?target:$('list-heading')).focus();returnFocus=null;
});
window.addEventListener('hashchange',syncDetails);
renderList();syncDetails();
