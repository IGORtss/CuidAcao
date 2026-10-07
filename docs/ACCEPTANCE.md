# Critérios de aceitação — versão 1.0
Cada cenário deve virar teste automatizado quando sua etapa for implementada; testes visuais/roteiro podem ser manuais quando indicado. “Especificado” não significa aprovado. Referências Dxx apontam DOMAIN.

| ID | Etapa | Cenário e resultado obrigatório |
| --- | --- | --- |
| AC01 | 1 | Abrir pelo mapa e pela lista mostra mesmo id; link direto/reload/Voltar/Avançar, fechar e foco funcionam |
| AC02 | 1 | Categoria E estado filtra mapa/lista; vazio permite limpar; tiles bloqueados mantêm consulta |
| AC03 | 2 | Banco novo recebe migrações/seed; aplicar migrações novamente não altera dados; seed recusa base preenchida |
| AC04 | 2 | Cadastro funcional cria user; username duplicado retorna 409; role=admin ou campos desconhecidos são rejeitados |
| AC05 | 2 | Login/logout/expiração funcionam; token revogado não autentica; resposta/log não revela senha/hash/token |
| AC06 | 2 | POST direto sem sessão retorna 401; alterar autoria/papel/estado não contorna autorização |
| AC07 | 2 | Criar relato válido retorna received com evento; recarregar e reiniciar servidor preserva registro |
| AC08 | 2 | Texto curto, categoria inválida, NaN e coordenadas fora da caixa falham; bordas exatas da caixa são aceitas |
| AC09 | 2 | Autor edita em received até 24h; outro usuário, após prazo ou outro estado recebe 403/409 conforme causa |
| AC10 | 2 | Falha de evento desfaz mutação; duas escritas com mesma version permitem só uma e outra retorna 409 |
| AC11 | 2 | Origin ausente/externa é recusada; rate limit de login/cadastro retorna 429; usuário não vê auditoria privada |
| AC12 | 3 | Participação permitida só nos três estados; autor não apoia/contesta próprio relato; sem sessão não participa |
| AC13 | 3 | Apoiar→contestar substitui manifestação sem duplicar contagem; retirada desativa e preserva evento |
| AC14 | 3 | Edição de contribuição obedece autoria, prazo e estado; texto com HTML é exibido como texto |
| AC15 | 3 | JPEG/PNG/WebP válido recebe legenda e perde metadados; assinatura falsa, SVG, >5 MiB, >20 MP e sexto anexo são rejeitados |
| AC16 | 3 | Falha de upload preserva relato; arquivo oculto/retirado não é obtido por URL direta; retirada respeita prazo |
| AC17 | 4 | Cada aresta permitida D03 funciona com condições; qualquer outra aresta retorna 409 sem evento de sucesso |
| AC18 | 4 | Confirmar sem suporte independente ou parecer de toda contestação falha; voto isolado nunca muda estado |
| AC19 | 4 | Referências de outro relato não relacionado, ocultas ou do autor não contam; decisão salva snapshots auditáveis |
| AC20 | 4 | Encerrar exige resolução referenciada; reabrir exige pedido; rejeição tem motivo; reabertura exige nova confirmação |
| AC21 | 4 | Admin não decide próprio conteúdo nem própria denúncia; admin independente pode agir; correção gera antes/depois |
| AC22 | 4 | Denúncia não oculta automaticamente; upheld oculta, dismissed preserva; público não vê denunciante/texto oculto |
| AC23 | 4 | Ocultar pai bloqueia filhos e arquivos por API; restauração de filho não contorna pai; retirada de suporte sinaliza revisão |
| AC24 | 4 | Duplicata preserva conteúdo, sai do mapa/lista padrão e aponta principal; contribuições e contagens não são copiadas |
| AC25 | 4 | Proibir ciclos/cadeias, principal mais nova, origem terminal e vínculo próprio; desvincular restaura operação e audita ambos |
| AC26 | 4 | Relação é simétrica/única; remoção não apaga fatos; conflito em qualquer versão desfaz alteração nos dois registros |
| AC27 | 5 | Roteiro completo funciona com três usuários e dois admins, e novas contas por cadastro |
| AC28 | 5 | Reset exige ambiente/pasta/confirmacão, backup prévio; erro de backup não apaga nada; restauração reproduz dados/anexos |
| AC29 | 5 | Consulta e formulários a 360px, 200% zoom e teclado; foco e erros verificáveis; imagens com legenda (revisão manual + E2E) |
| AC30 | 5 | Instalação limpa documentada, build e suíte aprovados; falha da API mostra erro sem fixtures; simulação visível em todos os fluxos |

## Cobertura atual real
Há 3 testes Node sobre fixtures/filtros/seleção e 4 cenários Playwright executados em desktop e mobile (8 execuções). Cobrem partes de AC01/AC02; não cobrem integralmente Avançar nem todo comportamento de seleção/filtro. Build validado. AC03–AC30 ainda pendentes; não marcar como prontos com base na documentação. Não usar a contagem de 8 execuções como oito funcionalidades de domínio.
