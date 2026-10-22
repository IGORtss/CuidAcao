# Decisões da consolidação 1.0

## Pin que se desdobra em ficha — 16/10/2026

Pedido explícito substitui o hover superficial anterior por uma transformação estrutural do marcador. O `L.marker` conserva latitude, longitude, `iconAnchor`, biblioteca, dados e fluxos; sua origem local coincide com a coordenada. A ponta fica imóvel nessa origem e somente a cabeça interna usa squash/stretch, salto e mudança de largura/altura até conter a própria prévia ou ficha ampliada — não há tooltip ou cartão visualmente independente. Posicionamento escolhe cima por padrão e um lado disponível quando necessário, sendo recalculado em movimento, zoom e resize. Primeiro toque seleciona; a ficha abre a publicação existente na Central; clique externo, Escape e troca de seleção recolhem. Água ganha anel único na coordenada e resíduos apenas desdobram o símbolo existente. `prefers-reduced-motion` troca os mesmos estados sem movimento prolongado. Backend, coordenadas, câmera, categorias e contratos de domínio não mudam.

## Expansão orgânica sequencial da HUD — 16/10/2026

Pedido explícito substitui o ícone e menu visualmente separados por uma única superfície ancorada no alto à esquerda. A máquina de movimento usa `closed`, `opening-horizontal`, `opening-vertical`, `open`, `closing-vertical` e `closing-horizontal`; a passagem entre eixos responde à conclusão real das transições, com reconciliação de cliques rápidos. A marca oficial permanece no mesmo nó durante todo o morph. Os destinos reutilizam ações reais e os painéis existentes; Leaflet, câmera, dados, backend e permissões não mudam. Movimento reduzido mantém estados, foco e funcionalidade sem interpolação.

## Evolução contextual da HUD — 14/10/2026

Pedido explícito amplia a exploração sem trocar Leaflet, Fastify ou SQLite. A apresentação editorial continua sem HUD; depois dela, um controlador único governa filtros, modo, seleção, enquadramento, período e URL. A comparação alterna estados na mesma instância do mapa, pois não há imagens aéreas históricas equivalentes que justifiquem um divisor. Reprodução reconstrói presença e estado somente por eventos públicos reais; não fabrica snapshots de texto ou geometria.

Acompanhamentos e consultas salvas são preferências privadas persistidas na migração 005. Atualizações internas projetam eventos já existentes, e a base guarda apenas a leitura; não há e-mail/push. Lugar usa raio explícito de 500 m; área aceita polígono desenhado de até 50 vértices. Atalhos territoriais não serão criados sem fonte. Coleções usam critérios determinísticos registrados em DOMAIN, e recorrência exige vínculo administrativo de duplicata.

O pedido exige alternar satélite e mapa legível. World Imagery permanece a camada inicial e não foi substituído; OpenStreetMap Standard volta apenas como alternativa acionada pela pessoa, no mesmo Leaflet, preservando atribuição e câmera. Não há imagens aéreas históricas, divisor entre dois mapas ou sincronização de instâncias: a comparação temporal alterna A/B sobre a única instância para evitar duplicar listeners, estado e consumo de tiles.

Criação pode persistir geometria temática somente quando escolhida explicitamente e compatível com categoria/tipo, sempre aproximada e dentro da caixa demonstrativa. Qualidade da água/vegetação não são desenhadas pelo público. Medições exigem valor, unidade, data e origem para entrar no modo próprio; pH continua sem inferência de potabilidade, balneabilidade ou risco.

## Camadas ambientais sem inferência espacial — 13/10/2026

Pedido explícito acrescenta representações temáticas sobre o Leaflet, mantendo pins e satélite. A implementação não deriva tipo, centro, raio, geometria, pH ou risco de id, categoria ou texto. Qualidade da água e esgoto aparente exigem Point; resíduos, alagamentos e vegetação exigem Polygon/MultiPolygon; erosão exige LineString/MultiLineString. Cada forma declara precisão approximate ou verified, distinguida por traço e texto. Sem metadado cartográfico explícito, o registro mantém somente seu pin. A camada pH permanece vazia enquanto os dados atuais não trouxerem medições; valores reais são classificados apenas pela propriedade química abaixo de 7/igual a 7/acima de 7, sem afirmar conformidade, potabilidade, balneabilidade ou risco. Esses tipos são metadados de apresentação e não ampliam as categorias persistidas Resíduos/Água. Nenhuma alteração de backend, migração ou dado demonstrativo foi feita.

## Estrutura por camadas e fronteira Firebase — 13/10/2026

Decisão explícita posterior substitui a restrição de dez arquivos principais por diretórios de camada, preservando comportamento e evitando fragmentação por função. Frontend separa aplicação, features, serviços e estilos; backend separa HTTP, domínio, dados e CLI. Arquivos grandes podem ser decompostos futuramente por feature somente com testes focados e sem alterar contratos.

