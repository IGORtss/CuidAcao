# Critérios de aceitação — versão 1.0
Cada cenário deve virar teste automatizado quando sua etapa for implementada; testes visuais/roteiro podem ser manuais quando indicado. “Especificado” não significa aprovado. Referências Dxx apontam DOMAIN.

## Limite da reorganização estrutural de 13/10/2026

A reorganização por camadas preservou 138/138 testes Node, build e 86/90 E2E. As quatro falhas cartográficas foram reproduzidas isoladamente nos dois dispositivos: expectativa de `inert` divergente do estado interativo atual e clique sintético numa área coberta por pins. Nenhum teste foi removido ou relaxado; portanto, esta entrega não declara regressão E2E integral aprovada. Firebase permanece apenas preparado por configuração/documentação, sem integração funcional ou novo critério de produto.

| ID | Etapa | Cenário e resultado obrigatório |
| --- | --- | --- |
| AC01 | 1 | Abrir pelo mapa e pela lista mostra mesmo id; link direto/reload/Voltar/Avançar, fechar e foco funcionam |
| AC02 | 1 | Categoria E estado filtra mapa/lista; vazio permite limpar; tiles bloqueados mantêm consulta |
| AC03 | 2 | Banco novo recebe migrações/seed; aplicar migrações novamente não altera dados; seed recusa base preenchida |
| AC04 | 2 | Cadastro funcional cria user; username duplicado retorna 409; role=admin ou campos desconhecidos são rejeitados |
| AC05 | 2 | Login/logout/expiração funcionam; token revogado não autentica; resposta/log não revela senha/hash/token |
| AC06 | 2 | POST direto sem sessão retorna 401; alterar autoria/papel/estado não contorna autorização |
| AC07 | 2 | Criar relato válido retorna received com evento; recarregar e reiniciar servidor preserva registro |
| AC08 | 2 | Texto curto, categoria inválida, NaN e coordenadas fora da caixa falham; bordas exatas da caixa são aceitas |
| AC09 | 2 | Autor edita em received até 24h; outro usuário, após prazo ou outro estado recebe 403/409 conforme causa |
| AC10 | 2 | Falha de evento desfaz mutação; duas escritas com mesma version permitem só uma e outra retorna 409 |
| AC11 | 2 | Origin ausente/externa é recusada; rate limit de login/cadastro retorna 429; usuário não vê auditoria privada |
| AC12 | 3 | Participação permitida só nos três estados; autor não apoia/contesta próprio relato; sem sessão não participa |
| AC13 | 3 | Apoiar→contestar substitui manifestação sem duplicar contagem; retirada desativa e preserva evento |
| AC14 | 3 | Edição de contribuição obedece autoria, prazo e estado; texto com HTML é exibido como texto |
| AC15 | 3 | JPEG/PNG/WebP válido recebe legenda e perde metadados; assinatura falsa, SVG, >5 MiB, >20 MP e sexto anexo são rejeitados |
| AC16 | 3 | Falha de upload preserva relato; arquivo oculto/retirado não é obtido por URL direta; retirada respeita prazo |
| AC17 | 4 | Cada aresta permitida D03 funciona com condições; qualquer outra aresta retorna 409 sem evento de sucesso |
| AC18 | 4 | Confirmar sem suporte independente ou parecer de toda contestação falha; voto isolado nunca muda estado |
| AC19 | 4 | Referências de outro relato não relacionado, ocultas ou do autor não contam; decisão salva snapshots auditáveis |
| AC20 | 4 | Encerrar exige resolução referenciada; reabrir exige pedido; rejeição tem motivo; reabertura exige nova confirmação |
| AC21 | 4 | Admin não decide próprio conteúdo nem própria denúncia; admin independente pode agir; correção gera antes/depois |
| AC22 | 4 | Denúncia não oculta automaticamente; upheld oculta, dismissed preserva; público não vê denunciante/texto oculto |
| AC23 | 4 | Ocultar pai bloqueia filhos e arquivos por API; restauração de filho não contorna pai; retirada de suporte sinaliza revisão |
| AC24 | 4 | Duplicata preserva conteúdo, sai do mapa/lista padrão e aponta principal; contribuições e contagens não são copiadas |
| AC25 | 4 | Proibir ciclos/cadeias, principal mais nova, origem terminal e vínculo próprio; desvincular restaura operação e audita ambos |
| AC26 | 4 | Relação é simétrica/única; remoção não apaga fatos; conflito em qualquer versão desfaz alteração nos dois registros |
| AC27 | 5 | Roteiro completo funciona com três usuários e dois admins, e novas contas por cadastro |
| AC28 | 5 | Reset exige ambiente/pasta/confirmacão, backup prévio; erro de backup não apaga nada; restauração reproduz dados/anexos |
| AC29 | 5 | Consulta e formulários a 360px, 200% zoom e teclado; foco e erros verificáveis; imagens com legenda (revisão manual + E2E) |
| AC30 | 5 | Instalação limpa documentada, build e suíte aprovados; falha da API mostra erro sem fixtures; simulação visível em todos os fluxos |
| AC31 | 6 | Link “HUD do mapa” da apresentação abre o mapa interativo; HUD acessível abre um painel principal por vez e desktop/mobile mantêm mapa, foco, Escape, toque e movimento reduzido |
| AC32 | 6 | Camadas/modos/filtros/legenda/etiquetas e transparência sincronizam mapa, lista, contagem e URL sem inferir dados |
| AC33 | 6 | Resumo do enquadramento usa debounce; clique livre não abre ficha, menu de lugar abre por clique direito/toque prolongado e distingue proximidade; compartilhamento restaura parâmetros válidos |
| AC34 | 6 | Hover/foco/seleção sincronizam card e geometria; detalhe permanece visível fora do painel e preserva seleção em atualização |
| AC35 | 6 | Polígono pode ser desenhado/editado/cancelado; pontos contidos e geometrias intersectadas são distinguidos e filtráveis |
| AC36 | 6 | Registro contextual preserva rascunho, sugere possíveis correspondências sem mesclar e só grava geometria explícita compatível |
| AC37 | 6 | Acompanhamentos, consultas salvas e leituras de atualização persistem por conta; chamada direta alheia é negada |
| AC38 | 6 | Coleções aplicam critérios documentados; recorrência depende de duplicata administrativa, não proximidade |
| AC39 | 6 | Reprodução usa criação/transições reais, pausa em ações incompatíveis e informa dimensões sem histórico; comparação A/B usa mesma câmera |
| AC40 | 6 | Medições mostram valor/unidade/data/origem somente quando completos; pH não implica segurança e pontos sem stationId não viram série |
| AC41 | 6 | HUD começa como a marca oficial com borda branca sutil em 56×56 px no desktop (44×44 no celular), mantém o símbolo à esquerda e revela “CuidAção” à direita, expande horizontalmente antes da altura, revela itens em sequência e fecha na ordem inversa; clique rápido, fora, Escape, teclado e movimento reduzido sempre reconciliam para aberto ou fechado sem bloquear o Leaflet |

