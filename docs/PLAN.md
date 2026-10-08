# Plano de implementação — versão 1.0
07/10/2026. Especificação e implementação têm estados separados.

Estado atual: passo 3 da lista geral (persistência e consulta, parte inicial da Etapa 2) validado pelo usuário no terminal local com Node 24.21.0: npm ci bem-sucedido, 28 testes Node aprovados, build aprovado e 16 execuções E2E aprovadas. Os bloqueios das tentativas anteriores do agente foram superados nessa validação; seus registros abaixo permanecem como histórico. Autenticação, criação e AC04–AC11 continuam pendentes.

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
- [ ] Cadastro, login, logout, sessões, proteção de origem, permissões e limites de tentativas.
- [ ] Criação e edição do autor, validação territorial demonstrativa e persistência.
- [ ] Histórico transacional e versionamento desde a primeira mutação, com projeção pública/privada.
Aceite: AC03–AC11; documentação de execução real atualizada. Esquema final pode ser criado nesta etapa, rotas posteriores permanecem ausentes. Recebidas reais ainda não transitam; seed fornece exemplos para testar participação na etapa seguinte.

## Etapa 3 — participação e imagens
- [ ] Comentários, complementos, manifestações e anexos com validação/retirada.
- [ ] Testar autoria, estados, limites e falhas parciais de upload.
Aceite: AC12–AC16. Histórico e autorização são reutilizados, não introduzidos somente aqui.

## Etapa 4 — administração completa
- [ ] Triagem, confirmação com referências/pareceres, acompanhamento, encerramento e reabertura.
- [ ] Pedidos de reabertura, denúncias, ocultação/restauração e correção administrativa.
- [ ] Duplicatas e relacionadas, sem perda de contribuições e sem soma de apoios.
- [ ] Auditoria e revisão de suporte oculto/retirado; independência do administrador.
Aceite: AC17–AC26. Cada endpoint exige testes de permissão pela API, não só botões ocultos.

## Etapa 5 — apresentação
- [ ] Comandos locais de execução/seed/reset/backup/restauração com instalação limpa comprovada.
- [ ] Roteiro: cadastro → criação → contribuição independente → revisão → acompanhamento → resolução; incluir contestação, duplicata e moderação em exemplos adicionais.
- [ ] Revisão móvel/teclado/zoom, falha de rede e sinalização da simulação.
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

Código implementado em server/app.js (sem porta), server/start.js (127.0.0.1:3000), server/routes/, server/services/ e server/repositories/. Somente GET de listagem, detalhe e histórico em /api/v1/occurrences. Schemas de entrada/saída, paginação, ordenação e filtros E; consultas parametrizadas e projeções públicas, ocultos=404, includeHidden=true=403 e duplicatas opcionais. Contagens/flags são derivadas do banco. Eventos de denúncias não entram no histórico público nem no total. Falhas internas têm mensagem genérica/requestId, sem SQL/stack/caminhos. Boot não migra, não faz seed/reset; não serve frontend. Autenticação e criação continuam pendentes; integração do frontend foi implementada na entrega descrita abaixo.