Firebase continua sem ser uma segunda fonte de identidade ou dados. Por solicitação explícita de 15/10/2026, o SDK Web modular e `app.js` foram ativados para inicialização do aplicativo e Analytics; a configuração pública fica em `VITE_FIREBASE_*`, com valores locais em `.env.local` ignorado pelo Git. Auth futuro deve verificar a identidade no servidor e convertê-la em sessão local; Firestore e Storage não podem operar em escrita paralela como fonte de verdade do SQLite. Arquivos `auth.js`/`firestore.js`/`storage.js` só serão criados quando houver um fluxo real e testes correspondentes.

Decisão explícita posterior do mesmo dia solicita preparar todos os produtos Firebase. A implementação inicializa os cinco SDKs e configura emuladores/Hosting com regras deny-by-default, mas não habilita escrita paralela nem publica sem autenticação da CLI. O corte de Auth exige troca de token no backend; o corte de Firestore/Storage exige migrador verificado e substituição atômica da fonte autoritativa. App Check só ativa com site key. Hosting não recebe deploy implícito.

Após autenticar a CLI, a continuação implementa o primeiro corte real somente em Auth. Firebase Web obtém a identidade Google, Firebase Admin valida o ID token e o backend o converte na sessão opaca existente. Migração 006 guarda `firebase uid` separado das identidades Google legadas; não há vínculo por e-mail, promoção por claim ou token persistido. Firestore/Storage permanecem deny-by-default e SQLite continua autoritativo para domínio e anexos.

## Simplificação autorizada em 11/10/2026

Concentrar o código em dez arquivos principais, mantendo testes, documentação e configurações separados. Pedido explícito do usuário para facilitar compreensão e manutenção; substitui a regra anterior de não mover arquivos apenas por organização. Preservar funcionalidades, textos, contratos HTTP, migrações numeradas e dados locais. Incorporar a arte SVG como constante legível e as migrações como SQL numerado, sem alterar seus conteúdos. Manter os nomes dos comandos npm e atualizar importações/apoio/testes/documentação. Os novos arquivos são fontes editáveis, com seções por assunto. Backup do código anterior fora do repositório; nenhuma exclusão da cópia aninhada ou de dados privados. Evidências e limites em PLAN.

07/10/2026 • autorização: usuário pediu aplicar as melhorias da revisão do repositório.

Estas são escolhas novas para preencher lacunas, distintas das decisões gerais anteriores. Não representam funcionalidades já entregues. Referência normativa: DOMAIN; decisões técnicas: ARCHITECTURE.

| Questão | Escolha | Justificativa e consequência |
| --- | --- | --- |
| Confirmação | Admin independente + suporte comunitário referenciado + parecer em contestações | Critério verificável sem apresentar votos como laudo |
| Estados | Seis estados existentes com tabela fechada; encerrada=resolved | Elimina interpretações sobre encerramento por inatividade |
| Reabertura | Pedido com fato novo e decisão administrativa | Preserva ciclo e histórico; exige nova confirmação |
| Categorias | Resíduos e Água fechadas na versão do TCC | Recorte viável ligado aos problemas já escolhidos; demais categorias fora desta versão |
| Território | Caixa explicitamente demonstrativa, validada na API | Não inventa fonte oficial nem bloqueia protótipo aguardando cartografia |
| Cadastro | Funcional, sem e-mail/dados reais; seed complementar | Demonstra contas e autorização sem depender de serviço externo |
| Edição | Autor por 24h em received; depois complemento/correção auditada | Evita reescrever observação já em revisão |
| Duplicatas | Vínculo sem fusão, sem somar votos; principal mais antiga | Preserva rastreabilidade e impede inflar confirmação |
| Moderação | Visibilidade separada do estado, denúncias privadas | Distingue conteúdo inadequado de validade ambiental do relato |
| Evidência | Imagens limitadas e reencodadas; upload após relato | Reduz complexidade e explicita recuperação de falha parcial |
| Histórico | Transação desde criação, controle de versão | Evita perder auditoria e sobrescrever decisões concorrentes |
| Arquitetura | Frontend existente + Fastify + SQLite local | Mantém escopo pequeno, persistência real e testes diretos de API |

## Alterações de escopo explicitadas
A 0.1 deixava categorias e cartografia oficial abertas; a 1.0 fecha duas categorias e usa geografia ilustrativa para o aceite. A expansão ambiental geral e o polígono oficial ficam fora desta versão. A 0.1 sugeria framework futuro: não haverá troca de frontend no escopo atual. Cadastro real no contexto de simulação não é substituído por seletor de papéis. Regras numéricas são convenções desta versão e podem ser revistas conscientemente, nunca alteradas silenciosamente pelo agente.

## Limitações externas
Sem fonte cartográfica oficial incorporada; sem alegação de precisão territorial. Sem revisão de normas específicas da instituição de ensino, pois não foram fornecidas. Sem avaliação de operação pública/produção. Nenhuma dessas limitações impede os critérios funcionais definidos para o TCC demonstrativo.

