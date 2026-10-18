# Demonstração acadêmica — item 14

Todos os relatos, contas, posições, motivos e imagens abaixo são fictícios. Os pontos representam uma área aproximada ilustrativa do Perequê; não descrevem fatos reais, contaminação, pessoas ou ações no bairro. Participação comunitária não equivale a laudo técnico.

## Preparar e iniciar

Na raiz do projeto, com Node.js 24 e dependências instaladas pelo lockfile:

```bash
# Caminho do Node 24 neste computador:
export PATH="$HOME/.local/n/bin:$PATH"
node --version
# Somente na primeira preparação, com demo-data inexistente ou vazio:
npm run demo:prepare
# Nas apresentações seguintes, basta iniciar:
npm run demo:start
```

Abra http://127.0.0.1:5174. Esse comando inicia API em 3001 e Vite em 5174, somente em loopback, com a origem correta. Não precisa iniciar `npm start`/`npm run dev` separadamente. O servidor web (inclusive npm run dev) bloqueia acesso direto a bancos, credenciais e anexos privados, inclusive por `/@fs`; imagens são lidas somente pela API. Não modifica `data/cuidacao.sqlite` e não usa `db:seed`. Se as portas já estiverem ocupadas, a inicialização falha; não encerra outros processos. Ctrl+C para parar.

A entrega já deixou demo-data preparado neste checkout: não repita prepare em pasta preenchida; a recusa é intencional. Outra preparação independente pode usar uma pasta vazia dedicada:

```bash
CUIDACAO_DEMO_DIR="$PWD/cuidacao-demo-outra" npm run demo:prepare
CUIDACAO_DEMO_DIR="$PWD/cuidacao-demo-outra" npm run demo:start
```

Somente nomes `demo-data` ou `cuidacao-demo[-nome]`, com marcador gerado pela ferramenta, são aceitos para operação. Não usar symlinks ou pasta que contenha a base de uso/configurada. `CUIDACAO_DB_PATH`/`CUIDACAO_UPLOAD_DIR` não selecionam o destino demonstrativo. Banco, anexos e credenciais gerados estão ignorados pelo Git; não os adicione à força.

## Contas e arquivos locais

Senhas aleatórias estão em demo-data/current/credentials.json, arquivo 0600 dentro de pasta privada. Para consultá-las localmente:

```bash
cat demo-data/current/credentials.json
```

Há `morador_demo_1`, `morador_demo_2`, `morador_demo_3`, `admin_demo_1` e `admin_demo_2`. Use perfis separados do navegador para trocar rapidamente de papel sem compartilhar cookies. Administradores são provisionados apenas na preparação local; cadastro continua criando usuários comuns. Senhas e IDs de usuários/contribuições são diferentes em cada preparação; IDs das quatorze ocorrências são estáveis pelo ordenamento de criação. Os registros 9–14 são exemplos cartográficos fictícios de qualidade da água, resíduos, erosão, esgoto aparente, alagamentos e vegetação; geometrias e pH existem somente para demonstrar a interface e não descrevem condições reais do Perequê.

| Caminho em demo-data | Conteúdo |
| --- | --- |
| `.cuidacao-demo.json` | Identificação do diretório exclusivo |
| `current/db.sqlite` | Banco em uso na apresentação |
| `current/uploads/` | Nove PNGs referenciados, servidos somente pela API, incluindo conteúdo reservado |
| `current/credentials.json` | Credenciais locais; não versionar, fotografar ou publicar |
| `current/scenarios.json` | Índice inicial dos cenários e IDs dos pedidos/denúncia |
| `current/examples/ilustracao.png` | Imagem de teste para uploads ao vivo |
| `initial/` | Snapshot inicial, hashes e credenciais correspondentes |
| `backups/` | Backups verificados de apresentações anteriores |
| `.demo.lock` | Lock enquanto CLI/servidor demonstrativo opera |

A ilustração é gerada localmente com Sharp, com o texto “ILUSTRAÇÃO FICTÍCIA” e “Não é fotografia nem evidência de fato real”. Não depende de downloads. O serviço normal de imagens valida e reencoda cada PNG antes de persistir. Legenda identifica seu caráter ilustrativo.

## Cenários iniciais

A consulta pública padrão mostra seis pontos. A duplicata mantém URL própria, mas sai do mapa/lista padrão; a ocorrência oculta é reservada à administração. Não há fusão de contagens nem perda de relatos.