## Cobertura atual real

Histórico dos itens 5–7: dependências do item 7 reexecutadas antes de editar: 70/70 testes Node, build e 38/38 E2E aprovados. Na implementação do item 7, suíte Node final 79/79 aprovada, build e 42/42 E2E desktop/mobile aprovados; tentativas e resultado final em PLAN. Node.js 24.21.0, Fastify/SQLite reais, bancos temporários e processos HTTP independentes.

AC01–AC11 preservados. AC12/AC13 verificados por API para leitura pública, autenticação/Origin, negação do próprio relato (inclusive admin), justificativas Unicode/trim/limites/tipos/campos protegidos, estados, ocultação e duplicata, criação/substituição/retirada/reativação e retirada repetida. Unicidade no banco e escritas concorrentes com mesma versão: apenas uma confirma e a outra retorna 409. Evento falho reverte posição/evento/versão na criação, substituição e retirada. Reinício HTTP preserva posição ativa, retirada, contagens e histórico; quantidade não muda estado, principal não soma duplicata.

AC14: autoria, prazo inclusivo de 24h, estados/visibilidade/duplicata, tipo imutável, HTML literal e edição persistente dos comentários/complementos. AC15/AC16: imagens originais/de complementos com assinatura/decodificação/metadados/limites, limite por conteúdo, permissões/prazo, pai oculto, retirada, falha parcial conservando texto salvo, rollback/disco e reinício HTTP. Todos permanecem cobertos pela regressão.

Novos E2E desktop/mobile cobrem apoio→contestação→retirada→reativação, autor/data/justificativa literal sem elemento HTML, contagens separadas, envio único, reload/leitura pública, validação/foco, 360px/200%, conflito/revisão explícita conservando texto, falha de rede, sessão perdida seguida de login e envio do rascunho, atualização de controles e recuperação de erro de consulta.

Etapa 3 concluída no escopo AC12–AC16. No item 8, AC17–AC19 e partes de AC20/AC21/AC23 foram verificados conforme abaixo; área administrativa/rejeição/moderação entregues no item 9 conforme evidência abaixo; gestão de duplicatas/relações, reset/backup, roteiro completo e revisão manual final continuam pendentes. Restrição de duplicatas/ocultos existentes não entrega ferramentas de gestão/moderação. Disponibilidade externa dos tiles e revisão visual manual abrangente não certificadas; E2E bloqueiam tiles. Evidências finais, tentativas e limitações em PLAN; comandos em README.