## Direção visual autorizada em 08/10/2026
O usuário aprovou cartografia artística/editorial em petróleo/areia, sem CTA no hero, revelação natural do Leaflet e painel comunitário de consulta. FRONTEND_DESIGN consolida o prompt fornecido, pois o remoto não pôde ser consultado. Painel escolhe até quatro registros na ordem existente de createdAt/id dos filtros, sem avaliar gravidade; expande a lista integral. Fontes locais alternativas a Noto Serif/Inter evitam dependências externas. Sheet móvel é não modal e permanece no fluxo, com botões/teclado como alternativa a gestos. Discussão e anexos continuam futuros onde não há API; nenhuma regra de domínio ou autorização mudou.

## Arte de abertura autorizada em 12/10/2026

O usuário forneceu a imagem `Coastal Town Cartographic Bay Map.png` e pediu seu uso direto como fundo dominante de 100svh. Essa decisão substitui apenas a restrição visual anterior contra raster na abertura. A arte permanece decorativa, não georreferenciada e não substitui o Leaflet. A passagem usa rolagem nativa, opacidade discreta e a mesma imagem como véu transitório sobre a única instância do mapa; sem CTA, scroll artificial, parallax ou mudanças de domínio/backend.

## World Imagery no Leaflet autorizado em 12/10/2026

Substituir somente os tiles convencionais do mapa interativo e do seletor por Esri World Imagery, preservando Leaflet, centro, zoom, limites, marcadores e falha degradável. O endpoint público respondeu com JPEG no Perequê e seus metadados declaram Esri, Vantor, Earthstar Geographics e GIS User Community; esses créditos permanecem visíveis. Não usar Google Earth, cache em lote ou tratar a imagem artística da abertura como georreferenciada.

## Transformação artística para satélite em 12/10/2026

Revisão solicitada: substituir o fade simultâneo por fases independentes (texto 0–30%, arte 30–65%, marcadores 65–85%, controles 85–100%). A câmera inicial não depende da resposta assíncrona da listagem. Animação atua no conteúdo do ícone, nunca nas coordenadas/transformações Leaflet; é única por entrada e limitada a 860ms. A dissolução requer tiles efetivamente decodificados; falha conserva consulta e orientação explícita para a lista. Sem distorcer geografia para ajustar a arte ilustrativa.

A entrada e o mapa passam a compartilhar um palco sticky de 200svh: Leaflet por baixo, arte e texto por cima, com dissolução reversível ligada diretamente à rolagem. Há uma única instância Leaflet. Ponteiro, marcadores e controles só entram no trecho final; links diretos saltam para o estado interativo. Movimento reduzido troca estados sem interpolação. A arte é apenas aproximação visual: centro e zoom geográficos permanecem reais, sem deformar tiles para forçar correspondência perfeita.

## Alinhamento da câmera de abertura em 12/10/2026 (histórico; superado pela decisão abaixo)

Pedido posterior autoriza ajustar somente a câmera inicial do Leaflet para aproximá-la do recorte da arte existente. A comparação usa o raster efetivamente renderizado com `cover` e capturas reais do World Imagery em 1440×900 e 390×844. O mapa de consulta usa zoom fracionário 15.54; centro desktop `-23.9348,-46.1805` e centro móvel `-23.9348,-46.1815`, porque o recorte horizontal da arte muda no breakpoint móvel. A latitude e a escala permanecem iguais. `setView()` aplica o enquadramento antes dos tiles; filtros, ocorrências, marcadores e `fitBounds()` de “Ver todas” não mudam.

Não há rotação de câmera no Leaflet 1.x. A arte também contém deformações locais: o promontório sul/leste é alongado e parte das ruas/vegetação foi reinterpretada. Portanto, o alinhamento prioriza praia, curva da baía, malha urbana central, estrada oeste e entrada do promontório. Nenhuma transformação CSS é aplicada aos tiles e nenhuma coordenada de ocorrência é alterada.

## Mapa permanente na abertura — 12/10/2026

Decisão explícita do usuário: eliminar a necessidade da ilustração estática sobreposta. O próprio mapa Leaflet com World Imagery é o cenário da primeira tela e continua sendo o mesmo mapa durante toda a transição; a transição passa a ser entre estados de interface sobre o mesmo mapa, sem troca de imagens. Isso substitui as decisões de 12/10/2026 sobre arte de abertura, transformação artística e alinhamento visual. A câmera `territoryView` é preservada sem alteração (desktop `-23.9348,-46.1805` zoom 16.10; móvel `-23.9348,-46.1815` zoom 15.54). O arquivo `codigo-fonte/recursos/mapa-cartografico-baia-costeira.png` é preservado no repositório, mas deixa de ser empacotado ou exibido; a constante `territoryArt` (SVG decorativo sem uso) é removida de `codigo-fonte/map.js`.

