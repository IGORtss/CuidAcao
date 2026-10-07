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

**Preparação do projeto.** O repositório está na etapa inicial de documentação; ainda não há uma aplicação disponível para execução.

A stack, a estrutura técnica e os comandos de instalação serão documentados quando forem definidos e implementados.

## Próximos passos

1. Criar `AGENTS.md` com as instruções de trabalho para os agentes.
2. Consolidar objetivo, público, escopo e limites em `docs/PRODUCT.md`.
3. Registrar as regras de ocorrências e participação em `docs/DOMAIN.md`.
4. Documentar páginas e fluxos em `docs/UX.md`.
5. Formalizar a arquitetura e a stack em `docs/ARCHITECTURE.md`.
6. Organizar etapas e critérios de verificação em `docs/PLAN.md`.
7. Implementar a primeira fatia funcional: **mapa → visualizar ocorrência → abrir detalhes**.

Os caminhos acima representam a estrutura planejada; os documentos ainda serão criados.

---

**CuidAção — cuidado com o território, participação da comunidade e acompanhamento dos problemas ambientais.**
