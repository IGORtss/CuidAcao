# Contrato HTTP — versão 1.0
Contrato da versão 1.0. As três rotas públicas de ocorrência/listagem/histórico são implementadas na fatia de API local; quatro rotas de autenticação, POST de criação, PATCH do autor e quatro rotas de anexos, três rotas de comentários/complementos e três rotas de manifestações e POST de transições também implementados. Item 9 acrescenta correções, denúncias/decisões, moderação, rejeição de pedidos, filas e consulta/auditoria administrativas; Gestão de vínculos implementada no item 10; verificação final em PLAN. O frontend consome essas rotas com adaptador explícito e sem fallback para fixtures.

Listagem e detalhe podem incluir `environmentalRepresentation` quando o registro foi preparado com metadado cartográfico explícito. O objeto contém `type` (`water_quality`, `waste`, `erosion`, `apparent_sewage`, `flooding` ou `vegetation`), `geometry` GeoJSON compatível e `accuracy` (`approximate` ou `verified`); qualidade da água inclui `measurement: {label:"pH", value}`. Ausência do campo significa pin por coordenada, nunca geometria inferida. As rotas públicas de criação/edição não aceitam esse metadado nesta versão; os exemplos são preparados localmente pela demonstração.

## Convenções
Prefixo /api/v1, JSON UTF-8, datas UTC ISO 8601, nomes camelCase e códigos de DOMAIN. Sucesso: {data: objeto}; listas: {data: [], page, pageSize, total}. Paginação começa em 1, pageSize padrão 20, máximo 100; ordenação ocorrências createdAt DESC,id DESC, filhos/histórico ASC. Filtros categoria e estado são combinados com E; valor desconhecido retorna 422. Strings/limites em DOMAIN; campos desconhecidos rejeitados. Resposta nunca contém campos de senha/sessão.

Falhas: {error:{code,message,fields?}}, com message em pt-BR e fields como mapa campo→mensagem. 400 JSON/multipart inválido; 401 sessão ausente/expirada; 403 permissão/origem; 404 inexistente ou oculto ao solicitante; 409 estado, vínculo, unicidade ou versão conflitante; 413 tamanho; 415 tipo de mídia; 422 conteúdo/campos inválidos; 429 limite de tentativas. Falha interna: 500 genérico com requestId, sem stack/SQL/caminhos.

Toda escrita vinculada a ocorrência exige expectedVersion no corpo; multipart usa campo textual inteiro. Ações com duas ocorrências exigem expectedVersions:{id:version} para ambas. Missing version=422, conflito=409; resposta informa versões resultantes. Criar ocorrência/auth não têm expectedVersion. Escritas retornam 200; criação retorna 201, exclusão de sessão 204. DELETE de vínculo/manifestação aceita corpo JSON com versões/motivo quando exigido. Retries não são automáticos: reler estado antes de reenviar. Botão de envio fica desabilitado enquanto pendente.

Leituras públicas aplicam D08; admin usa as mesmas rotas com includeHidden=true, nunca disponível ao usuário comum (403). Sem includeHidden, admin recebe projeção pública. Autenticação e mutações validam Origin conforme ARCHITECTURE. Não aceitar authorId/role/status/simulated em criação/edição comum.

## Rotas e corpos

### Projeções da consulta pública
Detalhamento técnico dos campos já exigidos pelo contrato (sem ampliar funcionalidades):
- Listagem retorna os campos persistidos públicos `id,authorId,title,description,category,latitude,longitude,locationLabel,status,simulated,version,duplicateOfId,closureReason,discardReason,createdAt,updatedAt`. Campos opcionais ausentes no banco retornam null; simulated é booleano. Não retorna visibility nem dados da conta/sessão.
- Detalhe retorna os mesmos campos e `counts:{support,contest}` (manifestações da própria ocorrência, visíveis e ativas), `flags:{referencesUnavailable,referencesChanged,relationsRemoved,duplicateTargetUnavailable}`. Flags são derivadas dos snapshots das referências de decisões e do estado atual do banco; não constituem outro estado de ocorrência. Retirada/inativação/ocultação/pai oculto tornam referência indisponível; alteração do conteúdo desde snapshot sinaliza mudança; relação inexistente sinaliza remoção. Sem decisão referenciada, flags de referência são false. duplicateOfId continua preservado, mas o destino oculto/inexistente sinaliza duplicateTargetUnavailable.
- Histórico público retorna somente `id,action,createdAt,username,reason,fromStatus,toStatus`. username é o identificador fictício do ator humano ou null para system. Eventos de entidade report (criação ou decisão de denúncia) são privados e ficam fora de data e total; moderação resultante deve ter evento separado no alvo. Motivos públicos não incluem texto anterior/posterior ou dados de denúncia. Não são retornados snapshots, referências, ids do denunciante ou campos de arquivo.
- IDs de entrada são identificadores CA com três dígitos legados ou seis ou mais dígitos sequenciais. IDs malformados retornam 422; válidos inexistentes/ocultos retornam 404. Query aceita apenas campos listados para cada rota. page/pageSize são inteiros decimais positivos; page aceita até 13 dígitos para manter o offset inteiro exato no JavaScript, e valores repetidos são inválidos. includeHidden/includeDuplicates aceitam somente true/false. includeHidden=true exige sessão administrativa atual: ausente/expirada=401, papel comum=403; projeção privada do item 9.
- Erro interno usa `{error:{code:"INTERNAL_ERROR",message:"Não foi possível concluir a consulta.",requestId}}`; o identificador é gerado no servidor, sem confiar em header fornecido pelo cliente.

