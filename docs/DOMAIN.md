# Domínio e regras — versão 1.0
07/10/2026 • normativa para a versão de apresentação; escrita ainda não implementada.

## D01 — Identidade e acesso
Visitante consulta conteúdo público. Conta ativa tem papel user ou admin; cadastro sempre cria user. Usuário: identificador público fictício de 3–30 caracteres ASCII minúsculos, números ou sublinhado, único após normalização para minúsculas; senha de 12–128 caracteres, sem remoção de espaços. Não coletar nome civil, e-mail, CPF, endereço residencial ou comprovação de residência. Cadastro não inicia sessão: encaminha para login. Administração é atribuída apenas pela preparação local da demonstração, nunca por campo do cadastro ou botão público.

Admin pode participar como usuário, mas não pode confirmar, descartar, encerrar, reabrir, corrigir administrativamente ou moderar sua própria ocorrência/contribuição. Outro administrador decide; seed inclui dois administradores. Na revisão de denúncia, o revisor não pode ser denunciante nem autor do conteúdo. A vinculação administrativa também não pode envolver ocorrências de autoria do revisor. Não há gestão de papéis ou bloqueio de contas na interface desta versão.

## D02 — Ocorrência e entrada
Ocorrência é um registro de um problema observado em um local; não constitui comprovação científica. Campos obrigatórios: category (Resíduos ou Água), description (20–3000 caracteres após trim), latitude e longitude finitas. locationLabel é opcional, até 120 caracteres. Título opcional, 5–100 caracteres quando informado; se omitido, servidor gera “{categoria} — {id}”. id, autor, createdAt, updatedAt, version=1 e simulated=true são gerados pelo servidor. Nunca aceitar autor, estado ou simulated fornecidos pelo cliente. Datas em UTC, ISO 8601; exibição em America/Sao_Paulo na futura versão persistente. A fatia estática atual ainda formata datas em UTC.

Área de demonstração: latitude entre -23.9500 e -23.9250; longitude entre -46.1950 e -46.1650, limites inclusivos, WGS84. Trata-se de uma caixa ilustrativa em torno dos pontos atuais, escolhida para o protótipo, não de um limite oficial ou prova de que cada ponto pertence ao bairro. Mostrar “Área aproximada de demonstração”; rejeitar coordenadas externas na API. Não consultar geocodificador nem exigir GPS. Um polígono oficial é melhoria futura dependente de fonte verificada, fora do aceite do TCC atual.

Categorias: Resíduos inclui descarte e acúmulo de lixo/entulho; Água inclui alterações visuais, odor e suspeita de lançamento de efluentes. A interface não deve afirmar contaminação ou qualidade de banho a partir de relatos. Outros assuntos são fora de escopo nesta versão.

## D03 — Estados e transições
Códigos persistidos e rótulos: received/Recebida, community_review/Verificação comunitária, confirmed/Confirmada, monitoring/Acompanhamento, closed/Encerrada, discarded/Descartada. A API usa códigos; interface usa rótulos. Qualquer transição não listada é proibida. Apenas criação gera received; nenhuma contagem muda estado automaticamente.

| Origem | Destino | Executor | Condição obrigatória |
| --- | --- | --- | --- |
| inexistente | received | Conta ativa | D02 válido; evento de criação na mesma transação |
| received | community_review | Admin independente | Verificar categoria, localização, descrição e ausência de inadequação; motivo |
| community_review | confirmed | Admin independente | D04 atendido; motivo e referências às contribuições usadas |
| confirmed | monitoring | Admin independente | Referenciar complemento visível com atualização do problema; motivo |
| confirmed ou monitoring | closed | Admin independente | Motivo e referência a complemento visível que descreva resolução; closureReason=resolved |
| received, community_review, confirmed ou monitoring | discarded | Admin independente | Motivo; discardReason=invalid ou out_of_scope |
| closed ou discarded | community_review | Admin independente | Pedido de reabertura visível com fato novo; motivo e referência ao pedido |

Motivo administrativo: 20–1000 caracteres após trim. Encerrada significa resolução relatada e revisada na simulação, não certificação técnica. Falta de atualização não resolve nem descarta automaticamente. Ocorrência inválida é descartada; duplicata é vinculada (D07), não descartada. Reabrir limpa closureReason/discardReason atuais, preserva o evento anterior e exige nova confirmação. Corrigir conteúdo não altera estado automaticamente.

