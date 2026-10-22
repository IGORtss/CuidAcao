# Plano de implementação — versão 1.0
07/10/2026. Especificação e implementação têm estados separados.

## Correção dos três painéis finais da HUD — 18/10/2026

- [x] Corrigida a troca de vista da superfície orgânica: ao escolher `Lista de ocorrências`, `Investigar área` ou `Conta / perfil`, o menu deixa de ocupar a altura interna e o painel funcional correspondente passa a ser a única vista visível. Antes, o painel era montado corretamente, mas ficava abaixo do menu e era recortado pelo `overflow` da própria HUD.
- [x] O teste de navegação agora exige que o menu esteja realmente oculto e o painel realmente visível nas três ações, evitando o falso positivo anterior que verificava apenas a existência do painel no DOM.
- [x] Verificação atual: `npm test` 159/159 e build Vite com 63 módulos aprovados. Na repetição dos casos E2E que falharam sob carga, com um worker, HUD desktop/mobile, pin móvel, transições desktop/mobile e vínculos desktop/mobile passaram (7/8).
- [ ] A regressão E2E integral executou 100/108 sob seis workers; sete casos funcionais falharam por timeout/sessão encerrada sob carga e passaram na repetição com um worker. O oitavo, `integrated-desktop`, concluiu as asserções funcionais, mas o limite interno histórico de 120 s expirou no `finally`, durante `browserContext.close()`, inclusive com um worker; `integrated-mobile` passou na execução integral. Portanto, não se declara 108/108 nesta correção.

## Pin transformável e ficha ancorada — 16/10/2026

- [x] Estrutura separada em âncora Leaflet, ponta fixa e cabeça interna; a origem local e o `iconAnchor` coincidem com a latitude/longitude durante repouso, hover, seleção e fechamento.
- [x] Hover/foco com salto e squash/stretch, prévia integrada e fechamento em 150 ms; seleção por clique/toque/teclado desdobra a cabeça na ficha ampliada, reduz os demais pins e recolhe por clique externo/Escape/troca.
- [x] Ficha abre acima ou no lado disponível, recalcula em movimento/zoom/resize e conduz à publicação existente na Central. Água usa anel único na coordenada; resíduos desdobram o símbolo existente; movimento reduzido conserva informação e ações.
- [x] Cobertura focal nova em `apoio/testes/ponta-a-ponta/transformacao-marcador.spec.js`: água e resíduos em desktop/mobile, ponta ancorada, flutuação, hover, travessia do cursor, seleção, desdobramento do símbolo de resíduos, anel único da água, fechamento, abertura da Central, bordas, resize, teclado e movimento reduzido. Resultado focal final: 4/4.
- [x] Verificação: `npm test` 159/159, build Vite aprovado, sequência cartográfica focal 10/10, inspeção Chromium desktop com a âncora e a ponta no mesmo pixel e ficha selecionada de 520×203 px. A regressão E2E integral com dois workers passou 106/108; somente os dois ciclos `integrado.spec.js` (desktop/mobile) atingiram o limite antigo de 120 s ao fechar os contextos. A repetição isolada desktop reproduziu o mesmo timeout; os cenários de pins, Central, consulta, HUD, transição, escrita, contribuições, manifestações, administração, vínculos, Google e demonstração passaram. O servidor de teste emitiu repetidamente `Component auth has not been registered yet` durante as etapas Firebase; não se declara 108/108.

## Menu expansível orgânico — 16/10/2026

- [x] A logo oficial e o título agora pertencem à mesma superfície: círculo com borda branca sutil, preenchido pelo símbolo de 56 px no desktop/44 px no celular; na cápsula, o símbolo permanece à esquerda e “CuidAção” aparece à direita, antes da expansão vertical.
- [x] Máquina explícita com seis estados, avanço por `transitionend`, cancelamento/reconciliação de cliques rápidos, clique externo, Escape, foco contido e itens inertes fora do estado aberto.
- [x] Destinos reais reorganizados em grupo principal (mapa, Central, registro, camadas, linha do tempo) e secundário (lista, investigação, conta), sem rota ou função decorativa.
- [x] `npm test` 159/159, build Vite, sintaxe e `git diff --check` aprovados. Chromium pontual inspecionado em 1440×900 e 390×844: dimensões, sequência horizontal→vertical, fechamento, clique externo, cinco cliques rápidos e movimento reduzido aprovados; mapa/câmera não foram alterados.
- [ ] O harness focal Playwright não iniciou inicialmente porque a porta 5180 era usada por oito servidores de outra execução. Os processos foram preservados; depois, servidor isolado 5189 permitiu a inspeção Chromium. A suíte E2E integral ainda precisa ser executada para certificação total.
- [ ] Uma segunda tentativa focal na fixture 5180 chegou aos fluxos da HUD, mas não certificou a spec: a edição concorrente dos pins passou a renderizar 210 SVGs onde a asserção histórica espera 105, e o servidor isolado encerrou antes dos últimos cenários. O auxiliar da HUD foi endurecido para aguardar/reverter estados intermediários; não se atribui essas falhas ao produto nem se declara a regressão aprovada sem uma árvore quieta.

## Clique livre no mapa — 16/10/2026

- [x] Clique simples em área livre deixou de abrir a ficha de lugar; menu por clique direito/toque prolongado, pins, seleção de localização do registro e desenho da investigação permanecem separados.
- [x] UX, AC33 e decisão atualizados para refletir o pedido explícito.
- [x] E2E de navegação confirma a ficha fechada após clique livre e preserva a abertura de detalhes pelos pins.
- [ ] Execução focal `npm run test:e2e -- apoio/testes/ponta-a-ponta/navegacao.spec.js --project=desktop --project=mobile`: 5/6 execuções passaram; a asserção do clique livre passou em desktop e mobile. A execução mobile falhou depois, ao tentar clicar em `#filters-close` oculto; essa falha não está no trecho alterado e requer avaliação separada antes de declarar regressão integral aprovada.

## HUD recolhível de ponto único — 15/10/2026 (pedido explícito do usuário)

- [x] Estado inicial com apenas o ícone do CuidAção sobre o mapa; menu compacto (Central, Registrar, Investigar, Camadas/legenda, Ocorrências, Conta/perfil, Histórico) com morph/fade+slide, fecha por clique fora e Esc, foco devolvido ao ícone.
- [x] Painéis contextuais: investigação compacta com contador de vértices e confirmação a partir de 3; camadas com categorias, seis toggles ambientais, exibição, fundo, transparência e legenda; ocorrências com busca, contagem e lista resumida; conta com sessão e acesso ao perfil.
- [x] Elementos soltos absorvidos (barra cheia, legenda fixa, “Ver todas”, “Perequê”/“Mapa legível”, painel grande de investigação); fluxos, permissões e escritas preservados; Central (outra frente) como item do mesmo menu.
- [x] E2E de navegação reescritos para dirigir a HUD (`apoio/testes/ponta-a-ponta/hud.js`); contratos atualizados em UX/DECISIONS.
- [x] Verificação por blocos (árvore quieta, pré-reescrita da HUD): `npm test` 159/159, build aprovado e E2E verdes em navigation (micro/camadas), territory, reading, transition, auth, interface-review, occurrence-write, contributions, stances, google, central, demo, links, admin (6/6) e transitions:15 — após 4 correções: imports `createImageFields`, import `renderHistory` no painel admin, projeção adaptada no review admin (`adaptDetail` + prefill por código de categoria).
- [ ] Verificação integral final PENDENTE: a outra frente reescreveu a superfície da HUD (máquina de estados de motion, itens/labels do menu, `hud.css`, `shell.js`, specs) com saves durante as suítes (reload do Vite invalida testes). Último estado: `navegacao.spec.js:7` falha porque o menu permanece aberto sobre o diálogo de registro (`closeHud` assíncrono da nova máquina de estados); `integrado.spec.js:9` não re-verificado após as correções. Passar a suíte integral quando a reescrita assentar.

## Central do CuidAção como área social comunitária — 15/10/2026

Implementada sobre as estruturas existentes, sem recriar o projeto, trocar o Leaflet ou remover funcionalidades. Nenhuma rota, migração, modelo, categoria, medição ou permissão nova; Central é apresentação sobre as APIs existentes.

- [x] Feed geral (`codigo-fonte/funcionalidades/central/indice.js`, `codigo-fonte/estilos/central.css`): mesma consulta e filtros/categorias, uma publicação por ocorrência ordenada por `updatedAt` decrescente (atividade real por D09), cartões compactos com evidência principal (lazy, com cache), título, trecho, categoria/estado, localização, data de atualização e contagens reais de contribuições/evidências. Sem curtidas ou métricas inventadas. Entrada pela opção “Central do CuidAção” no menu do ícone da HUD (`shell.js`, `main.js` doHudCentral, hash `#central`).
- [x] Publicação completa: página dedicada com resumo, faixa de pertencimento quando aberta pelo pin, linha do tempo única cronológica (comentários, evidências e transições, sem abas; helpers `collectTimelineRows`/`paintTimeline` reutilizados também pelo diálogo de detalhes) e as ações existentes (comentar, complementar com evidências, apoiar/contestar, acompanhar, vínculos, encerramento, histórico, edição/transição/denúncia conforme permissão). Entrada direta pela ficha do pin (`onCentralSelect`, hash `#publicacao=id`), sem passar pelo feed e sem duplicar o registro.
- [x] Voltar ao feed ou ao mapa preserva centro, zoom e seleção: a Central é sobreposição sem chamadas de câmera; fechar o diálogo pela Central usa `keepSelection` e o `syncDetails` só limpa seleção/restaura câmera no ciclo do diálogo. Hashes `#central`/`#publicacao=` integram Voltar/Avançar e link direto, e concluem a transição editorial.
- [x] Interface própria em tela cheia com coluna única, desktop e celular, teclado (foco nos títulos, retorno ao ícone, Escape volta), foco visível e `prefers-reduced-motion` sem animações.
- [x] Testes novos: `apoio/testes/unitarios/central.test.js` (ordenação, trecho, contagens, linha do tempo, hash) e `apoio/testes/ponta-a-ponta/central.spec.js` (duas entradas, cartão correto, participação preservada, volta com mapa intacto, teclado, link direto/indisponibilidade).
- [x] Verificado em Node 24.21.0: `npm test` 158/158 (153 existentes + 5 novos), `npm run build` aprovado, `git diff --check` aprovado. E2E da Central 12/12 desktop/mobile em servidores isolados próprios (par 5179/3199, fixture de 105 registros), sem escrita.
- [x] Regressão parcial: `leitura.spec.js` 14/16; as 2 falhas (abrir menu da HUD com painel de filtros aberto) são de empilhamento do menu restilizado e reproduzem sem o botão da Central — não pertencem a esta entrega.
- [ ] Suítes de escrita (contribuições/posições/transições/admin/vínculos) não foram reexecutadas por esta entrega: a frota E2E oficial estava ocupada por outra sessão ativa no mesmo repositório. As escritas passam por `noteDataChanged`, sem efeito quando a Central está fechada; a confirmação integral fica para a regressão completa com a árvore quieta.
- [ ] Convivência: outra sessão opencode reescreve os pins (ficha `cpin` inline em `map/index.js`, `pin-central.css`) e ajusta specs de navegação/leitura. A composição foi verificada (a ficha `cpin` chama `onCentralSelect` e a volta preserva ficha + seleção). Não editar `map/index.js` (área dela) nem seus specs sem combinar; memória de projeto registra a divisão.

## Central como rede comunitária sobre as ocorrências — 16/10/2026

Redesenho sobre a base de 15/10/2026, sem nova rota, migração, categoria ou permissão. Reutiliza ocorrências, mapa, pins, comentários, evidências, validação e formulários existentes.

- [x] Feed como rede ativa: cartões com autor (via histórico público `created`) e horário, título e resumo com hierarquia, categoria/estado, localização no Perequê, foto quando existe, contribuição/validação mais recente e ações reais (comentar, anexar evidência, validar, ver no mapa). Ação visível “Relatar problema no Perequê” fecha a Central e abre o fluxo existente para escolher o ponto no mapa sem pin. Sem curtidas ou contadores inventados; destaque para confirmação, evidências e atualizações.
- [x] Publicação narrativa: começa pelo título e relato, depois categoria/estado/local/última atividade; faixa de mapa sempre visível com “Ver no mapa” para o mesmo ponto do pin; linha do tempo única com comentários, evidências, validação (apoios/contestações com autor e justificativa) e mudanças de estado, com autor e data claros; barra “Adicionar atualização” abre comentário, complemento com evidência e manifestação existentes, e o salvamento aparece na linha do tempo e atualiza o cartão. Ação clara de voltar ao feed ou ao mapa; sem aparência de formulário administrativo.
- [x] Conexão Central↔mapa preservada: mesma ocorrência nos dois caminhos, sem duplicar; sobreposição sem mover a câmera, com centro/zoom/seleção intactos ao voltar; HUD segue com só o ícone visível e opções ao clicar; tela própria sem pilha permanente de painéis. Animações curtas e funcionais (abertura da publicação, itens da linha do tempo), removidas em `prefers-reduced-motion`.
- [x] Bloqueio identificado e contornado sem mudar a API: a listagem pública não inclui o username do autor (só `authorId`), então o feed resolve a autoria via histórico público existente (`created.username`) com cache e concorrência limitada. Mudança mínima futura, se desejada: incluir `username` por join na projeção pública da listagem.
- [x] Verificado: `npm test` 159/159, `npm run build` aprovado, `git diff --check` aprovado. Central E2E 12/12 desktop/mobile em servidor isolado próprio (par 5179/3199, fixture de 105 registros), cobrindo os dois caminhos de entrada, volta ao mesmo ponto do mapa, cartão correto, participação existente, criação pela Central com escolha no mapa e desktop/celular sem rolagem horizontal. A frota E2E oficial (`npm run test:e2e`) não foi usada porque as portas 5180+ estavam ocupadas por outra sessão ativa no mesmo repositório.

## Acesso direto à HUD do mapa — 15/10/2026

- [x] Adicionado “HUD do mapa” à navegação da apresentação; o link usa o acesso direto existente para concluir a transição, atualizar `#map` e liberar a interação.
- [x] Coberto por cenário E2E desktop/mobile e documentado em UX/AC31.
- [x] Verificado em Chromium contra o Vite local: transição concluída, HUD visível e mapa não `inert`; rótulo visível sem overflow em 1440, 390 e 360 px. `npm run build` aprovado.
- [ ] O cenário via `npm run test:e2e` não iniciou porque a porta fixa 5180 já estava ocupada por serviço existente; não encerrado para preservar o processo. A interação equivalente foi verificada no Chromium pontual, mas a execução no harness E2E permanece pendente.

## Etapa 6 — HUD contextual, investigação e tempo — 14/10/2026

Implementado e verificado nesta revisão: AC31–AC40 e D11–D13. A entrega integra HUD, estado de exploração, camadas/legenda, enquadramento, lugar, desenho espacial, registro contextual, acompanhamentos/consultas/notificações internas, coleções, reprodução e comparação. Limites contratuais: uma instância Leaflet, sem recortes oficiais ou imagens históricas, medições somente explícitas e duas categorias persistidas.

- [x] Corrigir a linha de base: três falhas Node ligadas à migração 004/projeção administrativa e duas expectativas E2E de transição.
- [x] Persistir preferências privadas pela migração 005 e rotas de conta, com autorização, bancos temporários e reinício.
- [x] Centralizar estado e URL; renovar shell/HUD, camadas, legenda, etiquetas, resumo e compartilhamento.
- [x] Implementar ficha/menu de lugar, sincronização lista↔mapa e investigação poligonal com interseção.
- [x] Integrar geometria explícita e possíveis correspondências ao registro, sem mesclagem automática.
- [x] Entregar coleções, reprodução histórica de estados, comparação A/B e modo de medições com limitações visíveis.
- [x] Verificar Node, build, E2E completo e inspeção Chromium desktop/mobile/200% antes de marcar itens.

Evidência final: Node 24.21.0; `npm test` 148/148; build Vite aprovado (15 módulos); `git diff --check` aprovado. A regressão E2E passou nos 30 cenários afetados e nos dois ciclos integrados; a execução integral seguinte chegou a 89/90, com a única falha sendo arredondamento subpixel da altura do logotipo (`24.0000019` em vez de `24`). A asserção foi tornada tolerante somente a essa precisão de renderização, `navegacao.spec.js` passou 6/6 e a suíte integral final passou 90/90 sem falhas ou skips. Capturas Chromium foram inspecionadas em 1440×900 e 390×844; a abertura não exibe nem permite interação com a HUD antes do fim da transição. Os tiles foram bloqueados nessas capturas para inspecionar também o fallback. Dispositivo físico e leitor de tela não foram executados.

## Inicialização Firebase Web e Analytics — 15/10/2026

- [x] SDK modular `firebase` fixado no lockfile e inicialização única ligada à entrada do frontend.
- [x] Configuração pública recebida mantida em `.env.local` ignorado pelo Git; `.env.example` documenta também `measurementId`.
- [x] Analytics carregado somente em navegador compatível, sem ativar Auth, Firestore, Storage ou alterar Fastify/SQLite.
- [x] Verificado com Node 24.21.0: `npm test` 148/148, build Vite aprovado (29 módulos, chunk assíncrono do Analytics), `npm run test:e2e` 90/90 e `git diff --check` aprovado. Nos E2E sem acesso ao endpoint remoto de medição, o SDK registrou o fallback oficial para o `measurementId` local e a aplicação permaneceu funcional.

## Preparação dos produtos Firebase — 15/10/2026

- [x] Inicializadores modulares para Authentication, Firestore, Storage e App Check; carregamento assíncrono e conexão explícita aos emuladores.
- [x] Firebase CLI reproduzível, `firebase.json`, projeto local, Hosting SPA, índices vazios e regras Firestore/Storage fechadas.
- [x] Build e inicialização local de Auth, Firestore, Storage, Hosting e Emulator UI; hub confirmou todas as portas em `127.0.0.1`.
- [x] Firestore/Storage locais: JRE Temurin 21 portátil instalado no perfil do usuário, sem alterar pacotes do Arch; script aponta o runtime local.
- [x] Smoke local: Hosting HTTP 200; criação fictícia no Auth 200 com token; leitura Firestore e listagem Storage sem autorização recusadas com 403 pelas regras.
- [x] CLI autenticada e acesso ao projeto ativo `cuidacao-13fc8` confirmado, sem publicar recursos.
- [x] Ponte Firebase Auth implementada: popup Web, ID token verificado por Firebase Admin, migração 006 e conversão para sessão local; testes de primeiro acesso, recorrência, colisão, origem e token/provedor inválidos.
- [ ] Provedor Google remoto e App Check: ainda exigem configuração no Console/site key; nenhum deploy foi feito.
- [ ] Corte autoritativo de Firestore/Storage: não iniciado; exige migração que preserve transações, eventos, versões, arquivos privados e todas as negações de permissão. SQLite/Fastify permanecem ativos para evitar duas fontes de verdade.

Verificação desta preparação: `npm test` 148/148, build Vite aprovado com chunks separados de Auth/Firestore/Storage/App Check, `npm run test:e2e` 90/90 com os emuladores conectados e `git diff --check` aprovado. Ao concluir, os quatro emuladores e a UI permaneceram em execução local; nenhum recurso remoto foi criado ou publicado.

