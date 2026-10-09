# CuidAção

Plataforma de monitoramento ambiental comunitário do bairro Perequê, em Guarujá (SP), desenvolvida como Trabalho de Conclusão de Curso (TCC).

## Sobre o projeto

O CuidAção propõe um espaço digital para moradores registrarem, visualizarem e acompanharem problemas ambientais do bairro. Um mapa interativo reúne ocorrências, enquanto os registros permitem compartilhar evidências e organizar contribuições da comunidade sobre cada problema.

O projeto amplia uma proposta inicial voltada ao descarte de resíduos e à localização de pontos de coleta. Seu recorte atual inclui problemas ambientais do território, como descarte inadequado de lixo e relatos de possível contaminação da água do mar. Relatos comunitários não equivalem a uma medição técnica ou a um laudo ambiental.

## Objetivo

Facilitar a visão geral dos problemas ambientais do Perequê e demonstrar como uma plataforma pode organizar registros, participação comunitária, acompanhamento e histórico de ocorrências.

## Contexto acadêmico

O sistema será desenvolvido como uma **simulação funcional de uma plataforma real**, destinada à apresentação do TCC. As funcionalidades previstas serão demonstradas nesse contexto; o projeto não está sendo preparado para lançamento como serviço público.

Dados fictícios utilizados na demonstração deverão ser identificados como simulados.

## Público e território

- **Público-alvo:** moradores do Perequê interessados em acompanhar a situação ambiental do bairro.
- **Área de abrangência:** bairro Perequê, Guarujá (SP).
- **Tema:** monitoramento ambiental comunitário.

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

Esta lista apresenta o escopo geral. Regras de estados, validação, permissões e resolução estão definidas na especificação 1.0 em docs/DOMAIN.md. A implementação continua dividida em etapas; documentação pronta não significa funcionalidade pronta.

## Nova direção visual do frontend (08/10/2026)

A entrada do CuidAção terá **cartografia artística abstrata** como protagonista, tipografia editorial e composição assimétrica. A **V6 foi aprovada como referência visual**; o botão “Explorar o mapa” foi retirado porque a rolagem natural da página fará a passagem à exploração.

A experiência planejada usa transição da ilustração para o **mapa Leaflet real**, um painel comunitário compacto/expansível com registros em destaque, detalhes que preservam contexto cartográfico e navegação móvel acessível. Nada disso transforma cartografia ilustrativa ou registros de exemplo em informação geográfica validada. **O código neste repositório ainda precisa implementar o redesenho.**