| Método e caminho | Acesso | Corpo/parâmetros e efeito |
| --- | --- | --- |
| POST /auth/register | Público | {username,password}; cria user, retorna {id,username,role}; não inicia sessão |
| POST /auth/login | Público | {username,password}; cookie, dados públicos da conta |
| GET /auth/me | Sessão | Dados da conta; 401 se ausente |
| POST /auth/logout | Sessão ou sem sessão | Revoga se presente, limpa cookie; 204 idempotente |
| GET /occurrences | Público | category=residuos/agua, status=código, page,pageSize; omite duplicatas por padrão; includeDuplicates=true as inclui |
| GET /occurrences/:id | Público | Campos públicos da ocorrência, version, contagens, duplicateOfId e flags de referências indisponíveis |
| POST /occurrences | Sessão | {category,description,latitude,longitude,title?,locationLabel?}; D02; 201 com registro/version |
| PATCH /occurrences/:id | Autor permitido | {expectedVersion,changes:{campos de entrada D02}}; D05; não muda estado |
| POST /occurrences/:id/corrections | Admin independente | {expectedVersion,changes:{campos D02},reason}; correção auditada |
| GET /occurrences/:id/contributions | Público | Lista paginada de contribuições; conteúdo oculto substituído por marcador |
| POST /occurrences/:id/contributions | Sessão | comment/supplement/reopen_request: {expectedVersion,type,text,kind?}; pedidos somente em closed/discarded; D05 |
| PATCH /contributions/:id | Autor permitido | {expectedVersion,text}; edição de comentário/complemento; kind/type imutáveis |
| GET /occurrences/:id/stances | Público | Manifestações ativas paginadas, marcadores de ocultas; autor fictício, tipo e justificativa somente visíveis |
| PUT /occurrences/:id/stance | Sessão | {expectedVersion,type,reason}; cria/substitui manifestação própria; D05 |
| DELETE /occurrences/:id/stance | Sessão | {expectedVersion}; retira própria; se já inativa retorna atual sem novo evento |
| POST /occurrences/:id/attachments | Autor permitido | Multipart file,caption,expectedVersion,contributionId opcional para complemento ou pedido já salvo da mesma ocorrência; D06 |
| GET /occurrences/:id/attachments | Público | Metadados de anexos do relato original; anexos de contribuição vêm na contribuição |
| GET /attachments/:id/file | Público conforme visibilidade | Binário validado; oculto/retirado/pai oculto=404; includeHidden=true permite auditoria somente a admin autenticado |
| DELETE /attachments/:id | Autor permitido | {expectedVersion}; marca withdrawnAt; preserva arquivo privado |
| GET /occurrences/:id/history | Público | Projeção pública paginada; admin includeHidden recebe auditoria |
| POST /occurrences/:id/transitions | Admin independente | Corpo abaixo; D03/D04 |
| POST /contributions/:id/reopen-decision | Admin independente | {expectedVersion,decision:rejected,reason}; aceitação ocorre por transição |
| GET /occurrences/:id/duplicates | Público | Duplicatas visíveis paginadas; sem conteúdo de ocultas |
| PUT /occurrences/:id/duplicate | Admin independente | {expectedVersions,principalId,reason}; D07 |
| DELETE /occurrences/:id/duplicate | Admin independente | {expectedVersions,reason}; inclui versões da duplicata e principal |
| GET /occurrences/:id/relations | Público | Relacionadas visíveis paginadas |
| POST /occurrences/:id/relations | Admin independente | {expectedVersions,relatedId,reason}; D07 |
| DELETE /occurrences/:id/relations/:relatedId | Admin independente | {expectedVersions,reason}; remove vínculo |
| POST /reports | Sessão | {expectedVersion,targetType,targetId,reason}; occurrenceId inferido do alvo |
| GET /reports | Sessão | Usuário vê próprias, admin vê todas; status,page,pageSize |
| POST /reports/:id/decision | Admin independente | {expectedVersion,decision:upheld/dismissed,reason}; D08 |
| POST /moderation | Admin independente | {expectedVersion,targetType,targetId,action:hide/restore,reason}; D08 |
| GET /account/subscriptions | Sessão | Lista acompanhamentos privados da conta |
| POST /account/subscriptions | Sessão | occurrence `{kind,occurrenceId,label}`; place/area `{kind,label,geometry,radiusMeters?}`; D11 |
| DELETE /account/subscriptions/:id | Sessão | Remove somente acompanhamento próprio |
| GET /account/saved-queries | Sessão | Lista consultas privadas da conta |
| POST /account/saved-queries | Sessão | `{name,query}` com filtros públicos/enquadramento válidos; máximo 20 |
| DELETE /account/saved-queries/:id | Sessão | Remove somente consulta própria |
| GET /account/notifications | Sessão | Eventos públicos posteriores que correspondem aos acompanhamentos; `read` privado |
| POST /account/notifications/:eventId/read | Sessão | Marca atualização derivada como lida |

