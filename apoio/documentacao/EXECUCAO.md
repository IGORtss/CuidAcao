# CuidAção

Plataforma de monitoramento ambiental comunitário do bairro Perequê, em Guarujá (SP), desenvolvida como Trabalho de Conclusão de Curso (TCC).

## Sobre o projeto

O CuidAção propõe um espaço digital para moradores registrarem, visualizarem e acompanharem problemas ambientais do bairro. Um mapa interativo reúne ocorrências, enquanto os registros permitem compartilhar evidências e organizar contribuições da comunidade sobre cada problema.

O projeto amplia uma proposta inicial voltada ao descarte de resíduos e à localização de pontos de coleta. Seu recorte atual inclui problemas ambientais do território, como descarte inadequado de lixo e relatos de possível contaminação da água do mar. Relatos comunitários não equivalem a uma medição técnica ou a um laudo ambiental.

## Objetivo

Facilitar a visão geral dos problemas ambientais do Perequê e demonstrar como uma plataforma pode organizar registros, participação comunitária, acompanhamento e histórico de ocorrências.

## Contexto acadêmico

O sistema será desenvolvido como uma simulação funcional de uma plataforma real, destinada à apresentação do TCC. As funcionalidades previstas serão demonstradas nesse contexto; o projeto não está sendo preparado para lançamento como serviço público.

Dados fictícios utilizados na demonstração deverão ser identificados como simulados.

## Público e território

- Público-alvo: moradores do Perequê interessados em acompanhar a situação ambiental do bairro.
- Área de abrangência: bairro Perequê, Guarujá (SP).
- Tema: monitoramento ambiental comunitário.

## Funcionalidades previstas

- Cadastro e identificação de usuários.
- Mapa interativo com ocorrências ambientais.
- Criação de ocorrências por moradores.
- Inclusão de evidências e informações complementares.
- Comentários e participação comunitária na verificação dos registros.
- Acompanhamento do estado de cada ocorrência.
- Organização de registros duplicados ou relacionados.
- Administração e moderação das ocorrências.
- Histórico de alterações e encerramento dos registros.

Esta lista apresenta o escopo geral. Regras de estados, validação, permissões e resolução estão definidas na especificação 1.0 em apoio/documentacao/DOMINIO.md. A implementação continua dividida em etapas; documentação pronta não significa funcionalidade pronta.

## Desenvolvimento com agentes de IA

Agentes como o Codex apoiarão a documentação, implementação e revisão do projeto. O desenvolvimento seguirá etapas pequenas e verificáveis, com regras explícitas para reduzir inconsistências e funcionalidades sem relação com o objetivo do TCC.

Diretrizes:

- Implementar com base na documentação do projeto.
- Distinguir decisões confirmadas de propostas técnicas.
- Evitar funcionalidades, dados e regras de negócio inventados.
- Priorizar os fluxos essenciais antes do acabamento visual.
- Verificar o comportamento entregue em cada etapa.
- Manter uma interface clara, adequada ao território e ao público do projeto.

## Estado atual

Etapa 2 implementada: consulta pública, migrações e base demonstrativa, cadastro/login/logout, sessões persistidas, criação e edição limitada pelo autor. Histórico desde a criação, validação e permissões no servidor, controle de versão e conflitos. O item 5 da lista original (criação de ocorrências) inclui agora imagens opcionais persistentes. Comentários, complementos e suas imagens estão implementados no item 6. Apoio/contestação, substituição e retirada estão implementados no item 7. Ciclo de estados e pedidos de reabertura estão implementados no item 8, com controles mínimos de administrador nos detalhes. Área administrativa, correções, denúncias/moderação e rejeição de pedidos implementadas no item 9. Gestão de duplicatas/relacionadas implementada e verificada no item 10: 112/112 Node, build e 56/56 E2E desktop/mobile aprovados, Chromium/diff-check aprovados; aplicar migração 002 sem reset. Verificação final do item 9: 101 testes Node, build e 52 E2E desktop/mobile aprovados, com diff-check aprovado; 90 Node/46 E2E do item 8 são evidências históricas. Item 11: revisão integrada de histórico/encerramento, fundamento público permitido e paginação visual; 116/116 Node, build e 56/56 E2E desktop/mobile aprovados, Chromium/diff-check aprovados. Migrações 001/002 aplicadas à base padrão sem seed/reset. Uma falha intermitente de mapa na primeira tentativa E2E passou na reexecução isolada e completa. Evidências atuais em [PLAN](PLANO.md). Item 12: revisão de interface com identidade preservada, diálogos utilizáveis a 200%, foco/contraste/rótulos e recuperação de leitura corrigidos; 116/116 Node, build e 64/64 E2E desktop/mobile aprovados. Capturas desktop/360/390 e limites em PLAN; falha histórica do marcador não reproduzida em 72 tentativas, causa indeterminada.


Item 13: ciclo integrado entre três contas novas e dois administradores, upload parcial recuperado sem duplicar registro e reinícios HTTP com leitura dos arquivos/vínculos/histórico comprovados; 116/116 Node, build e 66/66 E2E desktop/mobile aprovados, diff-check aprovado. [Roteiro isolado](VALIDACAO.md). Base de uso preservada; apresentação isolada preparada no item 14, conforme seção seguinte.

