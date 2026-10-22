# Domínio e regras — versão 1.0
07/10/2026 • normativa para a versão de apresentação; autenticação, criação/edição, imagens, comentários/complementos e manifestações, ciclo de estados e pedidos de reabertura implementados; área administrativa, denúncias/correções/moderação e rejeição de pedidos implementadas no item 9; gestão de vínculos implementada no item 10; histórico e encerramento revistos no item 11.

## D01 — Identidade e acesso
Visitante consulta conteúdo público. Conta ativa tem papel user ou admin; cadastro sempre cria user. Usuário: identificador público fictício de 3–30 caracteres ASCII minúsculos, números ou sublinhado, único após normalização para minúsculas; senha de 8–128 caracteres, sem remoção de espaços. Não coletar nome civil, e-mail, CPF, endereço residencial ou comprovação de residência. Cadastro não inicia sessão: encaminha para login. Administração é atribuída apenas pela preparação local da demonstração, nunca por campo do cadastro ou botão público.

Admin pode participar como usuário, mas não pode confirmar, descartar, encerrar, reabrir, corrigir administrativamente ou moderar sua própria ocorrência/contribuição. Outro administrador decide; seed inclui dois administradores. Na revisão de denúncia, o revisor não pode ser denunciante nem autor do conteúdo. A vinculação administrativa também não pode envolver ocorrências de autoria do revisor. Não há gestão de papéis ou bloqueio de contas na interface desta versão.

## D02 — Ocorrência e entrada
Ocorrência é um registro de um problema observado em um local; não constitui comprovação científica. Campos obrigatórios: category (Resíduos ou Água), description (20–3000 caracteres após trim), latitude e longitude finitas. locationLabel é opcional, até 120 caracteres. Título opcional, 5–100 caracteres quando informado; se omitido, servidor gera “{categoria} — {id}”. id, autor, createdAt, updatedAt, version=1 e simulated=true são gerados pelo servidor. Nunca aceitar autor, estado ou simulated fornecidos pelo cliente. Datas em UTC, ISO 8601; exibição em America/Sao_Paulo, aplicada pelo frontend integrado à API.

Área de demonstração: latitude entre -23.9500 e -23.9250; longitude entre -46.1950 e -46.1650, limites inclusivos, WGS84. Trata-se de uma caixa ilustrativa em torno dos pontos atuais, escolhida para o protótipo, não de um limite oficial ou prova de que cada ponto pertence ao bairro. Mostrar “Área aproximada de demonstração”; rejeitar coordenadas externas na API. Não consultar geocodificador nem exigir GPS. Um polígono oficial é melhoria futura dependente de fonte verificada, fora do aceite do TCC atual.

Categorias: Resíduos inclui descarte e acúmulo de lixo/entulho; Água inclui alterações visuais, odor e suspeita de lançamento de efluentes. A interface não deve afirmar contaminação ou qualidade de banho a partir de relatos. Outros assuntos são fora de escopo nesta versão.

Representações cartográficas temáticas não criam novas categorias de domínio. Exemplos locais da apresentação podem anexar metadado explícito para demonstrar ponto de qualidade da água, polígono de resíduos, linha de erosão, ponto de esgoto aparente, polígono de alagamento ou polígono de vegetação. Todos permanecem relatos fictícios categorizados em Água/Resíduos. A geometria deve vir integralmente do dado preparado, com precisão `approximate` ou `verified`; coordenada isolada nunca gera linha ou área. `verified` significa apenas que o traçado foi conferido dentro do conjunto fictício da demonstração, não verificação ambiental do mundo real. pH demonstrativo não implica potabilidade, balneabilidade ou risco.

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
Filtros categoria E estado; padrão omite ocultas e duplicatas, inclui encerradas/descartadas visíveis. Seleção sem resultado deve ser limpa ao mudar filtros. Link direto de registro visível abre detalhes independentemente dos filtros; ao fechar, filtros anteriores continuam. Identificador inexistente/oculto mostra indisponibilidade sem detalhes. Implementação atual consulta a API; o adaptador converte códigos persistidos em rótulos. Fixtures históricas não são consultadas pelo frontend nem usadas como fallback. Dados estáticos não são migração de usuários reais e não certificam as regras de escrita.

## D11 — Exploração, acompanhamento e consultas salvas

