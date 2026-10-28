# Validação funcional do cuidAÇÃO integrado

Data: 28/10/2026. Escopo: branch site-integrado, site verde e módulo do Perequê.

## Resultado

- 169 testes automatizados de domínio, API, banco, migrações, autenticação,
  permissões, anexos, concorrência, histórico, backup/restauração e reinício: passaram.
- 13 testes dos controles locais (armazenamento bloqueado/cheio, anexos, GPS,
  preferências e busca): passaram.
- 52 verificações observadas na interface: passaram. Navegação, filtros,
  formulários, agendamento/cancelamento, imagem real, mural/apoio, notícias por
  teclado, temas, conexão, cadastro/login, ocorrência com imagem, acompanhamento,
  recarga e celular com fonte grande.
- SQLite da verificação isolada: integrity_check = ok e foreign_key_check vazio.
  Conta, sessão, ocorrência, imagem, acompanhamento e eventos foram gravados.
  A imagem aparece nos detalhes e no histórico após recarregar.

## Correções

Salvamento local transacional (a interface só atualiza após salvar), validação de
campos, proteção da busca, anonimato persistido, filtros que não escondem novos
registros, retorno de erro, leitura de anexos, modais por teclado e foco.
Controles de aparência funcionam mesmo sem armazenamento local disponível.
Menu do mapa aceita ações visíveis durante a animação de abertura.
Cabeçalho mobile cabe em 390 px, inclusive com texto ampliado.
Servidor integrado fecha o SQLite corretamente, permite caminho de banco por
CUIDACAO_DB_PATH (ou CUIDACAO_DATABASE_PATH), aplica migrações sem resetar a base,
serve apenas site/ e bloqueia caminhos externos, banco e código-fonte.
Backup e testes foram adaptados às operações de arquivos disponíveis no Windows.
Sincronização de dados de arquivo permanece ativa; fsync de diretórios só é
executado nos sistemas que o suportam. Sessões e senhas são tratadas pelo backend
original; não foram criados atalhos que dispensem autenticação ou permissões.

## Limites verificados

O Sites atual é estático e não executa Node/SQLite. Cadastro, anexos e gravações
compartilhadas do módulo online dependem de um servidor HTTPS configurado.
O pacote local contém esse servidor. Os formulários antigos de Saúde/Denúncias
continuam sendo demonstrações locais, sem reserva SUS ou envio a órgãos públicos.
GPS físico depende de permissão do navegador; os caminhos de sucesso, recusa e
indisponibilidade foram testados com coordenadas fictícias. Mapas externos precisam
de internet. Verificações locais usaram somente contas, imagens e relatos fictícios;
o banco de auditoria não é incluído no pacote nem enviado ao GitHub.

## Reproduzir

```
npm ci
npm test
npm run test:interface-local
npm run test:integrado
npm run integrado:start
```

Abra http://127.0.0.1:4180. A base é criada/migrada sem seed automático.
Nunca substitua a base de uso pelos arquivos de teste. Use backup antes de
implantar alterações em um servidor que contenha registros reais.