Stack: JavaScript com módulos ES, Vite e Leaflet; base de persistência SQLite com better-sqlite3 13.0.3 e API pública local em Fastify 5.12.5. Requer Node.js 24 e npm. O [driver declara suporte a Node >=22](https://github.com/WiseLibs/better-sqlite3/blob/v13.0.3/package.json). O frontend consulta a API, sem fallback para fixtures. A instalação atual inclui @fastify/multipart 10.1.3 e sharp 0.35.5, com versões fixadas no lockfile. Verificação atual pelo agente em Node 24.21.0 registrada em PLAN; resultados anteriores permanecem identificados como históricos. Evidências e histórico dos bloqueios anteriores estão em PLAN.

## Executar localmente

```bash
git clone https://github.com/IGORtss/CuidAcao.git
cd CuidAcao
npm ci
npm run db:migrate
# Opcional, somente em base vazia:
npm run db:seed
# Terminal 1:
npm run start
# Terminal 2:
npm run dev
```

Abra o endereço exibido pelo Vite (normalmente http://localhost:5173). O proxy de `/api` encaminha as consultas para o Fastify local em `127.0.0.1:3002`; mantenha os dois processos ativos. O fundo cartográfico exige internet; se falhar, use a lista. O repositório é privado: o clone exige autenticação de uma conta com acesso.

O lockfile atual inclui Fastify 5.12.5, better-sqlite3 13.0.3 e dependências transitivas, sincronizados com package.json. A instalação reproduzível por `npm ci` foi validada pelo usuário no terminal local com Node 24.21.0.

Histórico: nas tentativas anteriores do agente, resolução do lockfile e `npm ci` falharam com EAI_AGAIN; dependências de backend estavam ausentes, Node disponível era 26.10.0 e o ambiente recusava bind local com EPERM. Esses bloqueios foram superados na validação local informada pelo usuário; não são pendências da entrega atual. O registro detalhado permanece em PLAN.

## Preparar a base local

Após instalar as dependências, com Node 24:

```bash
npm run db:migrate
npm run db:seed
```

O banco padrão é `data/cuidacao.sqlite`, relativo ao projeto. Para um banco separado, defina `CUIDACAO_DB_PATH` nos dois comandos. Dados, bancos e backups são ignorados pelo Git. Nenhum comando apaga ou reinicializa uma base existente.

Migrações numeradas são aplicadas em transação e registradas em `schema_migrations`; reaplicá-las preserva os dados. Cada conexão habilita chaves estrangeiras e WAL (bancos em memória usam o modo próprio do SQLite). Não editar migração já aplicada.

O seed exige esquema previamente migrado e base vazia, inclusive sem usuários ou sequência já utilizada. Recusa tabelas alheias. Cria três usuários e dois administradores fictícios, com senhas aleatórias derivadas por scrypt; mostra as credenciais somente no terminal depois do commit, sem gravá-las em arquivo. Não redirecione essa saída para arquivos do repositório. Essas contas podem entrar pela interface. Cadastro público sempre cria user; administradores continuam restritos à preparação local da demonstração.

Os quatro registros preservam `CA-001`–`CA-004`; novos IDs usam sequência transacional de seis dígitos, começando em `CA-000005` após o seed. Os eventos foram construídos para a simulação, com triagem, apoio independente e complementos referenciados; o histórico textual das fixtures não foi importado.

Há uma primitiva interna síncrona para mutação + evento + incremento de versão na mesma transação, incluindo comparação das versões de duas ocorrências. A projeção pública de consulta, autorização e validação de criação/edição do autor estão implementadas. Uploads do relato original estão implementados; comentários/complementos estão implementados; manifestações, transições e pedidos de reabertura estão implementados; área administrativa implementada no item 9; gestão de vínculos implementada no item 10; reset local da apresentação está disponível no item 14; não há reset HTTP nem da base de uso.

## API pública local

Com dependências instaladas e banco previamente migrado:

```bash
npm run start
```

Inicia somente a API em `http://127.0.0.1:3002`, sem servir o frontend e sem executar migrações, seed ou reset no boot. `CUIDACAO_DB_PATH` seleciona a mesma base configurada nos comandos de preparação; o padrão continua `data/cuidacao.sqlite`. O seed é opcional: uma base migrada vazia retorna lista vazia, sem fixtures. Fechar a aplicação fecha sua conexão.

Rotas implementadas:

- `GET /api/v1/occurrences?category=residuos&status=received&page=1&pageSize=20`
- `GET /api/v1/occurrences/CA-001`
- `GET /api/v1/occurrences/CA-001/history?page=1&pageSize=20`
- `POST /api/v1/occurrences` (sessão, campos D02)
- `PATCH /api/v1/occurrences/:id` (autor permitido, expectedVersion e changes)

Categorias/estados usam códigos do domínio. A listagem combina filtros com E, ordena por createdAt/id decrescentes e omite ocultos e duplicatas; `includeDuplicates=true` inclui duplicatas visíveis. Detalhe e histórico de ocultos ou inexistentes retornam 404. `includeHidden=true` exige sessão administrativa atual (401 ausente, 403 usuário comum); headers/campos que aleguem administração não autorizam. Sem a opção, admin recebe projeção pública.

Schemas rejeitam parâmetros desconhecidos/inválidos com 422. O detalhe expõe dados persistidos, contagens próprias de manifestações visíveis/ativas e flags derivadas de referências. Histórico expõe ação, data, username fictício e motivo público, sem snapshots nem eventos privados de denúncias. Falhas internas retornam 500 genérico com requestId gerado no servidor. Campos e envelopes estão descritos em apoio/documentacao/API.md.

A consulta carrega todas as páginas (100 registros por requisição) antes de atualizar mapa, lista e contagem juntos. Durante a carga ou erro não apresenta resultados parciais; vazio e erro são estados distintos, com tentativa manual novamente. Trocar filtros cancela e invalida respostas antigas. Detalhes e histórico consultam diretamente o ID, independentemente da listagem; fechar preserva filtros. Códigos são adaptados aos rótulos de DOMAIN, com datas em America/Sao_Paulo. Os detalhes consultam imagens pela API; legenda é texto literal e também texto alternativo. Anexos ocultos/retirados usam marcador sem conteúdo; ocorrência oculta impede leitura de seus arquivos.

## Autenticação local

Implementadas POST /api/v1/auth/register, POST /api/v1/auth/login, GET /api/v1/auth/me e POST /api/v1/auth/logout. Cadastro retorna 201 com id/username/role=user, sem iniciar sessão; login retorna 200 com dados públicos; logout retorna 204, revoga a sessão e limpa cookie inclusive sem sessão. Username é normalizado para minúsculas: 3–30 caracteres ASCII (letras, números, sublinhado); senha de 12–128 caracteres sem trim. Campos desconhecidos são rejeitados. Não informar e-mail ou dados pessoais reais.

Senhas usam scrypt assíncrono (N=131072, r=8, p=1, chave=64 bytes, salt=16 bytes, maxmem=256 MiB), com duas derivações simultâneas compartilhadas com seed. Sessão usa token aleatório de 32 bytes; banco guarda somente SHA-256 e expiração absoluta de 8h. Cookie cuidacao_session: HttpOnly, SameSite=Lax, Path=/, Max-Age=28800, sem Domain; Secure em HTTPS e exceção somente para HTTP local. Novo login substitui a sessão apresentada. Guardas requireSession/requireAdmin consultam a sessão e papel no banco, sem confiar em headers de identidade/papel. includeHidden exige papel administrativo confirmado no banco.

Configure a origem exata do navegador (sem barra final) no terminal da API:

```bash
# Neste computador, confirme o Node do processo:
export PATH="/home/higur/.local/n/bin:$PATH"
node -p 'process.version + " " + process.execPath' # v24.21.0
export CUIDACAO_WEB_ORIGIN="http://localhost:5173"
npm run start
# Outro terminal, também com Node 24:
npm run dev -- --host localhost --port 5173 --strictPort
```

Abra http://localhost:5173. Se preferir 127.0.0.1, configure CUIDACAO_WEB_ORIGIN=http://127.0.0.1:5173 e use --host 127.0.0.1 no Vite. Mudanças de porta exigem configurar a mesma origem na API. Padrão: http://localhost:5173. POSTs de auth exigem Origin exato; HTTP externo é recusado na configuração. Não há CORS irrestrito nem confiança em X-Forwarded-For. Login/cadastro exigem application/json; logout aceita corpo ausente ou {}.

Limites: cadastro, 5 tentativas/minuto por IP; login, 10 por IP+username normalizado, contando sucesso. Janela móvel de 60s na memória da instância, 429 com Retry-After. Contadores reiniciam com processo; sessões persistem no SQLite. Não há JWT ou autenticação em localStorage. Logs excluem corpos, cookies, tokens, URL/query e detalhes internos de erros. Token é transportado somente no cookie; corpo contém dados públicos da conta.

Formulários têm labels, mensagens em pt-BR, confirmação local da senha, estados de carregamento/erro/sucesso, foco e bloqueio de envio repetido. Cadastro encaminha para login com username preenchido. Senhas são limpas ao fechar/concluir, sem URL ou storage. Sessão é consultada após carregar, recuperar foco/visibilidade e a cada minuto visível. Expiração/encerramento pede nova entrada sem quebrar consulta pública nem reenviar formulário; texto fica somente na memória. Falha de autenticação não recorre a fixtures.

Não há migração nova nem reescrita da migração 001. Use db:migrate em base ainda não preparada; não faça seed/reset de base preenchida para testar autenticação.

Verificação atual da Etapa 2 pelo agente em Node 24.21.0: resultados completos em PLAN. As limitações anteriores de subprocessos/bind foram superadas executando as suítes fora do sandbox com autorização; nenhum teste foi ignorado ou substituído por mock.
## Verificar

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

O build é gerado em `dist`; servir frontend e API juntos continua pendente. `npm run preview` não configura o proxy da API. Os testes E2E iniciam Fastify/Vite em `127.0.0.1:3100/5180` para consulta e autenticação, `127.0.0.1:3101/5181` para criação, `127.0.0.1:3102/5182` para comentários/complementos `127.0.0.1:3103/5183` para apoio/contestação, `127.0.0.1:3104/5184` para transições e `127.0.0.1:3105/5185` para administração. Cada par usa banco exclusivo criado no diretório temporário do sistema e removido ao encerrar. Não reutilizam servidores existentes nem `CUIDACAO_DB_PATH`; o banco do desenvolvedor permanece intacto. Usam 105 registros para exercitar múltiplas páginas e bloqueiam os tiles externos. Chromium alternativo: `CUIDACAO_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`.

## Reproduzir a revisão em ambiente temporário (Bash)

Na raiz do projeto, com Node 24 e rede, copie o trabalho atual sem bancos ou credenciais. Estes comandos deixam a base existente intacta e não apagam a cópia temporária:

```bash
verification_dir="$(mktemp -d)"
tar --exclude='./.git' --exclude='./node_modules' --exclude='./dist' \
    --exclude='./data' --exclude='./backups' --exclude='./credentials' \
    --exclude='./test-results' --exclude='./playwright-report' --exclude='./CuidAcao' \
    --exclude='.env*' --exclude='*.sqlite*' --exclude='*.db*' \
    --exclude='*.credentials.json' -cf - . | tar -xf - -C "$verification_dir"
cd "$verification_dir"
node --version # Deve mostrar v24.x
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

O lockfile entregue está sincronizado; não é necessário resolvê-lo novamente antes de `npm ci`. Nesta entrega, o agente também verificou npm ci numa pasta temporária contendo apenas package.json/lockfile, importando SQLite e sharp no Node 24 sem substituir node_modules do projeto. `npm test` prepara bancos temporários, executa os comandos npm de migração/seed, compara os dados após reaplicação/recusa e verifica a API antes/depois de encerrar e iniciar outro processo HTTP. O teste de reinício também cadastra, autentica, cria, edita e envia imagem pelas rotas HTTP reais; compara registro, sessão, histórico, metadados e bytes da imagem após reiniciar o processo. Credenciais do teste ficam somente na memória; comparações de preservação usam digests para não imprimir hashes/salts em falhas.

Para a consulta manual nessa mesma cópia, sem usar a base de demonstração:

```bash
export CUIDACAO_DB_PATH="$verification_dir/data/consulta.sqlite"
npm run db:migrate
npm run db:seed # Credenciais exibidas apenas localmente; não redirecionar saída
npm run db:migrate # Deve preservar os dados
npm run db:seed # Deve falhar: base preenchida; não é um reset
npm run start
```

Em outro terminal, entre no diretório temporário indicado por `verification_dir` e execute `npm run dev`. Abra o endereço do Vite, consulte filtros e `/#ocorrencia=CA-001`. Para verificar reinício manual, pare a API com Ctrl+C e rode `npm run start` novamente no primeiro terminal, preservando `CUIDACAO_DB_PATH`. Os registros e histórico devem permanecer. Ao parar a API e atualizar a consulta, deve aparecer erro; reinicie a API e use Tentar novamente. A aprovação registrada refere-se aos comandos e testes automatizados informados pelo usuário; não registra execução adicional deste roteiro manual.

## Apresentação isolada — item 14

A base preparada neste checkout fica em `demo-data/`, separada da base de uso e dos testes. Contém oito ocorrências fictícias, nove imagens ilustrativas locais, três moradores e dois administradores independentes. Senhas aleatórias estão em `demo-data/current/credentials.json`, fora do versionamento.

Com Node.js 24:

```bash
# Somente em diretório demonstrativo vazio:
npm run demo:prepare
# A entrega já está preparada; para apresentar:
npm run demo:start
```

Abra http://127.0.0.1:5174. API local em 3001, Vite/proxy em 5174, uploads privados pela API; Ctrl+C para parar. Não execute seed na base de uso. Preparação recusa pasta preenchida. Para recuperar o cenário inicial, com a apresentação parada:

```bash
CUIDACAO_ENV=demo npm run demo:reset -- --confirm-demo-reset
npm run demo:backup
# Use o caminho de backup impresso e uma pasta dedicada vazia:
npm run demo:restore -- --backup CAMINHO_DO_BACKUP --target "$PWD/cuidacao-demo-recuperada"
```

Reset valida a cópia inicial e faz backup antes de substituir somente `current` da pasta identificada; restauração invalida sessões, preservando datas, histórico e arquivos. Não opera na base de uso. [DEMONSTRACAO.md](DEMONSTRACAO.md) contém contas, cenários, roteiro de cinco minutos, pastas alternativas, recuperação e consulta sem tiles. Preparação, recusa, reset, backup/restauração, instalação em diretório novo e leitura HTTP da cópia restaurada foram executados. Conferência final de 11/10/2026: 121/121 Node, build, 68/68 E2E desktop/mobile e git diff --check aprovados; 18 novas capturas desktop/360/390. Base de uso preservada; limites e resultados em PLAN.

## Criar e editar relatos fictícios

Depois de entrar, use Registrar ocorrência junto aos filtros. Consulte os registros existentes, escolha Resíduos ou Água, informe descrição e ponto pelo mapa ou coordenadas manuais. Título e referência local são opcionais. A área ilustrativa é latitude -23.9500 a -23.9250 e longitude -46.1950 a -46.1650; a API rejeita pontos externos. Não há GPS/geocodificador. Imagens opcionais são enviadas depois de salvar o relato.

A criação salva o registro em Recebida, com histórico e versão 1; cada imagem adicionada incrementa a versão. Sucesso abre os detalhes. O registro também aparece no mapa/lista; filtros incompatíveis são limpos com aviso explícito. Em detalhes, o autor pode editar somente quando received, visível, sem vínculo de duplicata e até 24h inclusive. Outro usuário/admin não pode usar esta rota para corrigir autoria alheia. A API decide permissões; estado/autor/datas são gerados pelo servidor. O formulário mostra erros, impede envio simultâneo e preserva rascunho em memória em caso de sessão perdida/conflito. Para conflito, carregue a versão atual, compare com seu rascunho e confirme a revisão antes de reenviar. Resposta de criação/edição inclui data e occurrenceVersion; detalhes do contrato em [API](API.md).

Se a conexão cair durante a escrita, consulte a lista antes de repetir: o servidor pode ter concluído o registro mesmo sem a resposta chegar ao navegador. Não há reenvio automático.

## Próximos passos

Dados, roteiro e recuperação da apresentação entregues no item 14. Material acadêmico e verificações em dispositivos físicos/leitores de tela permanecem pendentes; consulte [o plano](PLANO.md).

## Documentação normativa 1.0

- [Produto e escopo](PRODUTO.md)
- [Regras e permissões](DOMINIO.md)
- [Interface e fluxos](UX.md)
- [Arquitetura](ARQUITETURA.md)
- [Modelo de dados](MODELO_DADOS.md)
- [Contrato da API](API.md)
- [Critérios de aceitação](ACEITE.md)
- [Plano e verificação](PLANO.md)
- [Decisões desta revisão](DECISOES.md)
- [Instruções aos agentes](AGENTS.md)

---

CuidAção — cuidado com o território, participação da comunidade e acompanhamento dos problemas ambientais.

## Identidade cartográfica — 08/10/2026

Frontend evoluído com arte local, apresentação editorial em petróleo/areia e revelação por rolagem normal do Leaflet existente. A arte da abertura não representa geografia validada; o mapa interativo usa Esri World Imagery com créditos visíveis e mantém aviso de simulação. Sem CTA no hero, downloads de fontes ou bibliotecas novas. Fontes Noto Serif/Inter quando locais, com Georgia/system-ui como alternativas.

Acesso direto: `/#map`, `/#list-heading` e `/#ocorrencia=CA-001`. Links de salto levam foco ao destino sem atravessar animação; redução de movimento remove revelação animada e movimentos do mapa. Painel “O que merece atenção” mostra até quatro registros mais recentes dos filtros atuais; mapa/contagem incluem todos os registros da consulta paginada. “Consultar todas” expande a lista integral; recolhimento conserva contagem e mensagens de rede visíveis. Mobile usa sheet não modal no fluxo, com controles por teclado.

Popup contextual acrescenta local e trecho do relato. Detalhes separam relato, evidências, discussão e histórico; os recursos sem API são identificados como indisponíveis. Autenticação, filtros, hash, privacidade e ausência de fallback são preservados. Especificação em [FRONTEND_DESIGN](PROJETO_INTERFACE.md), evidências e bloqueios desta entrega em [PLAN](PLANO.md). Regressão automatizada de consulta e identidade visual incluída na verificação da Etapa 2 em PLAN. Revisão visual manual completa e fluxos futuros continuam pendentes.

## Imagens opcionais do relato original

No formulário, use Adicionar imagem, selecione JPEG, PNG ou WebP estático e informe legenda de 5–200 caracteres. Até cinco imagens ativas por ocorrência, cada uma até 5 MiB e 20 megapixels. O servidor verifica assinatura, decodifica todos os pixels e reencoda sem metadados; extensão e MIME do navegador não autorizam o arquivo. URLs, SVG, documentos e executáveis são recusados.

Primeiro o relato é salvo; depois cada imagem é enviada separadamente. Falha mostra “Registro salvo; anexo não enviado”, conserva seleções/legendas pendentes na memória e permite Enviar imagens pendentes ou Ver ocorrência salva. Arquivos já enviados não são reenviados. Perda de sessão pede entrada; conflito exige carregar e revisar o registro e imagens atuais antes de tentar novamente. Se a resposta se perder, confira as imagens antes de repetir. Recarregar/fechar a página descarta arquivos ainda não enviados; os dados confirmados permanecem salvos. O autor pode adicionar pela edição e retirar imagens nos detalhes, sujeito às mesmas regras de autoria/prazo/estado do relato.

Rotas adicionais implementadas:

- GET /api/v1/occurrences/:id/attachments (metadados paginados e occurrenceVersion).
- POST /api/v1/occurrences/:id/attachments (Origin/sessão/autor; multipart file, caption, expectedVersion).
- GET /api/v1/attachments/:id/file (binário, com verificação de visibilidade a cada leitura).
- DELETE /api/v1/attachments/:id (autor permitido, JSON expectedVersion; retirada auditada).

Arquivos ficam fora da pasta pública, por padrão em data/uploads/cuidacao.sqlite.files. Para outro banco, a pasta é uploads/<nome-do-banco>.files junto dele. CUIDACAO_UPLOAD_DIR permite substituir a pasta no processo npm run start: use diretório privado dedicado a essa base, nunca compartilhado por bancos distintos nem em public/dist. Preserve banco e pasta juntos ao reiniciar/copiar. Não há serviço de arquivos estáticos para uploads nem backup/reset automático. A estratégia de compensação e recuperação de arquivos está em [ARCHITECTURE](ARQUITETURA.md).

## Comentar e acrescentar complementos — item 6

Use npm run start e npm run dev com Node 24 e a origem descrita acima. Nos detalhes de uma ocorrência em Verificação comunitária, Confirmada ou Acompanhamento, use Comentar ou Acrescentar complemento. Entre com conta fictícia para publicar. Comentário: 1–2000 caracteres; complemento: 20–3000 e tipo Observação ou Informação de resolução. Texto é normalizado por trim. Resolução não encerra automaticamente o registro.

Para demonstração, o seed opcional em base vazia oferece CA-001 em Verificação comunitária e CA-003 em Acompanhamento. Ocorrências novas continuam Recebidas e não aceitam participação até triagem por administrador independente, entregue no item 8. Ocultas/duplicatas bloqueiam novas contribuições. Consulta é pública, inclusive após reload/reinício.

O autor pode editar a contribuição até 24h inclusive da sua criação, nos estados participativos e quando visível/sem duplicata. Tipo/autor/data original não mudam. Texto não tem botão ou DELETE de retirada: D05 exige solicitação/denúncia e moderação administrativa, entregues no item 9. Imagens opcionais pertencem somente a complementos; primeiro salva o complemento, depois envia cada imagem. Limites/armazenamento/remoção de metadados e recuperação de arquivos são os mesmos do item 5, com até cinco imagens não retiradas por complemento. Falha conserva complemento salvo e pendências, permite tentar sem criar outro; retirar imagem usa a janela/autoria do complemento.

Rotas implementadas: GET/POST /api/v1/occurrences/:id/contributions e PATCH /api/v1/contributions/:id. POST /api/v1/occurrences/:id/attachments aceita contributionId opcional de complemento já salvo da mesma ocorrência; a lista de anexos do relato mantém somente imagens originais. Imagens de complemento vêm na consulta de contribuições. Toda escrita exige expectedVersion atual e registra evento/incremento da versão do pai na mesma transação. Erros e contratos em API; verificação final em PLAN.

Execute npm test, npm run build e npm run test:e2e para a regressão completa. As suítes de API/reinício usam bancos temporários reais; E2E de participação usam terceiro par dedicado de portas 3102/5182. Sem novas dependências nem alteração da migração 001; não é necessário resetar ou fazer seed de uma base existente.

## Apoiar e contestar — item 7 original

Execute com Node 24: `npm run start` e, no outro terminal, `npm run dev`, usando a origem configurada acima. Consulte CA-001/CA-003 do seed opcional ou outra ocorrência participativa. Entre com conta fictícia diferente do autor; nos detalhes use Apoiar/Contestar e informe justificativa de 20–1000 caracteres. Sua posição pode ser alterada ou retirada enquanto o registro estiver em Verificação comunitária, Confirmada ou Acompanhamento, visível e sem duplicata. Não há prazo de 24h para manifestações. Nova ocorrência permanece Recebida até triagem por administrador independente, disponível no item 8.

Visitantes consultam posições públicas e contagens separadas, sem laudo técnico nem alteração automática de estado. Uma posição ativa por usuário/ocorrência; substituir/reativar mantém id, retirar conserva histórico. Ocultas não expõem justificativa/autor nem contam; posições de duplicatas não são somadas. Falha conserva justificativa na memória; sessão permite nova entrada e conflito exige consulta/comparação/confirmação da versão. Nada é reenviado automaticamente.

Rotas: GET /api/v1/occurrences/:id/stances, PUT e DELETE /api/v1/occurrences/:id/stance. PUT usa {expectedVersion,type:support/contest,reason}; DELETE {expectedVersion}. Escritas retornam `occurrenceVersion`, guardam evento/posição/versão na mesma transação. Esquema 001 reutilizado intacto, sem pacote novo ou reset.

Verificação: `npm test`, `npm run build`, `npx playwright install chromium`, `npm run test:e2e`. As quatro bases E2E são temporárias e isoladas; apoio/contestação usam 3103/5183 em desktop/mobile. Resultados reais em PLAN.

## Estados e acompanhamento — item 8 original

Use Node 24 e os mesmos comandos `npm run db:migrate`, `npm run start` e `npm run dev`/origem descritos acima. Nenhuma migração nova ou reset é necessário. Para demonstração em uma base vazia, `npm run db:seed` cria três usuários e dois administradores fictícios e imprime credenciais aleatórias localmente; não redirecione para o repositório. Em base já preenchida, preserve as contas/dados; cadastro público não cria administradores.

Entre como administrador diferente do autor e abra os detalhes. Mudar estado mostra apenas destinos da matriz e os requisitos atuais. Triagem exige revisão humana e motivo; confirmação exige suporte independente e parecer de toda contestação ativa visível; acompanhamento exige complemento de atualização; encerramento exige complemento de resolução e resolved; descarte exige invalid/out_of_scope e motivo. Motivos/pareceres têm 20–1000 caracteres. Não há quórum, salto de estados ou efeito automático de votos/resolução. Estado e histórico origem→destino/responsável/data/justificativa persistem após reload/reinício.

Para reabrir, uma conta publica Pedir reabertura em Encerrada/Descartada com fato novo de 20–3000 caracteres; texto imutável e no máximo um pedido pendente por usuário/ocorrência. Imagens opcionais seguem limites existentes e só podem ser alteradas pelo autor nas primeiras 24h enquanto pendente. Primeiro salva pedido, depois imagens; falha permite enviar pendências sem novo pedido. Admin independente referencia o pedido visível pendente e justifica retorno à Verificação comunitária; aceita selecionado e marca demais pendentes substituídos no mesmo commit. Nova confirmação é necessária. Rejeição justificada de pedidos foi entregue na área administrativa do item 9.

POST `/api/v1/occurrences/:id/transitions` recebe `{expectedVersion,to,reason,...requisitosDaAresta}` e retorna `{data,occurrenceVersion}`. Contratos completos em [API](API.md). Conta comum/visitante não transita; admin não decide ocorrência/contribuição própria; ocultos e duplicatas bloqueiam transições. Alteração/eventos/versão são atômicos. Conflito exige recarregar requisitos, comparar e confirmar versão; motivo/pareceres são conservados em memória. Resposta perdida exige consultar estado/histórico antes de repetir, sem retry automático.

Verificações executadas em Node 24.21.0: `npm test` 90/90, `npm run build` aprovado, `npx --no-install playwright install chromium` aprovado e `npm run test:e2e` 46/46 desktop/mobile. Quinto par temporário 3104/5184 isolado; credenciais aleatórias de testes ficam em arquivo privado no diretório temporário do sistema, removido ao encerrar. Nenhuma credencial/banco do desenvolvedor é usado ou resetado. Evidências, escopo e limites em [PLAN](PLANO.md).

## Área administrativa — item 9 original

Use Node.js 24, `npm run start` e `npm run dev`, com a mesma origem configurada acima. Entre com admin_demo_1 ou admin_demo_2, usando a senha aleatória que `npm run db:seed` mostrou no terminal ao preparar sua base vazia. Após entrar, use Administração na navegação ou `http://localhost:5173/#administracao`. Cadastro público sempre cria usuário comum; não há promoção de conta pelo cliente.

Se a base atual já tem dados, preserve-a e use as contas existentes. Senhas não são recuperáveis pela API. Para preparar outra demonstração sem apagar a atual, no terminal da API:

```bash
export PATH="/home/higur/.local/n/bin:$PATH"
admin_demo_dir="$(mktemp -d)"
export CUIDACAO_DB_PATH="$admin_demo_dir/cuidacao.sqlite"
export CUIDACAO_WEB_ORIGIN="http://localhost:5173"
npm run db:migrate
npm run db:seed # Credenciais aleatórias mostradas localmente; não redirecionar
npm run start
# Em outro terminal na raiz do projeto, com Node 24:
# npm run dev -- --host localhost --port 5173 --strictPort
```

Pare a API anterior antes de iniciar outra na mesma porta. Mantenha o caminho de CUIDACAO_DB_PATH para retomar esta base; reiniciar não migra/reset/recria dados. Imagens ficam na pasta privada associada ao banco. Seed recusa bases preenchidas.

Filas: Recebidas, Verificação, Todas as ocorrências, Denúncias pendentes e Pedidos de reabertura, com filtros e paginação. Revisão mostra conteúdo e imagens privados, estado/visibilidade separados e auditoria. Correção altera somente campos do relato com justificativa; preserva autoria/estado e bloqueia duplicata. Ocultar/restaurar exige motivo e administrador independente; pai oculto prevalece e imagem retirada não volta à consulta pública por restauração. Mudar estado reutiliza o ciclo do item 8. Rejeitar pedido exige motivo e permite novo pedido posterior com fato novo, sem transicionar estado.

Usuários podem denunciar os quatro tipos visíveis nos detalhes e consultar Minhas denúncias. Denúncia é privada e não oculta automaticamente. Administrador diferente do autor do conteúdo/ocorrência e do denunciante decide procedente (oculta) ou improcedente (mantém); decisões concorrentes sobre alvo já oculto continuam auditadas. Dados/arquivos não são excluídos fisicamente. Motivo/versão/eventos/mudanças têm o mesmo commit; conflito exige comparação explícita preservando rascunho.

Consulta privada usa `includeHidden=true` com sessão administrativa a cada rota, inclusive `/attachments/:id/file`; sem a opção a leitura permanece pública. Oculto/retirado/pai oculto não vaza em listas/detalhes/arquivos públicos. Rotas e projeções em [API](API.md). Gestão de duplicatas/relacionadas implementada no item 10 abaixo; reset/backup continuam pendentes.

Verifique com `npm test`, `npm run build`, `npx playwright install chromium`, `npm run test:e2e` e `git diff --check`. Sexto par E2E temporário 3105/5185, isolado das demais bases; nenhum banco/credencial do desenvolvedor é utilizado. Resultados reais em [PLAN](PLANO.md).

Verificação final do item 9 em Node 24.21.0: 101/101 Node, build, instalação Chromium, 52/52 E2E desktop/mobile e git diff --check aprovados. Sem falha final ou bloqueio; tentativas intermediárias e verificações manuais não executadas identificadas em PLAN.

## Duplicatas e relacionadas — item 10 original

Com Node.js 24, aplique `npm run db:migrate` à base atual antes de iniciar `npm run start`; migração 002 acrescenta índice sem recriar base nem reescrever 001. Inicie `npm run dev` no outro terminal e entre com admin_demo_1/admin_demo_2 usando as senhas locais do seed já preparado (não repetir seed em base preenchida).

Em Administração → Todas as ocorrências → Revisar ocorrência → Gestão de vínculos, consulte o identificador de destino, compare os dois registros e informe motivo. Duplicar exige mesmo fato/local/contexto temporal e principal mais antiga; relações são para fatos distintos. Para reorganizar, remova relações/desvincule filhos antes, conforme D07. A correção de destino exige desvincular e vincular novamente; cada ação é auditada. Nenhuma operação transfere relatos/imagens/contribuições ou soma contagens, nem muda estado automaticamente.

Detalhes públicos mostram relações, duplicatas e seu conteúdo visível identificado pela origem; cada link permite navegar ao registro próprio. Duplicata sai da consulta padrão, preserva URL/dados e bloqueia novas participações. Se a principal foi ocultada, mostra indisponibilidade sem dados do destino; admin pode revisar e desvincular. Criar/remover relações exige dois registros visíveis, não descartados e sem duplicata. Justificativa/seleção sobrevivem a falhas enquanto a página permanece aberta; conflito exige revisão explícita de ambas versões.

Verifique com `npm test`, `npm run build`, `npx playwright install chromium`, `npm run test:e2e` e `git diff --check`. Sétima base E2E isolada 3106/5186; testes não usam nem resetam a base existente. Evidências reais finais em [PLAN](PLANO.md). Reset/backup e apresentação completa continuam na Etapa 5.

Verificação final do item 10 em Node 24.21.0: 112/112 Node, build, Chromium, 56/56 E2E desktop/mobile e git diff --check aprovados. Zero falhas/skips finais e nenhum bloqueio; tentativas e limites em PLAN.

## Histórico e encerramento — item 11 original

Revisão integrada concluída sem recriar o histórico ou o serviço de transições. Nos detalhes de uma ocorrência encerrada, consulte o motivo, responsável e complemento visível usado como fundamento. Conteúdo oculto não é recuperado de snapshots. O histórico público e a auditoria administrativa têm páginas visuais de 20 eventos e abrem na página recente; use Eventos anteriores/Próximos eventos. A auditoria de denúncias continua privada. Encerramento/reabertura mantêm os requisitos e comandos do item 8 acima.

Com Node.js 24, execute `npm run db:migrate` para atualizar uma base existente, `npm run start` para a API e, em outro terminal, `npm run dev` para a interface. Na preparação desta revisão, as migrações 001/002 foram aplicadas à base padrão `data/cuidacao.sqlite`, que estava sem tabelas/registros; não foi executado seed nem reset. A base continua sem contas ou ocorrências. Cadastro público cria apenas usuário comum; a preparação local opcional de demonstração está documentada acima e não foi executada nesta etapa.

Verifique com `npm test`, `npm run build`, `npx playwright install chromium`, `npm run test:e2e` e `git diff --check`. Os testes usam bases temporárias, não a base de uso. Resultados finais, cobertura por requisito e limites estão em [PLAN](PLANO.md#item-11-original--revisão-integrada-de-histórico-e-encerramento).


Revisão de interface do item 12: `apoio/testes/ponta-a-ponta/revisao-interface.spec.js` acrescenta cobertura de SVG aplicado, 360/390px com CSS zoom a 200%, viewport de altura reduzida, rascunho/foco em diálogos aninhados e marcador por clique/toque. Cenários existentes também verificam retorno de foco após logout e repetição manual de leitura de duplicata após falha. Inspeção visual, medidas de contraste e limites de dispositivos/tiles estão separados dos resultados automatizados em [PLAN](PLANO.md). Não foram criadas dependências ou alterações de banco nesta revisão.

O roteiro do item 13 — validação integrada, com base/anexos isolados, contas fictícias geradas localmente, ciclo completo e reinício sem seed/reset, está em [apoio/documentacao/VALIDACAO.md](VALIDACAO.md). Evidências atuais e limites estão em ACEITE.md e PLANO.md.

## Cadastro e login com Google

O botão Continuar com Google preserva o login por usuário/senha. No primeiro acesso, escolha um username disponível (3–30 caracteres, letras sem acentos, números ou `_`). A conta nasce como usuário comum, sem senha local. A identidade é reconhecida pelo `sub` Google; e-mail coincidente não vincula contas. Para usar uma conta local existente, entre com sua senha. Vinculação entre contas não está implementada.

O fluxo usa o botão oficial Google Identity Services em popup e verifica o ID token no servidor com `google-auth-library` 11.2.0. Não solicita Gmail/Drive, não persiste tokens Google e não necessita de client secret. Nonce, cookie HttpOnly, contexto de origem e desafio descartável protegem o fluxo. State de redirect e PKCE não se aplicam a este fluxo sem código de autorização. Consulte a [validação oficial](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) e a [configuração do cliente](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

### Configurar no Google Cloud

1. Crie/selecione um projeto no Google Cloud Console → Google Auth Platform. Configure Branding (nome, e-mail de suporte e contatos), Audience e Data Access para autenticação básica (`openid`, `email`, `profile`), sem escopos de outros serviços. Se o projeto estiver em Testing, inclua as contas de teste autorizadas conforme a configuração do Console.
2. Em Clients, crie um cliente OAuth do tipo Web application. Em Authorized JavaScript origins, adicione `http://localhost` e `http://localhost:5173` para os comandos abaixo. Origem não inclui caminho nem `/` final. Use exatamente esse hostname/porta no navegador. Para outra porta, cadastre também sua origem exata.
3. Authorized redirect URIs não são necessários: este fluxo usa popup e callback JavaScript, não redirect OAuth. O envio local é `POST http://localhost:5173/api/v1/auth/google/verify` via proxy, não uma URL de redirecionamento a cadastrar no Google. Para futura hospedagem, cadastre a origem HTTPS real (por exemplo `https://cuidacao.seudominio.com.br`); o POST será nessa mesma origem em `/api/v1/auth/google/verify`. Substitua o exemplo pelo domínio efetivo, configure branding/domínios verificados e eventuais requisitos de publicação do Google. Hospedagem não foi implementada/verificada nesta entrega.
4. Copie o Client ID (`…apps.googleusercontent.com`). Configure `CUIDACAO_GOOGLE_CLIENT_ID` somente no ambiente do servidor. `CUIDACAO_WEB_ORIGIN` deve coincidir com a origem pública da interface. Não configure client secret: ele não é utilizado. Não inclua credenciais em arquivos versionados ou variáveis `VITE_*`.

### Atualizar e iniciar, preservando a base

Pare a API antes da migração. Use Node.js 24 e as dependências do lockfile (`npm ci` em uma instalação nova). Na raiz do projeto, para a base padrão existente:

```bash
export PATH="/home/higur/.local/n/bin:$PATH" # caminho desta máquina; em outra, use seu Node 24
npm run db:migrate # inclui 003; sem seed, reset ou exclusão de registros
export CUIDACAO_WEB_ORIGIN="http://localhost:5173"
export CUIDACAO_GOOGLE_CLIENT_ID="SEU_CLIENT_ID.apps.googleusercontent.com"
npm run start
```

Em outro terminal, na mesma raiz e com Node 24:

```bash
npm run dev -- --host localhost --port 5173 --strictPort
```

Abra http://localhost:5173. Para outra base, informe seu `CUIDACAO_DB_PATH` tanto na migração quanto na API; preserve o diretório de anexos associado. A migração 003 mantém usuários, senhas locais, sessões e ocorrências. A inicialização não aplica migrações automaticamente. Variáveis podem ficar em um `.env` local ignorado, mas `npm run start` não o carrega automaticamente: exporte-as no terminal ou use `node --env-file=.env servidor/linha-comando/indice.js start` com Node 24. Reinicie a API após alterar configuração.

A apresentação existente usa origem fixa `http://127.0.0.1:5174`; o supervisor `demo:start` não oferece troca de hostname/porta. Para testar Google com a origem localhost documentada acima, use `npm run start`/`npm run dev` e uma base separada. Não execute seed/reset na base de uso. Restaurar um snapshot antigo pode restaurar também seu esquema antigo; aplique novamente as migrações pendentes antes de ativar Google.

Sem Client ID válido ou sem migração 003, o botão informa indisponibilidade; cadastro, login e logout locais continuam disponíveis. Falha de SDK/rede permite tentar novamente; fechar/cancelar o popup mantém o formulário. Tokens/códigos/segredos não devem ser copiados para logs ou chamados de suporte.

### Testar

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
git diff --check
```

Os testes Google usam respostas/certificados controlados e tokens RSA assinados, mantendo a validação real de assinatura, emissor, destinatário, validade e nonce. E2E substitui o SDK externo somente no ambiente de teste. Incluem primeiro acesso, acesso recorrente, colisão, sessões/logout, permissões, concorrência, rollback e reinício de processos HTTP. Login real Google não verificado: é necessário configurar o cliente acima, entrar com uma conta autorizada, escolher username, sair e entrar novamente; confirme que é a mesma conta local e que o login por senha continua funcional. As bases de uso/apresentação não foram migradas nesta integração; a atualização explícita acima permanece necessária.

Verificação desta integração em Node 24.21.0: 133/133 testes Node, build e 74/74 E2E desktop/mobile aprovados, Chromium e `git diff --check` aprovados. São testes Google controlados; acesso real depende da configuração acima e permanece não verificado. Resultados e tentativas em PLANO.md.
