# Frontend do CuidAção — direção visual e contratos de experiência

**Versão:** 1.1 (direção visual)  
**Data:** 08/10/2026  
**Estado:** direção artística da apresentação aprovada; composição do mapa e dos painéis em estudo no Figma; implementação no repositório **não realizada** por este documento.  
**Produto:** protótipo acadêmico do CuidAção, Perequê, Guarujá (SP).  
**Autoridade:** PRODUCT e DOMAIN definem escopo, permissões, categorias e estados. UX e este documento definem apresentação/interação, sem criar regras novas de domínio. ARCHITECTURE e API limitam o que é implementável. Em conflito, registrar a divergência antes de programar.

## 1. Referência oficial e maturidade das decisões

**Arquivo de design editável:** [Figma do CuidAção](https://www.figma.com/design/I2Qk0iFboOAnJ5oENX5DNu).

| Referência | Nó do Figma | Situação |
| --- | --- | --- |
| Apresentação artística V6 | [01 — Apresentação](https://www.figma.com/design/I2Qk0iFboOAnJ5oENX5DNu?node-id=14-2) | **Direção visual aprovada**; não confundir aprovação da aparência com fidelidade cartográfica |
| Cartografia ganhando definição | [02 — Transição](https://www.figma.com/design/I2Qk0iFboOAnJ5oENX5DNu?node-id=20-2) | Estudo visual editável, não animação funcional |
| Marcadores e contexto emergindo | [03 — Transição](https://www.figma.com/design/I2Qk0iFboOAnJ5oENX5DNu?node-id=20-80) | Estudo visual editável; requer ajuste de sobreposições de texto |
| Exploração com painel comunitário | [04 — Mapa](https://www.figma.com/design/I2Qk0iFboOAnJ5oENX5DNu?node-id=21-143) | Estudo visual editável; requer ajuste de tipografia e revisão das categorias |

A V6 é a referência de identidade. As telas 02–04 especificam a **intenção de experiência**, não representam design pixel-perfect aprovado, dados verdadeiros nem componentes completos. O arquivo do Figma contém cartografia e marcadores **ilustrativos**, sem relação garantida com posições reais do Perequê; nenhuma captura, contorno ou marcador desse estudo pode ser reutilizado como dado geográfico.

A versão exploratória do Figma mostra o filtro **Vegetação**. Isso **não** amplia o domínio: a primeira versão só admite **Resíduos** e **Água** (DOMAIN D02). Remover o filtro inconsistente ao implementar e corrigir o Figma quando houver disponibilidade da integração.

## 2. Objetivo da experiência

Construir uma entrada editorial, calma e marcante, em que o **território** é o protagonista. A página inicial começa com uma representação cartográfica artística; ao rolar a página, a linguagem artística cede lugar ao **mapa interativo real**, com seus controles e ocorrências.

Evitar:
- template genérico de SaaS/dashboard, cartões desnecessários, ícones arredondados repetidos, métricas sem dados;
- composição rígida “texto de um lado / mapa do outro”, fotografia genérica ou imagens de pessoas como elemento principal;
- barras inferiores ornamentais, botões redundantes e excesso de elementos sobre o mapa;
- afirmações de precisão, gravidade, prioridade, resolução ou validação que não tenham base nos registros e nas regras do domínio.

**Decisão explícita:** não exibir botão “Explorar o mapa” no corpo da apresentação. A rolagem natural revela o mapa. A navegação superior pode oferecer link convencional para a seção do mapa por acessibilidade e acesso direto.

## 3. Linguagem visual e tokens iniciais

Visual **assimétrico, editorial, orgânico e minimalista**: atmosfera de azul-petróleo e grafite, camadas de contorno suaves, tons terrosos e areia, tipografia clara. A cartografia atravessa a superfície e o texto ocupa espaços de respiro internos ao mapa, sem painéis artificiais dividindo a tela.

Tokens de referência presentes na biblioteca do Figma (valores iniciais sujeitos a ajustes por legibilidade; usar variáveis CSS e não espalhar literais):

| Papel | Hex |
| --- | --- |
| fundo principal | \`#102A2D\` |
| oceano/área escura | \`#1D4247\` |
| terra | \`#40574D\` |
| contornos | \`#8B977E\` |
| areia | \`#A6987C\` |
| superfície escura | \`#182F31\` |
| painel claro | \`#E7E2D4\` |
| texto claro | \`#F0EBDD\` |
| texto escuro | \`#243333\` |
| texto secundário | \`#B9C4BA\` |
| destaque | \`#C99D76\` |
| borda | \`#65766C\` |

Tipografia editorial: **Noto Serif** no estudo Figma; fallback serif apropriado. Interface e rótulos: **Inter** com fallback de sistema. A escolha final de carregamento de fontes deve preservar desempenho, caracteres portugueses, contraste e legibilidade. Nunca usar caixa alta excessiva nos textos de leitura; pequenas legendas territoriais podem ser em caixa alta.

Controles com raios moderados, bordas discretas e foco bem visível. O destaque não pode depender só de cor: categoria, estado e ação permanecem textuais. Fotografias só quando forem evidências fictícias anexadas à ocorrência; caso contrário, usar recorte **real do mapa renderizado** ou apresentação apenas textual, nunca fotografia/cartografia fabricada para simular evidência.

## 4. Apresentação (estado 01)

- Ocupa aproximadamente uma tela inicial no desktop, com cartografia integrada em fundo contínuo.
- Marca **cuidAção.**, referência territorial **PEREQUÊ · GUARUJÁ (SP)** e título de abertura **“Um território em cuidado coletivo.”**.
- Texto curto: “Mapeando, acompanhando e discutindo os desafios socioambientais do Perequê.”, sujeito a pequenos ajustes editoriais.
- Navegação concisa: Mapa/Explorar, Comunidade, Sobre, Entrar apenas quando a etapa de autenticação estiver pronta. Links para seções existentes; não criar ação funcional fictícia.
- Nenhum CTA adicional “Explorar o mapa” no hero.
- Indicação de simulação acadêmica sempre disponível de maneira não intrusiva; não esconder aviso obrigatório de dados fictícios.
- A geometria artística inicial é **ilustração**, não mapa oficial, delimitação do bairro ou base apta para coordenadas.

## 5. Transição por rolagem (estados 02 e 03)

**Intenção aprovada:** transição suave e natural da apresentação ao mapa interativo. As telas 02/03 são quadros de direção visual, não o comportamento implementado.

**Estratégia técnica recomendada (sem trocar a stack):**
1. O documento mantém rolagem vertical normal, sem interceptar roda, bloquear scroll, impor snap obrigatório ou exigir animação para chegar à consulta.
2. Uma seção de progressão controlada por rolagem utiliza camadas sobrepostas: arte ilustrativa, tipografia da introdução e mapa Leaflet. A arte diminui opacidade, a introdução perde destaque, os rótulos/controles do mapa se revelam; evitar transição de costa fictícia como se fosse costa real.
3. Preferir revelar o **mapa real por baixo da camada artística**, em vez de simular uma “transformação geográfica” inventada. O momento exato de ocultar a ilustração deve evitar saltos visuais e mostrar atribuição OpenStreetMap.
4. A progressão da seção deve ser limitada e reversível pela rolagem: entrar e voltar preserva mapa, filtros, seleção e posição quando possível. Não recriar instâncias Leaflet a cada frame; manter a alternativa de lista disponível.
5. O mapa recebe interação normal quando visível e utilizável. A rolagem sobre ele não deve ser capturada inesperadamente pelo zoom; preservar ou rever conscientemente o \`scrollWheelZoom: false\` existente para não disputar o scroll da página.
6. Deep links \`#ocorrencia=id\`, navegação pelo teclado e acesso direto ao mapa não dependem de completar a animação. Quando necessário, ir diretamente ao estado funcional.
7. Com \`prefers-reduced-motion: reduce\`, dispensar efeitos de movimento/fade prolongados e apresentar o estado funcional imediatamente. Se JS ou tiles falharem, manter uma via sem animação e a lista legível.

Os valores exatos de duração/deslocamento e easing são detalhes de implementação a aferir em desktop/móvel; não fixar números arbitrários sem teste real. Não usar bibliotecas pesadas de animação sem justificar; CSS/IntersectionObserver e JS leve são preferíveis inicialmente.

## 6. Exploração do mapa (estado 04)

- Mapa ocupa a maior área visual; controles contidos e próximos das funções relevantes, não uma barra ornamental.
- Na primeira versão: **Resíduos** e **Água**; status deve continuar filtrável, mesmo se apresentado em controle separado. Aplicar filtros combinados (categoria **E** estado) conforme DOMAIN D10.
- Busca textual é direção futura: **não** prometer busca de local/geocodificação. Antes de implementá-la, definir fonte e critério suportados (por exemplo, pesquisar título/descrição já carregados); caso contrário, manter os filtros existentes.
- Pins identificáveis por categoria, com texto/alternativa; clicar abre uma prévia e permite navegar aos detalhes. Mapa e lista são caminhos equivalentes; nenhuma informação essencial depende de gesto espacial.
- Em situações sem fotos, a prévia pode usar um recorte de cartografia **derivado do mapa realmente exibido**, nunca mapa gerado que finja evidência local.
- Mostrar “Área aproximada de demonstração” conforme DOMAIN D02 e indicação de coordenadas simuladas. O limite ilustrativo existente não vira perímetro oficial.
- Utilizar Leaflet já presente, tiles OpenStreetMap com atribuição, tolerância a indisponibilidade e lista funcional em paralelo (ARCHITECTURE). Não usar o fundo/traçados do Figma como mapa geográfico.

## 7. Painel comunitário adaptativo

A interface prevê um painel **opcional**, inicialmente compacto/flutuante, que pode se expandir sem substituir o mapa. Em desktop não é coluna fixa obrigatória; manter respiro e espaço para cartografia. Em móvel usar **bottom sheet** com estados recolhido/expandido e controles acessíveis, sem prender a rolagem da página.

A vista inicial responde **“O que merece atenção”**, com um destaque editorial e uma lista curta de outros problemas. **Não** repetir contadores de resumo do mapa nem despejar eventos/comentários recentes no painel. O foco são ocorrências contextualizadas.

Para dados reais da demonstração, a seleção editorial automática deve ser **explicável e não inferir gravidade**:
- considerar só ocorrências públicas e visíveis, sem \`duplicateOfId\`, nas categorias aprovadas e com estado não terminal (received, community_review, confirmed, monitoring);
- ordenar por \`updatedAt\` descendente e id como desempate estável; limitar a três na apresentação inicial;
- descrever como “registros ativos atualizados recentemente” quando necessário, **sem** rótulos como “mais grave”, “urgente” ou “mais validado”; número de apoios não é pontuação de verdade;
- no protótipo estático, não inventar \`updatedAt\`; se indisponível, usar \`createdAt\` e rotular como seleção demonstrativa;
- se não houver elegíveis, mostrar estado vazio e acesso à lista; nada fictício é inserido como substituto de dado faltante.

Esses critérios são uma **regra de ordenação de interface**, não validação comunitária, ranking público ou mudança do estado da ocorrência. Priorizar API/DOMÍNIO existente caso exponha ordenação diferente; documentar ajustes antes de implementá-los.

## 8. Detalhe da ocorrência e navegação em camadas

A transição desejada é **mapa → prévia contextual → leitura expandida**. No primeiro toque/clique em marcador, painel/preview mostra identidade da ocorrência e caminho para ler mais; a versão expandida dá espaço confortável para texto, evidências, discussão e histórico, preservando contexto de retorno ao mapa.

**Prioridade de ação:** **Acompanhar → Discutir → Contribuir**.
- **Acompanhar** significa consultar estado, atualizações e histórico; **não** implica assinatura, notificações ou função de “seguir” (fora do domínio atual).
- **Discutir** abre comentários/conversa permitidos pelo estado e sessão.
- **Contribuir** abre complemento, manifestação ou evidência **somente quando DOMAIN D05/D06 autorizar**; explicar indisponibilidade por estado/autoria, sem criar botões enganosos.

Organização prevista: **Relato**, **Discussão/Contribuições**, **Histórico** em seções distinguíveis. Eventos de domínio continuam fora do fluxo de mensagens de discussão. O histórico é imutável, cronológico e filtrado por visibilidade; nunca exibir dados ocultos.

O detalhe existente usa \`<dialog>\` e hash \`#ocorrencia=id\`. O redesenho deve **preservar AC01/AC02** (link direto, reload, Voltar/Avançar, foco restaurado, filtros), não substituir por uma camada que perca acessibilidade ou semântica modal. Na versão expandida, manter Escape/Fechar, foco, rolagem interna e retorno coerente ao mapa.

**Lacunas de contrato:** mensagens realmente **aninhadas** em tópicos/respostas exigem \`parentId\` e regras de persistência ainda inexistentes em DOMAIN/DATA_MODEL/API. A direção visual tipo fórum está aceita como intenção, mas não se deve implementar encadeamento falso ou novo endpoint sem revisão normativa. Um **histórico global da comunidade** é diferente do histórico por ocorrência; também depende de contrato/API próprios e permanece proposta futura, não função implementada.

## 9. Estados, conteúdo e integridade

Todos os textos e registros da demonstração são **fictícios**, com identificação visível. Exemplo “possível alteração da água” não pode ser convertido em “água contaminada” sem laudo; encerrar um registro não prova saneamento. Exibir rótulos de estados do DOMAIN, sem renomear \`received\` etc. nas APIs.

Prever carregamento, vazio, erro e sucesso de controles; API indisponível não faz fallback silencioso para fixtures; duplicata redireciona leitura à principal sem duplicar participação; conteúdo oculto/inexistente mostra indisponibilidade sem vazar dados. Não derivar urgência, validação, confirmação ou estado automaticamente de votos/cores/estética.

Não criar botão Entrar antes de haver rota funcional; não exibir filtros e busca sem resposta demonstrável; amostras presentes no Figma não garantem existência dos recursos.

## 10. Responsividade, acessibilidade e desempenho

- Referências: desktop 1440×900 e móvel a partir de 360px; apoiar teclado, 200% zoom e redução de movimento. Não obrigar o usuário a atravessar tela artística para consultar a lista.
- Desktop: mapa expansivo, painel compacto e expansível; leitura ampla sem destruir estado da consulta.
- Móvel: hero reduzido, mapa antes da lista, filtros empilhados/recolhíveis, painel comunitário em bottom sheet com alternativa de lista simples.
- Texto com contraste suficiente, foco visível, labels nos filtros e busca, mensagens \`aria-live\` onde fizer sentido; não depender exclusivamente de cor, hover, movimento ou toque preciso em marcador.
- O layout artístico não pode reduzir alvo de toque, ocultar navegação, quebrar hash ou prejudicar a leitura com sobreposição de textos.
- Não inicializar múltiplas instâncias de Leaflet durante transição; limitar trabalho em scroll, animar \`opacity\`/\`transform\` quando possível, pausar trabalho fora da viewport, não usar grandes imagens raster de UI.
- Tratar conteúdo externo como texto (textContent) e respeitar autorização de servidor; nenhuma decisão visual muda isso.

## 11. Plano de implementação recomendado para agentes

A documentação é **contrato de direção**, não ordem para sobrescrever o frontend existente de uma vez.

1. **Auditar código atual** e preservar consulta, mapa/lista, filtros, hash, foco, testes, domínio e API. Usar Figma como inspiração, não fonte de dados/cartografia.
2. **Tokens/tipografia/componentes**: centralizar CSS de cores e fontes; implementar cabeçalho/hero sem CTA redundante com HTML semântico.
3. **Cartografia de transição**: sobreposição puramente visual sobre o Leaflet real; fallback funcional imediato e respeito a redução de movimento. Garantir que não haja salto de dimensão do mapa.
4. **Experiência de exploração**: mapa com filtros categoria/estado e lista sempre acessível; marcadores reais do conjunto simulado; painel compacto/expandido com a ordenação documentada.
5. **Detalhe em camadas**: adaptar dialog/painéis preservando links e foco; fluxo de leitura, discussão e contribuição **condicionado** às etapas de domínio efetivamente implementadas.
6. **Móvel e estados de erro**: bottom sheet, zoom, 360px, carregamento, indisponibilidade, empty state e tiles bloqueados.
7. **Verificar** \`npm test\`, \`npm run build\`, \`npm run test:e2e\` após alterar código; adicionar testes E2E de rolagem reduzida, hash, filtros, foco e telas móveis. Documentar comandos realmente executados.

**Não** trocar Vite/Leaflet por framework novo, mudar tabelas ou endpoints ou implementar cadastro, botões administrativos, push, geocodificação e tópicos aninhados só para parecer com o Figma.

## 12. Critérios de revisão do frontend (FE)

Estes são critérios **propostos para futura implementação**, independentes de AC01–AC30 do domínio; registrar aprovação somente após execução/verificação:

| ID | Critério esperado |
| --- | --- |
| FE01 | Hero V6 com cartografia artística, textos editáveis, aviso de simulação e sem CTA “Explorar o mapa” no corpo |
| FE02 | Scroll natural revela mapa; movimento reduzido ou acesso direto permite pular transição |
| FE03 | Renderização artística não é usada como base real de coordenadas; atribuição OSM e aviso de área aproximada permanecem |
| FE04 | Mapa e lista operam com filtros Resíduos/Água e estado, sem filtro Vegetação; seleção e hash consistentes |
| FE05 | Painel expande/recolhe; destaques vêm de ocorrências permitidas com critério transparente, sem ranking de gravidade |
| FE06 | Detail/preview mantêm retorno, foco, Escape, links diretos e as informações de domínio autorizadas |
| FE07 | Acompanhar/Discutir/Contribuir têm significado e permissão corretos; recursos futuros não aparecem como funcionais |
| FE08 | Em 360px e 200% zoom não há sobreposição de textos, perda da lista ou rolagem horizontal indevida |
| FE09 | Sem movimento, tiles, fotos, API ou registros, interface apresenta alternativa/estado coerente, sem conteúdo inventado |
| FE10 | Regressão AC01/AC02 e testes/build/e2e aprovados após alteração executável |

## 13. Pendências honestas

- Ajustar no Figma sobreposição de texto nos painéis 03/04 e remover o filtro visual “Vegetação”, que diverge do escopo.
- Desenhar vista expandida de ocorrência, discussão/histórico e mobile; o Figma atualmente contém a biblioteca e as quatro primeiras telas em estudo, não esses estados completos.
- Definir e testar valores de movimento na implementação navegável; o Figma contém **quadros estáticos**, não a animação real.
- Precisão cartográfica: para a implementação, usar base OSM/Leaflet disponível e rotular coordenadas/caixa aproximadas conforme DOMAIN; não fingir que o desenho artístico tem precisão do bairro.
- Não há decisão para sistema de assinatura, geocodificação externa, pontuação de gravidade, comentários aninhados ou feed global persistente. Se esses recursos forem pedidos, atualizar primeiro DOMAIN/API/DATA_MODEL e critérios de aceitação.

---

**Resumo normativo:** a entrada é arte territorial; a rolagem normal revela o mapa Leaflet; o mapa e a comunidade passam a ser a interface principal. O visual aprovado não substitui prova, geografia, acesso por teclado ou regras do domínio.
