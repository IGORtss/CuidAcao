# Arquitetura — versão 1.0
07/10/2026 • arquitetura alvo; Etapa 2 implementada e verificada em Node 24; evidências e escopo em PLAN.

## Escolhas
| Camada | Decisão | Motivo |
| --- | --- | --- |
| Interface | JavaScript ES modules, HTML/CSS, Vite e Leaflet existentes | Preservar o fluxo já testado; separar páginas, serviços HTTP e apresentação ao crescer |
| Servidor | Node.js 24, Fastify 5, JSON Schema nas rotas | Uma linguagem; validação explícita e testes HTTP sem navegador |
| Banco | SQLite com better-sqlite3, SQL e migrações numeradas | Demonstração local de uma instância, sem serviço de banco separado |
| Sessões | Cookie opaco e sessão persistida no servidor | Revogação simples, sem autorização em localStorage |
| Arquivos | Diretório privado local, @fastify/multipart e sharp | Upload limitado, decodificação e remoção de metadados |
| Testes | node:test, Fastify inject, Playwright | Domínio, API real com banco temporário e fluxos de interface |

Não adicionar framework de frontend, ORM, microsserviços ou serviços pagos nesta versão. Versões exatas novas devem ser fixadas no lockfile na etapa de instalação e compatibilidade comprovada no Node 24; escolhas acima não afirmam que dependências futuras já foram instaladas. O pacote exige Node 24.x; instalação e execução foram validadas pelo usuário com Node 24.21.0, conforme PLAN.

## Estrutura modular atual

Em 13/10/2026, a organização anterior em dez arquivos centrais foi substituída por diretórios de camada. A mudança responde ao crescimento real do produto sem trocar stack, contratos, regras ou design.

Frontend: `codigo-fonte/app` é a composição, `codigo-fonte/features` contém interface/mapa, `codigo-fonte/services` delimita integrações e `codigo-fonte/styles` conserva base e camada cartográfica. Backend: `servidor/http` recebe requisições, `servidor/dominio` decide comportamento, `servidor/dados` persiste e `servidor/linha-comando` executa operações locais. O mapa completo fica em ESTRUTURA.md.

As migrações SQL aplicadas permanecem inalteradas em `servidor/dados/banco-de-dados.js`. A decomposição adicional deve preservar o texto e a ordem das migrações, `domainTransaction`, os exports cobertos pelos testes e os nomes dos comandos npm.

O Firebase Web SDK modular faz parte do runtime somente quando a configuração pública `VITE_FIREBASE_*` está completa. `codigo-fonte/servicos/firebase/configuracao.js` valida os valores, `codigo-fonte/servicos/firebase/aplicativo.js` mantém uma única instância e `bootstrap.js` inicializa Analytics, Authentication, Firestore, Storage e App Check conforme a configuração disponível. Emuladores exigem opt-in explícito; App Check exige site key própria. Enquanto a migração transacional do backend não for concluída, Fastify, SQLite e a sessão opaca continuam sendo a única fonte de verdade e as regras Firebase negam acesso direto a dados/arquivos.

As seções de entregas abaixo são históricas e usam os caminhos da época. O mapa atual fica em ESTRUTURA.md; esses caminhos antigos não descrevem a árvore presente.

Em desenvolvimento, Vite encaminha /api para Fastify em 127.0.0.1:3002. A apresentação local do item 14 usa o supervisor existente de API e Vite/proxy na mesma origem do navegador (3001/5174), sem acrescentar servidor de estáticos de produção; bind 127.0.0.1. Banco e imagens em data/ ignorado pelo Git; nunca em public/ ou dist. API prefixada /api/v1. Vite preview testa somente frontend. Não realizar deploy sem pedido.

## Integridade
Ativar PRAGMA foreign_keys=ON em toda conexão e WAL; transações curtas e consultas parametrizadas. Validar entrada, sessão, papel, autoria, estado, visibilidade e version no servidor; schema não substitui autorização. Atualizações usam comparação de version dentro da transação. Relações em dois registros verificam ambas versões. Serviço único aplica evento + alteração; proibir escrita direta de rotas em tabelas. Nenhum voto dispara transição automática.

