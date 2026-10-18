# Modelo de dados — versão 1.0
Contrato alvo; esquema, migrações e código da consulta pública implementados. Criação/edição do autor, comentários/complementos e suas imagens e manifestações implementados; transições e pedidos de reabertura implementados no item 8; área administrativa entregue no item 9; gestão de vínculos implementada no item 10; limitações da verificação estão em PLAN. DOMAIN prevalece sobre detalhes de armazenamento.

Na preparação Firebase, nenhuma coleção remota é autoritativa. As regras locais negam leitura/escrita direta até existir uma migração verificada que preserve IDs, versões, relações, eventos imutáveis e atomicidade equivalente a `domainTransaction`. Storage permanece igualmente fechado até preservar validação e autorização de D06.

## Convenções
IDs TEXT UUID gerados pelo servidor, exceto occurrence.id público sequencial CA-000001 (sequência transacional, sem MAX+1 fora de transação). Datas TEXT ISO UTC; booleanos INTEGER 0/1; códigos de domínio persistidos em inglês. FKs com exclusão RESTRICT. Toda entidade tem createdAt; mutáveis têm updatedAt. Texto validado pela aplicação e invariantes estruturais por CHECK/UNIQUE/FK. Não persistir segredos em eventos.

| Tabela | Campos principais além de id/datas | Restrições |
| --- | --- | --- |
| users | username, passwordHash, passwordSalt, passwordParams, role | username UNIQUE normalizado; role user/admin |
| sessions | userId, tokenHash, expiresAt | tokenHash UNIQUE; FK user; segredo original nunca persistido |
| occurrences | authorId, title, description, category, latitude, longitude, locationLabel, status, simulated, visibility, version, duplicateOfId, closureReason, discardReason | D02; simulated=1; version>=1; FK author/duplicate; duplicate!=id |
| contributions | occurrenceId, authorId, type, kind, text, visibility, requestStatus | type comment/supplement/reopen_request; kind observation/resolution só supplement; requestStatus pending/accepted/rejected/superseded só pedido |
| stances | occurrenceId, userId, type, reason, active, visibility | UNIQUE(occurrenceId,userId); type support/contest; versão anterior via eventos |
| attachments | occurrenceId, contributionId opcional, uploaderId, storageKey, mediaType, byteSize, width, height, caption, visibility, withdrawnAt | Pai occurrence ou contribution da mesma occurrence; storageKey UNIQUE; D06 |
| occurrence_relations | leftId, rightId, createdBy, reason | PK(leftId,rightId); leftId<rightId; ambos FK occurrences; delete apenas vínculo, auditado |
| reports | occurrenceId, reporterId, targetType, targetId, reason, status, reviewerId, decisionReason, decidedAt | status pending/dismissed/upheld; UNIQUE parcial por autor/alvo onde pending |
| events | occurrenceId, entityType, entityId, actorId, action, reason, beforeJson, afterJson, referencesJson, correlationId | Append-only; sem updatedAt; ator FK ou system em seed/migração |
| schema_migrations | version, appliedAt | version única; migração aplicada não editada |

Migração 004 acrescenta `occurrences.environmentalRepresentationJson`, nullable e com JSON válido, para metadado cartográfico demonstrativo. O objeto validado contém `type`, geometria GeoJSON compatível, `accuracy=approximate|verified` e, somente em qualidade da água, medição pH entre 0 e 14. `NULL` mantém o pin por coordenada. A projeção pública converte o JSON em `environmentalRepresentation`; snapshots e eventos de criação preservam o mesmo valor. A migração é aditiva e não preenche nem reclassifica registros existentes.

Migração 005 acrescenta preferências privadas, sem alterar ocorrências/eventos existentes:

| Tabela | Campos principais | Restrições |
| --- | --- | --- |
| subscriptions | userId, kind, occurrenceId, label, geometryJson, radiusMeters, createdAt, updatedAt | kind occurrence/place/area; alvo exclusivo e válido; ocorrência FK; GeoJSON privado validado |
| saved_queries | userId, name, queryJson, createdAt, updatedAt | nome 3–60; JSON público validado; máximo 20 por conta |
| notification_reads | userId, eventId, readAt | PK(userId,eventId); FKs para conta/evento |

Atualizações não são copiadas: a leitura combina acompanhamentos com `events`/`occurrences`; `notification_reads` conserva apenas a confirmação privada de leitura. Remover acompanhamento/consulta apaga somente a preferência pertencente à conta, nunca ocorrência, evento ou anexo.

