# Instruções para agentes — CuidAção

Antes de editar, ler integralmente docs/PRODUCT.md, DOMAIN.md, UX.md, FRONTEND_DESIGN.md, ARCHITECTURE.md, DATA_MODEL.md, API.md, ACCEPTANCE.md, PLAN.md e DECISIONS.md. README descreve execução atual. PRODUCT define escopo, DOMAIN governa comportamento; os demais documentos devem concordar com ambos. Decisões explícitas do usuário prevalecem; registrar divergência e atualizar contratos antes de codificar a parte afetada.

## Escopo e método
- TCC funcional sobre o Perequê, pt-BR, dados e contas fictícios. Não afirmar que registros são denúncias reais, limite cartográfico oficial ou laudos.
- Trabalhar por etapas de PLAN e critérios AC. Separar “especificado”, “implementado” e “verificado”.
- Não criar chatbots, rankings, integrações oficiais, categorias extras, decisões automáticas ou troca de stack sem requisito.
- Não escolher silenciosamente regras que contradigam DOMAIN. Detalhe técnico de baixo impacto pode ser decidido e registrado com justificativa.
- Preservar trabalho existente. Não publicar/deployar o site sem solicitação; autorização de commit não é autorização de deploy.
- Não solicitar dados pessoais reais nem commitar credenciais, senhas demonstrativas, banco, imagens de usuários, backups, node_modules, dist ou relatórios.

## Direção de frontend aprovada em 08/10/2026
- Consultar `docs/FRONTEND_DESIGN.md` antes de trabalhar em hero, transição, mapa, painéis ou detalhes. A V6 é referência de aparência; quadros 02–04 do Figma ainda são estudos, não implementação ou geografia validada.
- Remover o CTA redundante “Explorar o mapa” do hero; a rolagem natural revela o mapa. Não capturar scroll do usuário nem tornar a animação obrigatória; suportar movimento reduzido, teclado e acesso direto às ocorrências.
- Manter Vite/Leaflet/OSM, lista equivalente, hash e testes existentes. Elementos artísticos não representam ruas, evidências, limites oficiais nem coordenadas reais.
- **Somente Resíduos e Água** na versão atual. O filtro “Vegetação” do estudo Figma é incorreto e não autoriza uma categoria nova.
- Painel de atenção não cria classificação de gravidade, ranking de veracidade ou feed inventado. Acompanhar é leitura da evolução, não assinatura/notificação; tópicos aninhados e histórico comunitário global exigem prévia revisão de contratos.
- O frontend remoto atualmente pode diferir do código local trabalhado com Codex; conferir branch e arquivos antes de aplicar redesenho. Não sobrescrever implementação mais recente nem marcar funcionalidade como pronta com base em mockup.

## Implementação
HTML semântico, teclado, foco visível, layout móvel, estados de erro/vazio e texto legível. Texto externo via textContent, nunca HTML não confiável. Separar dados, domínio, HTTP e apresentação. Validar permissões e estado no servidor; controles escondidos não são autorização. Toda escrita de domínio com evento na mesma transação e versionamento. Não adiar histórico para administração. Fixtures não são fallback de API nem contrato final do banco. Não implementar rota futura apenas para completar aparência.

## Verificação
Antes de concluir: npm test, npm run build, npm run test:e2e; Chromium via npx playwright install chromium, ou caminho alternativo documentado por CUIDACAO_CHROMIUM_PATH. Relatar qualquer verificação indisponível. Nas etapas de escrita, incluir testes de API com banco temporário, negação de permissões e atomicidade. Alterações só documentais não exigem novos testes que repitam o texto. Atualizar PLAN com evidências e limites reais; não marcar funções futuras prontas. Dependências novas exigem consulta à documentação oficial, compatibilidade e lockfile atualizado na etapa correspondente.