Fases sobre o mesmo mapa: textos editoriais 0–30% (descem suavemente e apagam, reversível); marcadores 65–85% (sequência espacial única, 300ms, deslocamento vertical 10px, escala inicial 0.85, opacidade inicial zero, stagger 80ms capado, easing suave com leve salto); controles/filtros/ferramentas 85–100% (opacidade e deslocamento suaves). Câmera fixa durante toda a apresentação; nenhuma opacidade, flash, reposicionamento ou recarregamento aplicado ao mapa. Marcadores e lista não dependem de tiles decodificados; falha de tiles mantém consulta, marcadores e mensagem explícita. Interações do Leaflet (arrastar, zoom por toque/scroll/duplo-clique, teclado) ficam desabilitadas na abertura e são habilitadas somente ao concluir, sem impedir a rolagem normal da página (toque vertical preservado) nem comprometer a acessibilidade (links de salto, foco e `inert` preservados). Atribuição obrigatória Esri/Vantor/Earthstar/GIS User Community mantida. `prefers-reduced-motion` troca estados sem interpolação.


## Detalhes técnicos da Etapa 2 — 09/10/2026
Sem alteração das regras DOMAIN. PATCH parcial exige changes não vazio; campos omitidos preservam valores. Título só é gerado quando omitido na criação; local vazio é permitido, normalizado por trim. Limite de corpo JSON de ocorrências: 24000 bytes, suficiente para os campos D02 em UTF-8; limites textuais aplicados após trim. Edição/checagem de permissões ficam sob transação immediate para evitar divergência entre leitura e atualização. Conflito mantém formulário e exige carregar/comparar registro atual antes de adotar a versão. Testes E2E de escrita usam base/API separadas dos cenários de consulta, para preservar fixture e limites sem desabilitar regras do produto. Nenhuma migração aplicada foi alterada e nenhuma dependência foi adicionada.

## Detalhes técnicos do item 5 original — 09/10/2026

Item 5 nesta solicitação significa criação com evidências opcionais, independentemente da numeração do PLAN. Implementar apenas imagens do relato original; contributionId rejeitado até participação ser entregue. Reutilizar esquema, transações, regras de autoria/estado/prazo e frontend existente.

Imagens estáticas: recusar múltiplas páginas/animação com 422, evitando descartar silenciosamente quadros ao reencodar. Limitar também saída a 5 MiB para manter armazenamento coerente com D06. Extensão/MIME informados não autorizam conteúdo; JPEG/PNG/WebP válidos são decididos pelo servidor. Arquivos gerados pelos testes ficam em memória/pastas temporárias, nunca no Git.

Diretório privado padrão é específico por nome de banco; override deve ser dedicado a uma base. Publicar arquivo durável antes do commit, compensar falhas comuns removendo novo arquivo, recuperar arquivos sem referência após 24h no início; detalhes/limites em ARCHITECTURE. Retirada mantém arquivo auditável. Sem promessa de transação distribuída entre SQLite e filesystem.

Após salvar pai, bloquear edição de seus campos durante a tentativa de imagens, conservar pendências e permitir ver registro salvo. Conflito exige revisão do registro e imagens atuais; resposta perdida não autoriza reenvio automático. Limpar filtros incompatíveis com aviso explícito para mostrar a criação no mapa/lista. Nenhuma mudança de layout, participação, administração ou estados novos.

## Escopo do item 6 original

Comentários e complementos seguem D05 sem nova permissão de retirada textual: não há DELETE nem exclusão física; solicitação/denúncia/moderação continuam futuras. Implementar leitura, criação e edição e imagens dos complementos; apoio/contestação, pedidos de reabertura e decisões administrativas fora do escopo. Migração 001 já contém contribuições e FK composta de anexos; reutilizar sem alterar migração aplicada. Projeção oculta mostra marcador sem texto/autor/tipo/imagens. Controle de versão pertence à ocorrência, inclusive nas mutações dos filhos. Datas de edição de contribuição contam da sua criação, independentemente da idade do relato original.

## Detalhes técnicos do item 7 original

Sem novas regras de negócio: UNIQUE(occurrenceId,userId) existente mantém uma linha mesmo após retirada; reativação usa a mesma identidade/data original e registra novo snapshot. Repetir DELETE inativo com versão atual retorna a entidade sem evento; DELETE sem posição retorna 404. Posição oculta é indisponível à alteração comum (404), sem restauração implícita. Lista ativa inclui marcador de moderação, total inclui marcador e counts exclui ocultas/inativas. Justificativas anteriores ficam só em snapshots privados para evitar reprodução de texto oculto no histórico público. Corpos JSON limitados a 8192 bytes no PUT e 2048 no DELETE; limites Unicode após trim. Nenhum prazo adicional, transição automática, administração ou migração estrutural.

## Escopo e coerência do item 8 original

Matriz e requisitos D03/D04/API concordam; nenhuma aresta ou permissão nova. Textos de entregas anteriores diziam pedidos/transições futuros e UX mencionava painel admin como se estivesse disponível. Atualizados para distinguir controles mínimos entregues nos detalhes de painel completo futuro. Pedido e imagens sob D05/D06 são dependências da reabertura, sem rejeição/moderação/gestão de vínculos nesta etapa. Revisor não decide própria ocorrência/contribuição, inclusive referência de conteúdo próprio sob D01; suporte comunitário continua independente do criador sob D04, sem inventar quórum ou veto ao apoio de admin.