Uploads: temporário privado, limites D06, decodificação e reencodificação antes do registro; renomear para id aleatório controlado pelo servidor. Em falha de transação, apagar novo arquivo; na inicialização limpar temporários e arquivos sem referência após 24h. Arquivo referenciado nunca é removido por essa limpeza. Servir via endpoint que verifica permissões, com nosniff e Content-Type validado. Backup inclui banco e anexos associados.

## Autenticação
Senha: node:crypto.scrypt assíncrono, salt aleatório de 16 bytes por senha, N=131072, r=8, p=1, chave 64 bytes, maxmem=256 MiB; armazenar parâmetros e hash, comparar com timingSafeEqual. Limitar duas derivações simultâneas para o protótipo. Nunca logar senha, cookie ou corpo de login/cadastro.

Token de sessão aleatório de 32 bytes; banco armazena apenas SHA-256 do token e validade absoluta de 8h. Cookie HttpOnly, SameSite=Lax, Path=/; Secure em HTTPS, exceção apenas para HTTP local. Login cria token novo, logout revoga e limpa cookie. GET /auth/me nunca entrega token/hash. Sem JWT nem papel recebido do cliente. Limitar login a 10 tentativas por minuto por IP+username e cadastro a 5 por minuto por IP; retornar 429. Conta inexistente e senha errada retornam mesma mensagem.

Para métodos de escrita exigir Origin da origem configurada, inclusive autenticação; rejeitar origem ausente/divergente no cliente web. Não habilitar CORS irrestrito. Conteúdo JSON exige application/json; multipart só nos uploads. Em futura exposição externa, reavaliar operação e segurança; o alvo desta versão permanece local.

## Cartografia
Leaflet empacotado; World Imagery por `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`, com atribuição visível à Esri e fontes declaradas pelo serviço. O World Imagery continua padrão e protagonista; a HUD oferece OpenStreetMap Standard somente como camada legível alternativa, com sua atribuição própria, no mesmo mapa. A configuração é compartilhada pelo mapa de consulta e seletor de ponto. Sem download em lote/cache offline personalizado. Falha mantém marcadores e lista; criação tem latitude/longitude manuais. Caixa D02 é aproximação de demonstração, não fonte oficial. Não é necessário contratar geocodificação.

O estado de exploração fica em um controlador único no frontend e alimenta mapa, lista, legenda, resumo, URL e análise; componentes não mantêm cópias independentes dos filtros. Operações espaciais locais usam GeoJSON explícito e algoritmos determinísticos de contenção/interseção adequados ao conjunto demonstrativo. Desenho usa primitivas Leaflet da instância existente, sem segundo mapa ou dependência de edição.

A migração 005 persiste preferências privadas em `subscriptions`, `saved_queries` e `notification_reads`. Atualizações internas são projeções de eventos públicos existentes, calculadas contra o alvo acompanhado; não duplicam eventos nem enviam mensagens externas. Rotas de conta exigem sessão atual, e escritas exigem Origin/JSON. Geometria e JSON de filtros são validados antes de persistir.

Reprodução temporal carrega históricos públicos sob demanda, com concorrência limitada e cache por versão. Somente `created` e `transition` alteram a presença/estado reproduzido. O Leaflet não é duplicado para comparação: A/B alternam dados sobre a mesma câmera. A ausência de imagens temporais equivalentes impede um divisor cartográfico honesto.

## Instalação e restauração
Scripts implementados: db:migrate, db:seed e start (somente API local), além de demo:prepare/start/backup/restore/reset exclusivos da apresentação. Instalação Node 24 via npm ci em diretório novo executada no item 14, com SQLite/Sharp, build e preparação conferidos. O seed legado continua restrito a base vazia; não é reset nem ferramenta de apresentação definitiva.