Verificação da ponte Auth: Node 24.21.0; `npm test` 153/153; build Vite aprovado com 48 módulos e chunks separados; ID token `google.com` emitido pelo Auth Emulator aceito pelo Firebase Admin real e convertido em pendência local sem persistir o token; regressão E2E final 90/90. Uma primeira rodada E2E teve cinco instabilidades antigas sob carga, todas passaram em repetição focal 5/5; após limpar apenas servidores temporários órfãos, a repetição integral passou. Migrações 5 e 6 foram aplicadas à base local sem seed/reset. Emulator Suite ficou ativa; nenhuma configuração remota ou publicação foi alterada.

## Camadas cartográficas ambientais — 13/10/2026

- [x] Pins preservados e seis camadas independentes: qualidade da água, resíduos, erosão, esgoto aparente, alagamentos e vegetação, em controle compacto sobre o mesmo Leaflet/satélite.
- [x] Nenhuma forma é gerada a partir de id, categoria, título ou coordenada isolada. Pontos, linhas e polígonos só entram com metadado GeoJSON explícito e compatível; sem ele, permanece apenas o pin.
- [x] Precisão approximate/verified distinguida por traço e texto. pH não é inventado: os dados atuais não têm medições; valor futuro válido de 0 a 14 usa apenas classificação química abaixo de 7/igual a 7/acima de 7, sem nível de risco.
- [x] Formas abrem o detalhe correspondente e acompanham a mesma coleção filtrada dos pins. Camadas podem ser ocultadas independentemente; transparência preserva leitura do satélite.
- [x] Verificação direcionada após a ampliação: 11/11 testes Node de geometria/adaptador, build Vite e 2/2 E2E da camada em desktop/mobile. O E2E injeta metadados somente na resposta controlada para exercitar as seis formas sem alterar os dados demonstrativos. Backend, migrações e dados reais/demonstrativos não foram alterados.

Exemplos demonstrativos adicionados posteriormente: migração 004 opcional preserva registros existentes e permite projetar o metadado validado pela API. `demo:prepare` cria seis ocorrências fictícias adicionais (CA-000009–CA-000014), uma por tipo, somando quatorze cenários; aproximado/verificado descrevem somente o conjunto simulado. Verificação direcionada: 16/16 testes HTTP de ocorrências/escrita e 12/12 testes de banco/demonstração aprovados. A base de uso não foi resetada nem recebeu exemplos automaticamente.

## Reorganização por camadas e preparação Firebase — 13/10/2026

Implementado: entradas do frontend movidas para `codigo-fonte/app`, mapa/interface para `codigo-fonte/features`, cliente HTTP e fronteira Firebase para `codigo-fonte/services`, CSS para `codigo-fonte/styles`; servidor separado em `servidor/http`, `servidor/dominio`, `servidor/dados` e `servidor/linha-comando`. Imports, scripts npm, supervisores e testes foram atualizados. Migrações, rotas, regras, HTML gerado e CSS foram preservados sem reescrita. Dados locais, demonstrações, backups e checkout histórico não foram movidos.

Firebase preparado, não ativado: `.env.example`, validação testada da configuração Web pública e do opt-in dos emuladores, além de `apoio/documentacao/FIREBASE.md`. Nenhum SDK, Admin SDK, service account, regra pública, cliente vazio ou segunda fonte de identidade foi adicionado. Fastify/SQLite e a sessão opaca continuam autoritativos.

Verificado: 138/138 testes Node, build Vite (13 módulos) e `git diff --check` aprovados. A regressão E2E completa aprovou 86/90. Quatro falhas reproduziram isoladamente em desktop/mobile: `transicao.spec.js` ainda exige `inert` numa fase em que o mapa atual já está interativo; `navegacao.spec.js` tenta clicar a primeira área ambiental em coordenada coberta por pins Leaflet. Os arquivos movidos não alteraram a lógica ou o CSS desses fluxos; apoio/testes/design não foram modificados para forçar aprovação. Permanecem pendências cartográficas da branch, não uma verificação integral aprovada desta reorganização.

## Microinterações refinadas — 13/10/2026

Especificado: ilha com rótulos suaves e indicador ativo móvel; painéis com fade/deslocamento; pins responsivos com prévia/destaque; filtros com mudança gradual de conteúdo e marcadores; controles secundários discretos durante gestos; suporte a toque e `prefers-reduced-motion`, sem tocar na abertura editorial.

Implementado: CSS existente, sem dependências, com durações de 150–240 ms. A posição/largura do indicador acompanha o controle ativo e suas mudanças de dimensão; o painel mantém conteúdo não interativo durante o fade de saída, sem alterar o fluxo do documento. Pins entram e saem em 180 ms; os elementos temporários de saída são apenas visuais, não focáveis e não interativos. Seleção usa estado explícito da ocorrência; rótulos permanecem visíveis no mobile e escala por hover só ocorre em ponteiro fino. Movimento reduzido remove animações/transições e evita criar os elementos temporários de fade.

Verificado: `npm test` 135/135, `npm run build` aprovado; `npm run test:e2e -- --project=desktop --project=mobile apoio/testes/ponta-a-ponta/navegacao.spec.js` 4/4. O E2E exercita filtro e contagem real de pins, saída/entrada, hover no desktop, toque no mobile, seleção/deseleção, painel e movimento reduzido. Diagnósticos sem erros. A suíte E2E completa não foi executada, conforme escopo solicitado; não houve teste em dispositivo físico.

## Cartografia editorial interativa — 13/10/2026

A composição final mantém o Leaflet como superfície permanente e redesenha a hierarquia, sem backend ou dependências: ilha com estado ativo, um cartão principal por vez, perfil único e contextual, pins com símbolos de água/resíduos e prévia, recuo temporário de controles secundários durante gestos e folhas inferiores no toque. Altura útil de diálogos/folhas acompanha ampliação do navegador para preservar rolagem e controles a 200%. A apresentação inicial, transição, dados, API, filtros, permissões e escritas permanecem nos fluxos existentes.

- [x] Navegação ativa, exclusividade dos painéis e entrada única de perfil implementadas com teclado, foco restaurado e anúncios preservados.
- [x] Pins categóricos e prévia em hover/foco implementados; popup e detalhe existentes preservados para clique/toque.
- [x] Recuo/reaparecimento após arraste/zoom e folhas inferiores mobile implementados sem ocultar funções essenciais.
- [x] Capturas Chromium inspecionadas em 1440×900 e 390×844 para lista e perfil, com World Imagery real, sem overflow aparente.
- [x] Verificação focal: interface/zoom 8/8, navegação/autenticação 8/8, administração 6/6; `npm test` 135/135 e build aprovados.
- [x] Regressão final: `npm test` 135/135, build Vite (12 módulos), `npm run test:e2e` 86/86 desktop/mobile e `git diff --check` aprovados. A primeira execução integral chegou a 78/86: expectativas ainda apontavam aos antigos botões de conta, folhas eram medidas durante a animação, o ciclo mobile tentava acionar um pin sob a lista aberta e uma imagem lazy da demo era verificada fora da área visível; cada caso foi corrigido e repetido isoladamente antes da suíte final. World Imagery foi inspecionado em capturas reais; dispositivo físico e leitor de tela não foram executados.
- [x] Ajuste posterior: HUD/ilha ocultas durante a apresentação e reveladas apenas em `transition-complete`; acesso direto, teclado e movimento reduzido preservados. Verificação focal e regressão atualizadas abaixo.

## Composição cartográfica compacta — 12/10/2026

Inspeção da captura descrita pelo usuário identificou os seletores `.explorer`, `.atlas-tools`, `.list-section` e `.data-summary` como donos de composições independentes: lista e filtros eram superfícies separadas, e estatísticas mantinham tipografia/estrutura editorial. Reposicioná-las apenas acumulava painéis sobre o mapa. A solução substitui essa composição em `codigo-fonte/shell.js` por um painel principal compartilhado entre filtros, ocorrências e resumo; o estado normal inicia fechado. Navegação compacta com ícones/títulos, rótulos em hover/foco e labels sempre visíveis no toque. CSS limita tamanho/rolagem, a lista é recolhível, métricas são resumidas e o erro de tiles orienta abrir Ocorrências. Vazio e falha de API mantêm ações acessíveis. Domínio, API, banco, autenticação, criação, filtros, dados, Leaflet e transição preservados.

- [x] Identificação dos seletores/componentes que causavam os painéis grandes, antes da edição.
- [x] Um painel principal exclusivo e fechado na entrada normal; hash direto de estatísticas/ocorrências preservado.
- [x] Paleta solicitada, navegação por ícones e rótulos desktop/mobile, lista recolhível e resumo estatístico.
- [x] Estados vazio/erro apresentados sem abrir painéis concorrentes; erro de consulta revela apenas a lista com retry.
- [x] Capturas Chromium inspecionadas: desktop inicial/filtros e mobile mapa/filtros/lista/estatísticas em 390×844. Sem sobreposição interna, pins descobertos permanecem acionáveis e legenda inclui Água/Resíduos.
- [x] `npm test`: 135/135; `npm run build`: aprovado; Chromium instalado; `git diff --check` sem erros; diagnósticos sem erros.
- [x] E2E focal: navegação 2/2 desktop/mobile, transição 10/10, criação 4/4; após a correção de interação durante a abertura, navegação repetida 2/2 e ciclo integrado desktop 1/1.
- [ ] Regressão integral executada antes da correção de interação: 82/86 passaram. Quatro falhas: mensagem de sessão esperada pela administração mobile após logout/reload; ciclos integrados desktop/mobile excederam 120 s; a imagem de um cenário demo desktop não decodificou no timeout. Após corrigir o avanço da transição sob interação, o ciclo integrado desktop passou isolado. A repetição mobile isolada não retornou dentro do limite operacional e foi encerrada; portanto continua não verificada. Não declarar a suíte integral aprovada nem substituir esses cenários por mocks.

## Transformação arte → satélite — 12/10/2026

- [x] Sequência reconstruída em fases independentes no mesmo palco sticky e na mesma instância Leaflet: texto 0–30%, arte estática 30–65%, marcadores 65–85% e controles/filtros 85–100%.
- [x] Texto principal desce 40px, textos secundários 26px; arte não recebe transformação. Dissolução só começa após a saída editorial e não muda centro/zoom. O enquadramento inicial deixou de depender do carregamento assíncrono da lista; “Ver todas no mapa” continua sendo a ação explícita de enquadramento.
- [x] Marcadores visíveis entram uma vez em ordem espacial, com 300ms, 10px, escala 0,85 e atraso de 80ms limitado a 560ms. Filtros/zoom entram depois, com opacidade e 6px; ponteiro e foco do mapa ficam bloqueados até a conclusão. Movimento reduzido e avanço rápido concluem sem espera.
- [x] A dissolução só libera tiles efetivamente decodificados. Atraso mantém a arte; erro após três segundos esconde o mosaico incompleto, explica a alternativa e libera marcadores/lista. Créditos do World Imagery permanecem visíveis quando a camada carrega.
- [x] Cobertura nova em `apoio/testes/ponta-a-ponta/transicao.spec.js`: separação de fases, texto/arte reversíveis, câmera e contagem de requisições estáveis, sequência única/capada, filtros não interativos antes do fim, falha de tiles e popup após atualização dos marcadores.
- [x] Inspeção visual real das sete etapas em 1440×1000 e 390×844: 14 capturas abertas e comparadas; sem overflow, flash cinza ou salto de câmera. World Imagery respondeu com 35 tiles no desktop e 12 no mobile. O estado “marcadores” capturou a sequência em andamento; o final mostrou zoom, filtros, ação de cadastro e atribuição.
- [x] Verificação final: Node 24.21.0, `npm test` 134/134, build Vite aprovado, E2E focado da transição/território 14/14, ciclo integrado corrigido e aprovado desktop/mobile, suíte completa 80/80 e `git diff --check` aprovado. A primeira suíte completa chegou a 76/78: o Leaflet suprimia o popup de um marcador recém-criado após uma longa sequência de foco; a abertura pós-evento com tolerância de arraste corrigiu o caso, que passou isolado e na regressão final. Dispositivo físico e leitor de tela continuam não executados.

## Imagens de satélite no mapa — 12/10/2026

- [x] Camadas OpenStreetMap identificadas nos mapas de consulta e seleção; configuração centralizada e substituída por Esri World Imagery.
- [x] Centro `[-23.9388, -46.183]`, zoom 15, caixa demonstrativa, marcadores, filtros, popups e interações preservados.
- [x] Créditos Esri e fontes do serviço mantidos no controle de atribuição; contraste de marcadores e controles reforçado para fotografia aérea.
- [x] Evidência: `npm test` 134/134, build Vite, `git diff --check` e E2E 74/74 aprovados. Chromium real sem interceptação recebeu World Imagery em JPEG/HTTP 200 (35 tiles carregados no desktop e 12 no mobile), preservou créditos, marcadores e ausência de overflow. Capturas inspecionadas em 1440×1000 e 390×844; imagem artística do hero não foi modificada nesta revisão.

## Revisão visual da abertura — 12/10/2026

- [x] Arte raster fornecida integrada como fundo de 100svh, com proporção preservada e enquadramentos próprios para desktop/mobile.
- [x] Cabeçalho discreto sobre a composição, sem CTA no hero; título editorial e aviso acadêmico preservados.
- [x] Fluxo reorganizado para o Leaflet suceder diretamente a abertura; mesma arte usada apenas como véu de opacidade, sem segunda instância de mapa.
- [x] `prefers-reduced-motion`, links diretos, teclado, toque, filtros, marcadores e detalhes preservados.
- [x] Evidência: `npm test` 134/134; build Vite aprovado; E2E completo 72/74 antes do ajuste final, com as duas únicas falhas restritas à opacidade residual de 1,5%; após corrigir o limiar de foco, os dois cenários afetados aprovaram 2/2 em desktop/mobile. Capturas de abertura e meio da transição inspecionadas em 1440×1000 e 390×844; sem sobreposição móvel ou corte completo de praia/bairro.

Estado atual: itens 5–11 implementados; item 12 revisado; item 13 validado; item 14 com apresentação isolada e recuperação verificadas nos limites registrados abaixo, em Node.js 24.21.0, Fastify/SQLite reais. Regressão atual no registro do item 14; evidências do ciclo integrado no item 13; resultados anteriores permanecem históricos. Preservados identidade visual, serviços, permissões, trabalho local e base de uso. AC27 comprovado com três cadastros novos e dois administradores em desktop/mobile, além de HTTP real reiniciado. A instabilidade histórica do marcador continua com causa indeterminada. Dispositivos físicos, teclado virtual real e leitores de tela não verificados. Item 14 entrega preparação isolada, roteiro, reset/backup/restauração e instalação limpa executada, conforme registro abaixo. Material acadêmico e limites de dispositivos continuam pendentes.

## Entregue
- [x] Primeira leitura: mapa, lista, filtros, detalhes, links diretos e dados simulados.
- [x] Documentação 1.0: produto, domínio, interface, arquitetura, dados, API e critérios de aceite.
- [x] Instruções aos agentes e registro de decisões desta revisão.
- [x] Três testes Node, build e oito execuções E2E da consulta existente.

## Etapa 1 — completar contrato de leitura
- [x] Cobrir Voltar/Avançar, filtro que invalida seleção e foco vindo do mapa.
- [x] Resolver divergências encontradas por esses cenários sem alterar regras de domínio.
Aceite: AC01–AC02 completos. Preservar testes já aprovados.

## Etapa 2 — persistência, identidade e criação auditada
- [x] Implementar conexão SQLite, esquema, migrações numeradas, seed e exclusões de dados/backup do Git.
- [x] Comprovar instalação de better-sqlite3/Fastify e testes com Node 24; resolver Fastify no lockfile.
- [x] Implementar código das três rotas públicas de ocorrência/listagem/histórico e npm run start local.
- [x] Aprovar testes HTTP com Fastify inject e driver SQLite real.
- [x] Código de consulta substitui fixtures, com adaptador de códigos/rótulos e datas, sem fallback silencioso.
- [x] Aprovar integração E2E com API e SQLite reais em Node 24.
- [x] Código de cadastro, login, logout, sessões, Origin, guardas e limites; testes HTTP/SQLite aprovados.
- [x] Aprovar E2E de autenticação e reinício de processo HTTP (execução pelo agente fora do sandbox).
- [x] Criação e edição do autor, validação territorial demonstrativa e persistência.
- [x] Histórico transacional e versionamento desde a primeira mutação, projeção pública e snapshots privados persistidos; endpoint de auditoria administrativa fica na Etapa 4.
Aceite: AC03–AC11; documentação de execução real atualizada. Esquema final pode ser criado nesta etapa, rotas posteriores permanecem ausentes. Recebidas criadas pela API passaram a ter triagem no item 8; seed continua opcional para demonstrar outros estados.

## Etapa 3 — participação e imagens
- [x] Anexos do relato original com validação, persistência, retirada e integração mínima (item 5 original).
- [x] Testar autoria, estados, limites e falhas parciais de upload do relato original.
- [x] Comentários/complementos com consulta pública, publicação autenticada e edição limitada pelo autor (item 6 original).
- [x] Imagens opcionais de complementos, limites por conteúdo, visibilidade dos pais, autoria/prazo e falha parcial recuperável.
- [x] Testes de validação/autoria/estados/prazo/visibilidade/duplicata, atomicidade/versionamento, reinício HTTP e desktop/mobile de comentários/complementos.
- [x] Manifestações de apoio/contestação, retirada/substituição/reativação e seus testes (item 7 original).
Aceite: AC12–AC16. Histórico e autorização são reutilizados, não introduzidos somente aqui.

## Etapa 4 — administração completa
- [x] Triagem, confirmação com referências/pareceres, acompanhamento, encerramento e reabertura; controles mínimos nos detalhes (item 8 original).
- [x] Publicação/leitura de pedidos necessários à reabertura e suas imagens, aceitação/substituição atômicas (item 8 original).
- [x] Rejeição administrativa de pedidos, denúncias, ocultação/restauração e correção administrativa (item 9 original).
- [x] Duplicatas e relacionadas, sem perda de contribuições e sem soma de apoios (item 10 original).
- [x] Auditoria de conteúdo e aviso de suporte oculto/retirado/alterado; independência do administrador (item 9 original).
Aceite: AC17–AC26. Cada endpoint exige testes de permissão pela API, não só botões ocultos.

## Etapa 5 — apresentação
- [x] Comandos locais de execução/seed/reset/backup/restauração com instalação limpa comprovada (item 14; seed legado preservado, apresentação por demo:prepare).
- [x] Roteiro integrado: cadastro → criação → participação independente → revisão → acompanhamento → resolução → encerramento → reabertura; contestação, vínculos e moderação cobertos (item 13; `apoio/documentacao/VALIDACAO.md`, testes e limites abaixo).
- [x] Revisão móvel/teclado/zoom, falha de rede e sinalização da simulação (item 12; limites de dispositivos/zoom/mapa abaixo).
- [ ] Material acadêmico descreve requisitos, método, arquitetura, validação e limitações; adequação às exigências da instituição depende do material fornecido pelo grupo.
Aceite: AC27–AC30 e regressão AC01–AC26. Deploy público não é requisito de conclusão.

