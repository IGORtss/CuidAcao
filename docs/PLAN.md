# Plano de implementação

## Entrega atual — fatia 1
- [x] AGENTS e documentação de produto/domínio/UX/arquitetura.
- [x] Dados locais explicitamente simulados.
- [x] Mapa navegável com marcadores e resumo.
- [x] Lista e filtros por categoria/estado, incluindo resultado vazio.
- [x] Detalhes com URL compartilhável e retorno.
- [x] Verificação de domínio, build e navegação em navegador.

## Próximas fatias, em ordem
1. Identificação + criação: formalizar formulário/categorias/limite do bairro, implementar API e banco, sessão e usuário demonstrativo; criar um registro, recarregar e verificar persistência. A autenticação deve acompanhar a primeira escrita.
2. Participação: comentários, evidências, apoio/contestação; fechar critérios e impedir participação sem sessão e auto-validação.
3. Administração/histórico: transições com motivos, moderação, denúncias, vínculo de duplicadas, encerramento, eventual reabertura; testar permissões na API e preservação de histórico.
4. Apresentação: roteiro com dados simulados, responsividade, acessibilidade, cenário de falha, instalação reproduzível e revisão do texto acadêmico.

## Definição de pronto por fatia
Comportamento verificável, documentação atualizada, dados simulados sinalizados, verificação apropriada aprovada e limites relatados. Não adicionar botões decorativos prometendo etapas futuras. Deploy não faz parte desta autorização.

## Resultado da verificação — 07/10/2026
3 testes Node aprovados; build Vite aprovado; 8 cenários Playwright aprovados (4 desktop e 4 mobile), incluindo mapa/resumo/detalhes, URL/recarregamento/voltar, seleção inválida, filtros/vazio, falha de tiles e retorno de foco. npm audit: nenhuma vulnerabilidade conhecida no momento da verificação.

O download padrão do Chromium falhou neste ambiente. E2E executados com Chromium alternativo instalado temporariamente via @sparticuz/chromium, sem adicionar essa dependência ao projeto. Caminho alternativo pode ser fornecido por CUIDACAO_CHROMIUM_PATH; instalação comum e CI usam o Chromium do Playwright. Os tiles foram bloqueados intencionalmente nos testes; a disponibilidade externa do OpenStreetMap não foi certificada.
