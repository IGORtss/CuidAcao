# Estrutura do CuidAção

A organização separa a aplicação por camada e responsabilidade, sem alterar os contratos de produto. Os arquivos grandes preservados nesta etapa continuam seccionados internamente; novas funcionalidades devem entrar no diretório da camada correspondente, sem voltar a concentrar tudo em um único arquivo.

## Raiz e configuração

| Caminho | Responsabilidade |
| --- | --- |
| `index.html` | Documento mínimo e entrada `codigo-fonte/aplicacao/principal.js` |
| `package.json` | Comandos públicos, Node 24 e dependências |
| `configuracao/vite.configuracao.js` | Servidor web, proxy da API e bloqueio de arquivos privados |
| `configuracao/playwright.configuracao.js` | Projetos E2E e processos isolados |
| `.env.example` | Nomes das variáveis públicas opcionais; não contém credenciais |

## Frontend

| Caminho | Responsabilidade |
| --- | --- |
| `codigo-fonte/aplicacao/principal.js` | Orquestra navegação, consulta, filtros, detalhes e mapa |
| `codigo-fonte/aplicacao/estrutura.js` | Estrutura visual permanente e pontos de montagem |
| `codigo-fonte/funcionalidades/interface/indice.js` | Fluxos visuais existentes: conta, ocorrências, participação e administração |
| `codigo-fonte/funcionalidades/mapa/indice.js` | Leaflet, seletor de coordenadas e apresentação editorial |
| `codigo-fonte/servicos/api.js` | Cliente da API CuidAção e validação das projeções públicas |
| `codigo-fonte/funcionalidades/central/indice.js` | Central do CuidAção: feed de publicações e página dedicada da ocorrência |
| `codigo-fonte/estilos/central.css` | Cartões do feed e página da publicação, desktop e celular |
| `codigo-fonte/servicos/firebase/configuracao.js` | Valida configuração pública futura; não inicializa Firebase |
| `codigo-fonte/estilos/base.css` | Tokens, base, formulários e estilos funcionais existentes |
| `codigo-fonte/estilos/cartografia.css` | Camada final da composição cartográfica e reflow |
| `codigo-fonte/recursos/` | Ícones e recursos visuais preservados |

## Backend

| Caminho | Responsabilidade |
| --- | --- |
| `servidor/http/aplicacao.js` | Schemas, rotas, guardas HTTP e criação do Fastify |
| `servidor/dominio/indice.js` | Validação, permissões, serviços e auditoria transacional |
| `servidor/dados/banco-de-dados.js` | Conexão SQLite, migrações, repositórios e armazenamento privado |
| `servidor/linha-comando/indice.js` | Migração, seed, API e operações da demonstração |

As fronteiras são unidirecionais: HTTP chama domínio; domínio usa dados; dados não importam HTTP nem apresentação. O frontend acessa dados somente pela API.

## Testes

- `apoio/testes/api/`: rotas, permissões, atomicidade e reinício HTTP.
- `apoio/testes/banco-de-dados/`: migrações, persistência, CLI e operação demonstrativa.
- `apoio/testes/servicos/`: clientes e configurações do frontend.
- `apoio/testes/ponta-a-ponta/`: comportamento real no Chromium em projetos isolados.
- `apoio/testes/auxiliares/`: infraestrutura controlada de Google e leitura HTTP.
- `apoio/testes/dados-teste/`: dados explícitos usados apenas em testes.

## Dados e artefatos fora do código

- `data/`, `demo-data/`, `extras/private/` e links `cuidacao-demo*`: dados locais privados, ignorados e intocados pela reorganização.
- `node_modules/`, `dist/` e `test-results/`: dependências e artefatos gerados.
- `archive/legacy-CuidAcao/`: checkout histórico preexistente, fora do runtime e preservado até decisão de arquivamento.

## Caminho de uma escrita

1. `codigo-fonte/funcionalidades/interface/indice.js` recolhe os dados do formulário.
2. `codigo-fonte/servicos/api.js` envia a requisição.
3. `servidor/http/aplicacao.js` valida formato, origem e sessão.
4. `servidor/dominio/indice.js` verifica regras, permissões e versão.
5. `servidor/dados/banco-de-dados.js` persiste a mutação e seu evento na mesma transação.
6. `codigo-fonte/aplicacao/principal.js` atualiza a projeção visual.

Firebase não participa deste fluxo hoje. A migração planejada está em [FIREBASE.md](FIREBASE.md).