## Cobertura real do item 8 original

Dependências reexecutadas antes de editar: 79/79 Node e 42/42 E2E aprovados. Verificação final em Node 24.21.0: 90/90 Node, build e 46/46 E2E desktop/mobile aprovados, zero falhas/skips; Chromium/diff-check aprovados. Nenhum teste exigido indisponível.

AC17: matriz completa e negação de todos os outros pares, visitantes/users/admin próprio, duplicatas/ocultos; mudança/evento/versão atômicos, rollback de transição/pedidos e concorrência 200/409. AC18/AC19: suporte independente visível, tipo/autoria/vínculo válido, lista exata de pareceres, snapshots preservados; nenhum estado automático por apoio/resolução. Referências ocultas/alteradas sinalizam revisão sem transicionar.

AC20 parcial: resolução é exigida para encerrar, pedido visível pending para reabrir, razões terminais limpas, pedido accepted e demais superseded no mesmo commit, nova confirmação necessária. Rejeição administrativa de pedido ainda futura, portanto não declarar AC20 integral. AC21 parcial: administrador não decide ocorrência/contribuição própria; correção, denúncia/moderação ainda futuras. AC23 parcial: ocultos impedem transições/escritas e referências sinalizam revisão, sem ferramentas de moderação/restauração.

Restrições verificadas após transições reais: relato/imagens originais deixam de ser editáveis após triagem; comentários/complementos/posições/imagens de complemento bloqueados em estado terminal, consulta preservada. Pedidos são texto imutável 20–3000, um pending por usuário/ocorrência; imagens apenas autor/pending/24h inclusivas com limites existentes; aceitação reavalia e bloqueia novas alterações. Reinícios HTTP preservam ciclo fechado e depois reabertura/pedido/status/histórico/sessão.

Navegador desktop/mobile: ciclo com parecer, atualizações e resolução, pedido com imagem/falha recuperável sem segundo registro, reabertura/descarte, leitura pública/reload, histórico origem/destino/responsável/motivo literal, envio único, campos/foco/zoom/móvel, validação, conflito com revisão, rede e sessão recuperada sem apagar motivo. Tiles externos/revisão manual abrangente continuam não verificados; painel administrativo completo, moderação e gestão de vínculos não incluídos.

## Cobertura real do item 9 original

Base reexecutada antes de editar: 90/90 testes Node e 46/46 E2E, demonstrando dependências atuais. Suíte final Node ampliada: 101/101 aprovados, sem skips. AC20 passa a incluir rejeição justificada sem transição e novo pedido posterior; AC21 inclui correção de campos D02, preservação de autoria/estado e negação de revisor autor/denunciante; AC22 inclui quatro alvos, unicidade de pending, leitura privada própria/admin, ausência de efeito automático, dismissed/upheld/concorrentes sobre oculto e nenhum denunciante/conteúdo privado no histórico público. AC23 inclui ocultação/restauração reais dos pais/filhos/arquivos, contagens públicas corretas, restauração subordinada ao pai e imagem retirada nunca republicada. Referência moderada sinaliza revisão sem reverter estado. AC01–AC19 permanecem cobertos pela regressão.

Testes de API provocam falha de evento na correção, criação de denúncia, ocultação, decisão composta e rejeição: nenhum dado/evento/versão parcial. Duas escritas concorrentes permitem uma e rejeitam outra por versão. Admin próprio, usuário comum e visitante negados inclusive por chamada direta; papel atualizado no banco/revogação de sessão não são contornados por parâmetros. Correção em duplicata bloqueada; denúncia/moderação permitidas sem gerir vínculo.

Teste HTTP real encerra processo após criar imagem/corrigir/denunciar/decidir e compara dados/auditoria/denúncia/arquivo privados em outro processo; usa sessão persistida para restaurar em terceiro processo, quarto confirma leitura pública/arquivo/estado/versionamento. Nenhuma base do desenvolvedor é usada. Fluxos browser/final build e diff-check registrados em PLAN. AC24–AC26/gestão de vínculos e AC27–AC30 integrais permanecem pendentes; revisão visual manual abrangente/tiles externos não certificados.

