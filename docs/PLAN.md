# Plano de implementação — versão 1.0
07/10/2026. Especificação e implementação têm estados separados.

## Entregue
- [x] Primeira leitura: mapa, lista, filtros, detalhes, links diretos e dados simulados.
- [x] Documentação 1.0: produto, domínio, interface, arquitetura, dados, API e critérios de aceite.
- [x] Instruções aos agentes e registro de decisões desta revisão.
- [x] Três testes Node, build e oito execuções E2E da consulta existente.

## Trilha transversal — direção visual e redesenho de interface 1.1 (08/10/2026)

Esta trilha não substitui as etapas de domínio; implementar incrementalmente, preservando AC01–AC30 e a stack. [Contrato de frontend](FRONTEND_DESIGN.md).

- [x] Seleção e aprovação da direção visual **V6** (entrada cartográfica abstrata e assimétrica, sem CTA redundante).
- [x] Criação dos quadros estáticos de transição 02/03 e exploração 04, componentes e tokens no Figma; **estudos visuais**, não produto funcional.
- [x] Registro das decisões de interface e distinção entre ilustração, dados simulados e mapa Leaflet real.
- [ ] Corrigir textos sobrepostos nos painéis Figma 03/04 e retirar “Vegetação”, categoria fora de escopo.
- [ ] Completar no Figma detalhe expandido, experiência de discussão/histórico e adaptação móvel.
- [ ] Implementar tokens e hero V6 no frontend atual **sem alterar lógica existente**; nenhum botão “Explorar o mapa” na área central.
- [ ] Implementar transição pela rolagem normal com alternativa para `prefers-reduced-motion`, acesso por teclado e links diretos.
- [ ] Ajustar mapa/lista, painel comunitário adaptativo, ordenação explicável dos destaques e filtros **Resíduos/Água + estado**.
- [ ] Adaptar detalhe em camadas preservando hash, foco, Escape, filtros e permissões; não adicionar threading/feed global sem alteração normativa do domínio.
- [ ] Validar FE01–FE10 com testes, build, E2E, viewport 360px, zoom 200%, falha de tiles e de API.

**Dependências:** aproveitar funcionalidades já implementadas no repositório/ramo de trabalho escolhido. As telas Figma não são dados geográficos nem evidência de conclusão de FE; os testes anteriores da Etapa 1 não validam o novo frontend.

## Etapa 1 — completar contrato de leitura
- [ ] Cobrir Voltar/Avançar, filtro que invalida seleção e foco vindo do mapa.
- [ ] Resolver divergências encontradas por esses cenários sem alterar regras de domínio.
Aceite: AC01–AC02 completos. Preservar testes já aprovados.

## Etapa 2 — persistência, identidade e criação auditada
- [ ] Instalar Node 24/backend escolhido, criar migrações e seed; adicionar exclusões de dados/backup ao Git.
- [ ] API de consulta substitui fixtures, com adaptador de códigos/rótulos e datas; não usar fallback silencioso.
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

## Verificação da revisão de documentação
A revisão anterior em 07/10/2026 aprovou 3 testes Node, build e 8 execuções Playwright. Chromium padrão ausente no ambiente; usar CUIDACAO_CHROMIUM_PATH=/tmp/chromium localmente quando disponível. CI continua instalando Chromium pelo Playwright. Tiles foram bloqueados; disponibilidade externa não foi certificada. Esta revisão só altera documentação e não implementa backend ou novas regras. Reexecução desta entrega: 3 testes Node aprovados, build aprovado e 8 execuções Playwright aprovadas com Chromium alternativo. Links relativos dos 11 documentos e identificadores AC01–AC30 verificados. Sem alteração de código executável ou dependências.