Fastify 5.12.5 declarado em package.json; documentação oficial de schemas, inject e política LTS consultada, com stack Node 24 preservada. A [CI oficial da linha 5.x](https://github.com/fastify/fastify/blob/5.x/.github/workflows/ci.yml) inclui Node 24. Tentativas de resolução/instalação pelo npm falharam com EAI_AGAIN (DNS) e ENOTCACHED (offline). Por isso Fastify e better-sqlite3 não estão instalados, e a atualização do lockfile com Fastify/transitivas ficou pendente: package.json e package-lock.json ainda precisam ser sincronizados por npm install com rede. Não declarar instalação limpa/npm ci aprovados.

Foram adicionados 11 testes Fastify inject com banco temporário real: paginação/ordenação, filtros, inválidos/desconhecidos, ocultos/inexistentes, recusa de includeHidden sem bypass, duplicatas, contagens/referências, histórico sem dados privados, falhas internas e ausência de rotas futuras/seed. `npm test` e `npm run start` executados, mas bloqueados no carregamento por dependências ausentes. Build aprovado no Node 26.10.0; `npm run test:e2e` bloqueado pelo bind do Vite (EPERM em 127.0.0.1:5173), mesmo com Chromium alternativo. Checagem complementar de SQL/serviços aprovada com adaptador temporário node:sqlite fora do repositório; não certifica HTTP, schemas, Fastify ou better-sqlite3. Syntax checks e git diff --check aprovados. Nenhum novo AC foi declarado aprovado nesta entrega.

## Histórico — verificação da revisão de documentação
A revisão anterior em 07/10/2026 aprovou 3 testes Node, build e 8 execuções Playwright. Chromium padrão ausente no ambiente; usar CUIDACAO_CHROMIUM_PATH=/tmp/chromium localmente quando disponível. CI continua instalando Chromium pelo Playwright. Tiles foram bloqueados; disponibilidade externa não foi certificada. Esta revisão só altera documentação e não implementa backend ou novas regras. Reexecução desta entrega: 3 testes Node aprovados, build aprovado e 8 execuções Playwright aprovadas com Chromium alternativo. Links relativos dos 11 documentos e identificadores AC01–AC30 verificados. Sem alteração de código executável ou dependências.

## Histórico — frontend integrado e limites daquela verificação

Implementadas camadas HTTP e adaptador explícito em src/services, filtros com códigos de DOMAIN, datas America/Sao_Paulo, proxy Vite /api para Fastify local e consulta integral paginada antes de atualizar mapa/lista/contagem. Estados carregando/vazio/erro e retry manual, cancelamento com geração contra respostas antigas; detalhes/histórico por ID independentes dos filtros/páginas, sem fixtures ou evidências inventadas. Fechamento preserva filtros, navegação por hash e retorno de foco; filtros que excluem seleção conhecida a removem. Nenhuma interface de autenticação/criação adicionada.

Verificado: 10 testes Node de domínio/serviços aprovados e npm run build aprovado em Node 26.10.0. npm test executado: testes frontend passam, suítes API/SQLite bloqueadas por fastify e better-sqlite3 ausentes. npm run test:e2e com CUIDACAO_CHROMIUM_PATH=/usr/bin/chromium executado: servidor não inicia pela ausência de better-sqlite3. Limitações de rede/lockfile/Node 24 descritas acima continuam; sem aprovação adicional de AC01/AC02/AC30.

E2E atualizados (8 cenários em desktop/mobile, ainda não aprovados): consultas com 105 registros/múltiplas páginas, filtros/vazio, detalhes, links diretos fora de filtro, Voltar/Avançar/reload, foco, indisponibilidade/retry de API/histórico, falha na segunda página, mudanças rápidas de filtros, seleção excluída por filtro e tiles indisponíveis. Supervisor usa banco temporário isolado com migração/seed e eventos próprios, ignora caminho de demonstração, não reutiliza servidores e remove somente seu diretório temporário ao encerrar. Portas locais 3100/5180. Syntax checks e git diff --check aprovados.

## Histórico — revisão de persistência e consulta no ambiente do agente

Releitura de AGENTS e contratos concluída; revisão do esquema, SQL parametrizado, projeções públicas, seed, transações, HTTP, adaptador e isolamento dos E2E. Corrigido o estado desatualizado de ARCHITECTURE (backend/scripts deixaram de ser apenas futuros). Não foram adicionadas autenticação, escrita HTTP, reset ou deploy. Trabalho local e clone aninhado preservados. Nenhuma base existente foi apagada ou sobrescrita.

Acrescentados testes ainda pendentes de execução com dependências reais:
- tests/db/cli.test.js: comandos reais npm run db:migrate/db:seed em banco novo, reaplicação, recusa de seed e preservação de todas as tabelas por digest; credenciais capturadas somente em memória, sem imprimir segredos em comparações.
- tests/api/restart.test.js e tests/helpers/read-server.js: preparação controlada com domínio/evento, conexão fechada, dois processos HTTP independentes em portas locais aleatórias, igualdade das consultas após reinício e ausência de conteúdo oculto, senhas geradas, salts/hashes e segredo/hash de sessão. Sem rota de escrita.
- tests/api/occurrences.test.js: preparação agora contém sessão privada, para tornar a verificação de projeção mais representativa.

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

Checks adicionais aprovados: node --test --test-isolation=none tests/domain.test.js tests/services/*.test.js (10 testes), syntax checks dos novos testes e git diff --check. Nenhum AC novo foi marcado aprovado. AC03 continua pendente de driver real; AC04–AC11 continuam incompletos (cadastro/sessões/escrita/autorização/Origin/rate limit não entregues); rollback e reinício testados isoladamente não completam esses critérios. README contém comandos exatos para copiar o projeto sem dados para diretório temporário, reparar o lock com rede, executar npm ci e verificar banco/API/frontend localmente.

## Validação local executada pelo usuário — estado vigente

O usuário informou ter concluído no próprio terminal local, com **Node.js 24.21.0**, os seguintes comandos:

| Comando | Resultado informado pelo usuário |
| --- | --- |
| npm ci | Instalação concluída com sucesso |
| npm test | 28 testes aprovados |
| npm run build | Build aprovado |
| npm run test:e2e | 16 execuções E2E aprovadas: 8 cenários em desktop e mobile |

A execução e seus resultados são atribuídos ao usuário; não se trata de reexecução pelo agente no ambiente restrito. Os bloqueios anteriores de DNS/instalação, dependências ausentes, Node diferente da stack e bind local foram superados nessa validação. Permanecem acima apenas como histórico das tentativas anteriores.

O package-lock.json atual foi revisado pelo agente: metadados raiz de dependências/devDependencies/engines correspondem a package.json; Fastify 5.12.5, better-sqlite3 13.0.3 e árvore transitiva constam com URLs do registro npm e integridades. README agora usa npm ci, sem etapa de reparo do lockfile.

Com a aprovação dos testes existentes, AC01–AC03 ficam verificados no escopo de consulta e preparação da base: navegação/foco, filtros/vazio/tiles e migração/seed/reaplicação/recusa. A suíte também exercita projeção pública, paginação, rollback interno, persistência entre conexões e reinício de processo HTTP, além de falha da API sem fallback. Isso não completa **AC04–AC11**, que dependem de cadastro, login/sessões, escrita HTTP, autoria/permissões, validação de criação, Origin e rate limit ainda não implementados. AC30 completo também permanece pendente para todos os fluxos da versão final. Nenhuma funcionalidade de outra etapa foi adicionada nesta atualização.

Commit do passo 3 inclui persistência, API de consulta, integração do frontend, testes e documentação. Clone aninhado CuidAcao/, bancos/WAL, credenciais, node_modules, dist e relatórios ficam fora do commit.
