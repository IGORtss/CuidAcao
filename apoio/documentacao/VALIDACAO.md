# Repetir a validação integrada — item 13

Este roteiro usa dados fictícios e uma base descartável separada da base de uso. Não prepara a base definitiva da apresentação (item 14). Não execute seed, reset ou exclusão sobre `data/`.

## Preparação local

No diretório do projeto, com Node.js 24 e as dependências do lockfile instaladas (`npm ci` numa instalação nova), use um terminal dedicado:

```bash
# Nesta máquina, o Node.js 24 instalado pelo n pode ser selecionado assim:
export PATH="$HOME/.local/n/bin:$PATH"
node --version
export CUIDACAO_VALIDATION_DIR="$(mktemp -d "${TMPDIR:-/tmp}/cuidacao-validation-XXXXXX")"
export CUIDACAO_DB_PATH="$CUIDACAO_VALIDATION_DIR/validation.sqlite"
export CUIDACAO_UPLOAD_DIR="$CUIDACAO_VALIDATION_DIR/uploads"
export CUIDACAO_WEB_ORIGIN=http://127.0.0.1:5173
npm run db:migrate
npm run db:seed > "$CUIDACAO_VALIDATION_DIR/contas.credentials.txt"
chmod 600 "$CUIDACAO_VALIDATION_DIR/contas.credentials.txt"
cat "$CUIDACAO_VALIDATION_DIR/contas.credentials.txt"
node --input-type=module -e 'import sharp from "sharp"; import {join} from "node:path"; await sharp({create:{width:32,height:24,channels:3,background:"#40574d"}}).png().toFile(join(process.env.CUIDACAO_VALIDATION_DIR,"evidencia-ficticia.png"));'
npm start
```

O arquivo de contas contém a saída textual do seed. Seu conteúdo permanece fora do repositório, na pasta temporária privada. As senhas são geradas em cada execução. Seed é permitido aqui somente porque a base temporária acabou de ser criada vazia; nunca repita seed na mesma base preenchida. Guarde o caminho dessa pasta para o reinício.

Em outro terminal, no projeto:

```bash
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Abra `http://127.0.0.1:5173`. Use cinco perfis/contextos de navegador com cookies independentes: uma conta nova criada pela interface, `morador_demo_2`, `morador_demo_3`, `admin_demo_1` e `admin_demo_2`. Abas normais e abas anônimas da mesma sessão compartilham cookies; não bastam para separar todas as contas. Apenas o seed local cria administradores; cadastro cria usuários comuns.

## Ciclo principal

1. Cadastre e autentique uma conta fictícia nova. Registre categoria Água, descrição com pelo menos 20 caracteres, latitude `-23.94`, longitude `-46.18` e a imagem gerada, com legenda de 5 a 200 caracteres. Anote o identificador criado. Confira o mesmo registro no mapa, na lista e no link `/#ocorrencia=IDENTIFICADOR`; recarregue.
2. Como `admin_demo_1`, abra o registro recebido e Mudar estado: encaminhe a Verificação comunitária com justificativa. A conta administrativa não deve ser autora do registro, das contribuições usadas como fundamento ou do pedido que decidir.
3. Como `morador_demo_2`, publique comentário, complemento de Observação e apoio justificado. Como `morador_demo_3`, publique contestação justificada. Confira autoria, textos, uma posição ativa de cada usuário e estado ainda Verificação comunitária. Participação não equivale a laudo técnico.
4. Como `admin_demo_1`, confirme usando o apoio independente e um parecer para a contestação. Passe a Acompanhamento referenciando a Observação; sem o fundamento exigido a operação deve falhar.
5. Como `morador_demo_2`, acrescente Informação de resolução. Confira que ela não encerra automaticamente. Como `admin_demo_1`, encerre com motivo, justificativa e referência a essa resolução. Consulte o fundamento público, autor da decisão e histórico, inclusive a paginação quando disponível. Comentários, apoios e novas imagens do relato não são permitidos no registro encerrado.
6. Como `morador_demo_2`, peça reabertura com um fato novo. O estado permanece Encerrada até decisão. Como `admin_demo_1`, reabra para Verificação comunitária referenciando o pedido; confira situação Aceito, histórico e ausência do painel de encerramento atual. Será necessária nova confirmação para avançar novamente.
7. Em cenário separado, como `morador_demo_3`, peça reabertura do registro demonstrativo já encerrado `CA-004`. Como `admin_demo_2`, Administração → Pedidos de reabertura → Revisar pedido → Rejeitar pedido, com justificativa. Confira pedido Rejeitado, histórico e estado ainda Encerrada.
8. Pare somente a API com Ctrl+C e execute novamente `npm start` no mesmo terminal, preservando as variáveis e a pasta. Recarregue os links e confirme textos, estados, decisões, eventos, vínculos e carregamento das imagens. Não repita migrate/seed para simular o reinício. Os testes automatizados também encerram processos HTTP reais e comparam respostas e bytes dos anexos em processos distintos.

## Cenários adicionais

- Após a reabertura do principal, denuncie-o com `morador_demo_3`. A denúncia não oculta sozinha. Como administrador independente, decida Procedente; como visitante confira ausência em consulta, detalhes e URLs das imagens. Como administrador, confira a auditoria privada e restaure; estado não muda. O denunciante consulta seu andamento em Minhas denúncias. Conteúdo privado não aparece no histórico público.
- Crie dois outros relatos fictícios: um do mesmo problema, outro distinto. Como administrador, vincule o mais novo como duplicata do principal e estabeleça relação com o problema distinto. Confira navegação pública, bloqueio de participação na duplicata e ausência de soma de posições ao principal. Desvincule/remova a relação e confira histórico nos dois registros, sem apagar os relatos originais.
- Em dois clientes administrativos, carregue a mesma versão antes de uma alteração. A segunda escrita deve exigir revisão da versão e conservar a justificativa. Visitantes e contas comuns não podem executar transições/moderação, mesmo pela API.
- Para falhas controladas, execute os E2E abaixo: eles interceptam upload, conexão e tiles; verificam rascunhos, recuperação de sessão e repetição apenas dos arquivos pendentes, contando a criação única. Não substitua arquivos por URLs remotas. Expiração no instante exato e rollback são verificados com relógio/banco isolados nos testes Node; remover cookie no navegador simula perda de sessão, não passagem real de oito horas.

## Verificações automatizadas

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
git diff --check
```

Se Chromium já estiver instalado, não é necessário reinstalar. `CUIDACAO_CHROMIUM_PATH` permite apontar para um Chromium alternativo (README). Os testes criam bases/anexos isolados, credenciais temporárias privadas e removem essas pastas ao encerrar. Os projetos integrados desktop/mobile usam portas próprias 5187/5188 (APIs 3107/3108) para não compartilhar mutações nem consumir juntos os limites de cadastro. Não introduzem retries nem desabilitam autorização/rate limits.

Evidências e limites do item 13 em ACEITE.md e PLANO.md. Mapa móvel: falha antiga não reproduzida, causa indeterminada. Mobile é emulação Chromium; dispositivos físicos, teclado virtual real e leitores de tela não foram verificados. Tiles abortados são falha de rede simulada, não evidência de indisponibilidade externa atual. Instalação limpa, backup/reset/restauração e base da apresentação não integram esta entrega.