Histórico público ganha somente códigos de origem/destino para mostrar arestas sem snapshots privados. Referências de confirmação incluem suporte e pareceres por contestação com snapshots; reabertura referencia pedido já accepted no snapshot final, evitando sinalizar alteração causada pela própria aceitação. Operação composta de reabertura atualiza pai uma vez e gera evento por pedido tratado, todos no mesmo commit. Limite HTTP 1 MiB para comportar justificativas individuais; limites textuais do domínio mantidos. Nenhuma migração aplicada reescrita ou dependência instalada.

## Contratos operacionais do item 9 original

Sem ampliar D01/D08: consulta privada usa includeHidden=true com sessão administrativa atual; ausência de sessão=401, papel comum=403. Filtro visibility=visible/hidden é exclusivo desta consulta. Fila de pedidos pendentes usa GET /admin/reopen-requests com paginação padrão; aceitação reutiliza transições, rejeição usa rota já especificada. Denúncias mantêm leitura própria/admin e decisões independentes; nenhuma gestão de papéis ou vínculos. Auditoria de conteúdo conserva snapshots sem chaves internas de arquivos; eventos de denúncia continuam fora da projeção de histórico (pública e de conteúdo administrativo), sendo decisões consultáveis na fila privada de denúncias. Essa separação evita expor identidade do denunciante no histórico. Restaurar anexo não remove withdrawnAt nem contorna pai oculto; arquivo retirado permanece exclusivamente auditável.

## Operacionalização do item 10 original

D07 é aplicado sem fusão. Justificativa 20–1000 caracteres após trim descreve o mesmo fato/local/contexto temporal na duplicação; avaliação same_fact é humana, sem classificador, campo fictício de prova ou decisão por distância. Principal mais antiga por createdAt/id entre origem, principal e duplicatas visíveis não descartadas existentes. Principal/origem não terminais; origem sem filhos/relações; ambas sem duplicateOfId. Retarget não é implícito: desvincular, revisar e vincular novamente, com eventos de cada operação. Reorganizar uma principal exige desvincular seus filhos antes.

Desvinculação exige administrador independente dos dois autores, motivo e versões dos dois registros atuais. D07 não impõe janela, estado ou visibilidade adicional à desvinculação: permite corrigir vínculo quando a principal foi ocultada/encerrada/descartada, conservando estado e todos os dados. Para criação e remoção de relações, aplica-se literalmente a condição D07: ambos visíveis, não descartados e sem duplicateOfId. Se um ficou oculto, restaurar antes de remover relação. Uma relação com registro descartado só pode ser removida após reabertura autorizada pelo ciclo existente. Essa restrição não introduz transições ou permissões especiais.

Dois eventos com correlationId e versões incrementadas no mesmo commit. Remoção tem after=null; snapshots ficam privados e não reproduzem descrições no motivo público. Respostas públicas de vínculos omitem destinos ocultos inclusive de total; duplicateOfId já contratado permanece opaco, com flag de destino indisponível e sem link/dados públicos do destino. Consultas privadas exigem includeHidden=true. Migração 002 adiciona índice de consulta pelo endpoint direito da relação simétrica; 001 preservada e sem reset/dependência nova.

## Operacionalização do item 11 original

Revisão integrada, sem reconstruir auditoria ou duplicar transições. Lacunas de apresentação: fundamento público do encerramento e controles de paginação no navegador. Projeção closure deriva evento já existente e conteúdo atual permitido; nunca extrai texto/autor do snapshot para leitura pública. Evento mais recente selecionado por versão do snapshot posterior, evitando escolher decisão antiga quando datas empatam. Não criar eventos retroativos nem inventar fundamento quando registro legado não tem evento.

Paginação visual de 20 eventos sobre páginas já validadas pelo cliente existente; inicialmente última página, mantendo ordenação cronológica e permitindo consultar anteriores/próximos. Auditoria privada mostra também entidade/id/correlação; histórico público permanece no contrato restrito. Nenhuma permissão nova: retirar texto continua por denúncia/moderação, encerramento por resolução e admin independente, reabertura por pedido/fato novo e decisão existente.

## Revisão da interface — item 12 original

Revisão de usabilidade/integração, sem novas regras de domínio ou redesenho. Corrigir aplicação da arte SVG existente sem interpolar aspas da URL no atributo HTML; a arte continua decorativa. Diálogos devem limitar largura/altura ao espaço disponível também sob ampliação de conteúdo e viewport reduzida, mantendo rolagem interna e controles acessíveis. Formulários administrativos reutilizam legibilidade, bordas e foco dos campos existentes.

Consulta de conteúdo de duplicata deve permitir nova tentativa manual depois de falha, sem reenviar escrita ou buscar automaticamente. Textos devem refletir os recursos já existentes e rótulos em português. Rascunhos, arquivos pendentes, revisão de conflitos e validação/autorização no servidor permanecem nos contratos atuais. Investigar a instabilidade do mapa com eventos, animação, geometria e hit testing; não introduzir retries ou esperas arbitrárias. Evidências/limites reais e inspeções visuais estão registrados em PLAN.