visibility=visible/hidden em ocorrência, contribuição, manifestação e anexo. Sessões/report não têm visibilidade pública. Integridade de alvo polimórfico em reports e events é validada pelo serviço na mesma transação; reports também guarda occurrenceId para escopo. Uma denúncia aberta por alvo/autor e um pedido pending por ocorrência/autor usam índices únicos parciais. FK contributionId não basta: verificar que corresponde à occurrenceId do anexo.

## Eventos e leitura
Toda alteração dentro da ocorrência incrementa sua version, inclusive edição de filho e criação/decisão de denúncia. Events.beforeJson/afterJson preservam somente dados de domínio relevantes; decisões registram ids de suporte e pareceres de contestações. A referência de decisão contém também snapshot da versão usada, para alteração posterior não reescrever justificativa. Remoção de vínculo registra antes e depois=null.

Projeção pública expõe ação, data, nome de usuário fictício quando apropriado e motivo público. Nunca expõe corpo antigo oculto, dados de denúncia, senhas, tokens ou hashes. Evento de denúncia é privado; público pode ver apenas a moderação resultante sem denunciante. API administrativa pode consultar revisões antigas para auditoria. Conteúdo oculto no pai impede leitura de filhos e arquivos. Histórico é ordenado por createdAt,id; contadores de manifestações incluem somente active=1 e visible, da própria ocorrência.

Índices: occurrences(status,category,createdAt,id), occurrences(duplicateOfId), contributions(occurrenceId,createdAt,id), events(occurrenceId,createdAt,id), reports(status,createdAt), sessions(expiresAt). Categoria CHECK residuos/agua. Conversão de rótulos pertence ao adaptador/UI.

## Migração de fixtures
Quatro fixtures históricas são exemplos estáticos preservados para testes antigos; o frontend consulta somente a API. Na troca, construir seed com contas fictícias, descrições, coordenadas e histórico coerente com D03; não importar cegamente “Estado demonstrativo” como prova de transição. IDs CA-001 antigos podem ser preservados no seed para links existentes; sequência nova inicia em CA-000005. Não oferecer fallback silencioso para fixtures quando a API falhar: mostrar erro e tentar novamente.

## Detalhes de armazenamento da base implementada
Migração 001 usa tabelas STRICT. `occurrence_sequence(singleton=1,nextValue)` controla a numeração, acessível somente em transação pela primitiva de IDs; inicia em 1 numa base sem seed e passa a 5 junto do seed que reserva CA-001–CA-004. Rollback devolve o número reservado. `events.actorId=NULL` representa system; atores humanos mantêm FK para users. O seed usa atores humanos fictícios, sem criar conta system. Anexos têm FK composta para garantir que contribuição e ocorrência correspondam. A relação tem chave composta, sem id artificial ou updatedAt, e é removida/recriada pelos serviços auditados de vínculos. Eventos não admitem UPDATE/DELETE.

Autoria, prazo, estado, vínculo, visibilidade e versão de criação/edição são validados pelo serviço de escrita. Transições são validadas pelo serviço transitions; alvos de denúncias são validados pelo serviço administration; o esquema e a primitiva transacional não os substituem. A consulta pública tem projeção própria, definida em API, sem snapshots ou eventos de entidade report. O seed prepara uma linha do tempo fechada, não expõe transições ao usuário. Nenhuma credencial integra seus eventos.


Criação reserva id e grava ocorrência received/version=1 com evento created e snapshot posterior na mesma transação. Edição registra beforeJson/afterJson, ator e evento edited, incrementa version e atualiza updatedAt. Falha de evento devolve também a sequência de criação. Snapshots permanecem restritos ao banco; histórico HTTP público não os entrega. Não há nova migração nesta entrega: o esquema 001 atende a Etapa 2 e não foi reescrito.

## Persistência de imagens do relato original — item 5

A tabela attachments da migração 001 é usada sem reescrever migrações. No item 5 contributionId=NULL; no item 6 anexos de complementos guardam o id do complemento da mesma ocorrência. Imagens de pedidos pending estão entregues no item 8. id/storageKey são gerados pelo servidor; storageKey tem UUID e extensão interna jpeg/png/webp. mediaType, byteSize, width e height descrevem a imagem reencodada, não o original. Caption é texto validado após trim, usado como legenda e alt; nome original e metadados não são persistidos.