## D04 — Confirmação comunitária
A confirmação exige ao menos uma contribuição visível e independente do criador: manifestação de apoio com justificativa, complemento com observação do local ou ocorrência relacionada de outro autor com relato pertinente. Comentário genérico não basta. Uma manifestação ou relação é suporte observacional, não prova automática. Admin deve referenciar os registros usados e justificar por que sustentam o relato.

Cada contestação ativa e visível deve receber na decisão um parecer textual individual de 20–1000 caracteres, referenciando seu id: explica por que foi superada ou impede confirmar. Se não há suporte independente ou uma contestação não foi examinada, API rejeita a confirmação. Não exigir quórum de votos nem transformar número de apoios em laudo. API valida presença, autoria, visibilidade e vínculos; avaliação da pertinência é humana.

Remoção, alteração ou ocultação posterior de suporte, ou remoção de relação usada como suporte, não reverte estado: acrescenta evento e sinaliza revisão pendente ao administrador. Exibir aviso quando uma decisão depende de referência atualmente oculta/retirada, alterada desde o snapshot ou cuja relação foi removida; o administrador pode descartar ou, se encerrada, reabrir mediante D03. Essa sinalização é derivada, não sétimo estado.

## D05 — Participação, edição e permissões
| Ação | Visitante | Usuário/autor | Admin |
| --- | --- | --- | --- |
| Consultar ocorrência e histórico público | Sim | Sim | Sim |
| Criar ocorrência | Não | Sim | Sim, como autor |
| Editar relato original | Não | Só próprio, received, até 24h inclusive da criação | Correção justificada de outro autor em qualquer estado |
| Comentar/complementar | Não | Em community_review, confirmed ou monitoring | Mesma regra |
| Apoiar/contestar | Não | Mesmos três estados, exceto próprio relato | Mesma regra |
| Pedir reabertura | Não | Em closed ou discarded | Mesma regra |
| Denunciar conteúdo | Não | Conteúdo visível em qualquer estado | Mesma regra |
| Transicionar, vincular, moderar | Não | Não | D01, D03, D07 e D08 |

Comentários: 1–2000 caracteres; complementos e pedidos de reabertura: 20–3000. Texto simples após trim; sem HTML renderizado. Complemento tem kind=observation ou resolution; autor pode relatar resolução, mas não encerrar. Um pedido aberto de reabertura por usuário/ocorrência; admin aceita com transição ou rejeita com motivo. Pedidos rejeitados podem ser seguidos por novo pedido com fato novo. Ao reabrir, o pedido referenciado é accepted e os demais abertos ficam superseded, com evento.

Manifestação é support ou contest, justificativa obrigatória de 20–1000 caracteres. Uma manifestação ativa por usuário e ocorrência (restrição única); alterar substitui tipo/texto, conserva versões no histórico. Retirar desativa, sem apagar rastro. Alteração e retirada obedecem aos mesmos estados da criação; não contam como comentários. Autor nunca manifesta na própria ocorrência.

Comentário/complemento pode ser editado pelo autor até 24h inclusive, apenas nos estados participativos e quando visível; depois, usar novo complemento. Pedidos não são editáveis. Não há exclusão física por usuário; retirada de conteúdo se faz por solicitação/denúncia com motivo e moderação. Autor continua podendo complementar após perder o prazo de edição do relato. Imagens seguem a janela/permissão de edição do conteúdo pai; para pedido de reabertura, upload/retirada são permitidos ao autor nas primeiras 24h enquanto pending, apesar de o texto do pedido ser imutável. Admin não altera texto de contribuição alheia: pode ocultar/restaurar. Histórico e datas nunca são editados na interface.

## D06 — Evidências
Imagens opcionais JPEG, PNG ou WebP, até 5 MiB por arquivo e cinco anexos por ocorrência ou contribuição (somente complemento ou pedido, não comentário). Máximo de 20 megapixels por imagem. Validar assinatura, decodificação, dimensões e limite no servidor; reencodar sem metadados antes de servir. Rejeitar SVG, executáveis, documentos e URLs remotas. Legenda obrigatória de 5–200 caracteres incluindo descrição da imagem; serve como texto alternativo. Usar imagens fictícias sem dados de pessoas.

Upload só após existir o conteúdo pai. Falha não apaga o relato; indicar “registro salvo; anexo não enviado” e permitir repetir. Arquivo novo não é público antes de validação e associação concluídas. O usuário pode retirar anexo na janela de edição do pai; admin pode ocultar/restaurar com motivo. Arquivo retirado não conta no limite de cinco e permanece reservado para auditoria. Acesso ao arquivo respeita visibilidade do pai e do próprio anexo.