Detalhes técnicos do item 12: percentuais de largura/altura e coluna minmax(0,1fr) evitam dimensões multiplicadas fora da viewport com CSS zoom; nomes de arquivo são apresentados separadamente do texto nativo truncável do navegador. Reutilizar tokens/campos existentes nas ações administrativas. Manter estados/códigos da API e traduzir somente apresentação. Ajustar luminosidade da arte existente para contraste; nenhum desenho/asset/dependência novo. Retorno de foco após logout é explícito, porque substituir os controles removia o botão ativo e deixava foco no body. Não alterar o mapa de consulta com hipótese não comprovada: 24 cliques de referência e 48 tentativas com CPU desacelerada não reproduziram a falha histórica.

## Operação demonstrativa — item 14

Separar a ferramenta da apresentação do seed legado para preservar apoio/testes/IDs históricos. Oito ocorrências bastam: seis estados, uma duplicata e uma oculta; relações reutilizam registros distintos do conjunto. Serviços existentes geram cada mutação e evento, sem snapshots ou transições fabricados. Imagem PNG ilustrativa gerada com Sharp local, sem downloads.

Recuperação restaura snapshot inicial imutável, com backup obrigatório da sessão demonstrativa anterior e invalidação das sessões de autenticação. Não reescrever datas para estender 24h nem apagar diretórios alheios. Marcador local, nome de pasta restrito, ausência de symlinks e exclusão da base de uso/configurada definem o limite da ferramenta. CLI/servidor usam lock comum; após parada abrupta, lock exige conferência do PID antes de retirada manual. Sem nova dependência, permissão de domínio ou alteração da arquitetura de aplicação.

A apresentação usa Vite/proxy local no supervisor demo:start, preservando a arquitetura de desenvolvimento em vez de introduzir serviço de estáticos para produção nesta etapa. O servidor web restringe também arquivos privados locais (caminhos diretos e /@fs), mantendo as negações padrão do Vite. A mesma restrição vale para npm run dev, que poderia servir a pasta demonstrativa mesmo com a apresentação parada. A inspeção identificou esse desvio possível da autorização da API; teste HTTP real verifica negação mesmo quando o diretório pai está explicitamente permitido.

## Google autorizado pelo usuário — 11/10/2026

Adotar GIS popup/ID token, não OAuth para serviços Google; só autenticação e sub persistido. google-auth-library 11.2.0 exige Node >=22, compatível com 24 (metadados npm consultados; referência oficial do mantenedor). Nonce emitido/persistido e cookie HttpOnly de contexto, Origin e JSON; sem tokens em armazenamento do navegador. Sem linking automático/e-mail, segredo OAuth ou senha fictícia. Reconstruir apenas tabela users por migração numerada, preservando registros e validando FKs, em lugar de credencial artificial. Não aplicar seed/reset a bases existentes. Contratos registrados antes do código; verificação real depende de configuração Google Cloud.

## Navegação funcional da exploração — 12/10/2026

Decisão explícita posterior autoriza tornar acessíveis pela navegação as funções já entregues: mapa, consulta, registro, resumo dos dados disponíveis, conta e administração restrita. Busca textual e período filtram localmente a projeção pública já carregada, sem geocodificação ou rota nova. O resumo agrega somente ocorrências fictícias e identifica que não há medições ambientais. Perfil mostra sessão e relatos cuja autoria já vem na API; seguir ocorrências permanece pendente por não existir no domínio/API. O detalhe passa a ser painel lateral não modal com navegação entre Relato, Evidências, Discussão e Histórico, preservando regras e escritas existentes.

## Interface cartográfica minimalista — 12/10/2026

Decisão explícita posterior: depois da transição inicial, o mapa permanece em tela cheia e vira a superfície permanente da aplicação. Os componentes funcionais existentes são reposicionados como controles e painéis sobrepostos; nenhuma rota, regra de domínio, coordenada, autenticação ou contrato de dados muda. A navegação usa abas arredondadas compactas, com expansão de rótulos por hover/foco no desktop e rótulos sempre legíveis no mobile. Paleta principal: branco acinzentado `#F5F5F2`, cinza `#E6E8E5` e petróleo `#102A2D`. Formulários e diálogos existentes continuam modais quando já eram modais; o detalhe permanece painel lateral não modal.

## Revisão da composição cartográfica — 12/10/2026

Pedido explícito posterior: substituir a sobreposição simultânea das composições antigas por uma superfície Leaflet de tela cheia, protagonista. No estado normal inicial, filtros, ocorrências e estatísticas ficam fechados. Esses três modos reutilizam um único painel compacto, mutuamente exclusivo, com dimensões limitadas; a lista tem recolhimento próprio e estatísticas ficam resumidas em métricas e prévia curta. Navegação com ícones, rótulos no hover/foco desktop e sempre legíveis no toque; controles secundários permanecem acionáveis por teclado e mobile. Pins seguem visíveis e clicáveis fora das superfícies abertas. Preservar a transição existente, os dados, busca/filtros, autenticação e ações; sem mudança de domínio, API ou coordenadas. Esta decisão atualiza a direção visual anterior somente quanto à composição e ao comportamento inicial dos painéis.