Inserção e evento attachment_added, incremento da versão e updatedAt do pai estão na mesma transação. Retirada atualiza withdrawnAt/updatedAt, gera evento withdrawn com before/after e incrementa versão do pai; mantém linha e arquivo para auditoria. Até cinco linhas originais não retiradas por ocorrência, incluindo ocultas; retirada libera vaga. Snapshots e storageKey continuam privados. Projeção pública de anexo oculto/retirado é marcador; pai oculto bloqueia todos os arquivos. A limpeza consulta todas as chaves referenciadas, inclusive ocultas/retiradas; estratégia dos arquivos em ARCHITECTURE.

## Comentários e complementos — item 6 original

Reutiliza contributions/attachments da migração 001 e seus CHECKs/FKs, sem editar migração aplicada nem exigir nova migração estrutural. Serviço cria UUID, authorId, createdAt/updatedAt, visibility=visible, requestStatus=NULL. type=comment exige kind=NULL; type=supplement exige observation/resolution. Edição mantém id/autor/tipo/kind/data original, altera text/updatedAt. Prazo conta da criação da contribuição, não do relato.

Eventos commented/supplemented têm snapshot posterior; contribution_edited preserva antes/depois. Gravação/evento/versão/updatedAt do pai usam a mesma transação immediate. Texto não tem retirada direta nem nova coluna withdrawnAt: D05 remete a solicitação/denúncia/moderação futuras. Arquivo de complemento pode ser retirado sob D06 e permanece privado para auditoria. Limite de cinco imagens ativas conta por contributionId; imagens originais e de outros complementos são independentes. FK composta e checagem do serviço impedem anexar a outro relato. Texto e imagens de complemento oculto não entram na projeção pública, mas permanecem no banco/disco para auditoria futura.

## Apoio e contestação — item 7 original
Reutiliza stances da migração 001: UNIQUE(occurrenceId,userId) garante uma linha por par mesmo inativa, portanto uma única posição ativa. Nenhuma migração aplicada é alterada. UUID, autoria e datas vêm do servidor. Substituição/reativação mantêm id/userId/createdAt, atualizam type/reason/active/updatedAt; retirada altera active/updatedAt, sem exclusão física ou restauração de visibilidade. Eventos stance_created, stance_replaced e stance_withdrawn preservam snapshots antes/depois na mesma transação do incremento de version/updatedAt do pai. Justificativa fica em snapshots privados, não em events.reason público. Lista ativa inclui marcador oculto sem conteúdo/autor/tipo; counts usa somente active=1/visibility=visible da própria ocorrência.

## Estados e reabertura — item 8 original

Migração 001 já contempla os seis estados, CHECKs de closureReason/discardReason, contributions.reopen_request/requestStatus e índice único parcial de pending. Reutilizada intacta: nenhuma migração estrutural necessária, banco recriado ou dado preexistente modificado na preparação. Transição altera status e razões terminais, version/updatedAt; evento transition contém snapshots anterior/posterior, actorId, createdAt, reason e referências com occurrenceVersion/snapshot e parecer individual de contestação. Snapshots e referências permanecem privados; histórico público extrai apenas fromStatus/toStatus de transition.

Pedido é contribuição imutável com kind=NULL, requestStatus=pending e texto de fato novo. Reabertura aceita pedido visível selecionado e marca demais pending superseded; gera eventos reopen_accepted/reopen_superseded com antes/depois no mesmo commit e incremento único da versão do pai para a operação composta. Evento reopen_requested na criação é atômico com pedido/version. Anexos usam FK composta e armazenamento existentes; até cinco imagens por pedido, autoria/prazo/pending/estado dos pais verificados no servidor. O serviço não escreve transição automática a partir de posição ou contribuição.

## Administração — item 9 original

Reutiliza reports e visibilidade/versionamento/events da migração 001, intacta: nenhuma alteração estrutural exige nova migração. Serviço valida alvo polimórfico/escopo, autoria, visibilidade e índice único parcial pending na mesma transação immediate. reported/report_decided são eventos privados com snapshots sem reporterId; ator continua FK interna, nunca no histórico público. A fila privada de denúncias guarda motivo/revisor/decisão/data e autor autorizado. upheld compõe report_decided e hidden em um único incremento de versão; alvo já oculto só recebe a decisão privada.

Correção gera corrected com antes/depois completos de domínio, motivo, responsável e data. Ocultação/restauração gera hidden/restored no alvo com snapshots; não altera status, active, withdrawnAt, requestStatus nem vínculo. Rejeição gera reopen_rejected e muda apenas requestStatus/updatedAt, com versão do pai e evento atômicos. Nenhum DELETE físico/limpeza de arquivo referenciado. Histórico privado exclui eventos de denúncia e chaves de disco, preservando auditoria de conteúdo; decisões privadas são consultadas em reports. Projeção pública permanece sem snapshots/corpo oculto/denunciante.