O reset exige CUIDACAO_ENV=demo, confirmação explícita, marcador e pasta dedicada; aplicação parada. Valida o snapshot inicial, faz backup verificado e instala a cópia inicial em staging, sem recriar esquema/seed nem reescrever datas. Invalida sessões. Restauração só aceita pasta dedicada vazia. Sem rota HTTP ou limpeza destrutiva no boot. Procedimentos, recuperação e limites em DEMO/PLAN; banco, uploads e contas são restaurados juntos.

## Referências técnicas verificadas em 07/10/2026
- Fastify: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/ e https://fastify.dev/docs/latest/Reference/LTS/ — schemas/validação; conferir compatibilidade da versão escolhida na instalação.
- SQLite: https://www.sqlite.org/foreignkeys.html — ativação de chaves estrangeiras.
- Driver: https://github.com/WiseLibs/better-sqlite3 — interface SQLite e transações.
- Node 24: https://nodejs.org/docs/latest-v24.x/api/crypto.html — scrypt e geração criptográfica.
- Cartografia: https://developers.arcgis.com/javascript/latest/references/core/layers/TileLayer/ e metadados públicos do World Imagery em https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer — endpoint, licenciamento e atribuição verificados em 12/10/2026.
Os limites e parâmetros deste projeto são decisões locais, não exigências dessas fontes.

## Configuração da entrega de autenticação