GET de listas filhas exige pai consultável; projeções ocultas não vazam texto original nem nome de arquivo. Respostas de escrita retornam entidade e occurrenceVersion; operações de dois registros retornam versions:{id:version}. Inclusão de denúncia incrementa version, mas não expõe o conteúdo privado no evento público.

## Transição
Corpo: {expectedVersion,to,reason,supportRefs?,contestAssessments?,updateId?,reopenRequestId?,closureReason?,discardReason?}.
- to=confirmed: supportRefs não vazio com objetos {type:stance/contribution/occurrence,id}; contestAssessments contém {stanceId,assessment} para cada contestação ativa visível. Referência occurrence exige relação ativa; D04 valida autoria e vínculo.
- to=monitoring: updateId é supplement visível da mesma ocorrência.
- to=closed: updateId é supplement kind=resolution visível da mesma ocorrência; closureReason=resolved.
- to=discarded: discardReason=invalid/out_of_scope.
- Reabertura para community_review: reopenRequestId é pedido pending da mesma ocorrência.
- received→community_review exige somente expectedVersion,to,reason. Campos específicos de outras transições são rejeitados.

API verifica estado atual e duplicidade dentro da transação; DTO de resposta contém apenas dados autorizados. Snapshot das referências fica no evento. Não aceitar decisão administrativa via PATCH genérico.

## Evolução e testes
Implementar schemas de entrada e saída junto de cada endpoint; não gerar servidor inteiro antecipadamente. Testes API devem usar banco temporário real, duas sessões independentes, concorrência/versionamento e tentativas diretas sem permissão. Rotas de etapas não entregues não devem aparecer como botões funcionais.

## Autenticação entregue
Register: {username,password}, 201 {data:{id,username,role:"user"}}, sem sessão/cookie automático. Username permite maiúsculas ASCII, normalizadas antes da unicidade; espaços/acentos inválidos. Login: mesmo corpo, 200 com dados públicos e Set-Cookie; inexistente/senha errada retornam o mesmo 401 INVALID_CREDENTIALS. Me: 200 com dados públicos ou 401 UNAUTHENTICATED, sem token/hash/validade. Logout: corpo ausente ou {}, 204 e cookie expirado, inclusive sem sessão; campos desconhecidos rejeitados. Query de auth não aceita campos. Respostas auth usam Cache-Control: no-store.

POST auth exige Origin exato de CUIDACAO_WEB_ORIGIN. JSON inválido=400; tipo incorreto=415; campos inválidos=422; duplicado=409; excesso=429 com Retry-After. Configuração e limites em ARCHITECTURE, resultados em PLAN. IncludeHidden agora exige sessão administrativa conforme o item 9.


## Escrita de ocorrências entregue na Etapa 2
POST /occurrences e PATCH /occurrences/:id exigem Origin exato, sessão válida e application/json. Query desconhecida e campos protegidos são rejeitados; limite de corpo 24000 bytes. Campos textuais são validados após trim por D02; coordenadas devem ser números finitos dentro da caixa inclusiva. Título omitido na criação é gerado; título informado vazio é inválido. locationLabel pode ser string vazia e é normalizada por trim; omissão na criação retorna null. PATCH aceita subconjunto não vazio dos seis campos de entrada; omissão preserva o campo atual. Não aceita null para limpar título/local (use string vazia somente para referência local).

Sucesso de ambas as rotas: {data: mesma projeção do detalhe público, occurrenceVersion: data.version}. POST retorna 201/version=1; PATCH retorna 200/version incrementada. Cadastro de admin não existe; sessão admin edita nesta rota apenas como autor sujeito às mesmas regras. Sem sessão=401; autoria alheia ou prazo ultrapassado=403; estado diferente de received, vínculo de duplicata ou conflito de versão=409; oculto/inexistente=404. Prazo de 24h inclusivo, contado pelo relógio do servidor. Eventos created/edited e snapshots são atômicos com a escrita; falha retorna 500 genérico sem confirmar sucesso. Histórico entrega somente sua projeção pública. Auditoria administrativa/includeHidden entregue no item 9; permanece negada a visitantes e usuários comuns.

## Anexos do relato original implementados — item 5

