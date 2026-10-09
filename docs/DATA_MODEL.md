# Modelo de dados — versão 1.0
Contrato completo alvo. Migração 001-core implementa users, sessions, occurrences, contributions (para seed), events, schema_migrations e sequência de IDs. Stances, attachments, relations e reports serão adicionados em migrações posteriores. DOMAIN prevalece sobre detalhes de armazenamento.

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

visibility=visible/hidden em ocorrência, contribuição, manifestação e anexo. Sessões/report não têm visibilidade pública. Integridade de alvo polimórfico em reports e events é validada pelo serviço na mesma transação; reports também guarda occurrenceId para escopo. Uma denúncia aberta por alvo/autor e um pedido pending por ocorrência/autor usam índices únicos parciais. FK contributionId não basta: verificar que corresponde à occurrenceId do anexo.

## Eventos e leitura
Toda alteração dentro da ocorrência incrementa sua version, inclusive edição de filho e criação/decisão de denúncia. Events.beforeJson/afterJson preservam somente dados de domínio relevantes; decisões registram ids de suporte e pareceres de contestações. A referência de decisão contém também snapshot da versão usada, para alteração posterior não reescrever justificativa. Remoção de vínculo registra antes e depois=null.

Projeção pública expõe ação, data, nome de usuário fictício quando apropriado e motivo público. Nunca expõe corpo antigo oculto, dados de denúncia, senhas, tokens ou hashes. Evento de denúncia é privado; público pode ver apenas a moderação resultante sem denunciante. API administrativa pode consultar revisões antigas para auditoria. Conteúdo oculto no pai impede leitura de filhos e arquivos. Histórico é ordenado por createdAt,id; contadores de manifestações incluem somente active=1 e visible, da própria ocorrência.

Índices: occurrences(status,category,createdAt,id), occurrences(duplicateOfId), contributions(occurrenceId,createdAt,id), events(occurrenceId,createdAt,id), reports(status,createdAt), sessions(expiresAt). Categoria CHECK residuos/agua. Conversão de rótulos pertence ao adaptador/UI.

## Migração de fixtures
As quatro fixtures agora servem de referência para o seed; a interface consulta a API e não importa as fixtures. Na troca, construir seed com contas fictícias, descrições, coordenadas e histórico coerente com D03; não importar cegamente “Estado demonstrativo” como prova de transição. IDs CA-001 antigos podem ser preservados no seed para links existentes; sequência nova inicia em CA-000005. Não oferecer fallback silencioso para fixtures quando a API falhar: mostrar erro e tentar novamente.