| ID / link em 5174 | Estado/cenário | Contas e fundamentos |
| --- | --- | --- |
| [CA-000001](http://127.0.0.1:5174/#ocorrencia=CA-000001) | Recebida, pronta para triagem ao vivo; Água | Autor `morador_demo_1`, imagem original; admin independente pode encaminhar |
| [CA-000002](http://127.0.0.1:5174/#ocorrencia=CA-000002) | Verificação comunitária; Resíduos | Autor 1; morador 2 comenta, observa com imagem e apoia; morador 3 contesta e tem denúncia pendente; principal da duplicata 7; relacionada à 3 |
| [CA-000003](http://127.0.0.1:5174/#ocorrencia=CA-000003) | Confirmada; Água | Autor 2, apoio do morador 1 referenciado por `admin_demo_1`; relacionada à 2 |
| [CA-000004](http://127.0.0.1:5174/#ocorrencia=CA-000004) | Acompanhamento; Resíduos | Autor 1; apoio e atualização do morador 2; `admin_demo_1` revisou os fundamentos |
| [CA-000005](http://127.0.0.1:5174/#ocorrencia=CA-000005) | Encerrada/resolved, pedido pendente; Resíduos | Autor 1; apoio do morador 2; resolução do morador 3 com imagem; encerramento por `admin_demo_1`; pedido com fato novo/imagem do morador 2, revisável por qualquer dos admins independentes |
| [CA-000006](http://127.0.0.1:5174/#ocorrencia=CA-000006) | Descartada/invalid com justificativa; Água | Autor 2; revisão independente de `admin_demo_1`, sem exclusão física |
| [CA-000007](http://127.0.0.1:5174/#ocorrencia=CA-000007) | Duplicata da principal 2, preserva Verificação comunitária; Resíduos | Autor 3; imagem própria, comentário do morador 1 e apoio do morador 2 conservados na origem; `admin_demo_1` vinculou ao registro mais antigo |
| CA-000008 — consultar na Administração | Recebida oculta; Água | Autor 2 e imagem própria; denúncia do morador 3 julgada procedente por `admin_demo_2`; estado não mudou. Público não lê corpo/arquivo; admin pode revisar/restaurar |

“Autor 1/2/3” e “morador 1/2/3” significam as contas `morador_demo_1/2/3`. Nenhum administrador é autor de conteúdo usado como fundamento nesses cenários. Todas as ações ocorreram através dos serviços existentes, com evento/versão transacionais; os snapshots não contêm eventos fabricados. Datas são reais da preparação e não são rejuvenescidas ao restaurar.

## Apresentação de aproximadamente cinco minutos

Deixe abertos os links e perfis antes de começar. A senha deve permanecer fora da projeção.

1. 0:00–0:40 — contexto e consulta. Mostre aviso de simulação, mapa, categorias e lista. Abra a mesma ocorrência pela lista/mapa e explique território ilustrativo. Use os links da tabela se o painel compacto mostrar só quatro recentes.
2. 0:40–1:20 — entrada e triagem. Como morador 1, mostre CA-000001 e sua imagem. Como admin 1, encaminhe para Verificação comunitária com motivo de pelo menos 20 caracteres. Se quiser criar um novo registro, use a imagem local e coordenadas `-23.94`, `-46.18`; isso adiciona um ponto e histórico.
3. 1:20–2:20 — revisão independente. Abra CA-000002: comentário, observação, apoio e contestação de outras contas. Como admin 1, confirme selecionando apoio/observação de morador 2 e preenchendo parecer individual sobre a contestação. Explique que contagem não confirma automaticamente. Mostre CA-000003/4 para a confirmação e atualização exigida no acompanhamento.
4. 2:20–3:10 — encerramento e reabertura. Em CA-000005, mostre motivo, revisor, resolução referenciada e histórico. Na Administração, revise o pedido com fato novo: aprove via Mudar estado → Verificação comunitária e referência ao pedido, ou rejeite com justificativa. Aprovação exige nova confirmação; rejeição mantém Encerrada. São alternativas para uma apresentação; use reset entre elas.
5. 3:10–4:00 — organização sem apagar fatos. Abra CA-000007, navegue à principal 2 e à relacionada 3. Mostre a origem das imagens/contribuições da duplicata, seu bloqueio de participação e contagens próprias. Exiba CA-000006 com motivo do descarte.
6. 4:00–4:40 — moderação e privacidade. Como admin 2, abra Denúncias pendentes para CA-000002; nenhuma ocultação automática ocorreu. Consulte CA-000008 na fila Todas, sua imagem privada/auditoria e a opção Restaurar ocorrência. Como visitante, mostre indisponibilidade do conteúdo oculto, sem expor denúncia privada.
7. 4:40–5:00 — persistência e recuperação. Recarregue o link e consulte histórico. Explique backup/restauração verificados, alternativa pela lista se tiles falharem e ausência de laudo técnico. Reinício ao vivo é opcional: pare/inicie `demo:start` preservando a pasta; não prepare novamente.

Após 24h, edição e imagens do relato/complemento continuam sujeitas ao prazo normal. Reset conserva essas datas. Para demonstrar uma criação/edição recente dias depois, crie um relato novo ou prepare outra pasta vazia; não altere datas nem permissões do banco.

## Voltar ao cenário inicial

Pare `demo:start` com Ctrl+C. Na raiz do projeto:

```bash
CUIDACAO_ENV=demo npm run demo:reset -- --confirm-demo-reset
npm run demo:start
```

Para uma pasta alternativa, use o mesmo `CUIDACAO_DEMO_DIR` nos dois comandos. Reset exige ambiente, confirmação, marcador e ausência do lock. Primeiro valida a cópia inicial e cria backup datado de banco + arquivos + contas atuais. Qualquer erro de backup/validação preserva o conjunto atual. Só depois instala o cenário inicial em staging, troca a pasta `current` e remove a anterior, com recuperação se o rename falhar. Sessões são invalidadas; entre novamente. Nunca restaura sobre a base de uso.

Se houve parada abrupta/SIGKILL, pode restar `.demo.lock`. Ele contém PID, sem credenciais. A ferramenta recusa operar enquanto esse arquivo existir. Confira que o PID não existe/que o servidor foi encerrado antes de remover somente esse lock; não remova banco, marcador, pastas ou locks de uma aplicação ativa. Não há limpeza destrutiva automática no boot.

## Backup e restauração em outra pasta

Com a demonstração parada:

```bash
npm run demo:backup
```

O comando imprime o caminho do backup publicado/verificado. Este bloco produz e restaura uma cópia usando o caminho sem edição manual:

```bash
backup_dir="$(node --input-type=module -e 'import {backupDemo} from "./servidor/linha-comando/indice.js"; console.log(await backupDemo());')"
npm run demo:restore -- --backup "$backup_dir" --target "$PWD/cuidacao-demo-recuperada"
CUIDACAO_DEMO_DIR="$PWD/cuidacao-demo-recuperada" npm run demo:start
```

O destino precisa estar vazio e ser dedicado; uma segunda restauração nesse destino é recusada. O original permanece intacto. O backup usa a API SQLite do driver para incluir dados confirmados do WAL, confere integridade/FKs e hashes/tamanhos de cada arquivo referenciado, inclusive oculto/retirado. Também contém credenciais correspondentes e o índice dos cenários. Não publica backup incompleto. Ao importar/resetar, sessões são limpas; dados/eventos/datas/imagens permanecem. Não copie manualmente só o `.sqlite` de uma API em execução.

A entrega verificou também as cópias cuidacao-demo-restored/ e cuidacao-demo-verificada/ neste checkout. A última foi restaurada e lida por processo HTTP independente em 11/10/2026: iniciar alternativamente com `CUIDACAO_DEMO_DIR="$PWD/cuidacao-demo-verificada" npm run demo:start`. Não inicie duas demonstrações simultâneas nas mesmas portas. Pastas restauradas são ignoradas pelo Git e contêm senhas locais; não as compartilhe.

## Tiles indisponíveis e verificações

Se os tiles externos falharem, use a lista, filtros, links diretos e marcadores existentes. Para criar, informe latitude/longitude manuais, sem GPS nem geocodificação; o fundo não é requisito para salvar. Não baixe tiles em lote. A ilustração, API e dados são locais.

Verificação: `npm test`, `npm run build`, `npm run test:e2e`, `git diff --check`; Chromium por `npx playwright install chromium` ou alternativa do README. Resultados, tentativas e limites do item 14 estão em PLAN/ACCEPTANCE. Mobile nos testes é emulação Chromium; dispositivos físicos, teclado virtual real e leitores de tela não verificados. A falha histórica do marcador móvel permanece sem causa determinada. Falha de tiles nos apoio/testes/capturas é simulada, não medição de disponibilidade externa.

### Google e snapshots anteriores

A integração Google é opcional e não modifica as credenciais demonstrativas locais. A migração 003 acrescenta identidades/desafios e permite contas sem senha; snapshots preparados antes dela conservam seu esquema anterior. Reset/restore invalida sessões e desafios Google quando a tabela existe. Depois de restaurar um snapshot antigo, com aplicação parada, execute somente `CUIDACAO_DB_PATH="$PWD/demo-data/current/db.sqlite" npm run db:migrate` antes de configurar Google; não execute seed. O supervisor continua em `http://127.0.0.1:5174`; as instruções de ativação Google em README usam uma base separada e localhost:5173, sem alterar a apresentação preparada.