POST /occurrences/:id/attachments aceita exatamente uma parte binária file e dois campos textuais caption e expectedVersion, em qualquer ordem. Não aceita URL remota, autoria, identificador de arquivo, caminho nem campos extras/repetidos. contributionId opcional passou a ser aceito no item 6 para complemento e, no item 8, pedido de reabertura da mesma ocorrência. Não há Content-Type JSON: use multipart/form-data com boundary. Limites do parser: um arquivo de até 5242880 bytes (5 MiB), até três campos de até 1024 bytes cada, quatro partes, nomes de campo até 50 bytes e 100 pares de headers. expectedVersion é inteiro decimal positivo seguro; legenda após trim possui 5–200 caracteres. Limite de cinco imagens não retiradas do relato, incluindo ocultas. JPEG/PNG/WebP estáticos são identificados por assinatura e decodificação; máximo 20000000 pixels. MIME e nome informado não são persistidos nem considerados prova de formato. Saída reencodada também limitada a 5 MiB, sem metadados.

Exige Origin/sessão e autorização D05/D06, revalidada após decodificação e dentro da transação: autor, pai visível, received, sem duplicata, até 24h inclusive. Admin não corrige imagens de outro autor. Sessão inválida=401; autoria/prazo=403; pai oculto/inexistente=404; versão/estado/quantidade=409; excesso de bytes=413; assinatura/formato não permitido=415; legenda/campos/dimensões/imagem danificada ou animada=422; multipart malformado=400. Falhas não revertem a ocorrência já salva e não registram evento de sucesso.

POST retorna 201 {data:attachment,occurrenceVersion}; DELETE /attachments/:id exige JSON {expectedVersion}, retorna 200 no mesmo envelope e marca withdrawnAt, sem apagar o arquivo privado. Retirada repetida=409. Ambos incrementam versão do pai e geram evento na mesma transação. Retirada aceita anexo visível do autor permitido do conteúdo pai; para complemento aplica a janela da contribuição, conforme item 6.

attachment contém id UUID, occurrenceId, createdAt, available, caption, mediaType, byteSize, width, height, fileUrl. Disponível: valores do arquivo reencodado e fileUrl=/api/v1/attachments/:id/file. Oculto/retirado: available=false e caption/mediaType/byteSize/width/height/fileUrl=null; somente marcador, sem conteúdo. Não retorna uploaderId/storageKey/caminho nem nome original. GET /occurrences/:id/attachments aceita page,pageSize,includeHidden; retorna {data,page,pageSize,total,occurrenceVersion}, ordenação createdAt,id ASC, apenas anexos do relato original (inclui marcadores). Pai oculto impede consulta inteira. includeHidden=true exige sessão administrativa e permite consulta privada.

GET /attachments/:id/file verifica anexo e pais antes de ler arquivo privado; oculto/retirado/pai oculto retorna 404 na consulta pública, inclusive para sessão admin sem includeHidden=true. Sucesso: binário com Content-Type validado, Content-Disposition:inline, X-Content-Type-Options:nosniff e Cache-Control:no-store. Não recebe caminho nem URL de arquivo. Histórico público expõe attachment_added/withdrawn somente na projeção pública, sem snapshots ou chave privada.

A UI salva o relato primeiro, envia imagens em sequência usando a versão retornada por cada operação e retenta apenas pendências após ação explícita. Conflito requer consultar/revisar registro e anexos atuais; nunca criar outro relato para retentar imagem.

## Contrato do item 6 original — comentários e complementos

Implementados: GET /occurrences/:id/contributions, POST no mesmo caminho e PATCH /contributions/:id. POST aceita {expectedVersion,type:comment/supplement,text,kind?}; kind obrigatório observation/resolution somente para supplement e proibido em comment. O item 8 acrescenta reopen_request; DELETE de contribuição continua ausente: D05 exige solicitação/denúncia e moderação para retirar texto. Edição aceita somente {expectedVersion,text}, sem mudar tipo/kind. Texto após trim: comentário 1–2000, complemento 20–3000 caracteres. Autor, id e datas vêm do servidor. Participação exige pai visível, sem duplicata e community_review/confirmed/monitoring; edição só autor até 24h inclusive da contribuição, nas mesmas condições. Resolução não muda estado.

Projeção de contribuição: id,occurrenceId,authorId,username,type,kind,text,available,createdAt,updatedAt,attachments. Oculta: authorId/username/type/kind/text=null, attachments=[] e available=false; marcador sem conteúdo. Lista paginada ASC createdAt,id retorna occurrenceVersion e apenas comentários/complementos. Escritas retornam {data,occurrenceVersion}, criação 201 e edição 200. includeHidden=true exige administrador; pai oculto=404. Não expor snapshots/visibility. O item 8 acrescenta requestStatus à projeção, null em comentário/complemento/oculto.

POST /occurrences/:id/attachments passa a aceitar contributionId UUID opcional para complemento já salvo da mesma ocorrência. Um arquivo, até três campos textuais e quatro partes; limites de imagem existentes mantidos. Cinco imagens não retiradas por conteúdo pai, independentes do relato original/outros complementos. Autor do complemento (não necessariamente autor da ocorrência), prazo de 24h da contribuição, estados participativos e visibilidade dos dois pais verificados novamente dentro da transação. Comentário não recebe uploads; pedidos passaram a recebê-los no item 8 sob as regras específicas de D05/D06. DELETE de imagem aplica a permissão do conteúdo pai. Imagens do complemento vêm em attachments da contribuição; lista de anexos original permanece só original. Falha de imagem mantém complemento salvo, sem evento de sucesso nem arquivo novo; tentativa explícita só das pendências.

