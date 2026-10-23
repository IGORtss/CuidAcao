# CuidAção

O **CuidAção** é uma ferramenta para organizar, visualizar e acompanhar problemas ambientais. Com foco inicial no bairro Perequê, em Guarujá (SP), reúne ocorrências em um mapa interativo para facilitar a consulta de informações sobre o território e suas atualizações.

A proposta é manter os registros acessíveis e organizados ao longo do tempo. Em vez de mostrar apenas onde um problema foi relatado, o CuidAção permite consultar sua descrição, as contribuições recebidas e o histórico de acompanhamento.

## Sobre o projeto

Situações como descarte irregular de resíduos e alterações observadas na água podem persistir, mudar ou receber novos relatos. O CuidAção organiza essas informações por localização, categoria e estado, sem tratar um relato como comprovação técnica.

A participação dos moradores faz parte desse processo: usuários cadastrados podem registrar ocorrências e, conforme as regras de cada estado, acrescentar observações, comentários e manifestações de apoio ou contestação. O histórico preserva as atualizações, permitindo entender o que mudou em cada registro.

## Como funciona

O mapa interativo é o principal meio de explorar as ocorrências. Também é possível consultar registros em lista, usar filtros e abrir uma ficha com localização, descrição, imagens disponíveis, estado e histórico.

A ferramenta permite:

- **Registrar ocorrências:** informar o problema observado, sua localização e, opcionalmente, anexar imagens.
- **Consultar o território:** localizar registros no mapa ou na lista e filtrar por categoria e estado.
- **Complementar informações:** adicionar observações e comentários, além de apoiar ou contestar registros quando permitido.
- **Acompanhar mudanças:** consultar estados, atualizações e o histórico de cada ocorrência.
- **Relacionar registros:** identificar ocorrências relacionadas e duplicadas sem perder o histórico original.

O CuidAção organiza relatos e contribuições; não substitui análises ambientais especializadas nem serviços oficiais de atendimento.

## Estado do projeto

O projeto possui um protótipo funcional para demonstração, desenvolvido inicialmente no contexto de um Trabalho de Conclusão de Curso. As contas, ocorrências e imagens demonstrativas são fictícias: não representam denúncias reais, laudos, medições ambientais oficiais ou limites cartográficos oficiais.

## Funcionamento técnico

O CuidAção separa a interface, a API e a persistência de dados. A interface apresenta as informações; o servidor valida as operações e aplica as regras do sistema; o banco armazena os registros e seu histórico.

### Interface e fluxo de dados

O frontend utiliza HTML, CSS, módulos JavaScript e Vite. O mapa é exibido com Leaflet. Ao consultar ou criar uma ocorrência, a interface envia uma requisição HTTP à API; o servidor valida a solicitação, consulta ou altera os dados e devolve uma resposta em JSON. A interface então atualiza o mapa, a lista ou os detalhes apresentados.

### Banco de dados

O banco principal é o **SQLite**, acessado pelo servidor com `better-sqlite3`. Ele funciona localmente, sem exigir um serviço de banco separado. As tabelas armazenam usuários, sessões, ocorrências, contribuições, manifestações, anexos, relações entre registros, denúncias e eventos de histórico. Também há dados de acompanhamento e consultas salvas.

As operações utilizam transações, chaves estrangeiras e consultas parametrizadas para preservar a consistência dos registros. O histórico de eventos guarda as mudanças relevantes; o controle de versões ajuda a detectar alterações concorrentes. Migrações SQL numeradas atualizam o esquema sem recriar a base a cada execução.

O arquivo padrão fica em `data/cuidacao.sqlite`. As imagens são mantidas em armazenamento privado local, com metadados e referências no banco, e são disponibilizadas por rotas que verificam as permissões.

### API e regras de acesso

O backend utiliza **Node.js 24** e **Fastify 5**. A API segue o prefixo `/api/v1`, recebe e devolve dados em JSON nas operações usuais e valida os dados antes de gravá-los. Exemplos de rotas:

| Método | Rota | Função |
| --- | --- | --- |
| `GET` | `/api/v1/occurrences` | Listar e filtrar ocorrências |
| `GET` | `/api/v1/occurrences/:id` | Consultar os detalhes de um registro |
| `POST` | `/api/v1/occurrences` | Criar uma ocorrência autenticada |
| `GET` | `/api/v1/occurrences/:id/history` | Consultar o histórico público |
| `POST` | `/api/v1/auth/login` | Iniciar sessão |
| `GET` | `/api/v1/auth/me` | Consultar a sessão atual |

A consulta pública não exige conta, mas ações de participação e criação dependem de autenticação. Revisões, moderação e mudanças administrativas seguem permissões próprias. As senhas são armazenadas como hashes e as sessões usam cookies `HttpOnly`, com tokens verificados pelo servidor. As regras de autoria, estado e visibilidade são aplicadas no backend, não apenas na interface.

### Organização do código

- `codigo-fonte/aplicacao/` e `codigo-fonte/funcionalidades/`: composição da interface e funcionalidades como o mapa.
- `codigo-fonte/servicos/` e `codigo-fonte/estilos/`: comunicação com serviços e estilos.
- `servidor/http/`: requisições e rotas da API.
- `servidor/dominio/`: regras de funcionamento e permissões.
- `servidor/dados/`: persistência e acesso ao banco.
- `servidor/linha-comando/`: operações locais de manutenção.

