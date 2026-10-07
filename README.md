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

Esta lista apresenta o escopo geral. Regras detalhadas de estados, validação, permissões e resolução serão registradas na documentação de domínio antes da implementação dessas funcionalidades.

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

**Primeira fatia implementada:** mapa → visualizar ocorrência → abrir detalhes. Inclui lista, filtros, navegação por URL e dados fictícios. Cadastro, criação, participação e administração serão implementados nas próximas fatias.

Stack inicial: JavaScript com módulos ES, Vite e Leaflet. Requer Node.js 22.12+ ou 24 LTS e npm.

## Executar localmente

```bash
git clone https://github.com/IGORtss/CuidAcao.git
cd CuidAcao
npm ci
npm run dev
```

Abra o endereço exibido pelo Vite (normalmente http://localhost:5173). O fundo cartográfico exige internet; se falhar, use a lista. O repositório é privado: o clone exige autenticação de uma conta com acesso.

## Verificar

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run preview` permite testar o build local. Os testes de navegador bloqueiam os tiles externos para verificar a alternativa pela lista de forma reproduzível.

## Próximos passos

1. Criar `AGENTS.md` com as instruções de trabalho para os agentes.
2. Consolidar objetivo, público, escopo e limites em `docs/PRODUCT.md`.
3. Registrar as regras de ocorrências e participação em `docs/DOMAIN.md`.
4. Documentar páginas e fluxos em `docs/UX.md`.
5. Formalizar a arquitetura e a stack em `docs/ARCHITECTURE.md`.
6. Organizar etapas e critérios de verificação em `docs/PLAN.md`.
7. Implementar a primeira fatia funcional: **mapa → visualizar ocorrência → abrir detalhes**.

Os sete passos acima foram executados nesta entrega. Consulte [o plano](docs/PLAN.md) para as próximas fatias e [as instruções aos agentes](AGENTS.md) antes de editar.

## Documentação

- [Produto](docs/PRODUCT.md)
- [Domínio](docs/DOMAIN.md)
- [Interface](docs/UX.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Plano e verificação](docs/PLAN.md)

---

**CuidAção — cuidado com o território, participação da comunidade e acompanhamento dos problemas ambientais.**