Filtros, modo de visualização, seleção, enquadramento e período formam um único estado de exploração no cliente. Links compartilhados podem conter apenas coordenadas, zoom, camadas, filtros, período, coleção e identificador público; sessão, rascunhos, nomes de usuário e conteúdo privado nunca entram na URL. Parâmetros fora da caixa D02 ou dos valores enumerados são ignorados com aviso.

Conta ativa pode acompanhar: uma ocorrência pública; um lugar identificado por Point e raio visível de 500 metros; ou uma área Polygon com 3–50 vértices dentro da caixa D02. O acompanhamento não altera estado nem constitui denúncia. Atualizações internas são eventos públicos reais posteriores à criação do acompanhamento, associados por ocorrência, distância ou interseção espacial. Marcar uma atualização como lida é preferência privada. Não há envio externo.

Consulta salva guarda nome de 3–60 caracteres e somente filtros públicos, modo, período, coleção e enquadramento válidos. Cada conta pode criar, listar e remover seus acompanhamentos e consultas. Esses registros são privados e persistentes; não entram no histórico público da ocorrência.

Seleção espacial temporária usa geometria desenhada pela pessoa. Um ponto pode estar contido; uma linha ou polígono pode intersectar a seleção. A interface deve distinguir esses resultados. Atalhos territoriais só existem quando houver geometria e origem documentadas; na ausência delas, declarar indisponibilidade em vez de fabricar recortes.

## D12 — Tempo, comparação e coleções

Filtro de data limita registros por data de criação. Reprodução histórica é diferente: para cada instante, inclui somente ocorrências já criadas e reconstrói exclusivamente o estado a partir dos eventos públicos `transition`. Conteúdo textual, geometria e visibilidade atuais não são apresentados como snapshot antigo. Quando o histórico não permite reconstruir outra dimensão, a interface informa a limitação.

Comparação A/B usa o mesmo enquadramento e filtros, contando ocorrências existentes e seus estados reconstruídos em cada instante. Não compara imagens aéreas históricas. Alternância usa a única instância Leaflet; divisor visual só será oferecido se existirem duas fontes temporais equivalentes, o que não ocorre nesta versão.

Coleções têm critérios fixos e visíveis: “Problemas na orla” usa referências textuais explícitas a praia, orla ou faixa de areia; “Descarte recorrente” exige categoria Resíduos e vínculo administrativo de duplicata no mesmo principal; “Aguardando atualização” usa estado Acompanhamento sem evento nos últimos 30 dias; “Resolvidos recentemente” usa Encerrada com transição nos últimos 30 dias. Proximidade isolada nunca estabelece recorrência.

## D13 — Geometria e medições registradas pela comunidade

Criação comum continua sempre com ponto principal. Opcionalmente, a pessoa pode declarar uma representação aproximada compatível: `waste` Polygon em Resíduos; `erosion` LineString, `apparent_sewage` Point ou `flooding` Polygon em Água. Geometria tem no máximo 50 posições, todas dentro da caixa D02, e nunca recebe precisão `verified` pela rota pública. Qualidade da água e vegetação permanecem exclusivas da preparação demonstrativa por exigirem medição/origem ou recorte apropriado. A edição comum não troca a geometria temática; correção exige o fluxo administrativo auditado existente.

Medição só entra no modo Medições quando o objeto explícito contém valor, unidade, data e origem. pH continua entre 0 e 14, unidade `pH`, e classificação apenas ácido/neutro/básico. Série histórica exige o mesmo `stationId`; pontos distintos nunca são conectados. Dados sem esses metadados permanecem como representação ambiental e mostram “Sem dados” no modo de medições.

### Aplicação de D05/D08 no item 7 original
A janela de 24h das contribuições não se aplica às manifestações. Retirada desativa a posição; nova manifestação reativa a mesma linha, conservando id/data original e histórico. Uma posição oculta não pode ser restaurada por substituição/reativação comum. Repetir retirada já concluída com versão atual não é nova mutação; sem posição própria o recurso é indisponível. Regras de autoria, estado, visibilidade e duplicata continuam aplicáveis à retirada. Apoio/contestação continuam sem efeito automático no ciclo e não equivalem a laudo técnico.