Verificação final completa do item 9: 101/101 Node, build, instalação Chromium, 52/52 E2E desktop/mobile e git diff --check aprovados. Zero falhas/skips finais e nenhum bloqueio. Tentativas intermediárias corrigidas/reexecutadas documentadas em PLAN. Seis E2E administrativos verificam denúncia/consulta própria/decisão, correção em oculto, bloqueio público de arquivos e restauração, triagem integrada, paginação, HTML literal, conflito/validação/rede/sessão/envio único, moderação dos filhos/contagens/flags e rejeição de pedido com novo envio posterior. AC20–AC23 verificados; gestão de vínculos e apresentação final continuam pendentes.

## Cobertura do item 10 original

Dependências novamente executadas: 101/101 Node e 52/52 E2E desktop/mobile aprovados. AC24–AC26 verificados: 112/112 Node, build e 56/56 E2E desktop/mobile aprovados, zero falhas/skips finais, Chromium/diff-check aprovados. Aprovação final e tentativas em PLAN. Testes novos exercitam principal mais antiga, ausência de ciclos/cadeias/autorreferência/filhos/relações da origem, simetria/unicidade, vínculo/desvínculo, requisitos de estado/visibilidade e dois autores independentes. Arquivos/contribuições/autoria/estado/contagens conservados, sem agregação e participação em duplicata bloqueada. Eventos e versões dos dois pais no mesmo commit, rollback em adição/remoção e conflitos com moderação/transição. HTTP real reinicia processos e compara vínculos/sessão/auditoria antes/depois de remoção. Migração 002 sobre base 001 preenchida conserva dados e reaplicação. Browser desktop/mobile: leitura e gestão de vínculos, navegação, rascunho/sessão/conflito/rede/envio único, texto literal e consulta privada de principal oculta. Etapa 5/AC27–AC30 integrais não declarados concluídos.

## Revisão integrada do item 11 original

AC10 e os critérios de histórico/transição de AC17–AC26 foram reavaliados sobre a implementação atual. Não há regra ou serviço paralelo de encerramento. D03/D04 continuam exigindo admin independente, motivo válido e complemento de resolução visível da mesma ocorrência; pedido de reabertura/decisão mantém os requisitos anteriores. Quantidade de apoios ou resolução informada nunca transita automaticamente. Após fechamento/reabertura, permissões de cada escrita e anexos são reavaliadas.

`apoio/testes/api/history.test.js` exercita todas as famílias de eventos com APIs reais, privacidade dos destinos, referência inválida, fundamento moderado/restaurado, fechamento posterior com data idêntica e legado sem evento retroativo. Suítes existentes verificam autorização, rollback e conflitos das escritas. O teste HTTP de ciclo em `restart.test.js` confirma fundamento público, persistência de estado/versão/histórico e `closure:null` após reabrir.

Lacunas funcionais corrigidas: fundamento público do encerramento e paginação visual de histórico público/auditoria privada. O ciclo E2E de transições foi ampliado para mais de 20 eventos, ida/volta de páginas públicas e privadas, entidade afetada na auditoria, motivo/resolução literais sem HTML e encerramento/pedido/decisão em desktop/mobile. Nenhuma denúncia ou snapshot privado foi acrescentado à projeção pública.

Base de uso atualizada por migrações 001/002 sem seed/reset; 116/116 Node, build, foco browser 4/4 e suíte final 56/56 E2E desktop/mobile aprovados, assim como Chromium/diff-check. Primeira execução E2E: 55 aprovados e uma falha intermitente no mapa móvel; reexecução isolada e completa passaram sem alteração do cenário. Relação requisito→evidência e limites em PLAN. AC27–AC30 integrais, revisão visual manual abrangente, roteiro de apresentação e backup/reset permanecem pendentes.


## Revisão da interface — item 12 original

AC29 revisado por inspeção visual de capturas renderizadas e E2E: desktop 1440×1000, 360×800, 390×844, conteúdo a 200% nas duas larguras móveis e viewport reduzida a 420px. Cobertura: entrada, mapa/lista/filtros, links diretos/retorno, cadastro/login/logout, criação/edição/imagens, comentários/complementos/manifestações, denúncias e consulta privada, administração/moderação, vínculos, transições/histórico/encerramento/reabertura. Listas vazias/carregamento/falha de rede, upload parcial e páginas de histórico/auditoria foram também capturados. A suíte completa mantém verificação de autorização, estados, sessão expirada, conflitos, rascunhos, envio único e texto literal.

Correções relevantes: arte SVG não aplicada pela URL com aspas; diálogos ampliados extrapolando altura disponível; coluna de formulário causando overflow com imagens; contraste de campos/arte; legibilidade dos campos administrativos; foco perdido após logout; leitura de duplicata sem possibilidade de tentar novamente após falha; textos/rótulos desatualizados ou códigos em inglês; instrução explícita sobre tiles indisponíveis na seleção de ponto. Quatro novos cenários em `revisao-interface.spec.js` (oito execuções desktop/mobile) e cenários existentes ampliados para foco de logout, erros associados e nova tentativa de leitura de duplicata. Resultados finais e logs em PLAN.

