# Contrato HTTP — versão 1.0
Contrato completo alvo. Implementadas nesta entrega: register/login/me/logout; GET/POST occurrences; GET/PATCH occurrences/:id; GET occurrences/:id/history. Demais rotas da tabela permanecem futuras. Sucesso e falhas seguem as convenções abaixo.

A leitura desta etapa retorna os campos da ocorrência e autoria fictícia. Contagens de participação e flags de suporte serão implementadas junto das respectivas capacidades. Histórico público expõe ação, ator, data e motivo, sem snapshots; auditoria includeHidden é restrita a administradores.

## Convenções
Prefixo /api/v1, JSON UTF-8, datas UTC ISO 8601, nomes camelCase e códigos de DOMAIN. Sucesso: {data: objeto}; listas: {data: [], page, pageSize, total}. Paginação começa em 1, pageSize padrão 20, máximo 100; ordenação ocorrências createdAt DESC,id DESC, filhos/histórico ASC. Filtros categoria e estado são combinados com E; valor desconhecido retorna 422. Strings/limites em DOMAIN; campos desconhecidos rejeitados. Resposta nunca contém campos de senha/sessão.

Falhas: {error:{code,message,fields?}}, com message em pt-BR e fields como mapa campo→mensagem. 400 JSON/multipart inválido; 401 sessão ausente/expirada; 403 permissão/origem; 404 inexistente ou oculto ao solicitante; 409 estado, vínculo, unicidade ou versão conflitante; 413 tamanho; 415 tipo de mídia; 422 conteúdo/campos inválidos; 429 limite de tentativas. Falha interna: 500 genérico com requestId, sem stack/SQL/caminhos.

Toda escrita vinculada a ocorrência exige expectedVersion no corpo; multipart usa campo textual inteiro. Ações com duas ocorrências exigem expectedVersions:{id:version} para ambas. Missing version=422, conflito=409; resposta informa versões resultantes. Criar ocorrência/auth não têm expectedVersion. Escritas retornam 200; criação retorna 201, exclusão de sessão 204. DELETE de vínculo/manifestação aceita corpo JSON com versões/motivo quando exigido. Retries não são automáticos: reler estado antes de reenviar. Botão de envio fica desabilitado enquanto pendente.

Leituras públicas aplicam D08; admin usa as mesmas rotas com includeHidden=true, nunca disponível ao usuário comum (403). Sem includeHidden, admin recebe projeção pública. Autenticação e mutações validam Origin conforme ARCHITECTURE. Não aceitar authorId/role/status/simulated em criação/edição comum.

## Rotas e corpos
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
| POST /occurrences/:id/contributions | Sessão | {expectedVersion,type,text,kind?}; comment/supplement/reopen_request; D05 |
| PATCH /contributions/:id | Autor permitido | {expectedVersion,text}; edição de comentário/complemento; kind/type imutáveis |
| GET /occurrences/:id/stances | Público | Manifestações visíveis ativas, paginadas; autor fictício, tipo e justificativa |
| PUT /occurrences/:id/stance | Sessão | {expectedVersion,type,reason}; cria/substitui manifestação própria; D05 |
| DELETE /occurrences/:id/stance | Sessão | {expectedVersion}; retira própria; se já inativa retorna atual sem novo evento |
| POST /occurrences/:id/attachments | Autor permitido | Multipart file,caption,expectedVersion,contributionId opcional; D06 |
| GET /occurrences/:id/attachments | Público | Metadados de anexos do relato original; anexos de contribuição vêm na contribuição |
| GET /attachments/:id/file | Público conforme visibilidade | Binário validado; oculto/retirado=404 para público; admin com includeHidden pode auditar |
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
