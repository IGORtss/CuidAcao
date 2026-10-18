# Preparação para Firebase

## Estado desta etapa

O Firebase Web SDK modular está instalado e a aplicação inicializa o Firebase App quando encontra a configuração pública completa. Analytics, Authentication, Firestore, Storage e App Check são carregados em chunks assíncronos; App Check só ativa com site key. A aplicação continua usando:

- sessões opacas e identidades persistidas pelo Fastify/SQLite;
- Firebase Auth Google com ID token verificado pelo Firebase Admin, quando habilitado; Google Identity Services permanece como fallback;
- ocorrências, eventos e permissões no SQLite;
- anexos no armazenamento privado local servido pela API.

`codigo-fonte/servicos/firebase/configuracao.js` valida a configuração Web pública e o opt-in dos emuladores. `app.js` garante uma única instância; `bootstrap.js`, `auth.js`, `firestore.js`, `storage.js` e `app-check.js` inicializam cada produto sem bloquear a aplicação. O SDK não cria uma segunda fonte de verdade: Firestore e Storage estão fechados pelas regras até o corte autoritativo.

`firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules` e `firestore.indexes.json` configuram a Emulator Suite e o Hosting. As regras iniciais são deliberadamente `deny all`; não substituí-las por acesso público para “fazer funcionar”.

## Limite de segurança

Variáveis `VITE_*` são incluídas no bundle do navegador. Somente a configuração pública do aplicativo Web pode usar esse prefixo. Nunca colocar nelas service account, chave privada, client secret, senha, token ou credencial administrativa.

As chaves de API do Firebase identificam o projeto, mas não substituem autorização. Firestore e Storage precisam de Security Rules restritivas e App Check deve ser avaliado antes de qualquer exposição externa. Não serão criadas regras públicas de escrita.

Referências oficiais:

- Configuração Web: https://firebase.google.com/docs/web/setup
- Chaves de API: https://firebase.google.com/docs/projects/api-keys
- Auth Emulator: https://firebase.google.com/docs/emulator-suite/connect_auth
- Firestore Emulator: https://firebase.google.com/docs/emulator-suite/connect_firestore
- Storage Emulator: https://firebase.google.com/docs/emulator-suite/connect_storage

## Estratégia de migração gradual

1. Authentication primeiro, sem trocar sessão local. O navegador obtém uma credencial Firebase Google; o backend verifica o ID token e cria/recupera uma identidade local por `provider=firebase` + `uid`. O backend continua emitindo a sessão opaca do CuidAção. Não vincular por e-mail e não aceitar papel vindo do token/cliente.
2. Emuladores antes de novos serviços reais. Instalar a CLI somente quando houver um fluxo real e testes correspondentes. Conectar Auth, Firestore e Storage aos emuladores apenas quando `VITE_FIREBASE_USE_EMULATORS=true`.
3. Firestore como migração separada. Definir projeção, regras, versionamento e processo de migração antes de mover ocorrências. Não escrever simultaneamente SQLite e Firestore como fontes autoritativas.
4. Storage depois do contrato de metadados. Preservar validação de assinatura, dimensões, remoção de metadados, visibilidade do pai e auditoria. URLs diretas não podem contornar essas regras.

## Variáveis reservadas

Copiar `.env.example` para `.env.local` somente quando houver um projeto Firebase Web. `.env.local` já é ignorado pelo padrão `.env.*`.

`VITE_FIREBASE_USE_EMULATORS=true` conecta os SDKs às portas declaradas em `firebase.json`. `VITE_FIREBASE_APP_CHECK_SITE_KEY` recebe uma chave reCAPTCHA Enterprise criada para o domínio; debug token é exclusivamente local.

## Execução local

```bash
npm run build
npm run firebase:emulators
```

Auth, Hosting e a Emulator UI executam somente com Node. Firestore e Storage exigem Java; nesta máquina, o script usa o Temurin 21 portátil em `~/.local/share/cuidacao-tools/temurin-21`. A interface fica em `http://127.0.0.1:4000` e o Hosting em `http://127.0.0.1:5000`. O Hosting estático não substitui a API Fastify; publicar antes de hospedar/migrar `/api` deixaria as escritas indisponíveis.

## Estado do corte

- Firebase App, Analytics e os quatro SDKs adicionais: implementados.
- Emuladores, regras fechadas, índices e Hosting: configurados.
- Auth como sessão do CuidAção: ponte implementada e testada; ativação real depende de habilitar Google no Console e configurar o servidor.
- Firestore e Storage autoritativos: pendentes do migrador transacional e validação integral dos contratos D01–D13.
- App Check efetivo: pendente de site key e monitoramento antes de enforcement.
- Deploy: pendente de `firebase login`, backend hospedável para `/api` e autorização explícita de publicação.

## Ativação da ponte Authentication

1. Criar um projeto/aplicativo Web Firebase e habilitar Google em Authentication.
2. Definir as variáveis públicas em `.env.local` e configurar domínios autorizados.
3. Executar `npm run db:migrate` na base escolhida; a migração 006 é aditiva.
4. Desenvolvimento local: iniciar emuladores e usar `npm run start:firebase`; produção usa `CUIDACAO_FIREBASE_PROJECT_ID` e Application Default Credentials do ambiente, nunca chave em `VITE_*`.
5. Testes automatizados cobrem primeiro acesso, recorrência, rotação, colisão, origem e tokens/provedores inválidos; o popup real depende do provedor remoto configurado.
