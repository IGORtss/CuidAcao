# Arquivos de apoio

Esta pasta separa materiais que não participam do runtime principal:

- `documentacao/`: contratos, decisões, instruções e evidências do projeto;
- `testes/`: testes automatizados, servidores isolados e dados usados apenas por eles;
- `materiais/`: arquivos de origem preservados para consulta;
- `registros-locais/`: logs locais já existentes;
- `resultados-testes/`: saída temporária do Playwright, ignorada pelo Git.

O código executável continua em `codigo-fonte/` e `servidor/`. Configurações que os comandos npm carregam diretamente permanecem em `configuracao/`. O banco de uso e a demonstração privada não foram movidos, pois seus caminhos fazem parte dos contratos operacionais e podem conter trabalho local.