Contrastes calculados para os pares usados: texto/painel 10,17:1, texto secundário/painel 5,06:1, texto/administração 4,64:1, botão 9,17:1, borda/campo 6,56:1, foco/administração 3,85:1. Rasterização da arte existente com luminosidade final: mínimo conservador 4,67:1 para texto secundário e 3,43:1 para destaque grande. Não é certificação automatizada de acessibilidade integral.

Mapa móvel: nenhuma reprodução da falha histórica em 72 tentativas instrumentadas, incluindo toque e CPU 4× desacelerada; causa indeterminada. Sem retries adicionais, esperas arbitrárias ou retirada de asserções. Tiles foram abortados nos E2E/inspeções de falha; separadamente, nove tiles externos responderam HTTP 200 em observação real local. Isso não garante disponibilidade futura. Ampliação CSS/teclado virtual simulado não equivalem a navegador móvel físico, leitor de tela ou teclado virtual real; essas verificações não foram executadas. AC27/AC28 e instalação limpa/restauração completas de AC30 não são entregues por esta revisão; Etapa 5 integral continua pendente.

## Validação integrada — item 13 original

Em 09/10/2026, Node.js 24.21.0, Fastify/SQLite reais. A base inicial foi novamente executada: 116/116 Node e 64/64 E2E aprovados, antes das alterações. A revisão acrescenta um ciclo completo de navegador por dispositivo e amplia um teste HTTP existente; não cria serviços, regras, migrações nem eventos retroativos. Credenciais, bancos e arquivos gerados ficam em diretórios temporários separados da base de uso.

| Critério / requisito | Evidência executável | Resultado do item 13 |
| --- | --- | --- |
| AC27: ciclo entre três usuários e dois administradores; contas novas | `apoio/testes/ponta-a-ponta/integrado.spec.js`: três cadastros/logins por formulário, dois admins independentes; mesma ocorrência criada e lida pela lista, marcador e link, comentário/observação/apoio/contestação, confirmação com parecer, acompanhamento, resolução/encerramento, reabertura aceita; rejeição em outro registro (`CA-004`) | Aprovado em desktop/mobile; escrita do ciclo pela interface, leitura de efeitos pela API |
| AC04–AC07, AC14–AC16: identidade, criação, imagem e falha parcial | Mesmo E2E conta um POST de criação e três uploads: primeiro arquivo salvo, segundo falha, somente o pendente é reenviado; duas imagens finais legíveis; descrição/comentário com HTML literal | Aprovado; assinatura/dimensões/quantidade/autoria/prazos e expiração exata reutilizam `apoio/testes/api/auth.test.js`, `occurrence-write.test.js`, `contributions.test.js`, `attachments.test.js` |
| AC17–AC21: matriz, fundamentos, independência e decisões | Ciclo integrado; `apoio/testes/api/transitions.test.js`, `administration.test.js`, `apoio/testes/ponta-a-ponta/transicoes.spec.js` | Aprovado; participação e pedido não alteram estado automaticamente, encerramento mostra fundamento e decisão, rejeição mantém Encerrada |
| AC07, AC10, AC20, AC24–AC26: persistência integrada | `apoio/testes/api/restart.test.js`, cenário “ciclo integrado por HTTP”: cadastro real, imagem original, relação/duplicata, comentário/apoio/contestação, imagem de observação, encerramento, aceite e rejeição separados; quatro processos HTTP independentes com comparação de respostas, identificadores, versões, histórico e bytes das duas imagens | Aprovado; sete cenários de reinício executados, incluindo sessão, denúncia/moderação/restauração e desvinculação com auditoria |
| AC21–AC23: denúncia, revisão, conteúdo oculto e restauração | `apoio/testes/api/administration.test.js`, `history.test.js`, reinício administrativo; `apoio/testes/ponta-a-ponta/administracao.spec.js` desktop/mobile | Aprovado; visitante não lê conteúdo/arquivos ocultos, denunciante vê andamento privado, administrador autorizado conserva auditoria; visibilidade não altera estado |
| AC24–AC26: registros originais, relações e duplicatas | `apoio/testes/api/links.test.js`, reinício de vínculos e ciclo ampliado; `apoio/testes/ponta-a-ponta/vinculos.spec.js` | Aprovado; sem transferência/agregação, vínculo bloqueia participação; simetria, versões dos dois pais, remoção, navegação e privacidade |
| AC06, AC09–AC13, AC19, AC21: autorização, conflito e rollback | Testes API de cada família, especialmente `transitions.test.js`, `administration.test.js`, `links.test.js`, `history.test.js`; triggers de falha de evento e requisições concorrentes | Aprovado; consulta do banco confirma ausência de escrita/evento parcial, preservação de eventos e negação de permissões/referências |
| AC05, AC16: sessão perdida, rascunho e upload recuperável | E2E existentes de autenticação/escrita/contribuições/posições/transições/admin/vínculos, mais upload de dois arquivos do ciclo integrado | Aprovado na simulação de cookie removido/rede interceptada; expiração absoluta no instante exato aprovada por API com relógio controlado, sem aguardar oito horas no navegador |
| AC01–AC02, AC29: tiles indisponíveis, alternativas e layout | `apoio/testes/ponta-a-ponta/revisao-interface.spec.js`, leitura/escrita e ciclo integrado com tiles abortados | Aprovado na falha simulada: lista e coordenadas continuam utilizáveis. Inspeções visuais abrangentes são as do item 12; não foram refeitas nem declaradas novas |
| AC30 | Suíte, build e erro de API sem fallback reutilizados; comandos do roteiro isolado de migração/seed/PNG executados | Parcial: instalação limpa atual não executada |
| AC28 e item 14 | Reset/backup/restauração/base definitiva da apresentação | Não executados; fora do item 13 |

