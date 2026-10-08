# CuidAção

Plataforma de monitoramento ambiental comunitário do bairro Perequê, em Guarujá (SP), desenvolvida como Trabalho de Conclusão de Curso (TCC).

## Sobre o projeto

O CuidAção propõe um espaço digital para moradores registrarem, visualizarem e acompanharem problemas ambientais do bairro. Um mapa interativo reúne ocorrências, enquanto os registros permitem compartilhar evidências e organizar contribuições da comunidade sobre cada problema.

O projeto amplia uma proposta inicial voltada ao descarte de resíduos e à localização de pontos de coleta. Seu recorte atual inclui problemas ambientais do território, como descarte inadequado de lixo e relatos de possível contaminação da água do mar. Relatos comunitários não equivalem a uma medição técnica ou a um laudo ambiental.

## Objetivo

Facilitar a visão geral dos problemas ambientais do Perequê e demonstrar como uma plataforma pode organizar registros, participação comunitária, acompanhamento e histórico de ocorrências.

## Contexto acadêmico

O sistema será desenvolvido como uma **simulação funcional de uma plataforma real**, destinada à apresentação do TCC. As funcionalidades previstas serão demonstradas nesse contexto; o projeto não está sendo preparado para lançamento como serviço público.

Dados fictícios utilizados na demonstração deverão ser identificados como simulados.

## Público e território

- **Público-alvo:** moradores do Perequê interessados em acompanhar a situação ambiental do bairro.
- **Área de abrangência:** bairro Perequê, Guarujá (SP).
- **Tema:** monitoramento ambiental comunitário.

## Funcionalidades previstas

- Cadastro e identificação de usuários.
- Mapa interativo com ocorrências ambientais.
- Criação de ocorrências por moradores.
- Inclusão de evidências e informações complementares.
- Comentários e participação comunitária na verificação dos registros.
- Acompanhamento do estado de cada ocorrência.
- Organização de registros duplicados ou relacionados.
- Administração e moderação das ocorrências.
- Histórico de alterações e encerramento dos registros.

Esta lista apresenta o escopo geral. Regras de estados, validação, permissões e resolução estão definidas na especificação 1.0 em docs/DOMAIN.md. A implementação continua dividida em etapas; documentação pronta não significa funcionalidade pronta.

## Desenvolvimento com agentes de IA

Agentes como o Codex apoiarão a documentação, implementação e revisão do projeto. O desenvolvimento seguirá etapas pequenas e verificáveis, com regras explícitas para reduzir inconsistências e funcionalidades sem relação com o objetivo do TCC.

Diretrizes:

- Implementar com base na documentação do projeto.
- Distinguir decisões confirmadas de propostas técnicas.
- Evitar funcionalidades, dados e regras de negócio inventados.
- Priorizar os fluxos essenciais antes do acabamento visual.
- Verificar o comportamento entregue em cada etapa.
- Manter uma interface clara, adequada ao território e ao público do projeto.

## Estado atual

**Primeira fatia implementada:** mapa → visualizar ocorrência → abrir detalhes. Inclui lista, filtros, navegação por URL e dados fictícios. Cadastro, criação, participação e administração serão implementados nas próximas fatias.