Erros de contribuição: campos/tipo/texto/versão ausente=422, sessão ausente/expirada=401, Origin ou autoria/prazo=403, pai ou contribuição oculto/inexistente=404, estado/duplicata/versão=409. JSON malformado=400, mídia diferente de JSON=415, corpo acima de 24000 bytes=413. Não há DELETE de contribuição (404); moderação foi entregue no item 9 e gestão de estados foi entregue no item 8. Edição de tipo/kind é rejeitada por schema, mesmo pelo autor/admin.

Exemplos de POST /api/v1/occurrences/:id/contributions, após login, com versão atual:

```json
{"expectedVersion":2,"type":"comment","text":"Comentário fictício."}
```

```json
{"expectedVersion":3,"type":"supplement","kind":"resolution","text":"Informação fictícia de resolução observada no local."}
```

Eventos novos: commented, supplemented e contribution_edited; upload/retirada reutilizam attachment_added/withdrawn. Autor fictício/datas e conteúdo atual são públicos; beforeJson/afterJson e chaves de arquivos não são. Cada escrita incrementa version/updatedAt da ocorrência, inclusive edições/imagens do complemento, sem modificar status. Consulta não produz eventos. Anexos ocultos/retirados dentro de complemento visível mantêm a projeção de marcador existente; complemento oculto retorna attachments=[] e seus arquivos são 404.

## Manifestações — item 7 original

Implementadas GET /occurrences/:id/stances, PUT /occurrences/:id/stance e DELETE /occurrences/:id/stance. PUT recebe {expectedVersion,type,reason}, type=support/contest, justificativa 20–1000 caracteres Unicode após trim; DELETE recebe somente {expectedVersion}. Ambas retornam 200 {data,occurrenceVersion}. Origem/sessão e JSON obrigatórios; campos adicionais rejeitados. PUT cria, substitui ou reativa a única linha própria; mantém id e createdAt. DELETE desativa; repetir retirada com versão atual não cria evento nem incrementa versão. Sem manifestação própria, DELETE retorna 404. Não há edição de manifestação alheia nem envio de userId.

GET usa paginação padrão, ordenação createdAt/id ASC, retorna {data,page,pageSize,total,counts:{support,contest},occurrenceVersion}. Data contém posições ativas da própria ocorrência; ocultas são marcadores available=false, com userId/username/type/reason=null. Inativas não aparecem; total inclui marcadores, counts apenas ativas visíveis. Cada posição tem id, occurrenceId, userId, username, type, reason, active, available, createdAt, updatedAt. Escrita retorna a posição própria, inclusive active=false na retirada. includeHidden=true permite projeção privada somente a administradores; público não recebe conteúdo oculto. Pai oculto/inexistente é 404. Respostas destas rotas têm no-store.

Criação/substituição/reativação/retirada exigem estado participativo, pai visível e sem duplicata, e participante diferente do autor. Manifestação própria oculta não pode ser substituída ou retirada pela API comum (404); não é restaurada implicitamente. Não há prazo de 24h para manifestações. Contagens não somam duplicatas nem alteram estado. Versão divergente é 409, inclusive ao repetir retirada; autorização e versão são verificadas sob transação immediate. Histórico público não expõe justificativas anteriores ou ocultas: ficam apenas nos snapshots privados.

## Escopo e projeção do item 8 original

O ciclo implementa exclusivamente D03, inclusive reabertura condicionada a pedido. Pedidos reopen_request pelo POST de contribuições, sua leitura/status e imagens sob D05/D06 são dependências mínimas da reabertura; rejeição administrativa de pedidos, correção, moderação, denúncias e gestão de vínculos não são incluídas. Confirmação aceita referências de vínculos já existentes, sem criar relações. A verificação da pertinência, ausência de inadequação e fato novo é humana; servidor verifica estrutura, conteúdo, autoria, visibilidade, estado, vínculos e versão, sem decisão automática.

Histórico público ganha fromStatus/toStatus (códigos ou null) extraídos apenas de snapshots dos eventos transition. Não expõe snapshots, referências completas ou pareceres anteriores; preserva ator, data e motivo público. Assim o histórico mostra origem e destino sem reproduzir conteúdo oculto.

### Transições entregues no item 8

POST /api/v1/occurrences/:id/transitions exige Origin, sessão administrativa atual e JSON. Corpo de até 1 MiB; aceita somente expectedVersion,to,reason e os campos específicos da aresta descritos acima. Motivo/parecer: 20–1000 caracteres Unicode após trim. Retorna 200 {data:detalhe público,occurrenceVersion}. Versão ausente/campo inválido/requisito ausente=422; sessão=401; papel, origem ou decisão de ocorrência/contribuição própria=403; pai oculto/inexistente=404; aresta não listada, duplicata ou versão divergente=409. To=received é reconhecido, mas qualquer transição para ele é 409. Sem includeHidden=true, sessão admin mantém a projeção pública. Consulta/auditoria privada entregue no item 9.

