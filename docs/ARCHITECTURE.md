# Arquitetura — versão 1.0
07/10/2026 • decisões para implementação, sem backend entregue nesta revisão.

## Escolhas
| Camada | Decisão | Motivo |
| --- | --- | --- |
| Interface | JavaScript ES modules, HTML/CSS, Vite e Leaflet existentes | Preservar o fluxo já testado; separar páginas, serviços HTTP e apresentação ao crescer |
| Servidor | Node.js 24, Fastify 5, JSON Schema nas rotas | Uma linguagem; validação explícita e testes HTTP sem navegador |
| Banco | SQLite com better-sqlite3, SQL e migrações numeradas | Demonstração local de uma instância, sem serviço de banco separado |
| Sessões | Cookie opaco e sessão persistida no servidor | Revogação simples, sem autorização em localStorage |
| Arquivos | Diretório privado local, @fastify/multipart e sharp | Upload limitado, decodificação e remoção de metadados |
| Testes | node:test, Fastify inject, Playwright | Domínio, API real com banco temporário e fluxos de interface |

Não adicionar framework de frontend, ORM, microsserviços ou serviços pagos nesta versão. Versões exatas novas devem ser fixadas no lockfile na etapa de instalação e compatibilidade comprovada no Node 24; escolhas acima não afirmam que dependências futuras já foram instaladas. Pacote atual mantém compatibilidade de leitura com Node 22.12+; atualizar engines para Node 24 na etapa de backend.

## Estrutura alvo
src/domain/: regras puras e rótulos; src/services/: cliente API; src/ui/: fluxos; src/map.js: mapa. server/app.js: cria Fastify sem escutar; server/start.js: processo; server/routes/: HTTP; server/services/: autorização e casos de uso; server/repositories/: SQL; server/db/migrations/: esquema. tests/domain/, tests/api/, tests/e2e/. Não mover arquivos existentes apenas por estética; migrar com cada fluxo.

Em desenvolvimento, Vite encaminha /api para Fastify em 127.0.0.1:3000. Execução demonstrativa final serve dist e API na mesma origem pelo Fastify; bind padrão 127.0.0.1. Banco e imagens em data/ ignorado pelo Git; nunca em public/ ou dist. API prefixada /api/v1. Vite preview testa somente frontend. Não realizar deploy sem pedido.

## Integridade
Ativar PRAGMA foreign_keys=ON em toda conexão e WAL; transações curtas e consultas parametrizadas. Validar entrada, sessão, papel, autoria, estado, visibilidade e version no servidor; schema não substitui autorização. Atualizações usam comparação de version dentro da transação. Relações em dois registros verificam ambas versões. Serviço único aplica evento + alteração; proibir escrita direta de rotas em tabelas. Nenhum voto dispara transição automática.

Uploads: temporário privado, limites D06, decodificação e reencodificação antes do registro; renomear para id aleatório controlado pelo servidor. Em falha de transação, apagar novo arquivo; na inicialização limpar temporários e arquivos sem referência após 24h. Arquivo referenciado nunca é removido por essa limpeza. Servir via endpoint que verifica permissões, com nosniff e Content-Type validado. Backup inclui banco e anexos associados.

## Autenticação
Senha: node:crypto.scrypt assíncrono, salt aleatório de 16 bytes por senha, N=131072, r=8, p=1, chave 64 bytes, maxmem=256 MiB; armazenar parâmetros e hash, comparar com timingSafeEqual. Limitar duas derivações simultâneas para o protótipo. Nunca logar senha, cookie ou corpo de login/cadastro.

Token de sessão aleatório de 32 bytes; banco armazena apenas SHA-256 do token e validade absoluta de 8h. Cookie HttpOnly, SameSite=Lax, Path=/; Secure em HTTPS, exceção apenas para HTTP local. Login cria token novo, logout revoga e limpa cookie. GET /auth/me nunca entrega token/hash. Sem JWT nem papel recebido do cliente. Limitar login a 10 tentativas por minuto por IP+username e cadastro a 5 por minuto por IP; retornar 429. Conta inexistente e senha errada retornam mesma mensagem.

Para métodos de escrita exigir Origin da origem configurada, inclusive autenticação; rejeitar origem ausente/divergente no cliente web. Não habilitar CORS irrestrito. Conteúdo JSON exige application/json; multipart só nos uploads. Em futura exposição externa, reavaliar operação e segurança; o alvo desta versão permanece local.

## Cartografia
Leaflet empacotado; tiles https://tile.openstreetmap.org/{z}/{x}/{y}.png e atribuição OpenStreetMap. Sem download em lote/cache offline personalizado. Falha mantém marcadores e lista; criação tem latitude/longitude manuais. Caixa D02 é aproximação de demonstração, não fonte oficial. Não é necessário contratar geocodificação.

## Instalação e restauração — a implementar
Scripts futuros: npm run db:migrate; npm run db:seed; npm run start; npm run demo:reset -- --confirm-demo-reset. README só os apresentará como executáveis quando existirem. Seed funciona apenas em base vazia, cria três usuários e dois administradores fictícios, dados em diferentes estados com histórico válido; credenciais são geradas e mostradas localmente, nunca commitadas. Novas contas continuam possíveis via cadastro.

Reset só aceita ambiente demo e caminho do diretório data dedicado, com aplicação parada; nunca aceita caminho arbitrário para apagar. Antes de remover, cria backup datado do banco e uploads; erro de backup cancela reset. Recria esquema/seed, invalida todas as sessões. Reset não é rota HTTP. Testar restauração do backup em diretório separado. Sem limpeza destrutiva automática no boot. Documentar localmente data/ e backups/ no .gitignore quando criados.

## Referências técnicas verificadas em 07/10/2026
- Fastify: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/ e https://fastify.dev/docs/latest/Reference/LTS/ — schemas/validação; conferir compatibilidade da versão escolhida na instalação.
- SQLite: https://www.sqlite.org/foreignkeys.html — ativação de chaves estrangeiras.
- Driver: https://github.com/WiseLibs/better-sqlite3 — interface SQLite e transações.
- Node 24: https://nodejs.org/docs/latest-v24.x/api/crypto.html — scrypt e geração criptográfica.
- Cartografia: https://operations.osmfoundation.org/policies/tiles/ (referência da primeira entrega; não auditada novamente nesta revisão).
Os limites e parâmetros deste projeto são decisões locais, não exigências dessas fontes.