## Cartografia editorial interativa — 13/10/2026

Decisão explícita posterior substitui os tokens anteriores por `#F7F7F4`, `#E9EBE7` e `#102A2D` e conclui a hierarquia da superfície sem alterar domínio ou backend. A navegação é uma ilha adaptativa com estado ativo; filtros, ocorrências e dados continuam mutuamente exclusivos. Autenticação deixa de ter botões permanentes e passa por uma única entrada Perfil, cujo conteúdo reflete visitante, conta comum ou administração autorizada. Marcadores recebem pictogramas próprios de água/resíduos, sem depender apenas de cor, e uma prévia em hover/foco antes do detalhe por clique/toque. Elementos secundários recuam somente durante gesto do mapa e reaparecem automaticamente; funções essenciais permanecem acessíveis. Em telas de toque, painéis contextuais, perfil e detalhe usam folhas inferiores roláveis. A apresentação inicial, transição, API, dados, permissões e funcionalidades existentes são preservados; nenhuma dependência ou refatoração de servidor é autorizada.

Decisão explícita de 13/10/2026: a HUD inteira, inclusive marca e ilha de navegação, permanece oculta durante a apresentação editorial e entra somente em `transition-complete`, quando o mapa já está interativo. Links de salto e hashes diretos continuam concluindo a passagem para preservar acesso por teclado e navegação do navegador.

## Ícone oficial na interface — 13/10/2026

Usar o PNG transparente fornecido, sem redesenhar o símbolo, também no wordmark e no controle Mapa da ilha. No controle Mapa, o ícone é decorativo (`alt=""`), pois o próprio link conserva o nome acessível “Mapa”; tamanho visual de 24×24 px dentro do alvo existente. Gerar cópias proporcionais para favicon 32 px, Apple Touch 180 px e ícone pronto para PWA 192 px; o arquivo transparente 512 px serve como variante maior. O projeto não possui manifesto ou service worker: não criar infraestrutura PWA apenas para registrar essas imagens. Nenhuma regra do mapa, navegação, layout principal ou transição muda.

## Redesenho exclusivo da apresentação inicial — 14/10/2026

Decisão explícita posterior substitui apenas a composição da abertura: título serifado à esquerda, palavra “coletivo.” em terra, subtítulo espaçado, véu verde-petróleo lateral, marca e navegação editorial próprias, identificação do Perequê e detalhes cartográficos discretos. O convite “Explorar o mapa” é um link linear com traço e seta, não botão ou nova função. A HUD funcional continua ausente na apresentação e entra somente ao concluir a transição. O primeiro gesto de rolagem mantém o disparo automático existente; movimento reduzido conclui sem interpolação. Leaflet, câmera, zoom, pins, dados, camadas ambientais e funcionalidades permanecem inalterados.

## Aumento do ícone da marca — 15/10/2026

Por solicitação explícita do usuário, o ícone oficial em PNG fica maior na interface sem redesenho: 36×36 px no cabeçalho desktop, 32×32 px no celular, 34×34 px na abertura desktop, 36×36 px na abertura móvel e 28×28 px na navegação do mapa. Os alvos de interação e nomes acessíveis permanecem os mesmos; tamanhos de favicon/ícones instaláveis não mudam.

## Central do CuidAção como área social comunitária — 15/10/2026

Pedido explícito do usuário: acompanhar as publicações da comunidade sobre o Perequê mesmo sem partir de um pin, com dois caminhos de entrada e sem recriar o projeto. Nenhuma incompatibilidade estrutural foi encontrada: a Central é apresentação sobre as APIs existentes, sem rota, migração, modelo de dados, categoria, medição ou permissão novos.

- Feed geral: mesma consulta e filtros/categorias existentes, uma publicação por ocorrência (sem duplicadas), ordenada por `updatedAt` decrescente — toda mutação de domínio versiona e atualiza esse campo na mesma transação (D09), de modo que a ordem reflete a atividade real. Cartões compactos mostram somente dados existentes: evidência principal, título, trecho, categoria/estado, localização, data de atualização e contagens reais de contribuições/evidências. Sem curtidas ou mecanismos genéricos de rede social (fora do escopo em PRODUCT); a participação é a existente: comentários, evidências e apoio/contestação.
- Publicação completa: página dedicada à ocorrência, com resumo, linha do tempo única em ordem cronológica (comentários, evidências e mudanças de estado, identificadas por tipo sem abas) e as mesmas ações e seções existentes (evidências, discussão, verificação comunitária, vínculos, encerramento, histórico, acompanhamento, edição/transição/denúncia conforme permissão).
- Entradas: opção “Central do CuidAção” no menu do ícone da HUD abre o feed; botão “Abrir na Central” na ficha do pin abre direto a publicação da ocorrência associada. O diálogo de detalhes do mapa é preservado.
- Estado do mapa: a Central é uma sobreposição em tela cheia; abrir ou voltar não move a câmera nem limpa a seleção — nenhuma chamada de câmera ocorre nesses fluxos, e “Ver no mapa” só enquadra o pin por ação explícita da pessoa.

