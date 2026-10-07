# Arquitetura
07/10/2026 • decisões técnicas desta entrega

## Stack da primeira fatia
JavaScript com módulos ES, HTML/CSS, Vite, Leaflet 1.9.4 e testes Node + Playwright. Node.js 22.12+ ou 24 LTS. Dependências reproduzíveis em package-lock.json. Escolha: o fluxo inicial é pequeno e somente leitura; módulos explícitos evitam framework/backend prematuros, mantendo dados, domínio e mapa separados. Framework poderá ser adotado quando autenticação/formulários justificarem a complexidade.

## Componentes
- src/data/occurrences.js: fixtures identificadas como simulação.
- src/domain.js: estados, seleção e filtros puros.
- src/map.js: Leaflet, tiles, marcadores e enquadramento.
- src/main.js: composição da página, filtros, detalhes e hash.
- src/style.css: tokens, layout, foco e responsividade.
- tests/: contrato do domínio e navegação E2E.

URL usa hash para funcionar em hospedagem estática sem regra de reescrita. Vite gera dist; não há servidor de domínio, banco, login nem escrita nesta entrega. Não usar localStorage como autenticação futura.

## Cartografia e disponibilidade
Leaflet empacotado localmente; fundo https://tile.openstreetmap.org/{z}/{x}/{y}.png, atribuição visível a OpenStreetMap e link para copyright. Sem pré-download, cache personalizado ou uso offline de tiles. Depende de rede e política do provedor; falha mantém lista e marcadores e mostra aviso. Coordenadas das fixtures são aproximações ilustrativas; não desenhar polígono oficial sem fonte. Evitar limites rígidos fictícios do bairro.

## Evolução planejada
Na fatia de escrita, criar API separada e persistência relacional (SQLite como candidato para demonstração local), validação no servidor, sessões e permissões. O contrato de leitura pode migrar das fixtures para um repositório HTTP. Banco, framework de API e estratégia de autenticação ainda são propostas, não implementações ou escolhas confirmadas. Integração futura exige revisão de domínio antes de codificação.

## Verificação
npm test (regras de seleção/filtro e fixtures), npm run build, npm run test:e2e (mapa→resumo→detalhe, lista, link/voltar, filtros/vazio, falha de tiles e viewport móvel). Tiles podem ser bloqueados nos testes para não depender de serviço externo.

## Referências técnicas consultadas
- https://leafletjs.com/reference.html (verificar versão; implementação usa API 1.9.4 do pacote instalado).
- https://vite.dev/guide/
- https://operations.osmfoundation.org/policies/tiles/