## D07 — Duplicatas e relações
Duplicata representa o mesmo fato no mesmo local/contexto temporal; proximidade isolada não basta. Admin escolhe como principal a ocorrência visível não descartada mais antiga do conjunto (desempate por id). Vincular somente origens não terminais, visíveis, sem duplicatas próprias, à principal não terminal; proibir autorrelação, ciclos e cadeias. Se necessário, desvincular filhos antes de reorganizar. Exigir motivo e comprovar same_fact na justificativa humana; não mesclar automaticamente por distância.

Duplicata guarda duplicateOfId; conserva estado anterior e todos os dados, mas suspende transições, edição e participação. Não aparece como ponto separado/listagem padrão; URL própria mostra aviso e link à principal. Novas contribuições devem ser enviadas explicitamente à principal. Consultar documentos/denunciar conteúdo continua permitido. A principal exibe links às duplicatas e seus conteúdos visíveis, identificados pela origem; não copia nem soma apoios das duplicatas. Isso impede contagem duplicada sem apagar informação.

Desvincular requer motivo; remove duplicateOfId e recupera a operação no estado preservado. Encerramento/descarte da principal não altera automaticamente o estado das duplicatas. Ocultação da principal não oculta a duplicata, mas seu link público mostra destino indisponível. Admin resolve vínculo antes de usar a duplicata como suporte independente.

Relacionadas são fatos distintos; relação é simétrica e única por par ordenado de ids. Admin cria/remove com motivo, entre registros visíveis, não descartados e sem duplicateOfId. Remover relação não remove fatos/contribuições. Duplicar um registro exige remover antes suas relações, com histórico. Relação usada para confirmar deve existir no momento da decisão e apontar relato de outro autor. Apoios são sempre por ocorrência.

## D08 — Moderação e denúncias
Denúncia: conta ativa, alvo occurrence/contribution/attachment/stance visível, motivo de 20–1000 caracteres. Uma denúncia aberta por autor e alvo; sem efeito automático na publicação. Só autor da denúncia e administradores podem vê-la. Admin independente decide dismissed (sem alteração) ou upheld (oculta alvo), com motivo. Revisor tem acesso ao conteúdo já oculto para tratar denúncias concorrentes; ocultar novamente é operação sem efeito adicional no alvo, mas registra a decisão da denúncia.

Ocultar ocorrência retira corpo, anexos e contribuições da leitura pública, inclusive por URL/API/arquivo; retornar página de indisponibilidade sem conteúdo. Não é estado discarded: visibilidade e ciclo são dimensões separadas. Ocultar contribuição/manifestação/anexo mostra apenas marcador de moderação, não o texto/arquivo. Público vê evento e motivo público; revisões com conteúdo removido são restritas a administradores. Histórico privado preserva antes/depois, sem expor senhas, sessões ou identidade do denunciante. Administrador independente também pode ocultar/restaurar diretamente com motivo. Pai oculto prevalece sobre restauração de filho. Conteúdo oculto não recebe participação, edição comum ou transição; pode ser restaurado por admin e então tratado normalmente.

## D09 — Histórico, concorrência e retenção
Desde a criação, cada mutação de domínio bem-sucedida gera evento imutável com id, occurrenceId, entidade/id, ator, instante UTC, ação, motivo quando exigido, valores anteriores/posteriores e referências usadas. Mutação e evento na mesma transação; falha de um desfaz ambos. Logout e senhas não integram histórico público. Incrementar version da ocorrência em toda mutação dentro dela (incluindo contribuições/anexos/denúncias); operações em dois registros incrementam ambos e geram eventos para ambos com correlationId comum. Conflito de versão retorna 409 sem sobrescrever.

Nenhuma exclusão física durante uso normal. Dados fictícios e imagens retiradas/ocultas ficam até reset explícito da base de demonstração; sessões expiram em 8h e registros expirados podem ser removidos na inicialização. Reset exige backup consistente e confirmação local, conforme ARCHITECTURE. Isso não constitui política para eventual serviço real.

## D10 — Leitura e compatibilidade
Filtros categoria E estado; padrão omite ocultas e duplicatas, inclui encerradas/descartadas visíveis. Seleção sem resultado deve ser limpa ao mudar filtros. Link direto de registro visível abre detalhes independentemente dos filtros; ao fechar, filtros anteriores continuam. Identificador inexistente/oculto mostra indisponibilidade sem detalhes. Implementação atual usa rótulos e evidências textuais em fixtures; adapter da etapa persistente converte para os códigos/modelo novos. Dados estáticos não são migração de usuários reais e não certificam as regras de escrita.