## Clique livre no mapa — 16/10/2026

Por solicitação explícita do usuário, clicar diretamente em uma área livre do mapa não abre mais a ficha de lugar nem executa outra ação. A ficha/menu de lugar continua acessível por clique direito/toque prolongado e pelos controles já existentes. Clique/toque em pins, seleção de coordenadas no fluxo de registro e inclusão de vértices na investigação de área permanecem inalterados.

## HUD recolhível de ponto único — 15/10/2026

Pedido explícito do usuário: inverter a lógica da interface — estado inicial com quase só mapa e ícone do CuidAção; navegação consolidada em torno desse ponto de entrada. Absorve (sem remover funcionalidades): barra superior cheia, legenda fixa, “Ver todas no mapa”, “Perequê”, “Mapa legível” e o painel grande de investigação (substituído pelo modo compacto com contador de vértices). Os painéis legados de filtros/lista/histórico/perfil e todos os fluxos de escrita, participação, administração e vínculos são preservados e alcançados a partir da HUD. Central do CuidAção (outra frente, mesma sessão) entra como item do mesmo menu, sem duplicar ponto de entrada. Contratos atualizados em UX antes da verificação final; E2E da navegação reescritos para dirigir a HUD (auxiliar `apoio/testes/ponta-a-ponta/hud.js`).

## Vocabulário interno em português — 18/10/2026

Por solicitação explícita do usuário, pastas, arquivos, módulos, funções, variáveis, comentários e demais nomes internos mantidos pelo projeto passam a usar português, sem acentos em caminhos e identificadores. Permanecem inalterados os contratos públicos e persistidos, incluindo rotas e campos JSON da API, códigos de estado, nomes de tabelas e colunas já migradas, variáveis de ambiente, formatos externos e nomes exigidos por JavaScript, Node.js, HTTP, SQL, Firebase, Vite, Playwright e bibliotecas. A mudança é estrutural e lexical, sem alteração de comportamento, dados, permissões ou compatibilidade.

## Redação direta e natural — 18/10/2026

Os textos mantidos pelo projeto devem explicar o comportamento concreto antes de resumir ou qualificar a entrega. A redação evita frases de efeito, conclusões genéricas, enumerações montadas apenas para dar ritmo e fórmulas como “não apenas X, mas também Y”. Frases podem variar de tamanho conforme o assunto. Negrito, títulos e listas ficam reservados para trechos em que ajudam a localizar informação.

Documentos acadêmicos mantêm precisão e sobriedade, mas não precisam soar burocráticos. Textos da interface podem ser mais conversacionais quando orientam uma ação. Ao revisar um texto existente, a prioridade é conservar sua intenção e seu grau de formalidade. Termos vagos devem dar lugar a dados verificáveis, como o comando executado, a quantidade de testes, a regra aplicada ou o limite que continua pendente.

## Movimento contínuo e superfícies orgânicas — 22/10/2026

Solicitação explícita do usuário substitui a restrição visual anterior de movimentos de 120–190ms: entradas coordenadas de 310ms, transformações de 330–390ms e saídas curtas de 160–240ms, com expansão inicial em duas fases. CSS e Web Animations API nativos; nenhuma dependência nova. Dimensões reais são interpoladas para preservar a legibilidade dos textos; deslocamento e recorte conectam superfícies maiores. Mantidos dados, permissões, câmera Leaflet, hashes, foco e contratos de domínio. A referência de imagem mencionada não veio anexada nesta solicitação; direção implementada a partir da descrição e dos tokens existentes.


## Autenticação prioritária — 22/10/2026

Solicitação explícita posterior autoriza e-mail privado e senha no cadastro, apelido público único, entrada por e-mail ou apelido (preservando contas existentes), sessão local HttpOnly e Google opcional sem vínculo automático. Cadastro encaminha à entrada. O e-mail nunca integra projeções públicas. Recuperação e verificação usam links de uso único, expiração e transporte externo configurável; sem transporte, a interface informa indisponibilidade e não simula envio. Android aproveita o fluxo web responsivo existente, sem recriar APK. Esta autorização substitui a proibição anterior de e-mail/recuperação somente no gerenciamento de contas.


## Senhas mais simples — 22/10/2026

Pedido posterior do usuário flexibiliza o mínimo de 12 para 8 caracteres no cadastro e na redefinição, mantendo máximo de 128. Não exigir maiúsculas, números ou símbolos. Preservar senhas existentes, hashing, limites de tentativas e validação no servidor.


## Cadastro simples — solicitação posterior de 22/10/2026

A interface oferece somente cadastro e entrada por apelido e senha, com confirmação da senha no cadastro e mínimo de oito caracteres. Retirados campos/botões de Google, e-mail e gerenciamento por e-mail da interface. Contas, vínculos e dados persistidos permanecem preservados; serviços anteriores mantidos para compatibilidade, sem exposição no fluxo simples.