Stack: JavaScript com módulos ES, Vite e Leaflet; base de persistência SQLite com better-sqlite3 13.0.3 e API pública local em Fastify 5.12.5. Requer Node.js 24 e npm. O [driver declara suporte a Node >=22](https://github.com/WiseLibs/better-sqlite3/blob/v13.0.3/package.json). O frontend consulta a API, sem fallback para fixtures. Validação executada pelo usuário no terminal local com Node 24.21.0: npm ci bem-sucedido, 28 testes Node aprovados, build aprovado e 16 execuções E2E aprovadas. Evidências e histórico dos bloqueios anteriores estão em PLAN.

## Executar localmente

```bash
git clone https://github.com/IGORtss/CuidAcao.git
cd CuidAcao
npm ci
npm run db:migrate
# Opcional, somente em base vazia:
npm run db:seed
# Terminal 1:
npm run start
# Terminal 2:
npm run dev
```

Abra o endereço exibido pelo Vite (normalmente http://localhost:5173). O proxy de `/api` encaminha as consultas para o Fastify local em `127.0.0.1:3000`; mantenha os dois processos ativos. O fundo cartográfico exige internet; se falhar, use a lista. O repositório é privado: o clone exige autenticação de uma conta com acesso.

O lockfile atual inclui Fastify 5.12.5, better-sqlite3 13.0.3 e dependências transitivas, sincronizados com package.json. A instalação reproduzível por `npm ci` foi validada pelo usuário no terminal local com Node 24.21.0.

Histórico: nas tentativas anteriores do agente, resolução do lockfile e `npm ci` falharam com EAI_AGAIN; dependências de backend estavam ausentes, Node disponível era 26.10.0 e o ambiente recusava bind local com EPERM. Esses bloqueios foram superados na validação local informada pelo usuário; não são pendências da entrega atual. O registro detalhado permanece em PLAN.

## Preparar a base local

Após instalar as dependências, com Node 24:

```bash
npm run db:migrate
npm run db:seed
```

O banco padrão é `data/cuidacao.sqlite`, relativo ao projeto. Para um banco separado, defina `CUIDACAO_DB_PATH` nos dois comandos. Dados, bancos e backups são ignorados pelo Git. Nenhum comando apaga ou reinicializa uma base existente.

Migrações numeradas são aplicadas em transação e registradas em `schema_migrations`; reaplicá-las preserva os dados. Cada conexão habilita chaves estrangeiras e WAL (bancos em memória usam o modo próprio do SQLite). Não editar migração já aplicada.

O seed exige esquema previamente migrado e base vazia, inclusive sem usuários ou sequência já utilizada. Recusa tabelas alheias. Cria três usuários e dois administradores fictícios, com senhas aleatórias derivadas por scrypt; mostra as credenciais somente no terminal depois do commit, sem gravá-las em arquivo. Não redirecione essa saída para arquivos do repositório. Essas contas ainda não podem entrar no sistema: login e cadastro permanecem pendentes.

Os quatro registros preservam `CA-001`–`CA-004`; novos IDs usam sequência transacional de seis dígitos, começando em `CA-000005` após o seed. Os eventos foram construídos para a simulação, com triagem, apoio independente e complementos referenciados; o histórico textual das fixtures não foi importado.

Há uma primitiva interna síncrona para mutação + evento + incremento de versão na mesma transação, incluindo comparação das versões de duas ocorrências. A projeção pública de consulta foi implementada; autorização e validação dos casos de escrita seguem pendentes. Não há rotas de escrita, uploads ou reset.

## API pública local

Com dependências instaladas e banco previamente migrado:

```bash
npm run start
```

Inicia somente a API em `http://127.0.0.1:3000`, sem servir o frontend e sem executar migrações, seed ou reset no boot. `CUIDACAO_DB_PATH` seleciona a mesma base configurada nos comandos de preparação; o padrão continua `data/cuidacao.sqlite`. O seed é opcional: uma base migrada vazia retorna lista vazia, sem fixtures. Fechar a aplicação fecha sua conexão.

Rotas implementadas:

- `GET /api/v1/occurrences?category=residuos&status=received&page=1&pageSize=20`
- `GET /api/v1/occurrences/CA-001`
- `GET /api/v1/occurrences/CA-001/history?page=1&pageSize=20`

Categorias/estados usam códigos do domínio. A listagem combina filtros com E, ordena por createdAt/id decrescentes e omite ocultos e duplicatas; `includeDuplicates=true` inclui duplicatas visíveis. Detalhe e histórico de ocultos ou inexistentes retornam 404. `includeHidden=true` retorna 403, inclusive com cookies ou headers que aleguem administração. Não há autenticação implementada.

Schemas rejeitam parâmetros desconhecidos/inválidos com 422. O detalhe expõe dados persistidos, contagens próprias de manifestações visíveis/ativas e flags derivadas de referências. Histórico expõe ação, data, username fictício e motivo público, sem snapshots nem eventos privados de denúncias. Falhas internas retornam 500 genérico com requestId gerado no servidor. Campos e envelopes estão descritos em docs/API.md.

A consulta carrega todas as páginas (100 registros por requisição) antes de atualizar mapa, lista e contagem juntos. Durante a carga ou erro não apresenta resultados parciais; vazio e erro são estados distintos, com tentativa manual novamente. Trocar filtros cancela e invalida respostas antigas. Detalhes e histórico consultam diretamente o ID, independentemente da listagem; fechar preserva filtros. Códigos são adaptados aos rótulos de DOMAIN, com datas em America/Sao_Paulo. Anexos ainda não têm consulta implementada, e a interface informa essa limitação sem inventar evidências.

## Verificar

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

O build é gerado em `dist`; servir frontend e API juntos continua pendente. `npm run preview` não configura o proxy da API. Os testes E2E iniciam Fastify em `127.0.0.1:3100` e Vite em `127.0.0.1:5180`, com banco exclusivo criado no diretório temporário do sistema e removido ao encerrar. Não reutilizam servidores existentes nem `CUIDACAO_DB_PATH`; o banco do desenvolvedor permanece intacto. Usam 105 registros para exercitar múltiplas páginas e bloqueiam os tiles externos. Chromium alternativo: `CUIDACAO_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`.

## Reproduzir a revisão em ambiente temporário (Bash)

Na raiz do projeto, com Node 24 e rede, copie o trabalho atual sem bancos ou credenciais. Estes comandos deixam a base existente intacta e não apagam a cópia temporária:

```bash
verification_dir="$(mktemp -d)"
tar --exclude='./.git' --exclude='./node_modules' --exclude='./dist' \
    --exclude='./data' --exclude='./backups' --exclude='./credentials' \
    --exclude='./test-results' --exclude='./playwright-report' --exclude='./CuidAcao' \
    --exclude='.env*' --exclude='*.sqlite*' --exclude='*.db*' \
    --exclude='*.credentials.json' -cf - . | tar -xf - -C "$verification_dir"
cd "$verification_dir"
node --version # Deve mostrar v24.x
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

O lockfile entregue está sincronizado; não é necessário resolvê-lo novamente antes de `npm ci`. A validação aprovada foi executada pelo usuário no terminal local, não pelo agente no ambiente anteriormente restrito. `npm test` prepara bancos temporários, executa os comandos npm de migração/seed, compara os dados após reaplicação/recusa e verifica a API antes/depois de encerrar e iniciar outro processo HTTP. Não cria endpoint de escrita. Credenciais do teste ficam somente na memória; comparações de preservação usam digests para não imprimir hashes/salts em falhas.

Para a consulta manual nessa mesma cópia, sem usar a base de demonstração:

```bash
export CUIDACAO_DB_PATH="$verification_dir/data/consulta.sqlite"
npm run db:migrate
npm run db:seed # Credenciais exibidas apenas localmente; não redirecionar saída
npm run db:migrate # Deve preservar os dados
npm run db:seed # Deve falhar: base preenchida; não é um reset
npm run start
```

Em outro terminal, entre no diretório temporário indicado por `verification_dir` e execute `npm run dev`. Abra o endereço do Vite, consulte filtros e `/#ocorrencia=CA-001`. Para verificar reinício manual, pare a API com Ctrl+C e rode `npm run start` novamente no primeiro terminal, preservando `CUIDACAO_DB_PATH`. Os registros e histórico devem permanecer. Ao parar a API e atualizar a consulta, deve aparecer erro; reinicie a API e use Tentar novamente. A aprovação registrada refere-se aos comandos e testes automatizados informados pelo usuário; não registra execução adicional deste roteiro manual.

## Próximos passos

1. Implementar cadastro, sessão e criação auditada em uma próxima entrega.
2. Verificar permissões e validações das rotas de escrita quando forem implementadas.
3. Implementar participação e evidências.
4. Implementar administração, transições, duplicatas e moderação.
5. Verificar o roteiro completo e preparar a apresentação.

A especificação 1.0 fecha as regras da versão demonstrativa. Passo 3 da lista geral (base SQLite, API pública de consulta e integração do frontend) implementado e validado pelo usuário no terminal local. Autenticação e criação de ocorrências continuam pendentes; AC04–AC11 não estão completos. Categorias desta versão: Resíduos e Água. Área cartográfica aproximada, explicitamente simulada. Consulte [o plano](docs/PLAN.md) para distinguir entregas e pendências.

## Documentação normativa 1.0

- [Produto e escopo](docs/PRODUCT.md)
- [Regras e permissões](docs/DOMAIN.md)
- [Interface e fluxos](docs/UX.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Modelo de dados](docs/DATA_MODEL.md)
- [Contrato da API](docs/API.md)
- [Critérios de aceitação](docs/ACCEPTANCE.md)
- [Plano e verificação](docs/PLAN.md)
- [Decisões desta revisão](docs/DECISIONS.md)
- [Instruções aos agentes](AGENTS.md)

---

**CuidAção — cuidado com o território, participação da comunidade e acompanhamento dos problemas ambientais.**