## Método e definição de pronto
Executar etapas pequenas; implementar uma capacidade com testes de falhas/permissões antes da seguinte. Toda entrega indica critérios AC aprovados, comandos executados e limites. Atualizar documentos e implementação juntos quando uma regra mudar. Não marcar checklist por existir código sem comportamento verificado. Migrações anteriores não são reescritas após aplicação. Nenhuma mudança em dados reais faz parte do projeto.

## Histórico — base de persistência e limites daquela verificação

Implementados `npm run db:migrate` e `npm run db:seed`, esquema em SQL com CHECK/UNIQUE/FK e índices, conexão com foreign_keys/WAL, sequência transacional e primitiva interna de mutação/evento/versionamento. Eventos são append-only por triggers. Seed atômico para base vazia: três usuários, dois admins, credenciais aleatórias locais e quatro ocorrências com suporte independente e histórico referenciado, preservando IDs antigos. Na entrega de persistência, login, cadastro, API, uploads e reset ainda estavam ausentes; frontend mantinha fixtures.

Dependência fixada: better-sqlite3 13.0.3, que declara Node >=22; engines do projeto exige 24.x. Lockfile inclui integridades do registro npm e foi normalizado por `npm install --package-lock-only --ignore-scripts --offline`. Compatibilidade declarada conferida na documentação oficial; execução no Node 24 ainda não comprovada neste ambiente.

Verificação desta entrega: build aprovado com Node 26.10.0. `npm test` foi executado, mas a suíte de persistência não carregou porque better-sqlite3 não pôde ser instalado: DNS/acesso ao registro npm indisponível e pacote ausente do cache. `npm ci --offline --ignore-scripts` também confirmou ausência da dependência no cache. `npm run test:e2e`, com CUIDACAO_CHROMIUM_PATH=/usr/bin/chromium, ficou bloqueado: sandbox recusa bind em 127.0.0.1:5173 (EPERM). Sem aprovação de AC03 ou AC10 com o driver real; não há API para testes de permissões HTTP nesta fatia.

Os testes adicionados usam bancos temporários em disco e cobrem esquema, reaplicação, seed/recusa, integridade, persistência ao reabrir, rollback de evento/seed, sequência, versões e atomicidade em dois registros. Checagem complementar com adaptador temporário fora do repositório usando node:sqlite no Node 26: cinco testes de persistência e três existentes aprovados (8 no total). Essa checagem não substitui better-sqlite3 nem altera a stack entregue. Os comandos de migração e seed também foram exercitados com esse adaptador em arquivo temporário: aplicação, seed e recusa da segunda execução. Dependências existentes do frontend foram recuperadas do clone local preservado após a tentativa offline; better-sqlite3 continua indisponível. É necessário executar npm ci com rede e Node 24 para a verificação oficial.

## Histórico — API pública local e limites daquela verificação

Código implementado em servidor/app.js (sem porta), servidor/start.js (127.0.0.1:3002), servidor/routes/, servidor/servicos/ e servidor/repositories/. Somente GET de listagem, detalhe e histórico em /api/v1/occurrences. Schemas de entrada/saída, paginação, ordenação e filtros E; consultas parametrizadas e projeções públicas, ocultos=404, includeHidden=true=403 e duplicatas opcionais. Contagens/flags são derivadas do banco. Eventos de denúncias não entram no histórico público nem no total. Falhas internas têm mensagem genérica/requestId, sem SQL/stack/caminhos. Boot não migra, não faz seed/reset; não serve frontend. Autenticação e criação continuam pendentes; integração do frontend foi implementada na entrega descrita abaixo.