## Vínculos — item 10 original

Migração 002_relations_reverse_index adiciona occurrence_relations(rightId,leftId) para a consulta simétrica, conservando 001 e todas as tabelas/dados aplicados. DuplicateOfId existente guarda apenas a principal; não muda status/autor/conteúdo. Serviço links valida principal mais antiga, ausência de filhos/cadeias/ciclos/relações da origem e condições D07 sob bloqueio immediate. Relação usa PK ordenada existente; orientação inversa representa o mesmo vínculo e não pode duplicá-lo.

Eventos duplicate_linked/duplicate_removed/relation_added/relation_removed em entidade relation são gravados para os dois occurrenceId, com mesmos before/after e correlationId. Remoção preserva before e after=null, removendo somente FK/vínculo, nunca relatos/filhos/arquivos. Ambas versões/updatedAt incrementam no mesmo commit. Rolagem/consulta não produz evento. Dados de vínculos ocultos só na consulta administrativa; totais públicos excluem alvos ocultos. Reaplicar migração preserva banco preenchido; nenhum reset necessário.

## Revisão integrada do item 11 original

Nenhuma tabela, coluna ou migração nova: a projeção `closure` do detalhe deriva do evento `transition` existente para `closed`, selecionado pela maior versão em `afterJson`, com desempate por data/id. O motivo, responsável e instante vêm desse evento; o fundamento público vem da contribuição atual referenciada, pertencente ao mesmo pai, visível, `supplement/resolution`. Snapshot privado não é fonte de texto público. Fundamento indisponível retorna apenas `available:false` e campos nulos; pai oculto não recebe essa projeção pública. Encerramento legado sem evento retorna `closure:null`, sem gravação retroativa.

As tabelas de eventos, versões e referências continuam sob as transações existentes. Denúncias/decisões continuam na auditoria privada de denúncias; não são acrescentadas à linha do tempo pública ou à auditoria de conteúdo. Retirada textual segue solicitação/denúncia e moderação (D05), sem exclusão física ou endpoint novo de retirada.

Em 09/10/2026, a base configurada padrão `data/cuidacao.sqlite` existia sem tabelas/registros. `npm run db:migrate` aplicou 001 e 002 nela, sem seed/reset/recriação. Todas as tabelas de domínio permaneceram vazias. Não há migração pendente para este item. Bases temporárias preenchidas e reinícios são verificados pelos testes; não substituem a inspeção da base de uso.

## Apresentação isolada — item 14

Sem migração nova nem alteração de registros da base de uso. demo:prepare aplica 001/002 em banco exclusivo vazio e constrói oito cenários pelos serviços existentes: três moradores, dois administradores locais, nove imagens referenciadas, 48 eventos iniciais. Papéis administrativos são provisionados localmente; cadastro/API não os concedem. Não se fabricam eventos nem se alteram datas.

current contém banco, uploads privados, credenciais e índice inicial dos cenários. initial e backups contêm snapshot SQLite, arquivos referenciados inclusive reservados, credenciais e manifesto SHA-256/tamanhos. Validação exige integridade/FKs e correspondência entre linhas de anexos e arquivos; restaurar/resetar limpa sessões sem mudar conteúdo/eventos/datas. Retenção e controle público continuam os do domínio; nenhum anexo oculto passa a ser estático. DEMO/ARCHITECTURE descrevem guarda de diretório, lock e publicação.

## Google — migração 003

users preserva colunas/IDs/roles/datas, permitindo passwordHash/passwordSalt/passwordParams todos NULL para contas federadas, ou todos preenchidos para senha local. google_identities(provider,subject,userId,createdAt): PK(provider,subject), provider=google, UNIQUE(userId,provider), FK users. E-mail/nome/foto não armazenados. google_flows(tokenHash,nonce,subject nullable,expiresAt): desafio persistido, cookie opaco, dez minutos; subject preenchido somente depois de token validado. Consumo/cadastro/identidade/sessão na mesma transação. Limpeza das pendências expiradas; sem tokens Google armazenados. Nenhuma identidade Google entra no histórico público/ocorrências.

## Firebase Auth — migração 006

`firebase_identities(uid,userId,createdAt)` mantém uma identidade Firebase por conta local, com FK restritiva e sem e-mail, perfil, token ou papel externo. `firebase_flows(tokenHash,uid,expiresAt)` guarda apenas a pendência opaca de primeiro acesso por dez minutos. Criação de usuário, identidade, consumo da pendência e sessão local compartilham uma transação; a migração é aditiva e não altera usuários, sessões ou identidades Google existentes.