Confirmação exige supportRefs não vazio, sem repetições: stance é apoio ativo/visível da mesma ocorrência e de outro autor; contribution é suplemento observation visível da mesma ocorrência e independente do criador; occurrence é relacionada por vínculo já existente, visível, sem duplicata/descarte e de outro autor. D01 impede o revisor de decidir contribuição/ocorrência de sua autoria usadas como referência. O apoio próprio de um admin continua sujeito a D04 (independência do criador); não há restrição adicional de votos. contestAssessments deve corresponder exatamente às contestações ativas visíveis, sem ausentes/extras/repetições; cada assessment tem 20–1000 caracteres. Sem contestações pode omitir ou enviar []. Avaliação humana da pertinência não é inferida por contagem.

Monitoring exige updateId de suplemento visível; closed exige suplemento resolution e closureReason=resolved. Podem ser contribuições do criador, revisadas por admin independente. Discarded exige discardReason=invalid/out_of_scope e motivo. Reabertura só de closed/discarded para community_review, com reopenRequestId de pedido visível pending. A mesma operação aceita o selecionado, marca demais pending como superseded (inclusive preservados sob moderação), grava eventos por pedido e limpa closureReason/discardReason; versão do pai incrementa uma vez para esta operação composta. Textos/datas originais permanecem. Referências/pareceres/snapshots são guardados em referencesJson privado.

### Pedidos necessários à reabertura

POST /occurrences/:id/contributions aceita type=reopen_request, text de 20–3000 após trim, sem kind. Exige conta, pai visível closed/discarded, sem duplicata, expectedVersion e no máximo um pedido pending por usuário/ocorrência. Texto representa fato novo a ser examinado pelo administrador; não reabre automaticamente. UUID/autor/datas/visibility/pending vêm do servidor. Índice único existente garante unicidade; conflito ou segundo pending=409. Texto é imutável (PATCH=404); rejeição administrativa entregue no item 9.

GET de contribuições agora inclui pedidos e requestStatus (pending/accepted/rejected/superseded somente em pedido, null em outros/ocultos), mais seus anexos. Conteúdo oculto não revela status/autor/texto/imagens. POST/DELETE de imagens permite autor do pedido até 24h inclusivas enquanto pending, com pai terminal visível e sem duplicata; ao aceitar/substituir ou reabrir, novas alterações de imagens são bloqueadas. Reutiliza assinatura, decodificação, remoção de metadados, limites e armazenamento privado existentes. Primeiro salva pedido, depois imagens; falha conserva pedido e pendências. Leitura permanece pública conforme visibilidade após tratamento; nenhuma exclusão física.

## Operacionalização da área administrativa — item 9

As consultas com includeHidden=true exigem sessão atual de administrador em cada rota (401 ausente/expirada, 403 papel comum), inclusive arquivos. Sem a opção, permanece a projeção pública. Lista administrativa aceita os filtros category/status e visibility=visible/hidden, paginação padrão e includeDuplicates; visibility sem includeHidden=true retorna 403. Detalhes privados acrescentam visibility; contribuições/manifestações privadas acrescentam visibility e conservam conteúdo; manifestações privadas incluem inativas para auditoria. Anexos privados acrescentam visibility, withdrawnAt, contributionId e uploaderId, nunca storageKey; fileUrl exige includeHidden=true. Histórico administrativo acrescenta entityType/entityId/actorId, before/after/references/correlationId sem chave de arquivo ou eventos de denúncia. GET /admin/reopen-requests é administrativo e paginado, lista pedidos pending com versão/estado/visibilidade/vínculo do pai. Rejeição registrada não transiciona estado. Denúncias próprias/admin são privadas; sua decisão inclui motivo/revisor/data e incrementa versão do pai. Conteúdo já oculto pode ser revisto em denúncias concorrentes sem repetir moderação do alvo.

### Escritas administrativas entregues

POST /occurrences/:id/corrections valida somente os seis campos D02, changes não vazio, reason obrigatório e expectedVersion. Admin independente pode corrigir pai oculto ou qualquer estado, preservando autor, id, datas originais, simulated, status, vínculos e motivos terminais. D07 mantém correção bloqueada em duplicata (409). Retorna detalhe privado/occurrenceVersion. Corpo até 32000 bytes; demais ações administrativas até 8192 bytes. Não oferece edição de contribuições, manifestações, legendas, datas ou papéis alheios.

POST /reports gera id/autor/status pending/datas no servidor, infere occurrenceId pelo alvo visível (inclusive duplicata). Alvos inválidos=422, inexistentes/ocultos/retirados/inativos ou pai oculto=404, segundo pending próprio por alvo=409. GET /reports exige sessão, filtra status e pagina ASC createdAt,id: usuário vê somente próprias; admin vê todas, inclusive conteúdo que ficou oculto. DTO: id,occurrenceId,reporterId,targetType,targetId,reason,status,reviewerId,decisionReason,decidedAt,createdAt,updatedAt; lista acrescenta occurrenceVersion atual. Sem denúncia pública, ocultação automática ou exposição em histórico de conteúdo.

