# Interface e fluxos

## Direção
Português brasileiro, linguagem comunitária e visual sóbrio: papel claro, verde profundo e diferenciação discreta de resíduos/água. O território e a informação são o centro. Evitar slogans excessivos, dashboards decorativos, números inventados de impacto e ações sem implementação.

## Consulta (implementada)
Cabeçalho CuidAção/Perequê; aviso de simulação persistente; introdução curta; categoria e estado; painel cartográfico e lista equivalente. Marcadores abrem um resumo com botão Ver detalhes. Cartões da lista abrem o mesmo detalhe. Botão Ver todas restaura enquadramento dos pontos visíveis.

Detalhes em dialog nativo: título, identificador, estado, descrição, localização/coordenadas, categoria, data, evidências de exemplo e histórico simulado. Fechar ou Escape retorna foco ao controle de origem. Hash #ocorrencia=id permite link direto, recarregar e navegação Voltar/Avançar. Erro de id inválido usa mensagem visível e ação para retornar.

## Estados
Zero resultados: mensagem com botão Limpar filtros. Erro de tiles: aviso de fundo indisponível e lista utilizável. Sem JavaScript: informar requisito. Marcador, resumo e detalhe sempre exibem contexto de simulação. Não exibir botões Registrar, Entrar ou Validar até seus fluxos existirem.

## Acessibilidade e celular
Lista oferece alternativa ao mapa, marcadores têm título/alt identificáveis, labels explícitos, foco visível e contagem em região aria-live. No celular mapa vem antes da lista; filtros empilham quando necessário. Detalhes têm rolagem interna, largura limitada e fechamento por teclado. Categorias e estados aparecem em texto, não só cor.

## Fluxos futuros
Cadastro/login → criar ocorrência (categoria, descrição, localização, evidência opcional) → leitura → complementos/participação → revisão administrativa → acompanhamento → encerramento com histórico. Perfil administrativo terá revisão, duplicatas e moderação. Formulários futuros precisam tratamento de envio, sucesso, erro e permissão verificada no servidor.
