/**
 * Estrutura visual da aplicação. A lógica de domínio permanece em main/interface;
 * este módulo define somente a composição editorial e seus pontos de integração.
 */
import siteIconUrl from "../recursos/icone-site.png";

export function renderShell(app) {
	app.innerHTML = `
		<a class="skip" data-direct href="#map">Ir para o mapa</a>
		<a class="skip skip-list" data-direct href="#list-heading">Ir para ocorrências</a>

		<header class="global-header">
			<a class="brand" href="#" aria-label="CuidAção, início"><img id="brand-icon" class="brand-icon" src="${siteIconUrl}" alt="" aria-hidden="true">cuid<span>Ação</span>.</a>
			<p class="header-place">Perequê<br><span>Guarujá · SP</span></p>
			<nav class="site-nav" aria-label="Navegação principal">
				<a id="nav-map" data-direct href="#map" title="Explorar o mapa" data-tooltip="Explorar" aria-label="Explorar o mapa" aria-current="page"><img class="nav-logo-icon" src="${siteIconUrl}" alt="" aria-hidden="true"><span class="nav-label">Explorar</span></a>
				<button id="nav-filters" type="button" title="Camadas e filtros" data-tooltip="Camadas e filtros" aria-label="Camadas e filtros" aria-expanded="false" aria-controls="explorer"><svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg><span class="nav-label">Camadas</span></button>
				<button id="nav-occurrences" type="button" title="Lista de ocorrências" data-tooltip="Lista de ocorrências" aria-label="Lista de ocorrências" aria-expanded="false" aria-controls="explorer"><svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg><span class="nav-label">Lista</span></button>
				<button id="nav-register" type="button" title="Registrar ocorrência" data-tooltip="Registrar ocorrência" aria-label="Registrar ocorrência"><svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span class="nav-label">Registrar</span></button>
				<button id="nav-data" type="button" title="Histórico e análise" data-tooltip="Histórico e análise" aria-label="Histórico e análise" aria-expanded="false" aria-controls="explorer"><svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9m7 10V5m7 14v-7"/><path d="M3 19h18"/></svg><span class="nav-label">Histórico</span></button>
				<button id="nav-account" type="button" title="Conta" data-tooltip="Conta" aria-label="Conta" aria-haspopup="dialog" aria-expanded="false" aria-controls="account-panel"><svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg><span class="nav-label">Conta</span></button>
				<span class="nav-indicator" aria-hidden="true"></span>
			</nav>
		</header>

		<div class="territory-transition">
			<section class="map-section transition-sticky" aria-label="Mapa do Perequê">
				<div class="map-top"><span>02 / CARTOGRAFIA INTERATIVA</span><button id="fit" class="secondary">Ver todas no mapa</button></div>
				<div class="map-surface">
					<div id="map" tabindex="-1" role="region" aria-label="Mapa interativo de ocorrências simuladas"></div>
					<button id="viewport-summary" class="viewport-summary" type="button" aria-controls="list-section" hidden><strong>Perequê</strong><span>Carregando ocorrências nesta área…</span></button>
					<div class="map-utility-controls" aria-label="Controles cartográficos">
						<button id="territory-home" type="button" title="Voltar ao enquadramento do Perequê">⌂ <span>Perequê</span></button>
						<button id="base-layer" type="button" aria-pressed="false" title="Alternar satélite e mapa legível">◫ <span>Mapa legível</span></button>
					</div>
					<section id="place-card" class="context-card" aria-labelledby="place-title" hidden>
						<header><div><small>LUGAR SELECIONADO</small><h2 id="place-title">Ponto no Perequê</h2></div><button id="place-close" type="button" aria-label="Fechar ficha do lugar">×</button></header>
						<p id="place-coordinates"></p><div id="place-summary"></div>
						<div class="context-actions"><button id="place-nearby" type="button">Ver registros próximos</button><button id="place-register" type="button">Registrar aqui</button><button id="place-follow" type="button">Acompanhar este lugar</button><button id="place-copy" type="button">Copiar localização</button><button id="place-investigate" type="button">Investigar esta área</button></div>
						<p id="place-feedback" role="status"></p>
					</section>
					<section id="area-investigation" class="context-card area-investigation" aria-labelledby="area-title" hidden>
						<header><div><small>SELEÇÃO ESPACIAL</small><h2 id="area-title">Investigar esta área</h2></div><button id="area-cancel" type="button" aria-label="Cancelar investigação">×</button></header>
						<p id="area-instruction">Clique em pelo menos três pontos no mapa. Arraste os vértices para editar.</p><div id="area-summary"></div>
						<div class="context-actions"><button id="area-confirm" type="button">Confirmar área</button><button id="area-clear" type="button" class="secondary">Limpar</button><button id="area-list" type="button" class="secondary" hidden>Abrir lista filtrada</button><button id="area-follow" type="button" class="secondary" hidden>Acompanhar área</button></div>
					</section>
					<details class="map-layer-control">
						<summary>Camadas</summary>
						<div aria-label="Camadas ambientais">
							<button type="button" data-layer-toggle="water_quality" aria-pressed="true"><span class="layer-indicator water-quality" aria-hidden="true"></span><span>Qualidade da água</span></button>
							<button type="button" data-layer-toggle="waste" aria-pressed="true"><span class="layer-indicator waste-area" aria-hidden="true"></span><span>Resíduos</span></button>
							<button type="button" data-layer-toggle="erosion" aria-pressed="true"><span class="layer-indicator erosion" aria-hidden="true"></span><span>Erosão</span></button>
							<button type="button" data-layer-toggle="apparent_sewage" aria-pressed="true"><span class="layer-indicator apparent-sewage" aria-hidden="true"></span><span>Esgoto aparente</span></button>
							<button type="button" data-layer-toggle="flooding" aria-pressed="true"><span class="layer-indicator flooding" aria-hidden="true"></span><span>Alagamentos</span></button>
							<button type="button" data-layer-toggle="vegetation" aria-pressed="true"><span class="layer-indicator vegetation" aria-hidden="true"></span><span>Vegetação</span></button>
							<p class="geometry-legend"><span><i class="verified"></i>geometria verificada</span><span><i class="approximate"></i>geometria aproximada</span><small>Relatos, medições e áreas são elementos distintos. Ausência de registro não significa ausência de problema.</small></p>
							<p class="ph-legend" aria-label="Classificação visual de pH"><span><i class="ph-acidic"></i>&lt; 7 ácido</span><span><i class="ph-neutral"></i>7 neutro</span><span><i class="ph-basic"></i>&gt; 7 básico</span><small>Escala química, não avaliação de risco.</small></p>
						</div>
					</details>
					<div class="opening">
						<header class="opening-header">
							<a class="opening-brand" href="#" aria-label="CuidAção, início"><img src="${siteIconUrl}" alt="" aria-hidden="true"><span>cuidAção.</span></a>
							<nav class="opening-nav" aria-label="Navegação da apresentação">
								<a data-direct href="#map">Mapa</a>
								<a data-direct href="#map" aria-label="Ir para a HUD do mapa">HUD do mapa</a>
								<a data-direct href="#list-heading">Ocorrências</a>
								<a data-direct href="#data-summary">Dados</a>
							</nav>
						</header>
						<p class="simulation">SIMULAÇÃO ACADÊMICA <span>Registros fictícios · Área aproximada de demonstração</span></p>
						<section class="intro" aria-labelledby="territory-title">
							<div class="editorial-copy">
								<p class="eyebrow">PEREQUÊ · GUARUJÁ (SP)</p>
								<h1 id="territory-title">Um território em<br>cuidado <em>coletivo.</em></h1>
								<p>Mapeando, acompanhando e discutindo os desafios socioambientais do Perequê.</p>
								<a class="opening-explore" data-direct href="#map"><span>Explorar o mapa</span><i aria-hidden="true"></i><b aria-hidden="true">→</b></a>
							</div>
						</section>
						<div class="opening-cartography" aria-hidden="true"><span class="north">N</span><i></i><p>WGS 84<br>ÁREA APROXIMADA</p></div>
					</div>
				</div>
				<p id="tile-error" role="status" hidden>O fundo do mapa está indisponível. Consulte as ocorrências pela lista.</p>
			</section>
		</div>

		<div id="hud" class="hud is-closed" data-state="closed">
			<button id="hud-trigger" type="button" aria-expanded="false" aria-controls="hud-menu" aria-label="Abrir menu do CuidAção" title="CuidAção — abrir menu">
				<img src="${siteIconUrl}" alt="" aria-hidden="true">
				<span class="hud-brand-title" aria-hidden="true">CuidAção</span>
			</button>
			<nav id="hud-menu" class="hud-menu" aria-label="Menu principal do mapa" hidden>
				<button type="button" data-hud-action="explore" aria-label="Explorar mapa"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/></svg><span><strong>Explorar mapa</strong><small>Voltar à cartografia do Perequê</small></span></button>
				<button type="button" data-hud-action="central" aria-label="Central de ocorrências"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v12H9l-5 4V5z"/><path d="M8 9h8M8 12.5h5"/></svg><span><strong>Central de ocorrências</strong><small>Publicações da comunidade</small></span></button>
				<button type="button" data-hud-action="register" aria-label="Registrar ocorrência"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span><strong>Registrar ocorrência</strong><small>Relatar um problema no Perequê</small></span></button>
				<button type="button" data-hud-action="layers" aria-label="Camadas ambientais" aria-expanded="false" aria-controls="hud-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg><span><strong>Camadas ambientais</strong><small>Categorias, legenda e fundo</small></span></button>
				<button type="button" data-hud-action="data" aria-label="Linha do tempo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9m7 10V5m7 14v-7"/><path d="M3 19h18"/></svg><span><strong>Linha do tempo</strong><small>Histórico, coleções e comparação</small></span></button>
				<div class="hud-menu-separator" role="separator"></div>
				<button type="button" data-hud-action="occurrences" aria-label="Lista de ocorrências" aria-expanded="false" aria-controls="hud-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg><span><strong>Lista de ocorrências</strong><small>Buscar, filtrar e enquadrar</small></span></button>
				<button type="button" data-hud-action="investigate" aria-label="Investigar área"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6l2 3 2-3h6v16H4z"/><path d="M9 13l2 2 4-4"/></svg><span><strong>Investigar área</strong><small>Desenhar um polígono no mapa</small></span></button>
				<button type="button" data-hud-action="account" aria-label="Conta / perfil" aria-expanded="false" aria-controls="hud-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg><span><strong>Conta / perfil</strong><small>Entrar, relatos e acompanhamento</small></span></button>
			</nav>
			<section id="hud-panel" class="hud-panel" aria-labelledby="hud-panel-title" hidden>
				<header class="hud-panel-head">
					<button id="hud-back" type="button" aria-label="Voltar ao menu">←</button>
					<div><p class="hud-eyebrow" id="hud-panel-kicker">CUIDAÇÃO · MAPA</p><h2 id="hud-panel-title" tabindex="-1">Painel</h2></div>
					<button id="hud-close" type="button" aria-label="Fechar painel">×</button>
				</header>
				<div id="hud-panel-body" class="hud-panel-body"></div>
			</section>
		</div>
		<main class="map-interface">
			<section id="explorer" class="explorer" aria-label="Painel de consulta" inert>
				<aside id="filters-panel" class="atlas-tools" aria-label="Filtros" hidden>
					<div class="overlay-panel-heading"><h2>Camadas e filtros</h2><button id="filters-close" class="panel-close" type="button" aria-label="Fechar filtros">×</button></div>
					<div class="toolbar">
						<div><label for="search">Buscar nos relatos</label><input id="search" type="search" placeholder="Título, local ou descrição"></div>
						<div><label for="category">Categoria</label><select id="category"><option value="">Todas as categorias</option></select><div id="category-counts" class="category-counts" aria-live="polite"></div></div>
						<div><label for="status">Estado da ocorrência</label><select id="status"><option value="">Todos os estados</option></select></div>
						<div><label for="period">Período</label><select id="period"><option value="">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></div>
						<fieldset class="mode-switch"><legend>Modo</legend><button type="button" data-mode="occurrences" aria-pressed="true">Ocorrências</button><button type="button" data-mode="measurements" aria-pressed="false">Medições</button></fieldset>
						<fieldset class="layer-switches"><legend>Exibir no mapa</legend><label><input type="checkbox" data-content-layer="occurrences" checked> Relatos</label><label><input type="checkbox" data-content-layer="areas" checked> Áreas e linhas</label><label><input type="checkbox" data-content-layer="measurements" checked> Medições</label></fieldset>
						<div><label for="area-opacity">Transparência das áreas</label><input id="area-opacity" type="range" min="0" max="0.45" step="0.05" value="0.18"></div>
						<button class="secondary" id="reset">Limpar filtros</button>
					</div>
					<div id="filter-chips" class="filter-chips" aria-label="Filtros ativos"></div>
					<div class="panel-share-actions"><button id="share-view" type="button">Compartilhar esta visão</button><button id="save-query" type="button" class="secondary">Salvar consulta</button><p id="share-feedback" role="status"></p></div>
					<div id="empty" hidden><p>Nenhuma ocorrência corresponde aos filtros.</p><button id="empty-reset">Limpar filtros</button></div>
					<p class="atlas-note">Os pontos indicam relatos fictícios dentro da área aproximada de demonstração.</p>
				</aside>
				<section id="list-section" class="list-section" aria-labelledby="list-heading" hidden>
					<div class="list-mast"><div class="list-head"><div><h2 id="list-heading" tabindex="-1">Ocorrências</h2><p class="panel-total"><span id="count" aria-live="polite"></span> no mapa.</p></div><div class="panel-actions"><button id="list-fit" class="secondary" type="button" title="Enquadrar os registros da lista">Ver todas</button><button id="panel-toggle" class="panel-close" type="button" aria-expanded="true" aria-controls="panel-content" aria-label="Recolher lista">−</button><button id="list-close" class="panel-close" type="button" aria-label="Fechar ocorrências">×</button></div></div></div>
					<p id="list-status" role="status" hidden></p><button id="retry" class="secondary" hidden>Tentar novamente</button>
					<div id="panel-content" hidden><p class="panel-criteria">Atividades recentes dos filtros atuais. Sem classificação de gravidade.</p><button id="show-all" class="secondary" aria-expanded="false" aria-controls="list" hidden>Consultar todas as ocorrências</button><div id="list"></div></div>
				</section>
				<section id="data-summary" class="data-summary" aria-labelledby="data-title" hidden>
					<header><div><p class="eyebrow">HISTÓRICO REAL DA BASE · REGISTROS FICTÍCIOS</p><h2 id="data-title" tabindex="-1">Histórico e análise</h2></div><button id="data-close" class="panel-close" type="button" aria-label="Fechar histórico e análise">×</button></header>
					<p class="data-disclaimer">Filtros por data e reconstituição histórica são operações diferentes. Não há imagens aéreas históricas nesta base.</p>
					<dl id="data-metrics" aria-live="polite"></dl>
					<section class="collections"><h3>Coleções temáticas</h3><div><button type="button" data-collection="coast">Problemas na orla</button><button type="button" data-collection="recurring-waste">Descarte recorrente</button><button type="button" data-collection="awaiting-update">Aguardando atualização</button><button type="button" data-collection="recently-resolved">Resolvidos recentemente</button></div><p id="collection-rule">Cada coleção aplica critérios explícitos; proximidade sozinha nunca comprova recorrência.</p></section>
					<section class="timeline-controls"><h3>Linha do tempo</h3><label for="timeline-date">Data exibida</label><input id="timeline-date" type="range" min="0" max="100" value="100"><output id="timeline-output">Atual</output><div><button id="timeline-play" type="button">Reproduzir</button><label for="timeline-speed">Velocidade</label><select id="timeline-speed"><option value="1600">0,5×</option><option value="900" selected>1×</option><option value="450">2×</option></select><button id="timeline-now" type="button" class="secondary">Voltar ao atual</button></div><p id="timeline-note" role="status">Abra a análise para carregar os eventos públicos.</p></section>
					<section class="comparison"><h3>Comparar períodos</h3><div><label for="compare-a">Período A</label><input id="compare-a" type="date"><label for="compare-b">Período B</label><input id="compare-b" type="date"><button id="compare-toggle" type="button" aria-pressed="false">Comparar</button><button id="compare-side" type="button" disabled title="A biblioteca atual usa um único mapa sincronizado">Alternar A/B</button></div><p id="compare-summary">Escolha duas datas. A comparação usa o mesmo enquadramento e alterna no único mapa.</p></section>
					<div id="data-followup"><h3>Em acompanhamento</h3><div id="followup-list"></div></div>
				</section>
			</section>
			<p id="creation-notice" role="status" hidden></p>
			<div class="legend" aria-label="Categorias no mapa"><span><i class="dot waste"></i>Resíduos</span><span><i class="dot water"></i>Água</span></div>
			<p class="map-disclaimer">Demonstração acadêmica · relatos fictícios · área aproximada</p>
		</main>

		<dialog id="details" aria-labelledby="detail-title"><div class="dialog-head"><span class="eyebrow">CENTRAL DE DENÚNCIAS E INTERAÇÕES · REGISTRO SIMULADO</span><button id="close" class="secondary" aria-label="Fechar detalhes">Fechar ×</button></div><div id="detail-body"></div></dialog>
		<section id="central" class="central" aria-labelledby="central-title" hidden>
			<div id="central-scroll" class="central-scroll" tabindex="-1">
				<div class="central-inner">
					<div id="central-feed">
						<div class="central-head-row"><p class="central-eyebrow">Central do CuidAção · Área da comunidade</p><button id="central-close" type="button" class="secondary">✕ Voltar ao mapa</button></div>
						<h2 id="central-title" tabindex="-1">Publicações da comunidade</h2>
						<p class="central-lede">Acompanhe os relatos sobre problemas ambientais do Perequê, mesmo sem partir de um pin do mapa. Cada cartão abre a publicação completa da ocorrência, sem duplicadas.</p>
						<div class="central-feed-actions"><button id="central-feed-create" type="button" class="primary">＋ Relatar problema no Perequê</button><span class="central-feed-hint">Escolha o ponto no mapa; não precisa partir de um pin.</span></div>
						<p id="central-feed-status" class="central-status" role="status"></p>
						<p id="central-feed-filters" class="central-filters"></p>
						<ul id="central-feed-list" class="central-feed"></ul>
						<div id="central-feed-empty" class="central-feed-empty" hidden><p>Nenhuma publicação corresponde aos filtros atuais.</p><button id="central-feed-adjust" type="button" class="secondary">Ajustar filtros no mapa</button></div>
					</div>
					<article id="central-publication" aria-labelledby="central-pub-title" hidden></article>
				</div>
			</div>
		</section>
		<dialog id="account-panel" class="account-dialog" aria-labelledby="account-title"><span class="sheet-handle" aria-hidden="true"></span><div class="dialog-head"><h2 id="account-title" tabindex="-1">Perfil</h2><button id="account-close" class="panel-close" type="button" aria-label="Fechar perfil">×</button></div><div id="account-body"></div><div id="account-actions" class="account-actions" aria-label="Ações da conta"></div></dialog>`;
}

export function occurrenceCard(item, index, el) {
	const card = el("button", "", `card ${item.categoryCode === "agua" ? "card-water" : "card-waste"}`);
	card.dataset.id = item.id;
	card.append(
		el("span", String(index + 1).padStart(2, "0"), "card-index"),
		el("span", `${item.id} · ${item.category}`, "card-meta"),
		el("strong", item.title),
		el("span", item.status, "badge"),
		el("span", `${item.locationLabel ?? "Localização ilustrativa"} →`, "card-location")
	);
	return card;
}
