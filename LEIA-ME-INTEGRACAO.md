# cuidAÇÃO integrado

Base GitHub: https://github.com/IGORtss/CuidAcao (commit 004515047ca01de852c736020b1478d4221ec253).

Mantém o site verde com Saúde, Denúncias, Comunidade, Mapa e Configurações.
Em Mapa > Ocorrências do Perequê · TCC abre a aplicação original do repositório.
Tema e tamanho de fonte são transmitidos ao módulo. O backend original preserva
contas, sessões, ocorrências, contribuições, anexos, histórico e permissões.

## Executar a versão completa

Requer Node.js 24 e npm. Extraia o ZIP e execute na pasta extraída:

```
npm ci
npm run integrado:start
```

Abra http://127.0.0.1:4180. O servidor cria/migra uma base SQLite vazia;
nenhum banco ou conta pessoal acompanha o pacote. Crie uma conta pela interface.
As páginas já estão compiladas em site/. Para recompilar o módulo após editar:
`npm run build`, depois copie o conteúdo de dist/ para site/territorio/.

## Publicação

A cópia no Sites é estática: não executa Fastify/better-sqlite3. Sem API ela
preserva o mapa e as funções locais do site; cadastro e gravações do módulo
dependem do servidor. Para disponibilizar o pacote completo, hospede esta aplicação
Node com SQLite persistente e HTTPS; configure CUIDACAO_WEB_ORIGIN com a origem
HTTPS e HOST conforme o provedor. No site, informe essa origem em
Configurações > Conexão com o projeto do TCC. O módulo será aberto nessa origem.
Cookies em iframe entre domínios podem ser bloqueados pelo navegador; nesse caso
use Abrir módulo em tela inteira para autenticar na própria origem.

Agendamentos e os formulários antigos continuam sendo demonstrações locais,
sem integração com SUS ou órgãos públicos. Registros do módulo são relatos;
não constituem laudo ambiental ou atendimento oficial.

## Validação

Build Vite concluído. Testes de autenticação, consulta, histórico e anexos
validados. Ajustes Windows: sincronização de diretório não suportada pelo sistema
(a sincronização dos arquivos é mantida) e fechamento dos bancos antes da limpeza
do teste temporário. Servidor estático serve somente site/, sem expor banco/anexos.
Backend e regras de domínio mantidos no pacote; GitHub original não foi alterado.