Fastify 5.12.5 declarado em package.json; documentação oficial de schemas, inject e política LTS consultada, com stack Node 24 preservada. A [CI oficial da linha 5.x](https://github.com/fastify/fastify/blob/5.x/.github/workflows/ci.yml) inclui Node 24. Tentativas de resolução/instalação pelo npm falharam com EAI_AGAIN (DNS) e ENOTCACHED (offline). Por isso Fastify e better-sqlite3 não estão instalados, e a atualização do lockfile com Fastify/transitivas ficou pendente: package.json e package-lock.json ainda precisam ser sincronizados por npm install com rede. Não declarar instalação limpa/npm ci aprovados.

Foram adicionados 11 testes Fastify inject com banco temporário real: paginação/ordenação, filtros, inválidos/desconhecidos, ocultos/inexistentes, recusa de includeHidden sem bypass, duplicatas, contagens/referências, histórico sem dados privados, falhas internas e ausência de rotas futuras/seed. `npm test` e `npm run start` executados, mas bloqueados no carregamento por dependências ausentes. Build aprovado no Node 26.10.0; `npm run test:e2e` bloqueado pelo bind do Vite (EPERM em 127.0.0.1:5173), mesmo com Chromium alternativo. Checagem complementar de SQL/serviços aprovada com adaptador temporário node:sqlite fora do repositório; não certifica HTTP, schemas, Fastify ou better-sqlite3. Syntax checks e git diff --check aprovados. Nenhum novo AC foi declarado aprovado nesta entrega.

## Histórico — verificação da revisão de documentação
A revisão anterior em 07/10/2026 aprovou 3 testes Node, build e 8 execuções Playwright. Chromium padrão ausente no ambiente; usar CUIDACAO_CHROMIUM_PATH=/tmp/chromium localmente quando disponível. CI continua instalando Chromium pelo Playwright. Tiles foram bloqueados; disponibilidade externa não foi certificada. Esta revisão só altera documentação e não implementa backend ou novas regras. Reexecução desta entrega: 3 testes Node aprovados, build aprovado e 8 execuções Playwright aprovadas com Chromium alternativo. Links relativos dos 11 documentos e identificadores AC01–AC30 verificados. Sem alteração de código executável ou dependências.

## Histórico — frontend integrado e limites daquela verificação

Implementadas camadas HTTP e adaptador explícito em codigo-fonte/services, filtros com códigos de DOMAIN, datas America/Sao_Paulo, proxy Vite /api para Fastify local e consulta integral paginada antes de atualizar mapa/lista/contagem. Estados carregando/vazio/erro e retry manual, cancelamento com geração contra respostas antigas; detalhes/histórico por ID independentes dos filtros/páginas, sem fixtures ou evidências inventadas. Fechamento preserva filtros, navegação por hash e retorno de foco; filtros que excluem seleção conhecida a removem. Nenhuma interface de autenticação/criação adicionada.

Verificado: 10 testes Node de domínio/serviços aprovados e npm run build aprovado em Node 26.10.0. npm test executado: testes frontend passam, suítes API/SQLite bloqueadas por fastify e better-sqlite3 ausentes. npm run test:e2e com CUIDACAO_CHROMIUM_PATH=/usr/bin/chromium executado: servidor não inicia pela ausência de better-sqlite3. Limitações de rede/lockfile/Node 24 descritas acima continuam; sem aprovação adicional de AC01/AC02/AC30.

E2E atualizados (8 cenários em desktop/mobile, ainda não aprovados): consultas com 105 registros/múltiplas páginas, filtros/vazio, detalhes, links diretos fora de filtro, Voltar/Avançar/reload, foco, indisponibilidade/retry de API/histórico, falha na segunda página, mudanças rápidas de filtros, seleção excluída por filtro e tiles indisponíveis. Supervisor usa banco temporário isolado com migração/seed e eventos próprios, ignora caminho de demonstração, não reutiliza servidores e remove somente seu diretório temporário ao encerrar. Portas locais 3100/5180. Syntax checks e git diff --check aprovados.

## Histórico — revisão de persistência e consulta no ambiente do agente

Releitura de AGENTS e contratos concluída; revisão do esquema, SQL parametrizado, projeções públicas, seed, transações, HTTP, adaptador e isolamento dos E2E. Corrigido o estado desatualizado de ARCHITECTURE (backend/scripts deixaram de ser apenas futuros). Não foram adicionadas autenticação, escrita HTTP, reset ou deploy. Trabalho local e clone aninhado preservados. Nenhuma base existente foi apagada ou sobrescrita.

Acrescentados testes ainda pendentes de execução com dependências reais:
- apoio/testes/banco-de-dados/cli.test.js: comandos reais npm run db:migrate/db:seed em banco novo, reaplicação, recusa de seed e preservação de todas as tabelas por digest; credenciais capturadas somente em memória, sem imprimir segredos em comparações.
- apoio/testes/api/restart.test.js e apoio/testes/auxiliares/servidor-leitura.js: preparação controlada com domínio/evento, conexão fechada, dois processos HTTP independentes em portas locais aleatórias, igualdade das consultas após reinício e ausência de conteúdo oculto, senhas geradas, salts/hashes e segredo/hash de sessão. Sem rota de escrita.
- apoio/testes/api/occurrences.test.js: preparação agora contém sessão privada, para tornar a verificação de projeção mais representativa.

| Verificação solicitada | Resultado nesta revisão |
| --- | --- |
| 1. Instalação reproduzível npm ci | Bloqueada: cópia de package.json/lock em /tmp/cuidacao-ci-*; npm ci --fetch-retries=0 --fetch-timeout=10000 falhou com EAI_AGAIN ao consultar fastify. Diretório criado pela verificação foi removido; node_modules do projeto não foi substituído. |
| 2. Migração/seed em banco novo | Testes existentes e novo teste CLI preparados; execução bloqueada pela ausência de better-sqlite3. |
| 3. Reaplicação/recusa sem perda | Cobertura em testes de persistência e CLI; não comprovada com driver real. |
| 4. API→banco e frontend→API | SQL/cliente revisados; Fastify inject e E2E reais bloqueados. |
| 5. Persistência após reinício | Novo teste reinicia o processo HTTP após preparação controlada; execução bloqueada. |
| 6. Filtros/paginação/URL/histórico | 10 testes frontend/domínio aprovados; comportamento HTTP/browser ainda pendente. |
| 7. Ausência de vazamento | Projeções SQL e schemas revisados; dados/sessões/credenciais fora do Git, exclusões confirmadas por git check-ignore. Testes de resposta HTTP ainda bloqueados; não equivale a auditoria aprovada. |
| 8. Erro de API sem fixtures | Testes de serviço aprovados; E2E de indisponibilidade/retry continua pendente. |
| 9. Suítes exigidas | npm run build aprovado; npm test executado: 2 arquivos frontend aprovados e 4 arquivos backend bloqueados no import de fastify/better-sqlite3. npm run test:e2e executado com Chromium alternativo: servidor bloqueado por better-sqlite3 ausente. |

Comando de resolução tentado: npm install --package-lock-only --ignore-scripts --fetch-retries=0 --fetch-timeout=10000, também EAI_AGAIN. Lock não foi falsificado: ainda falta fastify no registro raiz e na árvore de dependências. Node instalado: 26.10.0; não há comprovação no Node 24. Sondagem de socket 127.0.0.1 em porta aleatória também falhou com EPERM, um bloqueio independente das dependências.

Checks adicionais aprovados: node --test --test-isolation=none apoio/testes/dominio.test.js apoio/testes/servicos/*.test.js (10 testes), syntax checks dos novos testes e git diff --check. Nenhum AC novo foi marcado aprovado. AC03 continua pendente de driver real; AC04–AC11 continuam incompletos (cadastro/sessões/escrita/autorização/Origin/rate limit não entregues); rollback e reinício testados isoladamente não completam esses critérios. README contém comandos exatos para copiar o projeto sem dados para diretório temporário, reparar o lock com rede, executar npm ci e verificar banco/API/frontend localmente.

## Histórico — validação local do passo 3 executada pelo usuário

O usuário informou ter concluído no próprio terminal local, com Node.js 24.21.0, os seguintes comandos:

| Comando | Resultado informado pelo usuário |
| --- | --- |
| npm ci | Instalação concluída com sucesso |
| npm test | 28 testes aprovados |
| npm run build | Build aprovado |
| npm run test:e2e | 16 execuções E2E aprovadas: 8 cenários em desktop e mobile |

A execução e seus resultados são atribuídos ao usuário; não se trata de reexecução pelo agente no ambiente restrito. Os bloqueios anteriores de DNS/instalação, dependências ausentes, Node diferente da stack e bind local foram superados nessa validação. Permanecem acima apenas como histórico das tentativas anteriores.

O package-lock.json atual foi revisado pelo agente: metadados raiz de dependências/devDependencies/engines correspondem a package.json; Fastify 5.12.5, better-sqlite3 13.0.3 e árvore transitiva constam com URLs do registro npm e integridades. README agora usa npm ci, sem etapa de reparo do lockfile.

Com a aprovação dos testes existentes, AC01–AC03 ficam verificados no escopo de consulta e preparação da base: navegação/foco, filtros/vazio/tiles e migração/seed/reaplicação/recusa. A suíte também exercita projeção pública, paginação, rollback interno, persistência entre conexões e reinício de processo HTTP, além de falha da API sem fallback. Isso não completa AC04–AC11, que dependem de cadastro, login/sessões, escrita HTTP, autoria/permissões, validação de criação, Origin e rate limit ainda não implementados. AC30 completo também permanece pendente para todos os fluxos da versão final. Nenhuma funcionalidade de outra etapa foi adicionada nesta atualização.

Commit do passo 3 inclui persistência, API de consulta, integração do frontend, testes e documentação. Clone aninhado CuidAcao/, bancos/WAL, credenciais, node_modules, dist e relatórios ficam fora do commit.

## Autenticação — entrega atual e evidências

AGENTS e contratos relidos; git status tinha somente o clone aninhado CuidAcao/, preservado e não utilizado. PATH inicial usava /usr/bin/node v26.10.0; foi localizado e usado /home/higur/.local/n/bin/node v24.21.0, inclusive nos comandos npm. Fastify/better-sqlite3 reais carregados nessa versão.

Implementadas quatro rotas auth, serviços/repos SQL próprios, scrypt compartilhado com seed (parâmetros preservados, duas derivações simultâneas), sessão persistida com token aleatório/SHA-256 e cookie de 8h, logout idempotente, Origin e limites. Cadastro sempre user, sem sessão automática; conta inexistente e senha errada têm mesma resposta. Guardas requireSession/requireAdmin leem banco; /auth/me usa guarda. Serializadores não logam headers/corpos/URL/query/stack/SQL. Não há migração nova nem alteração de migração aplicada.

Interface em codigo-fonte/servicos/auth.js e codigo-fonte/ui/auth.js: cadastro/login/logout, sessão após reload, labels/erros, confirmação local, carregamento/sucesso, envio repetido bloqueado, senhas fora de URL/storage e apagadas ao fechar, verificação da sessão com aviso de expiração. Consulta pública preservada. IncludeHidden continua recusado para todos por falta da projeção administrativa. Nenhuma criação de ocorrências, upload, participação, painel, reset ou deploy foi adicionado.

Dependência direta fixada: cookie 1.1.1, já transitiva na base, com engines Node >=18. Documentação oficial da versão e Node 24 consultadas; referências/configuração em ARCHITECTURE. Lock atualizado por npm install --package-lock-only --ignore-scripts --offline --no-audit --no-fund.

Resultados desta execução pelo agente, sem adaptadores:

- node --test --test-isolation=none apoio/testes/api/auth.test.js apoio/testes/api/occurrences.test.js apoio/testes/banco-de-dados/persistence.test.js apoio/testes/dominio.test.js apoio/testes/servicos/*.test.js: 41 aprovados com SQLite real.
- npm run build: aprovado com Node 24.21.0.
- npm test: executado; suíte completa não aprovada neste ambiente pelos dois testes abaixo.
- CUIDACAO_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e: executado; Fastify não consegue bind 127.0.0.1:3100, EPERM. E2E novos não aprovados aqui.
- Syntax checks, git diff --check, sincronização do lock e exclusões de dados conferidos.

Bloqueios: teste de reinício HTTP em outro processo retorna erro de inicialização EPERM; o teste CLI falha na asserção da saída “Migrações aplicadas: 1.”, pois o subprocesso npm retorna stdout/stderr vazios neste ambiente. Sonda spawnSync npm --version retorna EPERM. Não foram ignorados, substituídos por mocks ou declarados aprovados. Sessão após fechar/recriar aplicação/conexão SQLite passou; entre processos HTTP ainda pendente. Aprovação local anterior do usuário permanece válida para o passo 3, não para a nova entrega.

AC04: cadastro/normalização, unicidade concorrente e negação de role/campos testados pela API; interface E2E pendente. AC05: login, mensagem uniforme, espaços da senha, cookie/hash, rotação, logout/revogação, expiração exata, persistência ao reabrir e privacidade de respostas/logs testados; reinício HTTP/E2E pendentes. AC06: apenas guardas testadas, sem autorização de futuras escritas. AC11: Origin e rate limits de auth testados; outras escritas e auditoria ainda pendentes. AC06/AC11 não completos; AC04/AC05 aguardam verificação do fluxo de interface. Não promover critérios futuros.

Adicionados 12 cenários Fastify inject em apoio/testes/api/auth.test.js, três testes do cliente HTTP e dois E2E em desktop/mobile (quatro novas execuções); oito cenários de consulta mantidos (16 execuções). Total previsto Node: 43; E2E: 20. Bancos temporários e preparação controlada, sem endpoint temporário de escrita e sem tocar a base de demonstração. README contém origem, PATH e comandos para repetir a aprovação local.

## Identidade cartográfica — implementação de 08/10/2026

Referência autorizada: prompt completo do usuário, consolidado em FRONTEND_DESIGN. Branch main, origin IGORtss/CuidAcao; alterações locais de autenticação/documentação preservadas. Clone aninhado não consultado. git ls-remote origin HEAD falhou com “Could not resolve host: github.com”; consulta web de FRONTEND_DESIGN retornou Cache miss. Sem pull/reset/checkout de arquivos remotos, sem alegar sincronização com main remota. Documento ausente criado a partir do prompt, com proveniência explícita.

Implementado (código, ainda sem aprovação visual/E2E):
- [x] Tokens de petróleo/terra/areia, títulos editoriais e alternativas locais a Noto Serif/Inter, sem novas dependências ou downloads de fontes.
- [x] Marca cuidAção., navegação mínima, hero assimétrico quase viewport e SVG abstrato local cobrindo a superfície; sem CTA Explorar o mapa. Arte declarada sem valor cartográfico.
- [x] Rolagem passiva com requestAnimationFrame e opacidade da arte/texto/revelação, sem scroll-jacking ou recriação do mapa. Atalhos #map/#list-heading e teclado pulam a animação. prefers-reduced-motion elimina revelação animada e movimento do Leaflet.
- [x] Mapa de largura inteira, filtros existentes, legenda/atribuição OpenStreetMap e simulação. Painel compacto flutuante desktop, sheet não modal no fluxo mobile, expandir/recolher por botão/teclado.
- [x] Até quatro registros mais recentes dos filtros, primeiro em destaque; ordem createdAt/id já fornecida pela API, sem ranking. Expandir conserva todos os registros já carregados e suas páginas; mapa/contagem sempre total dos filtros. Carregamento, erro/retry e contagem ficam disponíveis mesmo recolhido.
- [x] Popup com categoria/estado/local/trecho; detalhe ampliado com Relato, Evidências, Discussão e Histórico separados. Discussões/anexos sem API permanecem explicitamente indisponíveis. Hash/filtros/foco/autenticação/privacidade preservados no código, sem novos endpoints.
- [x] Cinco novos cenários E2E em desktop/mobile: rolagem/instância única, links/teclado/foco, painel/total/filtros, redução de movimento/arte removida, 360px/200%. Vinte execuções anteriores preservadas; total descoberto: 30 execuções em três arquivos.
- [ ] Aprovar navegador/E2E e revisão visual/360px/200% localmente.

Verificações pelo agente com /home/higur/.local/n/bin/node v24.21.0:
- npm test executado: seis arquivos aprovados, dois falham por limitações já identificadas (restart HTTP: EPERM no bind; CLI: subprocesso npm retorna saída vazia). Suíte completa não aprovada.
- node --test --test-isolation=none apoio/testes/api/auth.test.js apoio/testes/api/occurrences.test.js apoio/testes/banco-de-dados/persistence.test.js apoio/testes/dominio.test.js apoio/testes/servicos/*.test.js: 41 testes aprovados, Fastify/SQLite reais, sem adaptadores. Esses testes certificam a base, não os novos fluxos visuais.
- npm run build: aprovado após ajustes finais. Bundle JS ~176 kB, sem biblioteca de animação adicional.
- CUIDACAO_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e: executado, bloqueado antes dos cenários por listen EPERM 127.0.0.1:3100. Sondagem isolada de Chromium também falhou: crashpad setsockopt “Operation not permitted”, processo SIGTRAP. Não houve screenshot/revisão visual executada.
- npx --no-install playwright test --list: 30 execuções descobertas; syntax checks e git diff --check aprovados. Descoberta não equivale a aprovação.

Escopo/evidências: redesign endereça AC01/AC02 (consulta/navegação) e parte de AC30 (acessibilidade), mas regressão visual e browser desta versão continuam pendentes. Aprovação histórica do usuário (28 apoio/testes/16 E2E do passo 3) preservada e não estendida automaticamente ao redesign. AC06/AC11 e criação/participação/moderação continuam incompletos. Nenhuma alteração de backend/domínio, dado persistente, seed/reset, dependência, deploy ou commit nesta tarefa.

Para conferir: Node 24, npm test, npm run build, npx playwright install chromium, npm run test:e2e (ou CUIDACAO_CHROMIUM_PATH=/usr/bin/chromium). API e frontend locais pelos comandos do README, com CUIDACAO_WEB_ORIGIN correspondente à URL do Vite. FRONTEND_DESIGN documenta o comportamento e os critérios visuais.


## Etapa 2 — conclusão e evidências de 09/10/2026

Documentação normativa e AGENTS lidos integralmente, código existente inspecionado e trabalho local prévio preservado (incluindo clone aninhado, não utilizado). Execução com PATH apontando /home/higur/.local/n/bin: Node.js 24.21.0. Nenhuma dependência nova, migração aplicada alterada, base existente apagada, commit ou deploy.

Entregue: POST de criação e PATCH parcial do autor, schemas de entrada/saída, guardas de Origin/sessão/JSON, serviço de validação e permissões e repositório SQL. Criação gera autoria, id transacional, received, simulated=true, timestamps e version=1; evento created com snapshot na mesma transação. Edição received/visível/sem duplicata, só autor, até 24h inclusive; checagem sob transação immediate, expectedVersion obrigatório, evento edited com antes/depois e incremento de version/updatedAt. Falha do evento reverte alteração e sequência. Admin usa estas rotas apenas como autor, sem correção administrativa.

Interface existente conectada sem redesenho: controle junto aos filtros, formulário com mapa de seleção e campos de coordenadas por teclado, consulta prévia de registros, avisos fictícios/área aproximada, erros por campo/resumo focável e bloqueio de envio repetido. Sucesso abre detalhe/histórico e atualiza mapa/lista. Edição mostra prazo/condições; 401 conserva rascunho somente em memória e permite entrada; 409 bloqueia reenvio até carregar, comparar e confirmar a versão atual. Não há fallback nem reenvio automático. Texto externo continua via textContent.

| Verificação final | Evidência |
| --- | --- |
| npm test | 49/49 aprovados, sem skips/mocks de SQLite/HTTP. Inclui CLI real de migração/seed/reaplicação/recusa, autenticação/expiração/revogação, validação de campos e bordas, autoria/estado/prazo/visibilidade/duplicata, atomicidade e conflitos. |
| Reinício HTTP | Dois testes aprovados: preparação controlada anterior e novo cadastro/login/criação/edição por HTTP antes de reiniciar outro processo. Registro/version/histórico/sessão preservados. |
| npm run build | Aprovado; frontend ES modules/Vite/Leaflet preservado. |
| npx playwright install chromium | Aprovado fora do sandbox; cache era somente leitura nele. Playwright usa build de compatibilidade ubuntu24.04 informado pela ferramenta. |
| npm run test:e2e | 34/34 aprovados: 30 regressões de leitura/auth/cartografia + 4 execuções de escrita em desktop/mobile. Criação por ponto/manual, edição/reload/histórico, envio único, HTML literal, erros por campo, foco, rascunho/conflito/401 e formulário a 360px/200%. Tiles bloqueados para verificar operação sem fundo. |
| git diff --check | Aprovado. Bancos, credenciais, relatórios e dist permanecem ignorados; clone/trabalho prévios preservados. |

Primeiras tentativas no sandbox falharam por subprocessos/bind EPERM e cache EROFS; as suítes exigidas foram repetidas com autorização fora do sandbox e passaram. Um teste inicial de 24h encontrou sessão expirada de 8h; preparação temporária mantém sessão válida para testar o prazo, sem mudar a duração do produto. Primeira execução E2E identificou interferência das criações/limites na fixture de leitura e Leaflet do formulário instanciado antecipadamente: corrigidos isolamento em duas APIs/bases e inicialização somente ao abrir. Cenário de descrição curta passou após fornecer coordenadas válidas (sem elas, schema rejeitava antes da validação textual). Nenhuma dessas falhas foi ignorada; evidências finais acima vêm da reexecução após os ajustes.

AC03: migração/seed e preservação pela CLI; AC04/AC05: API e interface auth, sessão/logout/expiração e persistência entre processos; AC06: negação direta sem sessão e campos/autoria protegidos; AC07: criação/evento e persistência HTTP/reload; AC08: validação trim, NaN/Infinity no serviço, tipos/limites/bordas na API; AC09: autoria, prazo exato e ultrapassado, demais estados, vínculos/ocultação; AC10: evento falho e escritas concorrentes; AC11: Origin, limites auth e ausência de snapshots/segredos/denúncias na projeção pública. Auditoria administrativa não é exposta: includeHidden permanece 403 para todos.

Limites reais: AC12–AC30 completos continuam pendentes, incluindo participação, uploads, decisões administrativas, reset/backup, revisão visual manual abrangente e roteiro final. Sem alegar acesso a tiles externos ou cartografia oficial. Instalação limpa npm ci mantém a evidência histórica do usuário, não foi repetida nesta entrega sem dependências novas. README documenta comandos e origens de execução/teste; npm run preview continua sem proxy da API.

## Item 5 original — criação com evidências opcionais, concluído em 09/10/2026

Este item é criação de ocorrências da lista original do TCC, não Etapa 5 deste plano. Reutilizados SQLite/migrações, autenticação, criação/edição, histórico e versão existentes. Layout preservado; sem participação, administração, duplicatas ou novas transições.

- [x] Categoria/descrição/localização por mapa ou coordenadas, validação territorial e campos protegidos no servidor.
- [x] Persistência e exibição no mapa/lista/detalhes após reload e reinício HTTP; filtros incompatíveis limpos com aviso após salvar.
- [x] Imagens opcionais JPEG/PNG/WebP, legenda/alt, upload separado após salvar pai, leitura e retirada via API com autoria/prazo/estado/visibilidade.
- [x] Assinatura, decodificação completa, remoção de metadados, limites de 5 MiB/20 megapixels/cinco imagens; recusa de falsificações/URLs/SVG/documentos/executáveis.
- [x] Falha de imagem mantém pai salvo, seleções/legendas pendentes na página e tentativa explícita sem nova ocorrência; conflito/sessão sem reenvio automático.
- [x] Evento, mudança e versão na mesma transação; compensação de arquivos em rollback e recuperação de órfãos antigos, conforme ARCHITECTURE.
- [x] Contratos de API/dados/arquitetura/aceitação/UX/produto/decisões e comandos README atualizados.

### Evidências executadas nesta entrega pelo agente

Node.js 24.21.0 (PATH=/home/higur/.local/n/bin:$PATH), dependências reais, SQLite em disco temporário e HTTP real nos testes de reinício. Base existente e clone CuidAcao/ preservados.

| Verificação | Resultado real |
| --- | --- |
| npm ci --prefix <pasta-temporária> --no-audit --no-fund | Aprovado com package.json/lockfile atuais, 79 pacotes; importação nativa sharp 0.35.5 e SQLite SELECT 1 confirmada no Node 24. Não substituiu node_modules do projeto. |
| npx --no-install playwright install chromium | Aprovado; Chromium do Playwright utilizado na suíte final. |
| npm test | 60/60 aprovados, zero falhas/skips. Nove testes API de anexos e dois do cliente adicionados; regressões existentes preservadas. |
| npm run build | Aprovado. |
| npm run test:e2e | 34/34 aprovados, desktop/mobile, 27,4s na execução final. Mantidas 30 regressões e ampliadas quatro execuções de escrita para imagem/legenda/alt literal, retirada, falha seguida de tentativa sem duplicar ocorrência, mapa/lista/reload, conflito e sessão perdida. |
| git diff --check | Aprovado. |

API cobre bordas exatas de bytes/pixels, sexto arquivo, retirada liberando vaga, metadados removidos, MIME/nome falsos, bytes truncados, multipart/campos inválidos, sessão/Origin/autoria/admin/prazo/estados/duplicata, ocultação de pai/imagem, evento falho e concorrência. Falha de disco inclusive após rename remove arquivo novo e não confirma linha/evento/versão. Inicialização limpa órfãos antigos e preserva arquivos referenciados/retirados/recentes; pastas padrão de bancos distintos são isoladas. Reinício encerra servidor e inicia outro processo, comparando registro editado/version=3, sessão, três eventos, metadados e bytes de imagem enviados por HTTP.

Tentativas anteriores desta mesma entrega: oito novos testes API e suíte intermediária 57/57 + build + 34/34 passaram. Após ampliar as asserções de mapa/lista, a primeira rodada final teve 32 aprovados/2 falhos por título compartilhado entre desktop/mobile; corrigido título por id. A seguinte teve 33 aprovados/1 falho porque criação concorrente mudou o total durante paginação. O cliente corretamente recusou consulta parcial com tentativa manual; o cenário agora aciona esse controle explícito quando necessário. A repetição integral final aprovou 34/34. Bloqueios iniciais de sandbox/portas/subprocessos/cache foram superados; nenhuma verificação exigida ficou indisponível ao término.

Limites: arquivos/rascunhos ainda não enviados vivem só na memória da página; recarregar pode descartá-los. Falhas comuns são compensadas, mas queda abrupta antes do commit pode deixar arquivo privado sem referência, recuperado após 24h na inicialização. Não foi simulada perda física de disco/energia. Tiles externos bloqueados nos E2E, sem certificação de disponibilidade. Revisão visual manual completa e versão completa do TCC continuam pendentes. AC15/AC16 aprovados só para imagens originais; Etapa 3 não concluída, anexos de contribuições/participação futuros. Sem commit, push ou deploy.

## Item 6 original — comentários e complementos, concluído

Pré-verificação do item 5 nesta execução, antes de editar código: 60/60 testes Node e 34/34 E2E aprovados, incluindo criação, mapas/listas/reload, imagens/validações, permissões, falha de upload e reinício HTTP. Código, git status, AGENTS e documentos relidos; nenhuma pendência bloqueante do item 5 encontrada. Trabalho prévio e clone aninhado preservados; prowl indisponível (command not found), inspeção local por leitura direta/rg.

- [x] GET público paginado de comentários/complementos com autor/data/tipo e imagens; ocultos como marcador sem texto/imagens e pai oculto=404.
- [x] POST autenticado e PATCH do autor, campos protegidos/tipos/texto validados, Origin/sessão exigidos.
- [x] Comentário 1–2000 e complemento 20–3000 caracteres após trim; observation/resolution; resolução não altera estado.
- [x] Apenas community_review/confirmed/monitoring, sem duplicata; edição própria até 24h inclusive da contribuição, pais visíveis.
- [x] Imagens de complemento pelo serviço existente, limite independente por conteúdo, autorização do autor da contribuição e visibilidade dos dois pais.
- [x] Histórico/mudança/versão atômicos, snapshots privados, rollback e conflitos; persistência após reiniciar processo HTTP.
- [x] Integração nos detalhes sem redesenho, HTML literal, rascunho/seleções preservados em erros, revisão explícita de versão e bloqueio de envios repetidos.
- [x] Falha de imagem mantém complemento salvo; tentativa de pendências não cria outro filho nem reenvia imagem confirmada.
- [x] Documentos de API/dados/arquitetura/domínio/UX/produto/aceitação/plano e README atualizados.

Retirada de texto: D05 não concede exclusão/retirada direta ao autor. Não existe DELETE /contributions/:id nem botão fictício: solicitação/denúncia/moderação ainda futuras. Retirada de imagem segue D06 e foi verificada. Sem manifestações, pedidos de reabertura, administração, novas transições ou gestão de duplicatas. Migração 001 já possui contribuições e FK composta de anexos; reutilizada intacta, sem nova migração estrutural, dependência ou reset.

### Verificação real do item 6

| Comando/verificação | Resultado executado pelo agente |
| --- | --- |
| npm test (Node 24.21.0) | 70/70 aprovados, zero falhas/skips/todo; Fastify/SQLite reais. Sete novos testes API de contribuições, dois do cliente e um reinício HTTP adicionados. |
| npm run build | Aprovado, bundle JavaScript ~201 kB. |
| npx --no-install playwright install chromium | Aprovado, Playwright usa o build compatível ubuntu24.04 no Arch informado pela ferramenta. |
| npm run test:e2e | 38/38 aprovados, 46,7s; 34 regressões anteriores e quatro novas execuções de contribuições em desktop/mobile. |
| Reinício HTTP | Terceiro cenário usa registro participativo do seed em base temporária: publica comentário/complemento por HTTP, edita complemento, envia imagem, encerra processo e inicia outro; respostas públicas/estado/metadados/bytes de imagem iguais. |
| git diff --check | Aprovado. |

API: limites exatos, Unicode/trim, tipos inválidos/imutáveis/campos extras, sessão/Origin, autoria (incluindo admin sem privilégio de editar terceiro), 24h exatas/ultrapassadas, todos os estados, ocultação e duplicata. Verificados texto de oculto sem conteúdo, anexos sem texto/arquivo quando pai oculto, vínculo de outra ocorrência recusado, comentário sem upload, limite de cinco por complemento independente de outro complemento, idade do relato original sem restringir contribuição nova, rollback de eventos/texto/imagem/versão/arquivos e concorrência com 201/409. Validações de formato/dimensões/metadados continuam cobertas no serviço de imagens reutilizado, com regressão do item 5.

Navegador: visitante lê texto/autor/tipo/data; criação de comentário com HTML literal sem elemento injetado; edição e histórico/reload; resolução mantém estado; complemento salvo antes de imagem; falha simulada de upload deixa texto no banco e seleção/legenda na página, tentativa envia imagem sem nova contribuição; alt/legenda literais; retirada de imagem; validação/foco; conflito com revisão explícita; sessão perdida e modal de entrada mantendo rascunho; erro de consulta sem conteúdo anterior e tentativa manual; formulário 360px/200%. Testes usam terceiro par temporário 3102/5182 isolado das demais bases/limites.

Execuções focadas: 12/12 testes de API/reinício/cliente e 4/4 E2E de contribuições aprovados antes da regressão final. Primeira execução focada de API teve 15/16 aprovados: asserção presumiu contribuição específica na primeira página, mas relógio fixo produzia datas iguais e desempate correto era UUID. Teste corrigido para consultar id na lista completa e evento pela ação; falha não ignorada. Reexecução e suíte final aprovadas. Nenhum teste requerido ficou bloqueado ou não executado.

Limites mantidos: rascunho/arquivos pendentes vivem na memória da página; recarregar pode descartá-los. Perda de resposta requer consultar antes de repetir, sem deduplicação automática de contribuições; conflito requer revisão, nunca sobrescrita silenciosa. Recuperação de crash de arquivos continua como ARCHITECTURE (órfãos privados antigos limpos no boot), sem simular perda física de disco/energia. Tiles bloqueados nos testes; disponibilidade externa e revisão visual manual abrangente não certificadas. Pedidos e suas imagens, manifestações e administração continuam futuros. Sem commit, push ou deploy; nenhuma base preexistente alterada pela verificação.

## Item 7 original — apoio e contestação

Antes de editar, conferidos AGENTS, contratos, git status e implementação local. Dependências efetivamente reexecutadas: 70/70 testes Node, build e 38/38 E2E aprovados, incluindo criação/imagens/comentários/complementos e reinício HTTP. Não havia pendência bloqueante dos itens 5/6. Trabalho local e clone aninhado preservados; nenhuma base preexistente resetada.

- [x] Persistência e consulta pública paginada, autor/data/tipo/justificativa e contagens próprias.
- [x] PUT autenticado cria/substitui/reativa posição própria; DELETE retira sem apagar linha/histórico.
- [x] Justificativa 20–1000 caracteres Unicode após trim, suporte/contestação e campos protegidos validados.
- [x] Autor do relato impedido, inclusive admin; estados participativos/pais visíveis/sem duplicata; posição oculta não é restaurada pela escrita comum.
- [x] Uma linha por usuário/ocorrência por UNIQUE existente; concorrência/versionamento sob transação immediate; nenhuma migração aplicada alterada ou dependência nova.
- [x] Eventos e versões atômicos, rollback de criação/substituição/retirada, reativação e retirada repetida sem novo evento quando já inativa e versão atual.
- [x] Contagens somente ativas visíveis, sem somar duplicatas; nenhum efeito automático no estado.
- [x] Justificativas anteriores/ocultas somente nos snapshots privados, nunca em motivo público de evento.
- [x] Interface com seções distintas, texto literal, aviso de ausência de laudo, envio único, rascunho preservado e revisão explícita de conflito.
- [x] Mudança de sessão atualiza controles dos detalhes sem apagar formulário; nova entrada permite concluir rascunho.
- [x] Persistência após encerrar servidor e iniciar outro processo HTTP, com posições ativas/retiradas e histórico.
- [x] Contratos e README atualizados, sem administração, novas transições ou gestão de duplicatas.

### Verificações do item 7 executadas pelo agente

Node.js 24.21.0, PATH=/home/higur/.local/n/bin:$PATH, dependências reais. `npm test`: 79/79 aprovados, zero falhas/skips/todo; seis novos testes API, dois do cliente e um reinício HTTP. Build aprovado após adaptação final da sessão (~211 kB JS). `npx --no-install playwright install chromium` aprovado, utilizando fallback ubuntu24.04 informado pela ferramenta no Arch. `git diff --check` aprovado. `npm run test:e2e`: 42/42 aprovados, 47,6s na última execução, incluindo 38 regressões e quatro novas execuções de manifestações em desktop/mobile. Nenhuma verificação exigida ficou bloqueada ou não executada.

Primeira regressão integral após implementar manifestações: 79/79 Node, build e 42/42 E2E aprovados. Após adicionar atualização dos controles na mudança de identidade e ampliar teste de sessão para login/envio efetivo do rascunho, Node continuou 79/79, build aprovado, E2E teve 41 aprovados/1 falho. Os quatro testes de manifestações passaram; falha era o cenário anterior de criação: concorrência mudou total durante paginação (API/client corretamente recusaram resultado parcial), e helper tentava clicar retry da lista atrás de um modal, tornando recuperação inacessível. Helper corrigido para fechar detalhes, consultar novamente e reabrir o mesmo registro pela lista; sem mudar regra do produto, remover asserção ou habilitar retry automático. Regressão completa reexecutada após a correção.

Limites: rascunho vive na memória e não sobrevive ao reload; perda de resposta exige consulta antes de novo envio, sem retry automático. Não há prazo adicional para manifestações. Migração 001 e armazenamento privado de imagens intactos. Tiles externos bloqueados nos E2E; disponibilidade externa, perda física de disco/energia, revisão visual manual abrangente e roteiro completo do TCC não verificados nesta etapa. Pedidos/administração/moderação/gestão de duplicatas/reset continuam futuros. Sem commit, push ou deploy.

Última regressão após corrigir recuperação do cenário de criação: 42/42 E2E aprovados (47,6s), zero falhas/skips. Node final 79/79, build/instalação Chromium/diff-check aprovados. AC12/AC13 e Etapa 3 concluídos; AC17–AC30 completos continuam pendentes. Falha intermediária acima corrigida, nenhuma falha final ou bloqueio do ambiente.

## Item 8 original — estados e acompanhamento, concluído

AGENTS e documentos normativos relidos integralmente; git status/código/migração/políticas existentes inspecionados, prowl indisponível e leitura direta/rg utilizados. Antes de editar, dependências realmente reexecutadas: 79/79 testes Node e 42/42 E2E aprovados. Criação/imagens/contribuições/manifestações e histórico estavam funcionando; não houve pendência bloqueante. Matriz DOMAIN/API coerente; referências a pedidos/transições futuros e painel em UX foram atualizadas para o escopo real. Nenhuma regra, aresta ou responsável inventado.

- [x] Matriz fechada dos seis estados, apenas administrador independente, motivo 20–1000 após trim.
- [x] Confirmação exige suporte independente válido e parecer individual de todas as contestações ativas visíveis, sem quórum ou alteração automática.
- [x] Acompanhamento exige complemento visível de atualização; encerramento exige resolução referenciada/resolved; descarte invalid/out_of_scope e motivo.
- [x] Reabertura de closed/discarded exige pedido visível pending com fato novo; limpa razões terminais, aceita selecionado e substitui outros pending atomicamente; nova confirmação necessária.
- [x] Pedidos publicados/consultados pela API de contribuições, texto imutável, um pending por usuário/ocorrência; imagens opcionais nas primeiras 24h enquanto pending, com limites/armazenamento existentes.
- [x] Estado anterior/novo, responsável/data/motivo e snapshots privados na mesma transação da mudança/versionamento.
- [x] Histórico público mostra origem/destino sem snapshots/referências privadas.
- [x] Políticas de relato/contribuição/posição/imagem consultam estado atual e bloqueiam novas escritas após triagem/encerramento/descarte conforme D05/D06; visibilidade/duplicata preservadas.
- [x] UI funcional nos detalhes para admin independente, mantendo layout; motivo/pareceres/rascunho conservados em falhas, revisão explícita de versão e envio único.
- [x] Persistência após encerrar/iniciar processos HTTP reais; nenhuma base existente recriada ou modificada pelos testes.

Migração 001 já contém estados/razões terminais/pedidos/índice pending/anexos; reutilizada sem alteração e sem dependência nova. Rejeição de pedidos, painel administrativo completo, correções, denúncias, moderação e gestão de vínculos continuam futuros. Referências relacionadas são usadas só quando vínculo já existe.

### Evidências finais executadas pelo agente

| Verificação | Resultado real |
| --- | --- |
| Node/stack | Node.js 24.21.0, PATH=/home/higur/.local/n/bin:$PATH, Fastify/better-sqlite3/sharp reais. |
| npm test | 90/90 aprovados, zero falhas/skips/todo, 51,4s. Oito novos testes API, dois do cliente/histórico e um reinício HTTP. |
| npm run build | Aprovado, ~221 kB JS, sem troca de frontend. |
| npx --no-install playwright install chromium | Aprovado; fallback ubuntu24.04 informado pelo Playwright no Arch. |
| npm run test:e2e | 46/46 aprovados, ~1,5min; 42 regressões anteriores e quatro execuções novas desktop/mobile. |
| git diff --check | Aprovado. |

API: todas as arestas permitidas e todos os outros pares proibidos, motivos/pareceres/Unicode/limites/campos, sessão/Origin/papel/decisão própria, suporte ativo visível independente, comentário/resolução insuficientes para confirmar, referências ocultas/relacionadas/vínculos/autoria/descarte/duplicata, contestações ausentes/extras/repetidas, resolução/atualização/pedido exigidos, ocultos/duplicatas bloqueados. Transição de estado/evento e aceitação de pedido/eventos revertem juntos ao provocar falha de trigger; versões antigas e duas requisições concorrentes não sobrescrevem.

Ciclo por API real verifica bloqueio de edição do relato e imagens originais após triagem; bloqueio de comentários/complementos/edições/posições/imagens após encerramento; pedido imutável, autenticação/autoria/validação, imagens nas 24h exatas e bloqueadas 1ms depois com sessão válida, bloqueio após aceitação, rollback de pedido e pedido único. Resolução e apoio não alteram estado automaticamente. Snapshots de suporte preservados e alteração/ocultação posterior sinaliza revisão sem mudar estado.

Reinício HTTP: criação→triagem concorrente (200/409)→apoio→confirmação→atualização→acompanhamento→resolução→encerramento→pedido, leitura idêntica após outro processo; usa sessão admin persistida em terceiro processo para reabrir, quarto processo conserva estado/razões limpas/pedido accepted/histórico.

E2E: administrador independente executa ciclo com parecer de contestação, encerra referenciando resolução, usuário pede reabertura com imagem (falha simulada preserva pedido salvo e tentativa não cria outro), admin reabre e depois descarta justificadamente. Reload e visita pública preservam estado/histórico/autor e HTML literal sem elemento injetado. Verificados envio único, ausência de controles para perfis comuns, 360px/200%, validação/foco, conflito/revisão preservando motivo, rede, sessão perdida seguida de nova entrada e envio do mesmo rascunho. Quinta base/API temporárias isoladas 3104/5184.

Execuções focadas: sete testes API iniciais aprovados; oito API ampliados aprovados; sete cliente/reinícios aprovados; quatro E2E novos aprovados. Suíte intermediária antiga 79/79 aprovada após integrar serviços. Nenhuma falha de teste ou bloqueio ocorreu nesta entrega; última regressão inclui todas as ampliações.

AC17–AC19 verificados; AC20 parcial (encerramento/reabertura com pedido, nova confirmação e aceitação/substituição; rejeição futura), AC21 parcial (independência das decisões de estado/contribuição referenciada; correções/denúncias futuras), AC23 parcial (referências sinalizam revisão e pais ocultos bloqueiam; sem moderação/restauração). Etapa 4 completa não é declarada entregue. Limites: avaliação da pertinência/fato novo/inadequação é humana; rascunhos pendentes só em memória; perda de resposta exige consulta antes de repetir. Tiles bloqueados nos testes; disponibilidade externa, revisão visual manual abrangente e perda física de disco/energia não verificados. Instalação limpa mantém evidência histórica, não foi repetida porque não houve dependência nova. Sem commit, push ou deploy; trabalho preexistente preservado.

## Item 9 original — área administrativa

AGENTS e todos os contratos normativos relidos integralmente; git status e código real conferidos antes de editar. Trabalho existente, clone aninhado e base do desenvolvedor preservados. prowl indisponível; inspeção por leitura direta/rg. Base atual realmente reexecutada: 90/90 Node e 46/46 E2E aprovados, sem usar apenas o planejamento ou a evidência histórica. Nenhuma pendência bloqueante dos itens anteriores. D01/D08 mantidos; operacionalização de includeHidden/filas/auditoria e suspensão de correção em duplicata registrada em DECISIONS/API/DOMAIN.

- [x] Navegação Administração, filas Recebidas/Verificação/Todas/Denúncias/Pedidos, filtros categoria/estado/visibilidade e paginação.
- [x] Guarda administrativa atual em todas as consultas privadas, incluindo filhos, auditoria e arquivos; sem includeHidden permanece projeção pública.
- [x] Denúncias autenticadas de occurrence/contribution/attachment/stance visíveis, motivo 20–1000, um pending por autor/alvo; consulta privada própria/admin e sem ocultação automática.
- [x] Decisão independente dismissed/upheld com motivo/responsável/data; upheld e ocultação do alvo/eventos/versão no mesmo commit. Denúncias concorrentes podem revisar alvo já oculto sem repetir moderação.
- [x] Correção somente de campos D02 com motivo/versionamento, em qualquer estado inclusive oculto, autoria/ciclo preservados; duplicata bloqueia correção conforme D07.
- [x] Ocultação/restauração dos quatro tipos sem DELETE físico, sem transição/reativação/retirada implícita; pai oculto prevalece e withdrawnAt permanece reservado.
- [x] Rejeição de pedido pending com motivo/evento/versionamento; novo pedido posterior permitido sob D05, aceitação continua no serviço de transições.
- [x] Leitura privada de conteúdo/snapshots sem chave de arquivo, credenciais ou identidade de denunciante no histórico; decisões de denúncias na fila privada, não no histórico de conteúdo.
- [x] UI preserva visual, texto literal, justificativa em validação/rede/sessão/conflito, revisão explícita e envio único; transições integradas sem duplicar suas regras.
- [x] Persistência entre processos HTTP reais, concorrência, rollback e bloqueio de conteúdo/anexos públicos testados.

Esquema 001 já contém reports/visibility/índices/eventos: nenhuma migração aplicada reescrita, nova dependência ou reset necessário. Nenhuma gestão de papéis, contas, duplicatas/relacionadas ou reset/backup acrescentada. Comandos e contas administrativas de demonstração em README.

### Verificações reais do item 9

Resultados finais aprovados, incluindo a regressão ampliada abaixo. Primeira execução focada: 6/7 testes API; corrigida serialização de campos privados da auditoria (campos SQL não devem continuar como propriedades undefined no DTO). Reexecução 7/7; teste adicional de duplicata e restrições públicas incluído na suíte final. Testes focados de reinício/cliente: 8/8 aprovados. Primeira suíte completa: 98/100, duas asserções antigas ainda exigiam indisponibilidade de includeHidden mesmo ao administrador; atualizadas para novo contrato autorizado (401 visitante/403 comum/200 admin), sem reduzir verificações de negação. Regressão Node seguinte: 101/101 aprovados, zero falhas/skips/todo (68,3s).

Primeiro E2E administrativo: 2/4; preparação trocava cookie via API e navegava somente hash, sem atualizar identidade em memória, impedindo controle da nova conta. Teste agora recarrega após troca controlada de conta, como outros cenários existentes. Reexecução focada: 4/4 aprovados (47,2s). Regressão completa seguinte: 50/50 aprovados (~1,5min). Ampliação focada de moderação de filhos e rejeição pelo navegador: 6/6 cenários administrativos aprovados (55,5s). Primeira regressão ampliada teve 51/52, com formulário de reabertura desaparecendo durante recarga de página enquanto o código era atualizado com Vite ativo. Regressão completa repetida com código estabilizado: 52/52 aprovados (~1,2min), sem alterar o cenário nem eliminar asserções.

Limites: rascunhos apenas na memória da página; resposta perdida exige consultar antes de repetir. Avaliação humana da adequação/justificativa não automatizada. Tiles bloqueados nos E2E; disponibilidade externa, revisão visual manual abrangente e perda física de disco/energia não verificados. Instalação limpa mantém evidência histórica, não repetida sem dependência nova. Sem commit, push ou deploy.

### Resultado final confirmado

| Comando | Resultado real |
| --- | --- |
| npm test | 101/101 aprovados, zero falhas/skips/todo, 47,2s, Node 24.21.0. Oito novos testes API de administração, dois do cliente e um reinício HTTP, mais 90 regressões preservadas. |
| npm run build | Aprovado, 28 módulos, ~238 kB JS; frontend e layout existentes preservados. |
| npx --no-install playwright install chromium | Aprovado, fallback ubuntu24.04 no Arch informado pela ferramenta. |
| npm run test:e2e | 52/52 aprovados, ~1,2min; 46 regressões e seis novas execuções administrativas desktop/mobile. |
| git diff --check | Aprovado. |

API cobre bloqueio público/admin de consulta, filtros/páginas, alvo/justificativa/versionamento, autoria/revisor/denunciante, quatro tipos, denuncia privada/unicidade, dismissed/upheld/alvo já oculto, correção em todos os estados, duplicata, restauração subordinada/retirada, contagens/flags sem transição, rollback completo e concorrência. Navegador cobre envio/leitura privada de denúncia e decisão, consulta de ocultos, correção/HTML literal, imagens privadas/públicas, restauração e triagem via serviço existente; paginação, 360px/200%, foco, conflito/revisão explícita, rede, sessão recuperada e envio único. Inclui moderação de contribuição/imagem/manifestação, suporte oculto sinalizado sem mudar estado, fila de pedidos/rejeição e novo pedido posterior. Reinício HTTP inclui quatro processos e compara registros/denúncias/auditoria/imagens privadas e restauradas.

AC20–AC23 agora verificados no escopo normativo, AC01–AC19 preservados. Etapa 4 continua incompleta por gestão de duplicatas/relacionadas (AC24–AC26), reservada ao item 10. Nenhuma falha final, bloqueio do ambiente ou verificação exigida não executada. Revisão visual manual abrangente, tiles externos, perda física de disco/energia e instalação limpa adicional não executados nesta etapa, conforme limites acima. Documentação atualizada; sem commit, push ou deploy.

## Item 10 original — duplicatas e ocorrências relacionadas

AGENTS/documentos normativos e código inspecionados, git status conferido; trabalho dos itens anteriores, clone aninhado e bases existentes preservados. Dependências reexecutadas antes de editar: 101/101 Node e 52/52 E2E desktop/mobile aprovados. Sem pendência bloqueante. D07/contratos coerentes; detalhes operacionais em DECISIONS, sem regras novas de estado, autorização, fusão ou participação.

Implementados seis endpoints de vínculos, repositório/serviço dedicados, migração 002 de índice simétrico (001 intacta), guarda atual admin/independência dos dois autores, principal mais antiga, ausência de cadeia/ciclo/autorrelação/filhos/relações da origem, versões exatas dos dois ids e condições D07. Operações alteram somente vínculo, incrementam ambas versões e gravam dois eventos correlacionados atomicamente. Retarget é desvinculação seguida de vinculação auditadas; desvincular preserva estado e pode resolver principal indisponível. Criar/remover relação exige ambos visíveis, não descartados e sem duplicata, inclusive após moderação/estado. Relações permitem closed e não somam contagens. Conteúdo, autoria, identificadores, arquivos e contribuições ficam em seus registros.

UI integrada ao painel existente: filas incluem duplicatas, consulta privada de vínculos, seleção por id/resumo/estado e efeito antes do envio. Motivo/destino preservados em falhas, conflito exige revisão/aceitação explícita de ambas versões, sessão/login e envio único. Público mostra links de relações, descrição e leitura expansível do conteúdo visível de duplicatas identificado pela origem. Destinos ocultos omitidos de data/total/links; principal ocultada indica indisponibilidade, sem esconder automaticamente a duplicata. Duplicatas mantêm bloqueios existentes de edição/transição/participação e saem da lista/mapa padrão. Sem dependências novas, base resetada, commit, push ou deploy.

### Tentativas e correções do item 10

Primeira suíte ampliada: 110/111 Node aprovados. Falha única no teste CLI: expectativa usava quantidade “2”, mas comando informa versões “1, 2”; teste corrigido sem alterar produto. Primeiro E2E focado: 2/4 aprovados; cenário de conflito revelou prévia sem referência local, adicionados referência/coordenadas/autoria/data para comparar campos atuais com rascunho. Testes ampliados para migração 002 sobre base 001 preenchida, rollback de remoção de relação, concorrência com transição/moderação, anexos da própria duplicata preservados e navegação pública simétrica. Reexecução focada Node: 14/14 aprovados. Segundo E2E focado: 2/4, com navegação pública de relações recém-ampliada revelando uso incorreto do retorno de append; montagem do elemento corrigida, mantendo asserção de navegação. Terceiro E2E focado: 4/4 aprovados. Regressões finais abaixo incluem comentário da duplicata consultado pela principal e revisão após perda de sessão, limpando a prévia privada sem apagar motivo/destino.


### Evidências finais reais do item 10

| Verificação | Resultado |
| --- | --- |
| Stack | Node.js 24.21.0, PATH=/home/higur/.local/n/bin:$PATH; Fastify/better-sqlite3/sharp reais. |
| npm test | 112/112 aprovados, zero falhas/skips/todo, 39,6s. Sete API de vínculos, dois clientes, um reinício HTTP e uma migração evolutiva, mais 101 regressões. |
| npm run build | Aprovado, 30 módulos, ~247 kB JS; frontend/layout preservados. |
| npx --no-install playwright install chromium | Aprovado; fallback ubuntu24.04-x64 informado pela ferramenta no Arch. |
| npm run test:e2e | 56/56 aprovados, 49,0s; 52 regressões e quatro novas execuções desktop/mobile. |
| git diff --check | Aprovado. |

API: vinculação/desvinculação/relação/remoção, consulta pública/privada e paginação, justificativas/duas versões/campos, sessão/Origin/papel atual/dois autores independentes, autorrelação/principal mais nova/cadeias/ciclos/filhos/relações da origem/repetição/destino inválido, estados/visibilidade. Duplica sem transferir autoria/contribuições/anexos/contagens nem alterar estado; novas escritas suspensas e retomadas ao desvincular. Ocultos fora dos links/totais públicos e acesso privado guardado; principal indisponível pode ser desvinculada sem alterar visibilidade dos filhos. Referência de confirmação cuja relação foi removida sinaliza revisão sem transição automática. Rollback de adição/remoção/eventos/ambas versões; concorrência 200/409 com vinculação, moderação e transição.

HTTP real: quatro processos independentes preservam vínculos e ambas auditorias/sessões após reinício, removem via API e confirmam ausência dos vínculos em novo processo. Migração 002 sobre base 001 preenchida/reaplicação conserva todas as entidades/eventos, sem reset. Browser: relação simétrica e navegação, remover/vincular/desvincular, conteúdo do comentário de duplicata identificado pela origem e HTML literal, principal oculta e acesso privado, bloqueio de edição/participação, reload, 360px/200%, foco, conflito em versão do destino, revisão explícita, rascunho/rede/sessão e envio único. Perda de autorização limpa prévia privada preservando motivo/destino; nova entrada requer consultar/revisar ambos.

AC24–AC26 verificados; Etapa 4 concluída no escopo AC17–AC26, sem antecipar reset/backup/apresentação. Falhas finais: nenhuma; verificações exigidas não executadas: nenhuma; bloqueios: nenhum. Tentativas intermediárias acima foram corrigidas e reexecutadas. Limites não verificados nesta etapa: disponibilidade externa de tiles (bloqueados nos E2E), revisão visual manual abrangente, perda física de disco/energia e nova instalação limpa npm ci (sem dependências novas, evidência anterior preservada). Rascunhos pendentes somente em memória e perda de resposta exige consulta antes de repetir. Sem commit, push ou deploy; base preexistente, migração 001 e trabalho local preservados.

## Item 11 original — revisão integrada de histórico e encerramento

Revisão de 09/10/2026, sem recriar histórico/transições, sem migração nova, dependência, evento retroativo ou alteração de permissões. Antes de editar foram lidos AGENTS e todos os contratos normativos/README, inspecionados git status, serviços, rotas, repositórios, interface e testes. O trabalho local dos itens anteriores e o diretório não rastreado `CuidAcao/` foram preservados. Dependências atuais reexecutadas: 112/112 Node e 56/56 E2E, aprovados; não foram aceitos apenas os números históricos do item 10.

### Preparação da base de uso

Sem override `CUIDACAO_DB_PATH` ou arquivo `.env`, a base configurada é `/home/higur/CuidAcao/data/cuidacao.sqlite`. Ela já existia, inicialmente sem tabelas/migrações/registros. `npm run db:migrate` aplicou 001 e 002 na mesma base, sem seed, exclusão, reset ou recriação. Inspeção após aplicação: versões 1/2 e zero registros em users, sessions, occurrences, contributions, stances, attachments, occurrence_relations, reports e events. Nenhuma migração pendente. Sem criação de contas administrativas nesta revisão. Os testes usam suas próprias bases temporárias, algumas preenchidas, e não substituem a base de uso.

### Requisitos, estado encontrado e evidências

| Requisito | Resultado da revisão | Evidência executada |
| --- | --- | --- |
| Criação/edição de ocorrências | Já auditadas, com ator/data/entidade/alteração e versão transacional | `apoio/testes/api/occurrence-write.test.js`, ciclo de `apoio/testes/api/history.test.js` |
| Comentários/complementos, edição e retirada | Escritas já auditadas; retirada textual por denúncia/moderação conforme D05, sem DELETE ou exclusão física | `apoio/testes/api/contributions.test.js`, `administration.test.js`, `history.test.js` |
| Apoio/contestação/substituição/retirada | Já auditados; uma posição ativa e sem efeito automático sobre estado | `apoio/testes/api/stances.test.js`, `history.test.js` |
| Inclusão/retirada/moderação de anexos | Já auditadas; arquivo retirado não reaparece por restauração | `apoio/testes/api/attachments.test.js`, `administration.test.js`, `history.test.js` |
| Transições, pedidos, aceitação/rejeição/substituição | Serviço existente reutilizado sem alteração; eventos no commit da mudança | `apoio/testes/api/transitions.test.js`, `administration.test.js`, `history.test.js` |
| Correções e ocultação/restauração | Já auditadas; visibilidade separada de estado, snapshots privados | `apoio/testes/api/administration.test.js`, `history.test.js` |
| Decisões sobre denúncias | Auditoria privada própria, não exposta no histórico público nem na auditoria de conteúdo | `apoio/testes/api/administration.test.js`, `history.test.js` |
| Duplicatas/relações e remoção | Eventos correlacionados dos dois pais já transacionais; nenhum dado/contribuição transferido | `apoio/testes/api/links.test.js`, `history.test.js`, `apoio/testes/api/restart.test.js` |
| Encerramento autorizado, motivo e fundamento válido | Regras D03/D04 existentes confirmadas; complemento de resolução atual visível da mesma ocorrência obrigatório | `apoio/testes/api/transitions.test.js`, `history.test.js` |
| Referências inválidas, autoria, estado/visibilidade, conflitos e rollback | Guardas/transações existentes aprovadas; versões antigas não sobrescrevem | `apoio/testes/api/transitions.test.js`, `administration.test.js`, `links.test.js`; suíte Node completa |
| Participação/anexos após encerramento e reabertura | Condições reavaliadas em cada escrita; resolução/votos não causam transição | `apoio/testes/api/transitions.test.js` (mudanças reais), `history.test.js` |
| Motivo e fundamento público do encerramento | Lacuna corrigida: `closure` derivado de evento existente e contribuição atual; sem snapshot oculto; último fechamento por versão; legado sem evento retorna null | `apoio/testes/api/history.test.js`, `apoio/testes/servicos/occurrences.test.js`, `apoio/testes/ponta-a-ponta/transicoes.spec.js` |
| Sequência, paginação, autoria/data/justificativa | Lacuna corrigida: páginas visuais de 20, última ao abrir, ordem cronológica interna, controles/foco; auditoria traduz ação e identifica entidade | `apoio/testes/ponta-a-ponta/transicoes.spec.js` desktop/mobile com mais de 20 eventos, páginas públicas e privadas |
| Ciclo completo entre contas diferentes | Criação → participação → revisão → acompanhamento → encerramento → pedido → rejeição/novo pedido e aceitação | `apoio/testes/api/history.test.js`, `apoio/testes/api/transitions.test.js`, `apoio/testes/ponta-a-ponta/transicoes.spec.js` |
| Persistência após reinício | Teste HTTP existente ampliado para verificar fundamento público fechado e remoção da projeção após reabrir; estados/versões/histórico persistem | `apoio/testes/api/restart.test.js`, processos HTTP independentes reais |
| Privacidade e texto literal | Públicos sem snapshots/denúncias/segredos/corpo oculto; fundamento oculto sem id/autor/texto; HTML literal | `apoio/testes/api/history.test.js`, adaptador e E2E de transições |

### Verificações reais

- `npm test`: 116/116 aprovados, zero falhas/cancelamentos/skips/todo (46,3 s). Quatro testes novos relevantes: três de API para revisão integrada/projeção/legado e um de adaptador; reinício/ciclo browser existentes ampliados.
- Foco inicial de API/adaptador: 11/11 aprovados. Foco E2E de transições: 4/4 aprovados, desktop/mobile (46,6 s).
- `npm run build`: aprovado, Vite/31 módulos, sem erro (112 ms).
- `npx --no-install playwright install chromium`: executado; instalação disponível, aviso de fallback Ubuntu no Arch, sem bloqueio de navegador.
- `npm run test:e2e`: reexecução completa 56/56 aprovados, zero falhas/skips finais (1,0 min), desktop/mobile; inclui ciclo de encerramento/reabertura e paginação pública/privada.
- `git diff --check`: aprovado, inclusive após atualização da documentação.

Logs locais: `/tmp/cuidacao-item11-node-first.log`, `/tmp/cuidacao-item11-build-first.log`, `/tmp/cuidacao-item11-chromium.log`, `/tmp/cuidacao-item11-e2e-final.log`, `/tmp/cuidacao-item11-map-recheck.log` e `/tmp/cuidacao-item11-e2e-recheck.log`. Primeira execução E2E completa: 55 aprovados e 1 falha no teste móvel de mapa (`mapa, detalhes e retorno de foco`), por timeout esperando o botão Ver detalhes após o clique no marcador. O mesmo cenário passou em reexecução isolada 1/1 (21,5 s), sem alteração de código; ocorrência intermitente, sem causa técnica confirmada. A suíte completa foi reexecutada: 56/56 aprovados, sem alteração do cenário de mapa ou código para contornar a falha. Nenhuma falha nas execuções focadas de transições/API ou Node. Nenhum comando obrigatório ficou sem execução e nenhum bloqueio de ambiente permanece. Nenhum commit, push ou deploy. Revisão visual manual abrangente, tiles externos, roteiro integral de apresentação e backup/reset continuam fora desta verificação; nenhuma dessas funções futuras foi marcada concluída.


## Item 12 original — revisão integrada da interface

Revisão de 09/10/2026, sem redesenho, nova funcionalidade de domínio, dependência, migração, modificação da base de uso, commit, push ou deploy. AGENTS, FRONTEND_DESIGN, README e contratos normativos lidos; git status e implementação/testes inspecionados antes de editar. Preservados os itens anteriores, registros e diretório não rastreado `CuidAcao/`. Todos os fluxos existentes foram confrontados com suas permissões e testes, sem aceitar números históricos como resultado atual. Base de uso não recebeu seed/reset; navegador e suíte usaram bases temporárias próprias.

### Problemas encontrados e correções verificadas

| Lacuna / fluxo | Correção e evidência |
| --- | --- |
| Arte existente ausente na entrada/velamento | Aspas do SVG data URL quebravam `background-image` interpolado no atributo HTML; aplicação pela CSSOM. E2E decodifica a imagem aplicada nos dois elementos; captura confirma arte visível. |
| Login/cadastro inacessível a 200% | Limite `svh` era multiplicado pela ampliação: diálogo medido com top=-336px/altura=1472px em viewport de 800px, botão Criar conta inalcançável. Limite pelo espaço percentual disponível, rolagem interna e margens. Cadastro/fechamento/foco exercitados nas duas larguras. |
| Imagens/formulário extrapolando a largura a 200% | Track `auto` da grade impunha mínimo de conteúdo: scrollWidth=158px contra clientWidth=146px no diálogo. Coluna minmax(0,1fr), limites de filhos/controles e padding flexível. Nova seleção/legenda cabem sem scroll horizontal. |
| Legibilidade e foco administrativos | Campos de correção/vínculos reutilizam fonte, padding, borda e foco dos formulários; botões e atribuição do mapa podem quebrar linhas. Erros associados por aria-describedby e aria-invalid. E2E administrativo existente ampliado. |
| Contraste da arte restaurada e campos | Ajuste somente de luminosidade da arte e borda dos campos; paleta/desenho/layout preservados. Contrastes medidos e inspeção visual, valores em ACCEPTANCE. |
| Foco perdido no logout | Remoção do botão ativo deixava foco no body. Retorno explícito ao controle de conta, também em falha; E2E de autenticação existente ampliado e duas capturas de foco. |
| Leitura de duplicata após falha | Botão agora volta a ficar disponível ao terminar a consulta; tentativa manual sem escrita/reenvio automático. E2E de vínculos aborta a leitura, verifica erro/botão e então consulta com sucesso. |
| Textos/rótulos | Andamento de denúncias e visibilidade em português; limites textuais nos rótulos; limite de edição inclui hora de São Paulo; orientação de complemento somente em estados elegíveis. Nomes de arquivo selecionado anunciados separadamente do controle nativo. |
| Tiles de seleção indisponíveis | Anúncio explícito orienta latitude/longitude; salvar não depende do fundo. Lista/coordenadas manuais, marcadores e mensagens de consulta continuam disponíveis. E2E com tiles abortados e captura do mapa. |

### Fluxos existentes reutilizados

A suíte completa cobre consulta integral paginada, coerência mapa/lista/contagem, filtros, vazio, links diretos/fora de filtro, Voltar/Avançar, retorno de foco e respostas antigas; cadastro/login incorreto/correto/logout/reload; recuperação de sessão sobre rascunho; criação/edição e evidências; comentários/complementos/imagens; apoio/contestação/substituição/retirada; denúncias privadas/decisão; administração/correção/moderação; transições/encerramento/pedido/reabertura; vínculos públicos/privados; paginação de histórico/auditoria. Testes já existentes mantêm negação de autorização, coerência de controles/estado, HTML literal, rede, conflito/revisão explícita, envio único e persistência/reinício. Não recriar serviços nem mudar estados/permissões.

Upload parcial foi também inspecionado em navegador isolado: primeira imagem enviada, segunda com HTTP 500 simulado; ocorrência e texto preservados. Tentativa de pendências enviou somente a segunda: 1 POST de criação, 3 POSTs de imagens para 2 arquivos, 2 imagens finais. Encerramento, fundamento, histórico com 28 eventos/páginas, pedido de reabertura, revisão administrativa, andamento privado decidido, relações/duplicata e edição pelo autor foram capturados usando as APIs reais da base temporária.

### Inspeção visual e acessibilidade — distinta dos testes automatizados

Matriz de 15 telas × 5 configurações = 75 capturas renderizadas, com geometria registrada: desktop 1440×1000, 360×800, 390×844 e conteúdo a 200% nas duas larguras móveis. Telas: entrada, mapa, criação com seleção de imagem, login, cadastro, detalhes, comentário, complemento, posição comunitária, denúncia, administração, revisão, correção, vínculo e transição. Amostras de desktop e das duas larguras/ampliações foram efetivamente abertas e inspecionadas visualmente; gerar PNG sozinho não foi considerado inspeção. Capturas adicionais mostram edição, upload parcial/registro salvo, fechamento/fundamento, histórico, reabertura, denúncia própria/andamento, fila/decisão/moderação/auditoria, relações/conteúdo/aviso de duplicata, lista filtrada/vazia/carregando/falha de rede e foco por teclado/logout.

Conferidos composição existente, legibilidade, bordas/foco, margens, quebra de textos/botões, rolagem interna, labels e alternativa ao mapa. A matriz final não apresentou overflow horizontal na página/diálogos, diálogo fora da viewport ou campo visível sem label associado. Galeria e duas legendas de evidência foram abertas/inspecionadas em 360/390px; coordenadas manuais também capturadas na viewport de 420px de altura. Navegação por Tab/Enter/Escape, controles de pular, foco de retorno, login sobre rascunho e redução de movimento também exercitados. Viewport de altura 420px simula espaço ocupado por teclado virtual e conserva acesso aos campos/controles.

Ampliação foi feita com CSS zoom=2, não certificação do zoom nativo de todos os navegadores. Sem dispositivo físico Android/iOS, teclado virtual real, leitor de tela ou inspeção em Firefox/WebKit: não executados. Controle de arquivo nativo pode abreviar seu texto conforme navegador; nome selecionado completo é apresentado fora dele. Rascunhos/arquivos ainda só na memória; reload voluntário não é armazenamento de rascunho. Inspeção e contraste não equivalem a conformidade integral certificada.

### Investigação do mapa móvel

Baseline atual: cenário histórico e suíte 56/56 E2E aprovados, sem alteração. Antes das correções, 24 páginas novas com cliques no marcador; depois, 48 páginas novas em 360/390px, cliques/toques e CPU desacelerada em 4×. Registrados pointer/touch/mouse/click, coordenadas/retângulos, alvo do hit testing, transformação da pane, classes de animação e geometria do mapa. 72/72 abriram Ver detalhes; testes adicionais verificam botão dentro do mapa, toque/clique, abertura correta e foco ao fechar nas duas larguras. Código de eventos/fit/pan/popup do mapa de consulta preservado.

Inspecionadas animação Leaflet, posicionamento, sobreposições de controles/velamento (pointer-events:none), deslocamento pela sessão/erro de tiles e sincronização por resultados da API. Nenhuma hipótese foi demonstrada como causa. A falha histórica continua intermitente e sem causa confirmada; não declarar corrigida pela aprovação de reexecuções. Sem waits arbitrários, retries adicionais, clique forçado ou remoção das asserções do cenário original. Uma execução auxiliar foi interrompida por contagem fixa da fixture alterada pelo roteiro visual; esse erro de preparo não foi contado como falha do marcador nem incluído nas 72 tentativas completas.

Tiles: testes e capturas de falha abortaram requisições externas deliberadamente. Observação independente, sem interceptação: 9 tiles HTTP 200, fundo real renderizado no mapa em 390px. Disponibilidade observada localmente naquele momento; não é garantia futura nem validação do limite territorial.

### Verificações reais

- Baseline reexecutado antes das correções: 116/116 Node, 56/56 E2E desktop/mobile.
- Primeiro foco dos novos cenários: 6 aprovados / 2 falhos, por overflow real no formulário com imagens a 200%; causa medida e corrigida na grade. Foco posterior: 12/12 aprovados, incluindo administração e vínculos. Scripts visuais auxiliares tiveram também erros de importação/seleção/contagem de fixtures, corrigidos no roteiro; não exigiram alteração de regra de domínio.
- `npm test`: 116/116 aprovados, zero falhas/cancelados/skips/todo (51,65 s), incluindo API/banco temporário/reinícios/transações/permissões.
- `npm run build`: aprovado, 31 módulos, sem erro (110 ms na execução final).
- `npx --no-install playwright install chromium`: executado e aprovado; aviso de fallback Ubuntu no Arch, sem bloqueio do navegador.
- `npm run test:e2e`: 64/64 aprovados, zero falhas/skips finais (1,1 min), desktop/mobile. Primeira suíte integrada desta revisão também 64/64; última reexecução foi necessária pelo ajuste final de contraste/controle de arquivo. Quatro cenários novos (oito execuções); cenários existentes ampliados, sem criar testes redundantes de domínio.
- `git diff --check`: aprovado, inclusive após documentação.

Logs locais: `/tmp/cuidacao-item12-base-node.log`, `/tmp/cuidacao-item12-base-e2e.log`, `/tmp/cuidacao-item12-focused-interface.log`, `/tmp/cuidacao-item12-focused-second.log`, `/tmp/cuidacao-item12-node-final.log`, `/tmp/cuidacao-item12-build-final.log`, `/tmp/cuidacao-item12-chromium.log`, `/tmp/cuidacao-item12-e2e-final.log` e `/tmp/cuidacao-item12-e2e-final2.log`. Capturas/medições/diagnóstico: `/tmp/cuidacao-item12-visual/{before,after,extra}/`, `after/metrics.json`, `map-probe-before.json`, `map-probe-throttled.json`; contrastes e tiles em logs auxiliares `/tmp/cuidacao-item12-*`. Nenhuma captura/credencial/base/relatório foi acrescentada ao Git.

Resultado: item 12 concluído como revisão de interface nos limites documentados. Falhas finais automatizadas: nenhuma; comandos obrigatórios não executados: nenhum; bloqueio de ambiente: nenhum. Limitações: causa histórica do mapa indeterminada, dispositivos/teclado/leitor de tela físicos e outros motores não verificados. Apresentação/backup/reset/restauração e instalação limpa atuais permanecem pendentes na Etapa 5, sem marcar novas funções concluídas.

## Item 13 original — validação integrada do fluxo completo

### Escopo e preparação

Leitura dos contratos, código e estado local realizada antes das alterações. Base histórica novamente verificada: 116/116 Node e 64/64 E2E aprovados. Toda execução desta etapa usa SQLite/anexos isolados; nenhuma migração, seed, reset ou preparação de apresentação foi executada na base de uso. SHA-256 do banco de uso e dos arquivos WAL/SHM comparado antes/depois, sem alteração. Sem commit, push ou deploy.

### Cobertura completada

- Novo `apoio/testes/ponta-a-ponta/integrado.spec.js`: ciclo pela interface com três contas recém-cadastradas e dois administradores independentes. Cria categoria/descrição/coordenadas e duas imagens, consulta mapa/lista/link, faz triagem, publica comentário/observação/apoio/contestação, confirma com suporte e parecer, acompanha, acrescenta resolução e encerra. Confere motivo/fundamento/histórico público. Pede e aprova reabertura; em ocorrência separada já encerrada (`CA-004`), outro pedido é rejeitado pelo segundo admin, mantendo estado. As respostas da API comprovam as entidades e efeitos das ações, não apenas os controles visíveis.
- Falha parcial integrada: primeiro arquivo persistido, segundo POST recebe falha simulada; repetição envia apenas o pendente. Contagens comprovadas: uma criação, três POSTs de upload, duas imagens finais. Descrição permanece no formulário; arquivos legíveis. Texto com HTML continua literal.
- Ampliado cenário existente em `apoio/testes/api/restart.test.js`, sem duplicar serviços: cadastro/login reais, criação, imagem original, relação e duplicata, comentário, apoio, contestação, observação com imagem, confirmação independente com parecer, acompanhamento, resolução/encerramento, pedido aceito e pedido rejeitado em registro distinto. Quatro processos HTTP reais independentes: escrita/encerramento, leitura após reinício, aprovação usando sessão persistida, nova leitura. Compara respostas completas, autoria, versões, vínculos, histórico, fundamentos e bytes dos dois anexos. Concorrência de triagem permite somente uma escrita e retorna 409 na outra.
- Reutilizados os testes de denúncias/moderação/restauração e reinícios, auditoria pública/privada, referências inválidas, negação de autorização, vínculos/desvínculos, conflitos e rollback por falha de evento. Não foram criados cenários redundantes para cada regra já coberta. Relação requisito→teste/resultado em ACEITE.md.
- Harness integrado tem bancos/portas/arquivos de credenciais próprios por dispositivo (5187/3107 e 5188/3108), separados dos projetos existentes. Isso mantém os limites de cadastro reais, sem desabilitar rate limit. Credenciais temporárias privadas são removidas no encerramento.

### Roteiro e verificações

[VALIDACAO.md](VALIDACAO.md) documenta comandos e contas fictícias para repetir o ciclo manualmente em pasta temporária, reiniciar a API preservando DB/anexos, e exercitar os cenários adicionais. Comandos de preparação executados em base isolada nova: migrações 001/002, seed com cinco contas/quatro registros, PNG gerado por Sharp e credenciais com modo 0600. Pasta temporária removida após a conferência, sem usar a base de apresentação. Não houve nova instalação por `npm ci` nem repetição manual de todos os passos fora dos testes automatizados.

Resultados atuais efetivamente executados, sem retries adicionais:

| Verificação | Resultado |
| --- | --- |
| `node --version` | v24.21.0 |
| Base anterior: `npm test` / `npm run test:e2e` | 116/116 Node e 64/64 E2E aprovados |
| `node --test apoio/testes/api/restart.test.js` | 7/7 aprovados, zero falhas/skips |
| E2E integrado isolado desktop/mobile | 2/2 aprovados |
| `npm test` final | 116/116 aprovados, zero falhas/cancelados/skips; cenário existente ampliado, sem inflar contagem Node |
| `npm run build` | Aprovado, Vite 31 módulos |
| `npm run test:e2e` final | 66/66 aprovados, desktop/mobile, zero falhas/skips |
| `npx playwright install chromium` | Aprovado; Chromium utilizado nos E2E |
| `git diff --check` | Aprovado, sem erros |
| Preparação do roteiro em base isolada | Migrações 001/002, cinco contas/quatro registros, imagem PNG e arquivo de contas 0600 conferidos |
| Preservação da base de uso | SHA-256 do SQLite/WAL/SHM inalterado |

Logs locais fora do versionamento: `/tmp/cuidacao-item13-{node-baseline,e2e-baseline,restart,integrated-e2e,node-final,build,e2e-final,chromium,manual-preparation}.log`. Nenhuma tentativa automatizada desta etapa falhou. Correções entregues são de lacunas de cobertura e documentação; nenhum defeito de produto exigiu alteração dos serviços ou frontend. Nenhum comando obrigatório ficou bloqueado ou não executado. Item 13 concluído no escopo acima; isto não encerra a Etapa 5 inteira.

### Limites preservados

- Mapa móvel: falha antiga não reproduzida nesta validação; causa indeterminada, sem retries adicionais/esperas arbitrárias/remoção de asserções. Passar novamente não identifica causa.
- Desktop/mobile executados em Chromium; dispositivos físicos, teclado virtual real e leitores de tela não executados. Revisão visual abrangente pertence às evidências do item 12 e não foi refeita nesta etapa.
- Tiles abortados e falhas de rede/upload interceptadas são cenários simulados. Não houve nova medição de disponibilidade do provedor externo. Expiração exata usa relógio controlado na API; navegador simula perda da sessão removendo cookie, sem espera real de oito horas.
- AC27 concluído no fluxo testado. AC28/reset/backup/restauração, instalação limpa integral de AC30, material acadêmico e base definitiva da apresentação ficam pendentes. Item 14 não iniciado.


## Item 14 original — dados e recuperação da apresentação

Revisão de AGENTS, README e contratos antes da implementação. Base histórica novamente executada: 116/116 Node e 66/66 E2E aprovados. Migrações 001/002, autorização, imagens, contribuições, transições, administração, vínculos e auditoria já existiam; foram reutilizados sem modificar seus serviços ou frontend. Seed legado e todas as alterações locais anteriores preservados. Não há nova migração nem dependência.

### Entrega

- demo:prepare cria exclusivamente pasta dedicada vazia, com marcador, banco/anexos/credenciais privados; recusa sobrescrita. Caminhos de uso/configurados, symlinks e nomes arbitrários recusados.
- Oito relatos fictícios em coordenadas D02, nas duas categorias existentes: os seis estados, duplicata com principal mais antiga, relação simétrica, denúncia pendente, registro oculto com decisão e pedido de reabertura. Três moradores e dois administradores independentes; nove PNGs ilustrativos gerados localmente, sem download. Serviços produzem 48 eventos reais iniciais e versões coerentes.
- demo:start supervisiona API 3001 e Vite/proxy 5174. Bloqueia acesso web direto a bancos, contas e imagens locais, inclusive /@fs; anexos passam pela API. Nenhuma publicação/deploy ou endpoint novo de domínio.
- demo:backup publica snapshot SQLite/arquivos referenciados/contas/índice somente após integridade, FKs e hashes; lock impede concorrer com a apresentação. demo:restore exige destino dedicado vazio. demo:reset exige ambiente demo e confirmação, valida initial, faz backup antes de trocar current e invalida sessões; não reescreve datas nem eventos. Falhas de backup/snapshot preservam dados. Não executa seed na base de uso.
- [DEMONSTRACAO.md](DEMONSTRACAO.md): comandos, contas locais, oito cenários/IDs, roteiro de cinco minutos, reset/restauração e consulta sem tiles. README atualizado. Base preparada entregue em demo-data; cópia verificada em cuidacao-demo-restored, ambas ignoradas pelo Git.

### Requisitos e evidências realmente executadas

| Requisito | Evidência | Resultado |
| --- | --- | --- |
| Pasta vazia, domínio/histórico/imagens coerentes, recusa de sobrescrita | apoio/testes/banco-de-dados/demo.test.js; npm run demo:prepare no diretório final e repetição recusada | Aprovado; oito registros, seis pontos públicos, nove imagens, cinco contas |
| Reset explícito e preservação em falhas | apoio/testes/banco-de-dados/demo.test.js: ambiente/confirmação/lock/symlink, backup impedido e snapshot adulterado, hashes do domínio; reset por CLI com trabalho anterior salvo | Aprovado; restaura initial, conserva backup anterior, cookie antigo inválido e novo login funcional |
| Backup/restauração separados | testes e execução real de serviços/CLI; cópia cuidacao-demo-restored iniciada por outro processo HTTP | Aprovado; cinco autenticações, oito registros, 48 eventos, nove imagens com bytes idênticos, fechamento/vínculos conservados e oculto público 404 |
| Arquivos privados fora das rotas públicas | teste de Vite real com pai explicitamente permitido e controle público 200; sondagem no demo:start final | Aprovado; contas/banco/imagem oculta por caminho direto e /@fs retornam 403; API pública 200 |
| Instalação nova | npm ci em /tmp/cuidacao-item14-install-Ayq1bU, cópia sem node_modules/banco; Node 24.21.0, SQLite SELECT 1 e Sharp 0.35.5, build e demo:prepare | Aprovado; 79 pacotes instalados; não declara execução da suíte completa dentro dessa cópia |
| Base de uso preservada | SHA-256 antes/depois de data/cuidacao.sqlite, WAL e SHM | Aprovado; nenhum seed/reset/recriação na base de uso |
| Utilidade no navegador | apoio/testes/ponta-a-ponta/demonstracao.spec.js em desktop/mobile; abertura adicional da base entregue em desktop 1440 e móveis 360/390 | Aprovado; estados, imagens, comentários/posições, fechamento, duplicata/relação, denúncia/pedido e acesso privado |
| Inspeção visual | 22 capturas locais; telas de lista, recebida, verificação, encerrada, duplicata, administração oculta; detalhes do fundamento e ilustração | Capturas/inspeção realizadas; métricas de 12 páginas de cenário sem rolagem horizontal. Sem redesign |

A inspeção do supervisor encontrou possibilidade de Vite servir dados privados diretamente. Foi corrigida pela negação de diretórios/arquivos privados, reutilizada no servidor E2E demonstrativo. A sondagem real negou seis URLs diretas, mantendo a API pública. Não houve alteração de permissões de domínio para preparar cenários.

Tentativas: primeira execução focada do novo E2E falhou nos dois dispositivos por uma expectativa que não correspondia à mensagem existente (“não está disponível”); a asserção foi corrigida mantendo a verificação de privacidade e 2/2 passaram. O teste de negação web teve duas falhas de fixture: o arquivo de controle usava pai com prefixo privado e a seleção por readdir escolheu a pasta .staging em lugar de imagem. O controle passou a usar pai permitido e o arquivo foi selecionado pela referência real do banco; as asserções 200/403 foram preservadas. Nenhuma falha foi mascarada por retries, esperas arbitrárias ou remoção de asserções.

### Limites

Causa da falha histórica do marcador móvel continua indeterminada. Dispositivos físicos, teclado virtual real e leitores de tela não executados. Tiles abortados no E2E/capturas representam falha simulada; disponibilidade externa não foi medida nesta etapa. Não se simulou perda física de disco/energia. Datas de initial não rejuvenescem: prazos de edição/imagens continuam normais; para apresentação dias depois, criar relato novo ou preparar outra pasta dedicada vazia. Material acadêmico e adequação institucional continuam pendentes; o item 14 não declara a Etapa 5 inteira concluída. Não houve commit, push ou deploy.


### Conclusão e nova conferência — 11/10/2026

Após interrupção, código e pastas persistiram; os arquivos temporários de logs/capturas de 09/10 já não estavam disponíveis. Não se tratou seus resultados históricos como nova execução. Conferidos git status, AGENTS, dados locais e ausência de locks ativos. O bloqueio web foi também aplicado ao Vite normal de desenvolvimento, evitando exposição da pasta demonstrativa ao iniciar npm run dev. A tabela anterior descreve a execução de 09/10; as verificações abaixo foram novamente realizadas em 11/10.

Correção da contagem documental: o cenário contém 48 eventos persistidos, dos quais 45 de auditoria de conteúdo e três privados de denúncias. O número 45 vinha da consulta de auditoria que exclui denúncias, não do total do banco. current, initial e a cópia restaurada foram conferidos; nenhum evento foi inventado, apagado ou alterado.

| Comando / verificação atual | Resultado |
| --- | --- |
| npm test, Node.js 24.21.0 | 121/121 aprovados, zero falhas/skips |
| npm run build | Aprovado, 31 módulos |
| npm run test:e2e | 68/68 aprovados, desktop/mobile, zero falhas/skips |
| npx playwright install chromium | Aprovado; Chromium utilizado nas capturas/E2E |
| git diff --check | Aprovado, sem erros |
| Instalação em cópia nova /tmp/cuidacao-item14-install-m8d71suf | npm ci: 79 pacotes; SQLite SELECT 1 e Sharp; build e demo:prepare aprovados. Suíte completa executada no checkout principal |
| Base entregue, HTTP e navegador | Cinco contas, oito registros, nove arquivos idênticos, oculto 404; URLs privadas 403 em demo:start e Vite normal. 18 novas capturas desktop/360/390, lista, recebida, verificação, encerrada, duplicata e administração oculta; sem overflow nas páginas de cenário |
| Reset, backup e restauração | CLI reset com backup obrigatório concluído; novo backup validado e restaurado em cuidacao-demo-verificada. Outro processo HTTP confirmou cinco contas, oito registros, 48 eventos, nove arquivos e bloqueio público |
| Base de uso | SQLite/WAL/SHM com hashes iguais antes/depois desta continuação. O manifesto temporário anterior desapareceu; a comparação atual não retroage a 09/10 |

Os cinco testes da ferramenta cobrem também recusa de sobrescrita, autenticação, histórico, reset e falhas. Nenhuma verificação obrigatória falhou ou ficou indisponível nesta continuação. Tentativas antigas de fixture e limitações ficam registradas acima. Instalação nova e preparação não executaram seed na base de uso. As imagens são locais; apoio/testes/capturas de tiles permanecem simulados.

Logs atuais em /tmp/cuidacao-item14-resume-{node,build,e2e,install,browser,reset,recovery,restored,chromium}.log; capturas em /tmp/cuidacao-item14-resume-visual. São artefatos temporários e podem desaparecer após reinício/limpeza do ambiente. Base final demo-data permanece no cenário inicial, com sessões invalidadas; cópias restauradas preservadas e todos os servidores desta tarefa encerrados. Item 14 concluído nos limites documentados, sem commit/push/deploy.

## Extensão autorizada — cadastro e login Google (11/10/2026)

Implementados botão oficial nas duas telas, popup GIS, verificação de ID token no servidor com google-auth-library 11.2.0 (Node >=22, executado em Node 24.21.0), desafio com nonce/cookie HttpOnly/origem, escolha de username, identidade persistente provider/sub e sessão local compartilhada. Conta inicial tem papel user e credenciais de senha NULL; não se usa nome/e-mail para vinculação. Login/cadastro/logout por senha preservados. Sem tokens de autorização para outros serviços, client secret, One Tap, armazenamento de JWT no navegador/banco ou vinculação de contas.

Migração numerada 003 conserva usuários, hashes, sessões e todas as referências; usa transação e foreign_key_check antes do commit. Migrações 001/002 não foram alteradas. Migração exercitada sobre bases temporárias preenchidas, com caso de rollback por referência inválida. Base de uso e base demonstrativa não migradas nesta extensão: SHA-256 SQLite/WAL/SHM e banco current iguais antes/depois. Aplicação explícita de db:migrate à base escolhida, sem seed/reset, documentada no README. Reset/restore de demonstração invalida também desafios Google quando existentes e conserva suporte aos snapshots antigos.

Interface mantém design/formulários existentes. Primeiro acesso oferece username; colisão explica indisponibilidade de vinculação. Falhas de SDK/provedor/envio e cancelamento conservam o rascunho. Configuração ausente mostra botão indisponível sem impedir autenticação local. Escritas exigem JSON/origem correta, limites reutilizados e sessão emitida/rotacionada na mesma transação do cadastro. Nenhum claim concede papel administrativo; respostas públicas usam os mesmos três campos locais.

Cobertura por requisito em ACEITE.md. Tests/api/google.test.js inclui migração com dados anteriores, claims inválidos, provider indisponível, permissões, sessão/rotação/logout/expiração, colisões, concorrência, rollback, logs e reinício de processos HTTP independentes. Tests/services/google-auth.test.js verifica contrato/erros do cliente. Google E2E desktop/mobile comprova cadastro/username/colisão, rascunho de ocorrência, criação persistida, logout e acesso recorrente; falhas/cancelamento não autenticam. Auth E2E verifica também indisponibilidade sem configuração, mantendo login local.

Tentativas intermediárias: primeiro E2E Google falhou em dois projetos por locator de texto que não correspondia ao botão existente “Entrar para continuar”; corrigido locator sem retirar a verificação do rascunho. Primeira regressão Node teve 132/133 aprovados: a expectativa textual do CLI ainda dizia duas migrações; atualizada para 1,2,3 mantendo testes de preservação/recusa de seed. Testes focados finais: 25/25 Node e 4/4 E2E aprovados. Não foram acrescentados retries ou esperas arbitrárias para mascarar falhas.

Ativação exige Google Cloud Auth Platform/cliente Web com origem localhost:5173 e Client ID em CUIDACAO_GOOGLE_CLIENT_ID, conforme README. Popup não usa redirect_uri, código de autorização ou PKCE; nonce/contexto/origem protegem o fluxo escolhido. Login real Google não executado; não se declara configuração Cloud aprovada. Contas fictícias/credenciais/PEMs temporários fora do versionamento. Nenhum commit, push ou deploy.

### Verificação final da integração Google

| Verificação realmente executada | Resultado |
| --- | --- |
| npm test, Node 24.21.0 | 133/133 aprovados, zero falhas/skips |
| npm run build | Aprovado, 33 módulos |
| npm run test:e2e | 74/74 aprovados, desktop/mobile, 2,0 minutos, zero falhas/skips |
| npx playwright install chromium | Aprovado; aviso de fallback Ubuntu por Arch não suportado oficialmente, navegador executou toda a suíte |
| git diff --check | Aprovado |
| Integridade da base de uso e demo current | SHA-256 anteriores conferidos: SQLite/WAL/SHM e banco demo inalterados |
| Login real e Cloud/FedCM/popup externo | Não executado, cliente Google não configurado; instruções no README |

Logs temporários em /tmp/cuidacao-google-regression-{node,build,e2e}.log e /tmp/cuidacao-google-chromium.log. Testes controlados não equivalem a autenticação real do provedor. Nenhuma nova instalação limpa foi alegada nesta integração. Limitações históricas (causa do mapa móvel indeterminada, dispositivos físicos, teclado virtual e leitores de tela) permanecem; não se mediu disponibilidade externa do Google nesta etapa.

## Revisão visual geral — 11/10/2026

Aplicada uma revisão ampla do frontend sem alterar domínio, API ou dependências. A abertura ganhou escala tipográfica e composição cartográfica mais assimétrica, eixo territorial e navegação editorial. A transição continua por rolagem normal, sem CTA para explorar o mapa. Consulta, filtros e mapa foram reorganizados como uma prancha territorial; a lista contextual recebeu numeração, distinção textual/cromática de categoria e hierarquia mais clara. Diálogos, formulários, contribuições, histórico e administração passaram a compartilhar o mesmo sistema editorial, inclusive em telas móveis.

A inspeção gráfica atual foi realizada em Chromium a 1440×1000 e 390×844. Durante a validação, a primeira revisão introduziu overflow sob CSS zoom de 200% e interferência de hit testing em diálogos longos; largura mínima, margens de rolagem e regras compactas foram corrigidas. Um link de continuidade na abertura também foi removido por contrariar o aceite sem CTA. Os seis cenários focados de interface/zoom/toque passaram após as correções.

Verificação final em Node 24.21.0: 134/134 testes Node aprovados, build Vite aprovado, 74/74 E2E desktop/mobile aprovados e `git diff --check` aprovado. A primeira suíte E2E da revisão teve 72/74 por detectar o link na abertura; a reexecução integral após a correção passou. Dispositivos físicos, teclado virtual real e leitores de tela continuam não executados; login Google externo continua dependente de configuração real.

## Reconstrução estrutural do frontend — 11/10/2026

Trabalho isolado na branch `reconstruct/frontend-visual`. A apresentação deixou de ser montada diretamente em `main.js`: o novo `codigo-fonte/shell.js` define cabeçalho global, palco territorial, mesa cartográfica, coluna de instrumentos e caderno de registros; `main.js` conserva a orquestração funcional e integra a nova composição pelos mesmos contratos públicos. `codigo-fonte/reconstruction.css` mantém as garantias finais de reflow acima das regras históricas. Backend, dados, rotas, permissões e dependências não foram alterados nesta reconstrução.

A primeira entrega (home + mapa) foi renderizada com API temporária real e inspecionada em Chromium a 1440×1000 e 390×844. Foram capturados estado completo, mapa com quatro ocorrências, falha simulada de tiles, filtros, marcadores e lista. Diferenças corrigidas após inspeção: quebra de “perspectiva” dentro da palavra no mobile, compressão do cabeçalho da seção, overflow global a 200% causado por controles/caption e altura do dossiê de detalhes multiplicada pelo zoom. A continuidade da abertura permanece passiva, sem botão/link para acessar o mapa.

Na etapa seguinte, detalhes viraram dossiê lateral; autenticação, registro, participação, transições, vínculos e administração receberam a mesma estrutura editorial. Inspeções de detalhes e autenticação foram feitas em desktop/mobile. Capturas temporárias: `/tmp/cuidacao-final-{desktop,mobile}.png`, `/tmp/cuidacao-data-{desktop,mobile}.png`, `/tmp/cuidacao-detail-{desktop,mobile}.png` e `/tmp/cuidacao-auth-{desktop,mobile}.png`.

Verificação final: 134/134 testes Node, build Vite e 74/74 E2E desktop/mobile aprovados, além de `git diff --check`. Uma execução E2E intermediária teve 66/74 por saturação/temporização concorrente; os quatro grupos falhos passaram isoladamente (vínculos 4/4, integrado 2/2, Google 4/4 e demonstração 2/2) e a reexecução integral passou 74/74, sem retries ou expectativas removidas. Figma não estava disponível: a referência visual efetiva foi `apoio/documentacao/PROJETO_INTERFACE.md` e os contratos UX locais. Dispositivos físicos, teclado virtual real, leitores de tela e login Google externo permanecem não verificados.

## Alinhamento visual da abertura com o satélite — 12/10/2026

A arte raster existente foi preservada byte a byte. Capturas reais do navegador compararam o `cover` renderizado com Esri World Imagery em 1440×900 e 390×844. A câmera anterior (`-23.9388,-46.183`, zoom 15) mostrava área maior e deslocava praia, núcleo urbano e promontório durante a dissolução. O melhor compromisso visual verificado usa `setView()`, zoom fracionário 15.54, centro desktop `-23.9348,-46.1805` e centro móvel `-23.9348,-46.1815`; a diferença móvel compensa somente o recorte horizontal responsivo da arte.

Capturas locais em `test-results/alignment/`: arte, satélite, sobreposição matemática 50%, sobreposição real da fase de rolagem e mapa interativo final para desktop e mobile. A inspeção confirmou coincidência aproximada da linha da praia, curva da baía, malha urbana central, estrada oeste e entrada do promontório. O raster artístico alonga o promontório e reinterpreta ruas/vegetação; Leaflet 1.x não oferece rotação de câmera, e rotação/deformação CSS desalinharia marcadores. Essa diferença residual foi diagnosticada e não foi mascarada. Coordenadas, marcadores, filtros, `fitBounds()`, animação e créditos do provedor foram preservados.

Verificação de navegador: World Imagery carregado realmente nos dois tamanhos; seis marcadores visíveis, controles com opacidade 1, mapa interativo, créditos Esri/Vantor/Earthstar/GIS User Community e ausência de overflow horizontal. A nova câmera revelou um popup 5 px fora do mapa em 360 px; `autoPanPadding` foi aumentado e o retorno de foco passou a consultar o botão atualmente montado pelo Leaflet. O cenário foi repetido seis vezes em paralelo, desktop/mobile, com 6/6 aprovações.

Regressão final: 134/134 testes Node, build Vite, teste focado das fases 6/6, teste repetido de popup/foco 6/6, 80/80 E2E desktop/mobile e `git diff --check` aprovados. Duas execuções completas intermediárias tiveram 79/80: a primeira por uma expectativa administrativa de sessão que passou isoladamente sem mudança; a segunda reproduziu o popup/foco e levou à correção acima. Nenhuma asserção foi removida ou afrouxada.

## Mapa permanente na abertura — 12/10/2026

Decisão explícita do usuário executada: a ilustração estática sobreposta foi eliminada; o Leaflet com World Imagery é o fundo da primeira tela e o mesmo mapa em todos os estados. Contratos atualizados antes do código: DECISIONS (nova decisão, histórico preservado), UX (navegação e enquadramento), FRONTEND_DESIGN (fases sem dissolução), ACCEPTANCE (dez critérios do mapa permanente), ARCHITECTURE e ESTRUTURA (sem constante de arte).

Código: `codigo-fonte/shell.js` sem `.map-veil`/`.cartography`; `codigo-fonte/main.js` sem import da imagem (o PNG de 2,8 MiB sai do bundle; arquivo preservado no repositório); `codigo-fonte/map.js` sem `territoryArt` e sem lógica de dissolução — `mountTerritory()` alterna editorial/mapa/marcadores/controles sobre a mesma câmera, `createMap()` desabilita arrastar/zoom-toque/duplo-clique/scroll/box/teclado na abertura e `setInteractive()` libera ao concluir, `presentMarkers()` com easing de leve salto; CSS com véu de legibilidade em gradiente no lugar da arte. Câmera `territoryView` inalterada; nenhuma coordenada de ocorrência tocada; instância Leaflet única; atribuição Esri mantida.

Testes E2E atualizados: `transicao.spec.js` (câmera fixa por estilo do `map-pane`, ausência de arte, opacidade do mapa sempre 1, keyframes 10px/0.85, falha de tiles com marcadores funcionais), `territorio.spec.js` e `revisao-interface.spec.js` (fundo satélite desde o início, sem véu).

Verificação real em Node 24.21.0: 134/134 Node, build Vite (PNG fora do bundle), 80/80 E2E desktop/mobile, `git diff --check` aprovado. Capturas reais com tiles Esri em `/tmp/opencode/cuidacao-permanent/`: abertura, rolagem, marcadores e estado completo em 1440×900 e 390×844 — câmera fixa confirmada por comparação de estilo (`camera-fixa=true`), fase `controls` e mapa interativo ao final nos dois tamanhos. Sem commit, push ou deploy.

## Navegação funcional e recuperação dos pins — 12/10/2026

Reutilizados mapa, API, formulários, sessão, detalhes e administração existentes. A navegação agora acessa mapa, ocorrências, registro, dados disponíveis e conta; busca textual e período filtram os registros carregados. O resumo usa somente ocorrências fictícias. Perfil mostra a sessão e ocorrências do autor. Seguir ocorrências e medições ambientais continuam pendentes por não terem contrato de domínio/API. O detalhe é painel lateral não modal com navegação por Relato, Evidências, Discussão e Histórico.

Pins preservam dados/coordenadas, identificação Água/Resíduos, animação e popup com acesso aos detalhes; a visibilidade final ganhou salvaguarda e o popup foi limitado para caber no mapa móvel sob `maxBounds`. Teste novo cobre 105 pins, categorias, clique/toque, popup, seções, busca, dados, registro, perfil e restrição administrativa em desktop/mobile. Primeira rodada detectou overflow a 200%, clique em pin encoberto da fixture, espera insuficiente do stagger e popup 1,3 px fora do mapa; as causas foram corrigidas e não mascaradas.

Verificação: build Vite aprovado; grupo de navegação/transição/interface 20/20, repetição do popup 6/6 e fluxos funcionais de autenticação, criação, contribuições, manifestações, estados, administração, vínculos e ciclo integrado 34/34, todos em Chromium desktop/mobile. `git diff --check` aprovado. Não houve dependência, backend, dado persistente, deploy ou medição inventada.

## Correção da consulta local — 12/10/2026

A mensagem genérica vinha de `codigo-fonte/api.js` após `GET /api/v1/occurrences` receber 404: a porta padrão 3000 estava ocupada por outro servidor local, enquanto API e proxy presumiam que ela estivesse disponível. API e proxy agora compartilham a constante de porta padrão 3002; documentação operacional atualizada, sem alteração de contratos, dados ou interface. A falha foi reproduzida contra a porta antiga; na configuração corrigida a consulta real pelo Vite retornou 200 com quatro registros. Teste Node focado 1/1 e Chromium real confirmaram quatro cards, quatro pins, detalhe correto e as quatro abas, sem a mensagem de erro.

## Exemplos cartográficos ambientais — 14/10/2026

A demonstração isolada passou a incluir seis ocorrências explicitamente fictícias: qualidade da água, resíduos, erosão, esgoto aparente, alagamento e vegetação. As geometrias pertencem somente ao cenário acadêmico, distinguem extensão aproximada de geometria verificada dentro desse cenário e não afirmam condições reais do Perequê. A base de uso existente não foi resetada nem preenchida.

Verificação direcionada em Node 24.21.0: 39/39 testes aprovados, build Vite e `git diff --check` aprovados. Em Chromium real, a demonstração exibiu as seis formas, o rótulo `pH 7.2` e abriu pelo teclado o detalhe da erosão em viewport móvel. A inspeção gráfica foi feita em 1440×900; o cenário isolado permaneceu disponível em `http://127.0.0.1:5174` ao término da validação.

## Painel de registro em três etapas — 14/10/2026

O modal amplo e seu segundo Leaflet foram removidos. Registrar ocorrência usa painel não modal lateral de 360–420px no desktop e folha inferior no celular, com problema, localização e evidências sobre os mesmos campos persistentes em memória. A etapa de localização ativa temporariamente a seleção no Leaflet principal; fechar ou sair da etapa remove apenas o marcador transitório. Criação/edição, validação, autenticação, prevenção de duplicatas, conflito de versão, upload e recuperação de falha continuam nos clientes e contratos existentes; backend, API, banco e dependências não mudaram.

Verificação direcionada em Node 24.21.0, sem suíte completa: build Vite aprovado; `apoio/testes/ponta-a-ponta/escrita-ocorrencia.spec.js` 4/4 em desktop/mobile; `apoio/testes/ponta-a-ponta/revisao-interface.spec.js` 8/8 em desktop/mobile, incluindo 360/390px a 200%, mapa interativo, preservação do rascunho, imagens e retorno de foco. A primeira rodada focada detectou a barra de ações sobrepondo “Adicionar imagem” a 420px de altura; a barra deixou de ser fixa e a reexecução passou. Sintaxe e `git diff --check` aprovados. Não houve teste em dispositivo físico, teclado virtual ou leitor de tela; nenhuma suíte completa foi executada por solicitação explícita.

## Redesenho da apresentação inicial — 14/10/2026

A abertura recebeu composição editorial própria sobre a instância Leaflet existente: marca e navegação mínimas, identificação territorial, título serifado em duas cores, subtítulo, convite linear e pequenos detalhes WGS 84/área aproximada. O gradiente petróleo foi recalibrado para preservar leitura sem encobrir a imagem de satélite. A HUD interativa permanece separada e invisível até `transition-complete`. Nenhum enquadramento, zoom, dado, pin, camada ambiental, backend ou dependência foi alterado.

Verificação direcionada, sem executar a suíte E2E completa: build Vite aprovado e `git diff --check` aprovado. Chromium real com World Imagery foi inspecionado em 1440×900 e 360×800, sem overflow horizontal. Uma checagem comportamental focal confirmou nos dois tamanhos que o primeiro scroll oculta a abertura, mostra a HUD, libera o mesmo mapa e preserva exatamente o estilo da pane/câmera; em `prefers-reduced-motion: reduce`, a passagem foi imediata e sem transição CSS. Dispositivo físico, teclado virtual e leitor de tela não foram executados.

## Menus e painéis com navegação contínua — 22/10/2026

Implementado a pedido do usuário na versão extraída `CuidAcao-reconstruct-frontend-visual`. A HUD agora mede o conteúdo e interpola largura/altura reais entre menu, perfil, camadas, ocorrências e investigação. A marca permanece como âncora. Avanço e retorno têm sentidos opostos; conteúdo sai em uma cópia decorativa inerte, sem IDs, e entra em sequência. Trocas rápidas invalidam callbacks antigos. ResizeObserver ajusta a superfície a mudanças de conteúdo e viewport. A preferência de movimento reduzido é aplicada também quando muda durante a animação.

O módulo `codigo-fonte/funcionalidades/interface/componentes/movimento.js` concentra animações nativas, cancelamento, entrada coordenada e cópias de saída. `painel.css` foi reorganizado para eliminar sobreposições históricas de regras da HUD; `movimento.css` compartilha superfícies e transições entre filtros/lista/análise, Central, perfil e diálogos. Painéis completos têm retorno ao menu. Central abre/recolhe sobre o mesmo Leaflet; formulários preservam campos e movem suas etapas; autenticação ajusta altura ao trocar de modo. Nenhuma dependência de animação, regra de domínio, API, coordenada ou permissão nova.

Corrigido retorno de foco: na versão anterior, fechar detalhes focava o botão da ficha enquanto ela se recolhia; após 600ms o foco estava no body. Reproduzido numa cópia isolada da apresentação anterior. `getFocusTarget` evita a ficha ocupada pela contração e retorna o marcador permanente; origem na lista compacta recolhida retorna à entrada visível da HUD. Testes agora verificam o destino que permanece acessível após o recolhimento.

Verificação nesta máquina (Node 26.12.0, Chromium Playwright 153; o requisito declarado do projeto continua Node 24):

- `npm test`: 159/159 aprovados.
- `npm run build`: aprovado. Aviso existente de importação estática/dinâmica do mesmo módulo Firebase, sem impedir o build.
- Execução completa E2E: 109/116 aprovados. Dois cenários identificaram o retorno de foco descrito acima; cinco atingiram o limite total dos percursos longos. Nenhuma asserção funcional foi removida.
- Regressão final com os mesmos projetos, servidores e fixtures, selecionados por configuração temporária: 32 cenários aprovados de leitura, movimento, foco, estados e vínculos. O cenário integrado móvel ainda atingiu 120s nessa rodada.
- Reexecução isolada do integrado móvel com trace: 1/1 aprovado em 1,3 minuto. O orçamento desse cenário de cinco sessões foi ajustado para 180s, incluindo seu fechamento. Navegação, ciclo completo de estados e gestão completa de vínculos têm orçamento total de 60s; os prazos de cada asserção permanecem iguais. Não houve uma segunda execução integral após a correção final; os sete cenários antes falhos passaram nas reexecuções direcionadas.
- Inspeção visual em 1440×900 e 390×844; testes cobrem 360px, tela curta, ampliação de 200%, teclado, preferência reduzida, inversão da navegação, dimensões intermediárias reais e preservação da câmera. Sintaxe dos módulos alterados aprovada.

Duas URLs de download do lockfile vieram traduzidas incorretamente no ZIP (`remote-configuracao` e `node-servidor`). Corrigidas somente para os nomes publicados já declarados; versões e integridades mantidas. Dependências locais ficaram na pasta `node_modules` do projeto, sem vínculo com uma pasta temporária. Gravação das transições em `/home/higur/Downloads/CuidAcao-navegacao.webm`, fora do código-fonte. Site/API locais respondem HTTP 200 em `http://127.0.0.1:5174/`. Sem publicação. Dispositivo físico, teclado virtual real e leitor de tela não foram verificados.


## Autenticação prioritária — 22/10/2026

Implementado: cadastro com e-mail privado e apelido único, entrada por e-mail ou apelido, preservação do cadastro legado, sessão HttpOnly existente de oito horas, logout, Google opcional existente e perfil sobre o mapa com suas ocorrências. Novo gerenciamento de e-mail no perfil e recuperação no diálogo de entrada. Migração 007 aditiva, aplicada ao banco local sem seed/reset. Nenhuma dependência adicionada.

Recuperação/verificação: tokens aleatórios de 32 bytes, hash SHA-256 no banco, finalidade separada, expiração de 30 minutos/24 horas e consumo atômico de uso único. Redefinir senha revoga sessões na mesma transação; falha controlada desfaz senha/revogação/consumo. Links usam fragmento retirado da URL, com confirmação por POST. Origin, JSON, tamanho e limites de tentativas são exigidos. E-mail não integra projeções públicas. Transporte privado HTTPS configurável descrito no README; ausência/falha produz erro explícito, sem autenticação simulada.

Verificado neste ambiente (Node 26.12.0; o projeto requer Node 24):
- Build final aprovado e `git diff --check` sem erros. Advertência já existente de importação Firebase estática/dinâmica.
- 48 testes de domínio/clientes/unitários aprovados.
- Grupo direcionado de autenticação: 37 aprovados; um teste de Google entre processos não inicia servidor neste ambiente restrito. Inclui sessão, cookies, senhas, permissões, Google controlado, ponte Firebase e recuperação/verificação.
- Seis testes novos de conta/transporte aprovados, incluindo concorrência de e-mail, finalidade/expiração/reuso de token, falha de envio, CSRF/limites e rollback da redefinição.
- Quatro testes de migração/preservação aprovados; 11 testes da consulta de ocorrências aprovados após adaptar fixtures às colunas aditivas.
- `npm run db:migrate` direto aprovado (também em banco temporário), sem seed/reset.

Limites: `npm test` foi executado e não ficou integralmente verde. Testes HTTP entre processos falham ao iniciar servidores; testes CLI via execFile retornam saída vazia neste ambiente, enquanto o comando direto funciona. A execução integral que permaneceu sem progresso foi interrompida, sem marcar esses testes como aprovados. `npm run test:e2e` foi executado, mas o sandbox recusa escutar 127.0.0.1:3100 com EPERM; os cenários atualizados desktop/mobile não puderam rodar. Reexecutar regressão/E2E em Node 24 com portas locais permitidas.

Pendências externas identificadas: o ambiente da API não contém CUIDACAO_GOOGLE_CLIENT_ID/CUIDACAO_FIREBASE_PROJECT_ID nem CUIDACAO_ACCOUNT_MAIL_URL/CUIDACAO_ACCOUNT_MAIL_TOKEN. Configurar um provedor Google e o transporte real de e-mail antes de validar esses serviços. Nenhum projeto Android/Gradle/Capacitor existe neste checkout; preservado o fluxo web responsivo, sem recriar APK. Validação em aparelho/contêiner Android continua pendente.


### Flexibilização da senha — 22/10/2026

Mínimo reduzido para oito caracteres no cadastro, entrada e redefinição, com mensagens correspondentes na interface. Sem exigência de maiúsculas, números ou símbolos. Dezoito testes direcionados de autenticação/contas aprovados, incluindo cadastro/login/redefinição com oito letras e rejeição de sete. Build aprovado; diff sem erros. Mantidas as limitações de regressão HTTP/E2E do ambiente registradas acima.


### Cadastro simples — solicitação posterior de 22/10/2026

Retirados da interface campo de e-mail, acesso Google e gerenciamento/recuperação por e-mail. Cadastro por apelido, senha e confirmação; entrada, sessão e logout preservados. Serviços e dados anteriores mantidos por compatibilidade, sem reset/migração destrutiva. Dezenove testes de autenticação/contas aprovados, incluindo cadastro sem e-mail com oito letras, sessão e logout. Build e diff-check aprovados. E2E desktop/mobile atualizado; execução bloqueada novamente por EPERM ao escutar 127.0.0.1:3100. Cenários exclusivos da interface Google desativados conforme retirada solicitada; testes da API permanecem.