### Entrega do ciclo no item 8 original
Matriz D03 permanece sem novas arestas. Controles mínimos nos detalhes são exclusivos de administradores independentes; sem painel completo, correção administrativa, rejeição de pedidos, moderação ou gestão de vínculos. D04 usa suporte/contestações atuais e vínculos já existentes, revalidados na transação. Verificação de inadequação na triagem, pertinência das referências, resolução e fato novo é responsabilidade humana justificada; API não transforma texto, votos ou imagem em laudo/decisão automática. Pedidos e suas imagens sob D05/D06 são dependências entregues para reabrir.

### Aplicação de D01/D05/D08 no item 9 original

Área administrativa consulta conteúdo oculto/retirado explicitamente, somente com sessão administrativa atual. Denúncia permanece privada, sem efeito automático; revisor independente pode decidir mesmo após ocultação por outra revisão. Decisão sobre alvo já oculto não repete a alteração do alvo. Correções abrangem somente campos D02, com autoria/ciclo preservados; a suspensão de edição por duplicata D07 também vale para correção. Moderação e rejeição de pedido são ações independentes auditadas, sem exclusão física ou transição automática. Restauração de imagem mantém withdrawnAt e precedência da visibilidade do pai. Não foram ampliadas permissões de contas nem regras de estado/vínculos.

### Aplicação de D07 no item 10 original
Gestão administrativa entregue: vínculo/desvínculo de duplicatas e criação/remoção de relações, sem alteração implícita de estado e sem transferência de conteúdo. As condições D07 de visibilidade/não descarte/ausência de duplicata aplicam-se tanto à criação quanto à remoção de relações. Desvincular duplicata conserva a operação no estado preservado, inclusive para corrigir vínculo cuja principal ficou indisponível; administrador independente dos dois autores, motivo e ambas versões obrigatórios. Corrigir a principal não reescreve filhos: eventos/versões pertencem ao registro alterado; reorganizar principal exige desvincular filhos antes. Principal mais antiga é validada pelo servidor; equivalência same_fact é a avaliação humana explicitada no motivo, não inferida por proximidade.

## D01 — Extensão autorizada: Google (11/10/2026)

A solicitação explícita do usuário acrescenta autenticação Google opcional, mantendo username/senha. No primeiro acesso Google validado, escolher username fictício com a mesma validação; cadastro federado cria user e inicia sessão local. Identidade por provider=google + sub, nunca por e-mail/nome. Não persistir nome civil, e-mail, foto ou tokens Google. Sem vinculação automática nem interface de vinculação de contas; username ocupado exige outro nome ou entrada na conta local existente. Conta Google não recebe senha fictícia: credenciais locais são nulas e login por senha dessa conta é recusado sem diferenciá-la de senha inválida. Administradores continuam provisionados localmente; nenhuma claim Google ou campo do cliente concede role. Participação/autoria/prazos e independência não mudam.

## D01 — Extensão Firebase Auth (15/10/2026)

Firebase Auth pode substituir o transporte Google anterior sem substituir a sessão do CuidAção. O navegador envia ao backend somente o ID token Firebase recém-obtido; o servidor verifica assinatura, emissor, projeto, expiração, revogação e `sign_in_provider=google.com`. A identidade local usa `firebase uid`, nunca e-mail, nome, foto ou claim de papel. Primeiro acesso ainda exige username fictício; conta criada recebe papel `user`, não tem senha local e não é vinculada automaticamente a conta local ou Google legada. O token Firebase não é persistido e a sessão opaca local continua governando todas as permissões.


## Autenticação prioritária — 22/10/2026

Solicitação explícita posterior autoriza e-mail privado e senha no cadastro, apelido público único, entrada por e-mail ou apelido (preservando contas existentes), sessão local HttpOnly e Google opcional sem vínculo automático. Cadastro encaminha à entrada. O e-mail nunca integra projeções públicas. Recuperação e verificação usam links de uso único, expiração e transporte externo configurável; sem transporte, a interface informa indisponibilidade e não simula envio. Android aproveita o fluxo web responsivo existente, sem recriar APK. Esta autorização substitui a proibição anterior de e-mail/recuperação somente no gerenciamento de contas.


## Cadastro simples — solicitação posterior de 22/10/2026

A interface oferece somente cadastro e entrada por apelido e senha, com confirmação da senha no cadastro e mínimo de oito caracteres. Retirados campos/botões de Google, e-mail e gerenciamento por e-mail da interface. Contas, vínculos e dados persistidos permanecem preservados; serviços anteriores mantidos para compatibilidade, sem exposição no fluxo simples.