Para mais detalhes, consulte [Arquitetura](apoio/documentacao/ARQUITETURA.md), [API](apoio/documentacao/API.md) e [Modelo de dados](apoio/documentacao/MODELO_DADOS.md).

## Por onde começar

O projeto está organizado por camadas e responsabilidades. Abra primeiro [apoio/documentacao/ESTRUTURA.md](apoio/documentacao/ESTRUTURA.md): ele mostra o fluxo entre interface, API, domínio, banco, testes e dados locais.

- `codigo-fonte/aplicacao/` monta a aplicação; `codigo-fonte/funcionalidades/` agrupa interface e mapa.
- `codigo-fonte/servicos/` concentra integrações; `codigo-fonte/estilos/` preserva a cascata visual.
- `servidor/http/`, `servidor/dominio/`, `servidor/dados/` e `servidor/linha-comando/` separam as camadas do servidor.
- `index.html` inicia a página.
- `apoio/testes/` contém somente testes, servidores auxiliares e dados antigos usados pelos testes.
- `apoio/documentacao/` contém regras, decisões, histórico e instruções detalhadas.
- `apoio/` reúne tudo que auxilia desenvolvimento e apresentação, mas não entra no runtime principal.
- `configuracao/` contém somente a configuração das ferramentas.

O checkout histórico em `archive/legacy-CuidAcao/` foi preservado, mas não participa dos scripts nem do runtime. A pasta principal é `/home/higur/CuidAcao`.

## Executar o projeto

Requer Node.js 24 e npm.

```bash
npm ci
npm run db:migrate
# Somente em uma base vazia, se quiser os dados fictícios iniciais:
npm run db:seed
```

Depois, mantenha dois terminais abertos:

```bash
# Terminal 1: API em http://127.0.0.1:3002
npm run start

# Terminal 2: site, normalmente em http://localhost:5173
npm run dev
```

Para testar a ponte Firebase Auth localmente, inicie a Emulator Suite e use `npm run start:firebase` no lugar de `npm run start`. Antes, aplique a migração aditiva com `npm run db:migrate`.

O banco padrão fica em `data/cuidacao.sqlite`. Os comandos de início não apagam nem preenchem o banco automaticamente. O fundo do mapa precisa de internet; se ele falhar, a consulta pela lista continua funcionando. Quando `.env.local` contém a configuração pública completa, o frontend também inicializa Firebase App e Analytics conforme [apoio/documentacao/FIREBASE.md](apoio/documentacao/FIREBASE.md).

## Executar demonstração

Para criar uma demonstração isolada, sem alterar o banco de uso:

```bash
npm run demo:prepare
npm run demo:start
```

Abra `http://127.0.0.1:5174`. O roteiro, as contas fictícias e os procedimentos de backup e restauração estão em [apoio/documentacao/DEMONSTRACAO.md](apoio/documentacao/DEMONSTRACAO.md).

## Verificar alterações

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
git diff --check
```

Os testes usam bancos temporários e não devem resetar o banco de uso. A autenticação Google é opcional e exige configuração externa; veja [apoio/documentacao/EXECUCAO.md](apoio/documentacao/EXECUCAO.md#cadastro-e-login-com-google). O login real do Google não faz parte da verificação automatizada.

## Documentação detalhada

- [Estrutura](apoio/documentacao/ESTRUTURA.md): mapa simples dos arquivos atuais.
- [Produto](apoio/documentacao/PRODUTO.md): objetivo e escopo.
- [Domínio](apoio/documentacao/DOMINIO.md): regras de comportamento e permissões.
- [Interface](apoio/documentacao/UX.md): telas, fluxos e acessibilidade.
- [API](apoio/documentacao/API.md): rotas HTTP e respostas.
- [Modelo de dados](apoio/documentacao/MODELO_DADOS.md): tabelas e histórico.
- [Arquitetura](apoio/documentacao/ARQUITETURA.md): decisões técnicas.
- [Critérios de aceitação](apoio/documentacao/ACEITE.md): comportamentos que precisam funcionar.
- [Plano e evidências](apoio/documentacao/PLANO.md): o que foi implementado e verificado.
- [Execução detalhada](apoio/documentacao/EXECUCAO.md): referência operacional completa preservada do README anterior.
- [Preparação Firebase](apoio/documentacao/FIREBASE.md): fronteira atual, segurança e migração gradual futura.

## Cadastro e acesso

Abra o perfil sobre o mapa para criar conta com apelido público único e senha de 8–128 caracteres. Confirme a senha e, após o cadastro, entre com o apelido e a senha. A sessão persiste por oito horas em cookie HttpOnly; perfil, ocorrências e logout continuam integrados. Google e e-mail foram retirados da interface por solicitação do usuário. Dados e contas anteriores são preservados.

Execute `npm run db:migrate` antes de iniciar uma instalação ainda não atualizada. O checkout não contém projeto Android/Gradle/Capacitor; o fluxo utiliza o layout web responsivo existente.