Resultado final: 116/116 Node, build, 66/66 E2E desktop/mobile e `git diff --check` aprovados, sem falhas/skips; sete testes HTTP de reinício e dois E2E integrados também passaram isoladamente. Chromium confirmado. Detalhes dos comandos registrados em PLANO.md. Roteiro repetível, contas geradas fora do versionamento e comandos em [VALIDACAO.md](VALIDACAO.md). A falha histórica do marcador móvel continua com causa indeterminada; sucesso desta execução não explica sua origem. Dispositivos físicos, teclado virtual real e leitores de tela: não executados. Tiles abortados comprovam tratamento de falha simulada; disponibilidade externa não foi medida novamente. Não houve redesign nem alteração da base de uso.


## Preparação demonstrativa — item 14 original

AC28 verificado: demo:prepare recusa pasta preenchida; reset exige CUIDACAO_ENV=demo, confirmação explícita, marcador, pasta dedicada e aplicação parada. Backup obrigatório, snapshot adulterado e falha de backup testados sem alteração do domínio. Reset conserva cópia do trabalho anterior, instala initial validado e invalida sessões. Restauração em destino separado vazio reproduz registros, anexos e histórico; original preservado.

AC27 reutilizado na regressão e roteiro curto em DEMONSTRACAO.md. AC30: npm ci realmente executado numa cópia nova sem node_modules/dados, com Node 24.21.0, SQLite/Sharp, build e preparação vazia aprovados. Não se executou toda a suíte nessa instalação nova: regressão completa executada no checkout principal. Material acadêmico institucional continua pendente.

| Critério do item 14 | Evidência |
| --- | --- |
| Dados fictícios, categorias/território, independência, seis estados e vínculos | apoio/testes/banco-de-dados/demo.test.js: oito relatos construídos pelos serviços, nove PNGs e eventos; scenarios.json inicial e DEMONSTRACAO.md |
| Consulta e revisão útil à apresentação | apoio/testes/ponta-a-ponta/demonstracao.spec.js: desktop/mobile, estados/fundamentos, anexos carregados, participações, duplicata, privacidade, denúncias e pedido |
| Recusa/preparação/reset/backup/restauração | cinco testes em apoio/testes/banco-de-dados/demo.test.js e comandos reais no diretório demonstrativo |
| Leitura/autenticação após restauração e reinício | outro processo HTTP da cópia restaurada: cinco contas, oito registros, 48 eventos e nove imagens idênticas, registro oculto público 404 |
| Proteção web de arquivos reservados | Vite real: controle permitido 200 e diretórios privados 403 por URLs diretas/@fs; demo:start sondado nas seis URLs de banco/contas/imagem oculta |
| Usabilidade dos cenários | 22 capturas da base entregue em desktop/360/390, lista/detalhes/admin; métricas sem overflow em 12 páginas |
| Preservação da base de uso | SQLite/WAL/SHM com SHA-256 inalterado |

Limites: mapa móvel histórico com causa indeterminada; dispositivos físicos, teclado virtual real e leitores de tela não executados; falha de tiles simulada e nenhuma nova medição externa. Backup/reset testam falhas lógicas/de arquivos, não perda de energia/disco. Relação de requisitos, tentativas e regressão final em PLANO.md.


