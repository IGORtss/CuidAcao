# CuidAção

O CuidAção é uma simulação acadêmica de uma plataforma comunitária para registrar e acompanhar problemas ambientais do Perequê, Guarujá. As contas, ocorrências e imagens da demonstração são fictícias. Os registros não são denúncias reais, laudos ou limites cartográficos oficiais.

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

## Apresentação do TCC

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