Origem web única em CUIDACAO_WEB_ORIGIN (padrão http://localhost:5173), validada como origem HTTP(S) sem caminho. HTTP sem Secure é permitido apenas para localhost/127.0.0.1/[::1]; para origem HTTPS, cookie Secure. Fastify não confia em X-Forwarded-For nem habilita CORS. Ao usar outra origem/porta do Vite, configurar a mesma origem na API. O nome do cookie é cuidacao_session; Max-Age=28800, expiração absoluta de 8h, HttpOnly, SameSite=Lax, Path=/, sem Domain.

Cookie parse/serialização usa cookie 1.1.1 como dependência direta (Node >=18); compatibilidade com Node 24 e opções conferidas na [documentação oficial da versão](https://github.com/jshttp/cookie/blob/v1.1.1/README.md) e [package.json](https://github.com/jshttp/cookie/blob/v1.1.1/package.json). Scrypt e comparação usam node:crypto conforme [Node 24](https://nodejs.org/docs/latest-v24.x/api/crypto.html). Serializadores do logger não incluem headers, corpos, URL/query ou Set-Cookie; erros não serializam stack/SQL.

Limites de autenticação usam janela móvel de 60 segundos na memória da instância, contando tentativas, inclusive sucesso, sem confiar em IP enviado por headers. Cadastro: IP; login: IP + username normalizado. Chaves expiradas são limpas periodicamente; contadores reiniciam ao reiniciar o processo (sessões permanecem no SQLite). Derivações scrypt compartilham limite de duas simultâneas no processo. Não há migração nova: users/sessions já constam da migração 001. includeHidden=true exige guarda administrativa em cada rota; sem a opção, sessão admin mantém projeção pública.


## Escrita de ocorrências — Etapa 2
Rotas HTTP usam schemas explícitos, guardas de Origin/sessão e serviços de escrita; repositório separa SQL. Serviço valida campos após trim e regras D02/D05, reserva sequência dentro da transação e reutiliza domainTransaction para mutação/evento/versionamento. Edição usa transação immediate: lê autoria, visibilidade, estado, vínculo, prazo e versão sob o mesmo bloqueio antes de atualizar. Datas e autoria vêm do servidor. UI usa codigo-fonte/servicos/occurrence-write.js e codigo-fonte/ui/occurrence-form.js; Leaflet de seleção é criado ao abrir o formulário, sem recriar o mapa de consulta. Conflitos requerem revisão explícita da versão; rascunhos não usam storage. Dependências/lockfile anteriores foram preservados, sem pacotes novos.

E2E usam duas bases temporárias isoladas: consulta/auth nas portas 3100/5180 e escrita nas portas 3101/5181, com respectivas origens exatas. Assim criação não modifica a fixture de 105 registros nem consome os limites de autenticação dos testes de consulta. Ambas usam Fastify/SQLite reais e são removidas pelo supervisor ao encerrar; nenhuma base de demonstração é reutilizada.

## Uploads implementados — item 5, 09/10/2026

@fastify/multipart 10.1.3 declara Fastify 5.x no plugin instalado; sharp 0.35.5 exige Node >=20.9.0. Versões exatas e lockfile atualizados, instalação limpa e importação nativa de SQLite/sharp verificadas em Node 24.21.0. Referências oficiais consultadas nesta implementação: [multipart](https://github.com/fastify/fastify-multipart), [construtor/decodificação sharp](https://sharp.pixelplumbing.com/api-constructor/), [saída e remoção padrão de metadados](https://sharp.pixelplumbing.com/api-output/) e [compatibilidade](https://sharp.pixelplumbing.com/install/).

Rotas, serviço, SQL e disco estão separados em servidor/routes/attachments.js, services/attachments.js, repositories/attachments.js e storage/attachments.js. Frontend usa cliente codigo-fonte/servicos/attachments.js e componentes codigo-fonte/ui/attachments.js; mantém layout e mapa existentes. Sem nova migração. Testes injetam pasta privada temporária. Padrão em disco: diretório uploads/<basename-do-banco>.files junto do banco (data/uploads/cuidacao.sqlite.files na configuração padrão). Processos de produção local podem informar CUIDACAO_UPLOAD_DIR; a pasta deve pertencer a uma única base. Bases em memória usam pasta temporária própria, removida no fechamento.

Consistência: decodificar/reencodar antes da transação; gravar em .staging com criação exclusiva, modo 0600 e fsync. Dentro da transação immediate, comparar versão, revalidar permissões/quantidade, renomear para UUID interno e sincronizar diretórios antes de inserir linha/evento/incremento de versão e confirmar SQLite. Falha comum de publicação ou banco reverte SQL e remove tanto temporário quanto arquivo novo. O arquivo só é acessível por linha confirmada e autorização da API; leitura não segue symlink e confere tamanho. Retirada é SQL auditado e preserva arquivo privado.

SQLite e filesystem não compartilham transação atômica: queda abrupta antes do commit pode deixar arquivo privado sem referência. Na inicialização, remover somente temporários e nomes internos sem referência com idade >=24h; nunca remover referenciados (inclusive ocultos/retirados), arquivos recentes ou nomes externos. Publicação durável antes do commit evita confirmar linha antes de existir arquivo. Testes exercitam rollback de eventos, concorrência, falha de disco inclusive após rename, retirada e limpeza de órfãos antigos; não simulam perda física de disco/energia. Erros de limpeza/disco interrompem operação em vez de declarar sucesso. Operação destinada à única instância local; backup/restauração da apresentação estão implementados no item 14 e preservam banco e arquivos juntos.

Leitura somente por API, com cheque de visibilidade do anexo e pais a cada pedido, nosniff e no-store. Não publicar pasta no Vite/Fastify estático. Formulário salva pai antes de enviar arquivos; erros mantêm pai e pendências em memória, sem reenvio automático. Histórico e versão de cada imagem são atômicos no SQLite.

## Comentários/complementos — item 6 original

servidor/repositories/contributions.js contém SQL; services/contribution-policy.js concentra pais visíveis, estados participativos, autoria e prazo; services/contributions.js valida entrada e grava com domainTransaction; routes/contributions.js define schemas/guardas. Reutiliza esquema/migração 001, sem dependências novas. Resolução é um tipo de complemento e não transiciona estado. Não oferece DELETE textual, manifestações, pedido de reabertura ou administração.

Serviço de imagens reutiliza política da contribuição para upload/retirada de complementos. Parser permite contributionId e mais um campo textual/parte; mantém limite de arquivo, assinatura/decodificação/reencodificação, pasta privada e compensação do item 5. Checa sessão após decodificação e pais/autoria/prazo/estado/quantidade novamente na transação; linha do anexo/evento/versão têm o mesmo commit. Leitura do arquivo verifica também visibilidade da contribuição. Lista pública de contribuições é uma leitura transacional do pai, contribuições e metadados dos seus anexos; páginas devolvem occurrenceVersion. Frontend recusa páginas inconsistentes sem resultado parcial e oferece tentativa explícita.

codigo-fonte/servicos/contributions.js projeta somente campos públicos; codigo-fonte/ui/contributions.js mantém leitura nos detalhes e formulário em dialog próprio, com texto simples, erro focável e rascunho na memória. Usa componentes de imagens existentes com ids de campos únicos entre formulários. Salva complemento antes de imagens; falha conserva filho salvo e só envia pendências na próxima ação. Conflito bloqueia envio até carregar/comparar estado, contribuições e imagens e confirmar versão; sem substituir rascunho. Perda de resposta pede consultar antes de repetir, sem retries automáticos.

E2E de contribuições usam terceiro par temporário 3102/5182, separado de consulta/auth e criação; desktop usa CA-001/community_review e mobile CA-003/monitoring do seed. Assim participação não muda fixture nem consome limites de cadastro das outras suítes. Supervisor e testes de reinício preservam a base local do desenvolvedor. Nenhum endpoint de transição é introduzido para preparar testes.

## Apoio/contestação — item 7 original

SQL em repositories/stances.js, regras em services/stances.js e schemas/guardas em routes/stances.js. Reutiliza tabela e UNIQUE da migração 001 sem nova migração/dependência. Cada escrita começa transação immediate, verifica pai/autoria/estado/vínculo/visibilidade da posição própria e expectedVersion sob o mesmo bloqueio; domainTransaction grava posição, evento e versão/updatedAt do pai. Retirada repetida com versão atual retorna sem mutação; posição oculta nunca é restaurada pela escrita comum. Eventos não guardam justificativa em reason público.

GET lê pai/posições/contagens na mesma transação; somente ativas visíveis entram nas contagens. Marcadores ocultos não mostram texto/identidade/tipo. Não agrega duplicatas nem altera estados. Clientes em codigo-fonte/servicos/stances.js validam projeção, paginação integral, unicidade/contagens/versão, sem resultados parciais ou fallback. codigo-fonte/ui/stances.js renderiza texto simples e dialog no padrão visual existente. Auth notifica mudança de identidade para atualizar controles dos detalhes sem tocar o rascunho.

E2E usam quarto par temporário 3103/5183 e respectivos bancos/origens isolados. Desktop utiliza CA-001 e mobile CA-003; nenhum endpoint administrativo é criado para preparação. Teste de reinício usa HTTP real com escritas concorrentes, substituição e retirada, encerra servidor e abre outro processo contra a mesma base temporária. Nenhuma base local é resetada.

## Transições e acompanhamento — item 8 original

Repositories/transitions.js concentra SQL; services/transitions.js mantém matriz fechada, papel atual no banco, independência, visibilidade, vínculos, motivo/requisitos e referências; routes/transitions.js aplica schemas/Origin/admin/JSON. Toda leitura autorizadora e escrita ocorre sob transação immediate. DomainTransaction compara expectedVersion e grava estado, motivos terminais, version/updatedAt, evento e snapshots de referências usados no mesmo commit. Reabertura inclui aceitação/substituição de pedidos e seus eventos sem transação separada. Referências de outra ocorrência são somente leitura sob o bloqueio; não alteram sua versão nem criam relações.

Reutiliza esquema 001, sem migração ou dependência nova. Política de contribuição mantém texto de pedido imutável e permite imagens somente ao autor nas primeiras 24h enquanto pending e pai closed/discarded sem duplicata; arquivos usam compensação/recuperação existentes. Todas as demais políticas consultam estado atual ao escrever, inclusive após decodificar imagem. Não há transição automática. Histórico extrai códigos fromStatus/toStatus por JSON SQL somente de eventos transition; nenhum snapshot completo é exposto.

codigo-fonte/servicos/transitions.js valida resposta e codigo-fonte/ui/transitions.js oferece controles nos detalhes. Requisitos são consultados por clientes públicos existentes; versões das páginas/contribuições/posições devem concordar. Conflito requer revisão humana explícita sem apagar motivo/parecer. Auth atualiza controles ao mudar identidade sem substituir rascunho. Sem painel administrativo ou rotas de moderação/gestão de vínculos.

Quinto par E2E temporário 3104/5184, isolado de demais bases/limites. Supervisor prepara seed e grava credenciais aleatórias somente num arquivo privado 0600 em tmpdir, nome aleatório gerado pelo Playwright, removido ao encerrar. Não expõe endpoint de contas/papéis, não usa credencial fixa e não grava arquivo no repositório. Testes usam sessões reais de usuários/admins independentes. Teste de reinício encerra/inicia processos HTTP reais e preserva ciclo/fechamento/reabertura, pedido, sessão e histórico.

## Área administrativa — item 9 original

SQL em repositories/administration.js, casos de uso em services/administration.js, schemas/guardas em routes/administration.js. Consulta privada usa as rotas já contratadas com includeHidden=true e projeções próprias. Guardas consultam sessão/papel no SQLite a cada chamada, serviço revalida papel/independência sob bloqueio de escrita. Consultas públicas seguem somente projeções públicas; binário privado exige opção explícita e sessão administrativa, sem publicar diretório/chaves. Respostas privadas e públicas de conteúdo usam no-store.

Correção/denúncia/moderação/revisão/rejeição usam domainTransaction sob immediate, comparando versão atual do pai; revisão procedente compõe decisão e ocultação no mesmo commit, com um incremento de versão. Eventos de denúncia são privados; fila reports limita leitura ao autor/admin, auditoria de conteúdo exclui esses eventos para não expor denunciante. Arquivos ocultos/retirados permanecem reservados e restaurar filho não modifica pais nem withdrawnAt. Reutiliza esquema 001 sem reescrever migração/reset e não acrescenta dependências.

UI em codigo-fonte/ui/administration.js e cliente em codigo-fonte/servicos/administration.js: navegação, filas paginadas, filtros, revisão privada, formulários de correção/moderação/denúncia/rejeição, auditoria e transições via componente/serviço existente. Textos externos via textContent; snapshots via JSON como texto em detalhes expansíveis. Rascunho em memória, revisão explícita em 409, login em 401, bloqueio durante envio, sem retry automático. Troca de identidade invalida consultas administrativas e limpa conteúdo privado anterior. Sexto par E2E temporário 3105/5185 isolado; credenciais aleatórias em arquivo privado temporário 0600, removido no encerramento, sem conta/rota de privilégios do cliente.

## Duplicatas e relacionadas — item 10 original

SQL em repositories/links.js, condições/atomicidade em services/links.js, schemas/guardas em routes/links.js. Transação immediate inclui papel atual, dois autores, existência, condições D07, ambas versões, vínculo e dois eventos correlacionados, reutilizando domainTransaction. Mesmo bloqueio serializa vinculação/moderação/transição; cliente antigo recebe 409 sem alteração parcial. Remoção auditada altera somente vínculo, sem tocar arquivos/contribuições/estados. Migração 002 índice simétrico, sem reescrever 001/recriar base/dependência nova.

Cliente codigo-fonte/servicos/links.js valida paginação/versões/unicidade sem resultado parcial/retries. codigo-fonte/ui/links.js integra gestão no painel existente, consulta de destino identificada, resumo/estado/versão e efeito explícito antes da ação. Falha conserva motivo/destino em memória; conflito requer carregar/comparar ambos e aceitar versões. Textos via textContent. Público consulta vínculos e expande conteúdo visível de cada duplicata com origem identificada, reutilizando leitores de imagens/contribuições/manifestações sem copiar dados. Privado usa includeHidden com guarda atual. Sétimo par E2E temporário 3106/5186, credenciais aleatórias privadas 0600 removidas no encerramento; nenhuma base preexistente usada.

## Revisão integrada de histórico e encerramento — item 11

Os serviços de escrita/transição existentes são reutilizados integralmente: mudança, evento e versão continuam na mesma transação imediata. A revisão não cria serviços paralelos, eventos retroativos, migrações ou dependências. Consultas do repositório localizam o último encerramento pela versão registrada e a contribuição atual permitida. O serviço de consulta monta `closure`, e o schema HTTP/adaptador projetam somente seus campos públicos. A leitura pública usa a transação de leitura existente. Auditoria administrativa mantém snapshots privados e identificação da entidade; denúncias usam seu destino privado próprio.

`codigo-fonte/ui/history.js` compartilha a apresentação pública/administrativa: páginas visuais de 20 eventos, abertura na última página, ordem crescente de data/id dentro dela, autoria/ação/data/justificativa e controles de teclado. O cliente continua percorrendo as páginas da API existentes; a paginação visual não reduz o total transferido. A apresentação do encerramento usa motivo/responsável e fundamento atual visível, nunca o snapshot. Todo texto é inserido com `textContent`. Nenhum layout foi redesenhado.

Preparação real: migrações 001/002 aplicadas por `npm run db:migrate` em `data/cuidacao.sqlite`, previamente sem tabelas e registros; nenhum seed/reset. Testes de ciclo integrado usam SQLite temporário e APIs existentes, sem endpoint privilegiado de preparação. Reinício HTTP real compara fechamento, fundamento público, reabertura, versão e histórico; testes de escrita já existentes cobrem rollback e concorrência. Evidências finais em PLAN.

## Preparação da apresentação — contrato operacional do item 14

Ferramenta local separada do seed legado: `demo:prepare`, `demo:start`, `demo:backup`, `demo:restore` e `demo:reset`. Padrão `demo-data/` na raiz do projeto, ignorado pelo Git; `CUIDACAO_DEMO_DIR` pode apontar outra pasta dedicada cujo nome comece por `cuidacao-demo`, ou `demo-data`. Banco, uploads e credenciais ficam em `current/`; marcador próprio identifica a pasta. Recusar symlinks, caminhos que contenham a base de uso/configurada e preparação/restauração em pasta não vazia. Nenhuma ferramenta seleciona `CUIDACAO_DB_PATH` como destino de preparação.

Os cenários são construídos por serviços de domínio existentes, com relógio real crescente, contas locais fictícias (três moradores e dois administradores) e imagens ilustrativas geradas localmente. Atribuir papel administrativo é operação exclusiva dessa preparação local, sem API de promoção. Não alterar migrações, regras ou seed usado pelos testes. API e Vite da apresentação usam portas próprias 3001/5174, com origem exata, sem servir uploads estaticamente. O servidor web, inclusive Vite normal de desenvolvimento, bloqueia explicitamente diretórios demonstrativos/data, credenciais e bancos, inclusive por /@fs; a leitura de anexos passa somente pela API autorizada.

Backup é snapshot SQLite pela API de backup do driver, acrescido dos arquivos referenciados (inclusive ocultos/retirados), credenciais, imagem ilustrativa e índice dos cenários. Manifesto registra hashes/tamanhos; publicação do backup só depois de validar SQLite/FKs/arquivos. Arquivos de anexo são imutáveis e permanecem retidos, permitindo copiá-los a partir das referências do snapshot. Pasta de staging não é parte do backup. Lock local impede concorrer CLI e servidor demonstrativo; aplicação deve estar parada durante backup/reset/restauração. Não copiar diretamente um SQLite ativo ignorando WAL.

`demo:reset -- --confirm-demo-reset`, somente com `CUIDACAO_ENV=demo`, faz backup prévio e restaura a cópia inicial validada em staging. Erro de backup ou validação não modifica o conjunto atual. Troca por rename, com recuperação do conjunto anterior se publicação falhar; só remove a antiga pasta `current` após backup e troca completos. Não segue caminhos arbitrários ou symlinks. Restauração externa aceita somente destino dedicado vazio, com marcador novo. Sessões são invalidadas ao restaurar; conteúdo/eventos/datas não são reescritos. Reset conserva as datas do cenário inicial: depois de 24h, edição/imagens obedecem ao prazo normal; criar relato novo para fluxo ao vivo ou preparar outra pasta vazia, sem rejuvenescimento artificial do histórico.

Procedimentos de preparação, cinco minutos de apresentação e recuperação em DEMONSTRACAO.md. Contrato descrito antes da implementação; execução e evidências do item 14 em PLAN.

## Autenticação Google opcional — contrato de integração

Google Identity Services: botão oficial, popup e callback JavaScript; sem One Tap/entrada automática, autorização de APIs ou redirect de página. Callback envia ID token somente por POST JSON same-origin. Servidor usa google-auth-library mantida, verifica assinatura/chaves Google, iss, aud, iat/exp e sub; compara nonce emitido pelo servidor a fluxo persistido, associado a cookie HttpOnly/SameSite, de dez minutos e uso único. Origin exato/JSON protegem as escritas. state de redirecionamento e PKCE não se aplicam: não há authorization code nem redirect; nonce/contexto do cookie protegem este fluxo. Não aceitar tokens decodificados sem verificação, não registrar token/código/segredo.

Configuração exclusivamente no servidor CUIDACAO_GOOGLE_CLIENT_ID; ID do cliente é público via config, não exige client secret neste fluxo. Sem configuração ou migração necessária, apresentar indisponibilidade e manter autenticação atual. Nome local escolhido após validação; pendência guarda apenas subject por tempo curto. Cadastro/identidade/sessão/consumo da pendência atômicos; reutilizar sessões locais, rotação/revogação/expiração. Migração 003 torna os três campos de senha nullable em conjunto, preservando valores e referências existentes; reconstrução SQLite conforme procedimento de migração com FK desabilitadas somente fora da transação, verificação de FK antes do commit e reativação no finally. Nunca recriar base ou alterar 001/002.

Referências oficiais consultadas: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token ; https://developers.google.com/identity/gsi/web/reference/js-reference ; https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid ; https://github.com/googleapis/google-auth-library-nodejs . Testes controlam chaves/respostas do provedor preservando verificador real; não comprovam login Google real.

## Ponte Firebase Auth

Quando `CUIDACAO_FIREBASE_PROJECT_ID` está definido, `servidor/servicos/administrador-firebase.js` inicializa o Admin SDK com o Auth Emulator local ou Application Default Credentials no ambiente hospedado. O frontend usa `signInWithPopup`, força a emissão de ID token, envia-o por POST same-origin e encerra imediatamente a sessão do SDK no navegador. O backend aceita somente token verificado do projeto e provedor Google, grava apenas `uid` na migração 006 e converte a identidade em `cuidacao_session`. Testes injetam o verificador na borda HTTP; produção nunca confia em claims fornecidas pelo cliente. Firebase Admin 14.5.0 exige Node >=22 e é compatível com Node 24.


## Autenticação prioritária — 22/10/2026

Solicitação explícita posterior autoriza e-mail privado e senha no cadastro, apelido público único, entrada por e-mail ou apelido (preservando contas existentes), sessão local HttpOnly e Google opcional sem vínculo automático. Cadastro encaminha à entrada. O e-mail nunca integra projeções públicas. Recuperação e verificação usam links de uso único, expiração e transporte externo configurável; sem transporte, a interface informa indisponibilidade e não simula envio. Android aproveita o fluxo web responsivo existente, sem recriar APK. Esta autorização substitui a proibição anterior de e-mail/recuperação somente no gerenciamento de contas.