Conferência final em 11/10/2026: 121/121 Node, build, 68/68 E2E e git diff --check aprovados, zero falhas/skips; Chromium disponível. Instalação nova repetida com npm ci/SQLite/Sharp/build/preparação. Reset/backup repetidos e restauração em cuidacao-demo-verificada lida por processo HTTP independente: cinco autenticações, oito registros, 48 eventos totais (45 de conteúdo, três privados de denúncias) e nove imagens idênticas. Vite normal também bloqueia banco/contas/imagens por acesso direto. Novas 18 capturas desktop/360/390 e hashes da base de uso inalterados nesta continuação. Nenhuma verificação obrigatória não executada; limites de dispositivos, tiles e mapa histórico permanecem. Evidências, correção da contagem de eventos e indisponibilidade dos artefatos temporários antigos em PLAN.

## Autenticação Google opcional — 11/10/2026

A extensão autorizada preserva AC02/AC03 locais. Critérios e evidências específicos:

| Critério | Evidência automatizada |
| --- | --- |
| Primeiro acesso valida identidade, pede username e cria usuário comum sem senha fictícia | apoio/testes/api/google.test.js; apoio/testes/ponta-a-ponta/google.spec.js, desktop/mobile |
| Acesso recorrente usa provider/sub, sem duplicação nem vínculo por e-mail | API: mesmo sub com perfil diferente, sub distinto com mesmo e-mail, concorrência entre desafios; E2E sair/entrar na mesma conta |
| Assinatura/emissor/aud/validade/nonce/contexto inválidos são recusados | API: tokens RSA controlados com claims/assinaturas inválidos, cookie/origem incorretos e replay; verificador oficial real |
| Colisão de username preserva contas e pede outra escolha | API e E2E: conta local continua com senha e username/rascunho permanecem preenchidos |
| Papel não é concedido pelo cliente; permissões locais continuam iguais | API: rejeição de role extra, admin 403 e criação autorizada com sessão Google |
| Expiração, rotação, logout e reinício conservam o mecanismo local | API: sessão anterior revogada, logout, prazo; dois processos HTTP independentes, sessão/identidade/novo login após reinício |
| Cadastro transacional sem registros parciais | API: falha induzida na inserção da sessão conserva desafio, ausência de usuário/identidade parcial e sessão anterior; acesso concorrente cria uma única identidade |
| Migração preserva dados existentes e falha com rollback | API: usuário/senha/sessão/referências preexistentes após 003; FK inválida recusa migração e conserva esquema/valores anteriores |
| Ausência de configuração, cancelamento e falha de rede | API: 503 sem configuração ou certificados indisponíveis; E2E SDK indisponível, popup cancelado e envio interrompido; rascunho conservado, nenhuma sessão falsa |
| Segredos não aparecem em logs, UI ou dados persistidos | API: logs não contêm JWT, nonce, cookie, sub ou perfil; adaptador só publica id/username/role; tokens Google não são armazenados |

Os fixtures fornecem certificados Google controlados e tokens RSA assinados; não substituem o verificador por uma função que aceita identidades. O SDK no E2E é controlado. Login real com Google, popup/FedCM real e configuração Cloud não executados, por ausência de cliente configurado. Ativação e roteiro real em README. Limites físicos e do mapa das etapas anteriores permanecem.

Regressão final da integração: 133/133 Node, build (33 módulos), 74/74 E2E desktop/mobile e git diff --check aprovados. Chromium instalado/disponível; aviso de fallback por Arch sem impedir execução. Zero falhas/skips finais. Tentativas intermediárias e correções de expectativas em PLAN. SHA-256 dos bancos de uso/demo e WAL/SHM inalterados; migração real permanece explícita antes da ativação. Login Google real: não executado.

## Mapa permanente na abertura — 12/10/2026 (substitui o critério de alinhamento arte → satélite)

Critérios da decisão de mapa Leaflet permanente como cenário da primeira tela, sem ilustração sobreposta nem troca de imagens:

| # | Critério | Evidência |
| --- | --- | --- |
| 1 | O mapa aparece imediatamente como fundo da tela inicial | E2E `transicao.spec.js` + captura desktop/mobile da abertura |
| 2 | O mapa não se move durante a apresentação editorial | E2E compara estilo do `leaflet-map-pane` antes/depois da rolagem |
| 3 | O conteúdo editorial desaparece ao rolar | E2E confere opacidade dos títulos em 15% e 30% de progresso |
| 4 | Os marcadores aparecem com animação sequencial | E2E confere 300ms, 10px, escala 0.85, stagger 80ms capado |
| 5 | A HUD surge depois dos marcadores | E2E confere opacidade dos controles e `atlas-tools` após 85% |
| 6 | O mapa se torna interativo somente ao final | E2E confere `inert` presente e ausente; gestos Leaflet desabilitados na abertura |
| 7 | Não existe troca de imagem ou alteração de enquadramento | E2E confere ausência de `.cartography`/`.map-veil` e câmera estável; sem novas requisições de tiles por rolagem |
| 8 | Funciona em desktop e mobile | Projetos desktop/mobile + capturas 1440×900 e 390×844 |
| 9 | Respeita `prefers-reduced-motion` | E2E com mídia reduzida: estados trocam sem interpolação |
| 10 | Não prejudica filtros, ocorrências, autenticação ou outras funcionalidades | Regressão E2E integral desktop/mobile |