POST /reports/:id/decision exige admin diferente do denunciante, do autor do alvo e do autor da ocorrência. dismissed conserva visibilidade; upheld oculta alvo e grava evento hidden separado quando ainda visível. Se alvo já oculto, revisa denúncia concorrente sem repetir ocultação nem evento do alvo. Decisão/visibilidade/eventos/versão têm commit único. Repetir decisão retorna 409. Resultado inclui denúncia privada e occurrenceVersion.

POST /moderation oculta/restaura diretamente os quatro tipos com motivo, independência e versão. Visibilidade repetida=409; não exclui dados/arquivos, não transiciona estado e não remove retirada. Restaurar filho não contorna pai oculto. Resposta {data:{id,occurrenceId,visibility},occurrenceVersion}. Todas as escritas exigem Origin exato/JSON/sessão atual; 401/403/404/409/422 e falha interna seguem convenções.

POST /contributions/:id/reopen-decision aceita somente decision=rejected, pending e admin independente, com motivo/versionamento/evento reopen_rejected. Não transiciona estado; novo pedido com fato novo pode ser publicado depois, respeitando D05. Aceitação continua exclusivamente na transição existente. Gestão de duplicatas/relações entregue no item 10 abaixo; reset HTTP permanece ausente; item 14 oferece somente ferramenta local restrita à apresentação, conforme DEMONSTRACAO.md.

## Gestão de vínculos — item 10 original

Implementadas as seis rotas D07 de duplicates/duplicate/relations. GET retorna {data,page,pageSize,total,occurrenceVersion}, ASC createdAt/id; cada item contém id,title,description,status,version,createdAt,duplicateOfId. Somente destinos visíveis entram em data/total públicos; pai oculto=404. includeHidden=true exige admin e acrescenta visibility, incluindo destinos ocultos. Sem opção, sessão admin conserva projeção pública. Cache-Control:no-store.

PUT duplicate, DELETE duplicate, POST relations e DELETE relations/:relatedId exigem Origin, JSON, sessão administrativa atual e corpo com expectedVersions exatamente dos dois ids, ambos inteiros positivos seguros; campo desconhecido=422. Motivo 20–1000 Unicode após trim; limite de corpo 8192 bytes. Retornam 200 {data:descritor do vínculo,versions:{id:version}}, com incremento dos dois registros. data em duplicate: {duplicateId,principalId}; relation: {leftId,rightId,createdBy,reason,createdAt} (descritor removido no DELETE). Eventos privados preservam snapshots; histórico público contém somente ação/responsável/data/motivo, sem ids de destino extraídos de snapshots.

Visitante=401; usuário comum/admin autor de qualquer registro=403; inexistência e visibilidade incompatível=404; autorrelação, principal mais nova, terminal na duplicação, cadeia/ciclo/filhos/relações da origem, vínculo repetido/ausente, condição de relação incompatível e versão antiga=409. Campos/versões/motivo inválidos=422. Desvinculação usa principal atual do banco e aceita principal ocultada/terminal; não permite escolher novo destino no DELETE. Troca exige desvincular e depois novo PUT, cada ação auditada. Criar/remover relação exige dois registros visíveis, não descartados, sem duplicateOfId; closed é permitido. Correção da principal preserva filhos e não transfere conteúdo; duplicar principal com filhos é bloqueado. Quantidades e estados sempre próprios, sem soma automática.

## Revisão integrada de histórico e encerramento — item 11 original

Sem serviço de transição/histórico novo. Detalhe ganha closure:null fora de closed, ou {eventId,reason,username,createdAt,resolution:{id,available,username,text,createdAt}} quando há evento de encerramento existente. Escolhe o encerramento mais recente pela versão em afterJson (desempate createdAt/id). Motivo/responsável/data são os campos públicos desse evento; resolução consulta o complemento atual da mesma ocorrência, tipo supplement/resolution, visível. Nunca publica snapshot antigo. Se fundamento está oculto/inexistente/incompatível, available=false e demais campos de resolution=null. Pai oculto continua 404 publicamente; projeção closure é null para pai oculto até mesmo na consulta administrativa (snapshot autorizado permanece na auditoria existente). Sem evento anterior válido, closure=null e interface indica ausência de fundamento público, sem fabricar evento retroativo.

Histórico público mantém exatamente id/action/createdAt/username/reason/fromStatus/toStatus e paginação da API. Entidade/id/snapshots/referências permanecem exclusivos da auditoria administrativa; denúncias/criação/decisão permanecem privadas em reports e não entram em data/total de histórico de conteúdo. Retirada textual segue D05 por denúncia/moderação: nenhuma rota DELETE de comentários/complementos é introduzida. Histórico no navegador usa páginas de 20 eventos, ordem ASC createdAt/id e abre a última página para mostrar a ação recente, com navegação anterior/próxima sem perder conteúdo já consultado.

## Google opcional

