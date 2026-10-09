# Interface e fluxos — versão 1.0 (domínio) + direção visual 1.1

## Direção e estado atual
Português brasileiro, linguagem comunitária e informação territorial no centro. **A direção visual aprovada em 08/10/2026 substitui a antiga recomendação de “papel claro e verde profundo” como referência geral de interface.** Passamos a uma cartografia artística abstrata integrada à apresentação, com azul-petróleo, grafite quente, areia e acentos terrosos, mantendo superfícies claras pontuais de leitura e contraste. Detalhes normativos, Figma, limites, responsividade e critérios FE estão em [FRONTEND_DESIGN.md](FRONTEND_DESIGN.md).

A **apresentação V6** foi aprovada visualmente. As telas de transição e exploração no Figma são estudos editáveis, não estado funcional nem aprovação pixel-perfect. O código atual do repositório conserva consulta com mapa, lista, filtros e dialog; cadastro/login/logout e criação/edição agora estão conectados à API, sem redesenho visual. Participação e administração abaixo continuam contratos futuros. Evitar números inventados de impacto, slogans excessivos, rankings de gravidade e ações sem implementação.

### Entrada e passagem para o mapa
- Cartografia abstrata ocupa a apresentação inteira, com composição assimétrica, marca, título “Um território em cuidado coletivo.” e texto curto integrado à imagem.
- **Não criar botão “Explorar o mapa” no hero**: a rolagem natural conduz à exploração. Link de navegação superior pode saltar diretamente ao mapa.
- Em rolagem normal, camadas gráficas desaparecem gradualmente e o mapa Leaflet real se torna a superfície funcional. Não transformar litoral imaginário em geografia supostamente real; garantir atribuição e aviso de área aproximada.
- Sem bloqueio obrigatório de rolagem. Respeitar `prefers-reduced-motion`, teclado, links diretos e fallback de lista; o movimento não é requisito para consultar ocorrências.

### Composição de exploração
- Mapa visualmente dominante; painel comunitário opcional compacto/expansível em desktop e bottom sheet em móvel; controles de categoria e estado permanecem utilizáveis.
- Vista inicial do painel: **“O que merece atenção”** com ocorrências públicas ativas e ordenação transparente por atualização; não deduzir gravidade, confirmação ou importância de quantidade de votos.
- Prioridade de leitura/ação: **Acompanhar → Discutir → Contribuir**; “Acompanhar” significa consultar evolução, não assinar notificações. Ações são condicionadas por D05.
- Detalhe desejado: prévia no contexto do mapa e expansão confortável com Relato, Discussão/Contribuições e Histórico **separados**. Preservar `#ocorrencia=id`, foco, Escape e filtros durante migração do dialog existente.
- O layout de conversa semelhante a fórum e o histórico comunitário global dependem de contratos de domínio/API ainda inexistentes; não criar aninhamento nem feed artificial.
- Não incorporar filtro Vegetação visto em mockup: apenas **Resíduos e Água**. As posições do desenho Figma são ilustrativas e não equivalem a dados OSM ou coordenadas reais.

## Consulta
Aviso de simulação persistente; categoria e estado; mapa e lista equivalentes. Marcador abre resumo com Ver detalhes; cartão abre mesmo detalhe. Ver todas enquadra pontos filtrados. Dialog exibe id, título, categoria, estado, relato, local, data, evidências e histórico. Escape/Fechar devolve foco ao controle de origem. Hash #ocorrencia=id suporta link direto, recarregar, Voltar/Avançar; retornar não perde filtros. Se filtros forem alterados e excluírem a seleção, limpar seleção. Zero resultados oferece Limpar filtros. Oculto/inexistente mostra indisponibilidade sem corpo. Duplicata mostra seu registro, rótulo e link principal; não criar nela nova participação.

## Cadastro e sessão
Entrar e Criar conta aparecem só na etapa funcional. Pedir nome de usuário fictício, senha e confirmação local da senha; explicar que não se deve usar dados pessoais nem senha real. Cadastro bem-sucedido encaminha para entrada com username preenchido. Erro indica campos sem apagar username; nunca recuperar senha via API. Conta atual e Sair visíveis; admin tem acesso ao painel. Sessão expirada pede login e preserva texto do formulário apenas na memória da página, sem reenviar automaticamente.

## Criação e edição
Formulário: categoria, descrição, título opcional, referência local opcional e ponto selecionado no mapa; latitude/longitude editáveis por teclado como alternativa. Mostrar área aproximada e aviso de que não é limite oficial. Antes de criar, oferecer consulta à lista para evitar duplicatas, sem bloqueio automático por proximidade. Exibir erros junto aos campos e resumo focável. Sucesso abre registro received; anexos são enviados depois, separadamente, e falha não reverte criação. Não mostrar estado “publicado” antes de resposta do servidor. Edição pelo autor mostra prazo/estado permitidos; após isso, oferecer complemento quando permitido.

## Participação
Separar abas/seções Relato, Contribuições e Histórico. Comentário é discussão; complemento é observação/resolução com imagens opcionais. Apoiar/Contestar exige justificativa e mostra manifestação própria, opção de alteração/retirada quando permitido. Autor não recebe controle de autovalidação. Mostrar contagens como manifestações, sem porcentagem de veracidade. Closed/discarded permite Pedir reabertura, não comentário comum. Evidências têm legenda/texto alternativo e origem simulada. Retirada/ocultação usa marcador; nunca reproduzir texto oculto no histórico público.

## Administração
Filas para recebidas, verificação, denúncias pendentes e pedidos de reabertura. Filtros de estado existentes servem para acompanhamento. Cada decisão abre formulário com motivo e referências exigidos por D03; confirmar enumera todas as contestações ativas para parecer. Ações indisponíveis explicam condição faltante. Impedir decisão própria também no servidor. Encerramento usa complemento de resolução; descarte exige razão distinta. Duplicatas/relacionadas usam busca/seleção por id e mostram as duas ocorrências antes do vínculo. Ocultar/restaurar mostra efeito na consulta e exige motivo. Aviso de revisão quando suporte de decisão deixa de estar disponível.

## Estados de rede e acessibilidade
Cada fluxo tem inicial, carregando, vazio, sucesso e erro; envio pendente desabilita submissão repetida. Em 409, preservar rascunho em memória, informar mudança e exigir recarregar/revisar antes de reenviar; nunca substituir silenciosamente versão. Em 401, pedir entrada; 403 explica falta de permissão; 404 indisponibilidade; 413/415 informam limite/tipo. Falha de API não substitui dados por fixtures.

Fundo cartográfico indisponível mantém lista e entrada manual. Sem JS, informar requisito. Labels explícitos, HTML semântico, foco visível, mensagens aria-live, dialog rolável e foco restaurado. Funcionar a 360px sem rolagem horizontal na página, a 200% de zoom e por teclado. Cor não é informação única; marcadores têm título/alt identificáveis. No celular mapa precede lista e filtros empilham. Não adicionar Registrar/Entrar/Validar antes da etapa correspondente.