## Interface cartográfica em tela cheia — 12/10/2026

| # | Critério | Evidência |
| --- | --- | --- |
| 1 | Leaflet ocupa toda a viewport após a transição | Geometria e capturas desktop/mobile com tiles reais |
| 2 | Navegação compacta oferece mapa, filtros, ocorrências, registro, estatísticas e perfil | E2E de navegação desktop/mobile |
| 3 | Filtros, lista, estatísticas, conta e detalhe aparecem sobre o mapa | E2E funcional e inspeção visual |
| 4 | Pins e controles Leaflet continuam tocáveis sem sobreposição indevida | E2E de popup, zoom, arraste e limites |
| 5 | Hover/foco revela rótulos no desktop e toque mantém rótulos no mobile | Inspeção Chromium e navegação por teclado |
| 6 | Não há regressão de dados, autenticação, filtros, abas ou transição | Suítes Node/build/E2E exigidas pelo projeto |
| 7 | Abertura normal tem filtros/lista/estatísticas fechados; apenas um painel principal pode abrir por vez | `apoio/testes/ponta-a-ponta/navegacao.spec.js`, desktop/mobile |
| 8 | Painéis têm dimensão limitada, lista recolhível e métricas resumidas; conteúdo não cria rolagem horizontal interna | Geometria e assertions de overflow em `apoio/testes/ponta-a-ponta/navegacao.spec.js` |
| 9 | No mobile, navegação e controles essenciais continuam rotulados e alcançáveis por toque/teclado | Projetos Playwright mobile e inspeção renderizada a 390×844 |
| 10 | A ilha indica claramente a seção ativa e expande a função escolhida | `apoio/testes/ponta-a-ponta/navegacao.spec.js`, desktop/mobile |
| 11 | Perfil é a única entrada permanente de autenticação e oferece login/cadastro ou sessão/ações conforme o papel | `apoio/testes/ponta-a-ponta/navegacao.spec.js`, `auth.spec.js`, `administracao.spec.js` |
| 12 | Pins distinguem Água/Resíduos por símbolo e texto; hover/foco antecipa e clique/toque abre detalhes | `apoio/testes/ponta-a-ponta/navegacao.spec.js`, `revisao-interface.spec.js` |
| 13 | Controles secundários recuam durante exploração e retornam sem ocultar navegação, zoom ou atribuição | `apoio/testes/ponta-a-ponta/navegacao.spec.js`, desktop/mobile |
| 14 | No celular, painel principal, perfil e detalhe são folhas inferiores roláveis, contidas também a 200% | `apoio/testes/ponta-a-ponta/navegacao.spec.js`, `revisao-interface.spec.js`, desktop/mobile |
| 15 | Apresentação, dados, filtros, autenticação e escritas existentes não regridem | Node/build e regressão E2E integral registradas em PLAN |
| 16 | A apresentação inicial não mostra HUD; a ilha aparece somente no mapa interativo concluído | `apoio/testes/ponta-a-ponta/transicao.spec.js`, `navegacao.spec.js`, desktop/mobile |

Conferência final em 13/10/2026: 135/135 Node, build Vite e 86/86 E2E desktop/mobile aprovados, sem falhas ou skips. Capturas Chromium em 1440×900 e 390×844 foram inspecionadas com tiles reais; zoom simulado a 200% cobriu 360/390px. Dispositivo físico e leitor de tela não foram executados.


## Autenticação prioritária — 22/10/2026

Solicitação explícita posterior autoriza e-mail privado e senha no cadastro, apelido público único, entrada por e-mail ou apelido (preservando contas existentes), sessão local HttpOnly e Google opcional sem vínculo automático. Cadastro encaminha à entrada. O e-mail nunca integra projeções públicas. Recuperação e verificação usam links de uso único, expiração e transporte externo configurável; sem transporte, a interface informa indisponibilidade e não simula envio. Android aproveita o fluxo web responsivo existente, sem recriar APK. Esta autorização substitui a proibição anterior de e-mail/recuperação somente no gerenciamento de contas.