GET /api/v1/auth/google/config retorna data.enabled e clientId quando disponível. POST /google/challenge com {} cria cookie HttpOnly e retorna data.nonce/clientId; dez minutos. POST /google/verify {credential} verifica token/nonce/contexto: data.user para conta recorrente, ou data.needsUsername=true para primeiro acesso. POST /google/complete {username} consome pendência validada, cria user sem senha e sessão local; username indisponível=409 sem vincular conta. POST /google/cancel {} remove pendência e limpa cookie, sem encerrar sessão local. Escritas exigem Origin exato e JSON; campos extras rejeitados, rate limit, no-store. Configuração ausente=503 nas operações, config.enabled=false; token inválido/nonce/fluxo expirado=401, fluxo usado=409, provedor sem rede=503. Dados de perfil, role e e-mail enviados pelo cliente não são aceitos. Google não adiciona endpoint de promoção ou vinculação.

## Firebase Auth

GET `/api/v1/auth/firebase/config` retorna somente `data.enabled`. POST `/firebase/verify {idToken}` aceita ID token do SDK Web, valida-o com Firebase Admin e retorna `data.user` para identidade recorrente ou `data.needsUsername=true` com cookie de pendência HttpOnly/Strict de dez minutos. POST `/firebase/complete {username}` cria a conta `user` sem senha e emite a sessão local; POST `/firebase/cancel {}` invalida a pendência. Todas as escritas exigem Origin exato, JSON, limite de tentativas e `no-store`; campo extra, claim de papel, provedor diferente de `google.com`, projeto/emissor divergente e token inválido são recusados. O token não é salvo nem devolvido.

## Exploração cartográfica e preferências

POST de ocorrência passa a aceitar `environmentalRepresentation` apenas nas combinações públicas D13, sempre `accuracy=approximate`, GeoJSON dentro da caixa e até 50 posições. PATCH comum continua recusando o campo. Listagens aceitam `includeDuplicates=true` para a coleção recorrente já contratada.

Rotas `/account/*` têm `Cache-Control: no-store`; ausência de sessão=401, alvo alheio=404, Origin divergente=403 e JSON/campos inválidos=422. Respostas não incluem snapshots privados. Notificação contém eventId, occurrenceId, action, createdAt, reason público, título atual e tipo do acompanhamento; ocultos deixam de aparecer.


## Autenticação prioritária — 22/10/2026

Solicitação explícita posterior autoriza e-mail privado e senha no cadastro, apelido público único, entrada por e-mail ou apelido (preservando contas existentes), sessão local HttpOnly e Google opcional sem vínculo automático. Cadastro encaminha à entrada. O e-mail nunca integra projeções públicas. Recuperação e verificação usam links de uso único, expiração e transporte externo configurável; sem transporte, a interface informa indisponibilidade e não simula envio. Android aproveita o fluxo web responsivo existente, sem recriar APK. Esta autorização substitui a proibição anterior de e-mail/recuperação somente no gerenciamento de contas.

### Contrato de contas por e-mail

`POST /api/v1/auth/register`: `{username,password,email}`; e-mail normalizado, privado e único. `email` opcional apenas para compatibilidade com os clientes legados. O formulário atual exige e-mail. `POST /auth/login` mantém `{username,password}` e aceita e-mail no campo `username`. Cadastro retorna 201 sem iniciar sessão. Nenhuma projeção pública inclui e-mail.

- `GET /api/v1/auth/account/config`: `{data:{emailEnabled}}`, sem segredos.
- `GET /api/v1/auth/account`: sessão obrigatória; `{data:{email,verified,emailEnabled}}`, `no-store`.
- `POST /api/v1/auth/password/request`: `{email}`, 204 genérico quando disponível, inclusive conta ausente.
- `POST /api/v1/auth/password/reset`: `{token,password}`, 204, revoga todas as sessões.
- `POST /api/v1/auth/email/request`: `{}`, sessão obrigatória, solicita link de verificação.
- `POST /api/v1/auth/email/verify`: `{token}`, 204.

Escritas exigem Origin exata, JSON, limites de tamanho/tentativas; token inválido/expirado/reutilizado retorna 422. Sem transporte ou com falha de envio: 503 explícito. Tokens de 32 bytes aleatórios são guardados apenas como SHA-256, com finalidade e validade (30 minutos para redefinir, 24 horas para verificar). Consumo e atualização são atômicos. Links usam fragmento, retirado da URL ao abrir o diálogo; nenhum consumo acontece por GET. Verificar e-mail não muda permissões nem impede uso inicial da conta.

Senhas de cadastro, entrada e redefinição: 8–128 caracteres, sem exigir combinação de tipos de caracteres; senhas existentes permanecem válidas.


## Cadastro simples — solicitação posterior de 22/10/2026

A interface oferece somente cadastro e entrada por apelido e senha, com confirmação da senha no cadastro e mínimo de oito caracteres. Retirados campos/botões de Google, e-mail e gerenciamento por e-mail da interface. Contas, vínculos e dados persistidos permanecem preservados; serviços anteriores mantidos para compatibilidade, sem exposição no fluxo simples.
