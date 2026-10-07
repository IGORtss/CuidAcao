# Domínio e regras
Versão 0.1 • 07/10/2026

## Decisões confirmadas
Ocorrência é um registro localizado de um problema ambiental observado. Contribuições sobre o mesmo problema pertencem ao registro principal; fatos distintos podem ser relacionados. A ocorrência não comprova cientificamente contaminação.

Obrigatórios: categoria, descrição e localização. Evidência é opcional. Identidade do criador vem da conta na futura criação. Título, datas e identificador são campos técnicos de apresentação; sua inclusão no formulário será definida na fatia de criação. Nesta entrega títulos e datas pertencem às fixtures.

| Estado | Significado |
| --- | --- |
| Recebida | Registro criado e aguardando verificação |
| Verificação comunitária | Comunidade pode apoiar, contestar e complementar |
| Confirmada | Registro reconhecido no processo de revisão; não é laudo |
| Acompanhamento | Problema confirmado com atualizações |
| Encerrada | Encerramento documentado, com motivo e evidência ou atualização |
| Descartada | Registro inválido/inadequado com justificativa de moderação |

Fluxo de referência: Recebida → Verificação comunitária → Confirmada → Acompanhamento → Encerrada; descarte é uma saída de moderação justificada. Nenhuma dessas transições é executada na fatia 1.

## Participação e administração
Visitante lê. Usuário autenticado cria, comenta, complementa, apoia ou contesta. Administrador tem perfil separado, revisa denúncias, corrige com histórico, modera, vincula duplicatas e encerra com justificativa. Criador não controla sozinho a confirmação/resolução. Apoios, contestações e evidências ficam distinguíveis; contagem de votos não vira certificação técnica.

Duplicadas são vinculadas à principal, preservando informação e rastreabilidade; registros relacionados permanecem distintos. Histórico futuro registra autor, data, ação, motivo e alteração, incluindo ações automáticas.

## Propostas técnicas para próximas fatias (não decisões anteriores)
Confirmação, descarte e encerramento ficam sob revisão administrativa; apoios não alteram estado automaticamente. Uma manifestação ativa por usuário por ocorrência; autor não valida o próprio registro. Evidência complementar é armazenada separadamente do relato. Esses detalhes devem ser formalizados e testados antes de implementar participação.

## Pendências delimitadas
Limite geográfico oficial do bairro, catálogo completo de categorias, critérios de confirmação, reabertura, prazo de edição, limites/tipos de anexos e retenção ainda não estão definidos em detalhe nas fontes recuperadas. Não bloqueiam consulta simulada; bloqueiam as respectivas funções futuras. Não criar limiar automático de votos.

## Contrato da fatia 1
Occurrence: id único, title, description, category (Resíduos ou Água nas fixtures), status (um dos seis estados), latitude, longitude, locationLabel, createdAt (ISO), simulated=true, evidence (lista de descrições de exemplo), history (data/texto). Coordenadas são ilustrativas na região do Perequê, não comprovação de incidentes ou limite oficial. Evidência textual de exemplo não é anexo fotográfico.

Filtros combinam categoria E estado. Sem resultados, limpar seleção e manter mensagem explícita. Seleção por id na URL abre o registro; id desconhecido apresenta aviso e permite voltar. Não há mutação, persistência de usuário ou validação automatizada.
