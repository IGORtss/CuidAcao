# Produto — CuidAção
Versão normativa 1.0 • 07/10/2026

## Objetivo e contexto
Organizar registros ambientais localizados, contribuições e acompanhamento de problemas do Perequê, Guarujá, para moradores interessados na situação do bairro. O produto é uma simulação funcional para apresentação de TCC, sem lançamento como serviço público. Todas as contas, ocorrências e evidências usadas na demonstração devem ser fictícias e identificadas como tais.

## Escopo obrigatório da versão de apresentação
- Consulta pública por mapa e lista, filtros por categoria/estado, detalhes e link direto.
- Cadastro funcional por nome de usuário e senha, entrada e saída; contas demonstrativas adicionais para roteiro reproduzível.
- Criação persistente com localização, edição limitada pelo autor e correção administrativa auditada.
- Comentários, complementos, imagens de exemplo, apoio e contestação.
- Revisão administrativa, confirmação observacional, acompanhamento, encerramento e reabertura.
- Denúncia de conteúdo inadequado, ocultação/restauração, vínculo de duplicatas e de ocorrências relacionadas.
- Histórico desde a primeira escrita, permissões verificadas no servidor e restauração local da demonstração.
- Exploração cartográfica contextual: camadas e legenda, resumo do enquadramento, ficha de lugar, seleção poligonal, URL compartilhável, coleções com critérios explícitos, reprodução dos estados históricos disponíveis e comparação de períodos.
- Acompanhamento autenticado de ocorrências, lugares e áreas, consultas salvas e atualizações internas derivadas de eventos persistidos; sem e-mail ou push.

Categorias fechadas para esta versão: Resíduos e Água. A escolha cobre os dois problemas centrais do TCC e preserva o código existente. Novas categorias exigem revisão explícita de domínio; não são necessárias para concluir a apresentação. Abrangência conceitual: Perequê. Abrangência técnica demonstrativa: área aproximada definida em DOMAIN, sem valor cartográfico oficial.

## Fora desta versão
IA dentro do produto, chatbots, rankings, recompensas, contato com autoridades, promessa de atendimento oficial, diagnóstico médico, laudos, medição de balneabilidade, notificações externas, recuperação de senha por e-mail, coleta de dados reais, aplicação móvel nativa e deploy público. Não há prova de residência nem validação de identidade real.

Continuam fora do escopo imagens aéreas históricas, recortes territoriais oficiais sem fonte, geocodificação, previsão ambiental, interpolação de medições e inferência de recorrência por mera proximidade. O modo Medições mostra somente metadados explicitamente registrados; ausência de medições é apresentada como “Sem dados”.

## Entrega atual e alvo
Implementados e verificados na Etapa 2: migrações/seed, leitura da API com mapa/lista/filtros/detalhes, cadastro/login/sessão/logout, criação e edição limitada pelo autor, histórico transacional e versionamento. Evidências em PLAN. O item 5 original inclui imagens opcionais persistentes do relato original, com upload após salvar e recuperação de falha parcial. O item 6 acrescenta comentários/complementos e imagens de complementos, com leitura pública e edição limitada pelo autor. O item 7 entrega manifestações de apoio/contestação, substituição e retirada auditadas. O item 8 entrega ciclo de estados, controles mínimos administrativos nos detalhes e pedidos necessários à reabertura. Item 9 entrega área administrativa, denúncias, correções, ocultação/restauração, rejeição de pedidos e auditoria privada. Item 10 entrega gestão de duplicatas e relações; item 11 revisa histórico e encerramento sem duplicar os serviços. Itens 12/13 revisam interface e ciclo integrado; item 14 prepara oito cenários fictícios com backup/reset/restauração locais restritos à apresentação. Evidências e limites atuais em PLAN.

A infraestrutura Firebase é uma migração operacional, não uma ampliação funcional: os mesmos dados, permissões, auditoria e limites devem sobreviver ao corte. Inicializar SDKs ou emuladores não torna Firestore/Storage autoritativos nem permite escrita pública.

## Sucesso da versão completa
Uma demonstração deve mostrar cadastro, criação, persistência após reinício, contribuição de outra conta, revisão por administrador, acompanhamento, encerramento e histórico. Também deve mostrar uma duplicata, uma contestação, moderação e negação de uma ação sem permissão. Consulta e formulários essenciais devem funcionar em viewport móvel e por teclado. Falha dos tiles não impede consulta ou entrada manual de coordenadas. O roteiro deve ser restaurável sem apagar bases alheias.

## Autoridade e proveniência
As decisões gerais vêm das conversas do projeto; nome CuidAção e primeiro protótipo foram estabelecidos em 07/10/2026. Regras operacionais, limites numéricos e escolhas técnicas da versão 1.0 foram definidos nesta revisão, autorizada pelo usuário após a auditoria. São decisões novas para implementação, não uma alegação de consenso anterior.

DOMAIN governa comportamento; DATA_MODEL e API o operacionalizam; UX define apresentação; ARCHITECTURE define implementação; ACCEPTANCE define evidência de conclusão; PLAN separa trabalho entregue e futuro. Em conflito, corrigir os documentos antes de implementar a parte conflitante.

Autenticação Google opcional autorizada na solicitação de 11/10/2026: complementa usuário/senha, sem ampliar permissões, integrar outros serviços Google ou vincular automaticamente contas existentes. Primeiro acesso pede username local e cria apenas usuário comum. Contratos detalhados em DOMAIN/API; ativação depende de cliente Google configurado, não de dados demonstrativos.