- [Especificação detalhada do frontend](docs/FRONTEND_DESIGN.md) — decisões aprovadas, telas em estudo, restrições técnicas e critérios FE.
- [Figma editável](https://www.figma.com/design/I2Qk0iFboOAnJ5oENX5DNu) — apresentação V6 e estudos estáticos da transição/mapa.
- [Plano por etapas](docs/PLAN.md) — separa documentação, protótipo no Figma e implementação futura.

## Desenvolvimento com agentes de IA

Agentes como o Codex apoiarão a documentação, implementação e revisão do projeto. O desenvolvimento seguirá etapas pequenas e verificáveis, com regras explícitas para reduzir inconsistências e funcionalidades sem relação com o objetivo do TCC.

Diretrizes:

- Implementar com base na documentação do projeto.
- Distinguir decisões confirmadas de propostas técnicas.
- Evitar funcionalidades, dados e regras de negócio inventados.
- Priorizar os fluxos essenciais antes do acabamento visual.
- Verificar o comportamento entregue em cada etapa.
- Manter uma interface clara, adequada ao território e ao público do projeto.

## Estado atual — etapa de persistência

Consulta conectada à API, cadastro/login/logout, criação e edição do autor, sessões persistentes e histórico transacional implementados na branch de persistência. Categorias: Resíduos e Água. Registros criados são sempre simulados e começam em Recebida. Autor pode editar nas primeiras 24 horas, enquanto o registro estiver em Recebida. Permissões, coordenadas e versões são verificadas no servidor.

Participação, imagens, transições administrativas, denúncias e vínculos ainda são etapas futuras. O seed inclui contribuições e decisões fictícias coerentes para consulta; isso não significa que suas rotas de escrita foram implementadas. O frontend recebeu apenas controles funcionais de conta e formulário nesta entrega.

Requer **Node.js 24** e npm. Backend: Fastify 5 + SQLite/better-sqlite3. Banco local em `data/cuidacao.sqlite`, ignorado pelo Git. Não copie essa pasta para `public/` ou `dist/`.

## Executar a demonstração local

Na pasta do projeto:

```bash
npm ci
npm run db:migrate
npm run db:seed
npm run build
npm start
```

Abra **http://127.0.0.1:3000**. O seed funciona somente em base vazia e imprime cinco contas fictícias com senhas aleatórias (três usuários, dois administradores). Guarde as credenciais localmente; nunca as envie ao Git. Cadastro de novas contas também funciona; não use dados pessoais ou senhas reais.

Em execuções posteriores, use `npm start`; **não execute o seed novamente**. Fechar o servidor não apaga contas, sessões, registros ou histórico. Sessões expiram em oito horas. Ctrl+C encerra o servidor.

O fundo cartográfico exige internet; sua falha preserva lista e formulário com coordenadas manuais. A área exibida é aproximada e não delimita oficialmente o Perequê. Falha da API exibe erro e opção de repetir; não substitui dados por fixtures.

## Desenvolvimento em dois terminais

Terminal da API:

```bash
CUIDACAO_ORIGIN=http://127.0.0.1:5173 npm run dev:api
```

Terminal da interface:

```bash
npm run dev -- --host 127.0.0.1
```

Abra exatamente **http://127.0.0.1:5173**. A origem precisa coincidir com `CUIDACAO_ORIGIN`; não alterne para localhost. Vite encaminha `/api` ao servidor em 3000. `npm run preview` sozinho testa apenas o frontend e não oferece API funcional.

Variáveis opcionais: `PORT` (padrão 3000), `CUIDACAO_ORIGIN` (origem exata sem caminho), `CUIDACAO_DB_PATH` (banco dedicado). HTTP é permitido somente em origem local; não há deploy nesta etapa.

## Verificar

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes usam bancos temporários próprios, não a sua base demonstrativa. O E2E inicia API e Vite; deixe portas 3000 e 5173 livres. Tiles externos são bloqueados para testar a alternativa pela lista. Se um Chromium já estiver disponível no ambiente, `CUIDACAO_CHROMIUM_PATH=/caminho/do/chromium npm run test:e2e` permite utilizá-lo.

Os resultados realmente executados e limites constam em [PLAN](docs/PLAN.md) e [ACCEPTANCE](docs/ACCEPTANCE.md).

## Próximos passos

1. Comentários, complementos e manifestações de apoio/contestação.
2. Imagens com validação, legenda e recuperação de falha de upload.
3. Administração, transições, reabertura, denúncias, duplicatas e relacionadas.
4. Roteiro completo, backup/reset seguro e preparação acadêmica.

## Documentação normativa 1.0

- [Produto e escopo](docs/PRODUCT.md)
- [Regras e permissões](docs/DOMAIN.md)
- [Interface e fluxos](docs/UX.md)
- [Direção visual do frontend 1.1](docs/FRONTEND_DESIGN.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Modelo de dados](docs/DATA_MODEL.md)
- [Contrato da API](docs/API.md)
- [Critérios de aceitação](docs/ACCEPTANCE.md)
- [Plano e verificação](docs/PLAN.md)
- [Decisões desta revisão](docs/DECISIONS.md)
- [Instruções aos agentes](AGENTS.md)

---

**CuidAção — cuidado com o território, participação da comunidade e acompanhamento dos problemas ambientais.**

