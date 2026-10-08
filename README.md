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

Abra o endereço exibido pelo Vite (normalmente http://localhost:5173). O fundo cartográfico exige internet; se falhar, use a lista. O repositório é público no GitHub; não são necessárias credenciais para clonar.

## Verificar

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run preview` permite testar o build local. Os testes de navegador bloqueiam os tiles externos para verificar a alternativa pela lista de forma reproduzível.

## Próximos passos

1. Completar os cenários de navegação pendentes.
2. Implementar API, banco, cadastro, sessão e criação com histórico transacional.
3. Implementar participação e evidências.
4. Implementar administração, transições, duplicatas e moderação.
5. Verificar o roteiro completo e preparar a apresentação.

A especificação 1.0 fecha as regras da versão demonstrativa. Backend planejado: Node 24, Fastify e SQLite; ainda não instalado. Categorias desta versão: Resíduos e Água. Área cartográfica aproximada, explicitamente simulada. Consulte [o plano](docs/PLAN.md) para distinguir entregas e pendências.

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

