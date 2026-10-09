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

Categorias fechadas para esta versão: Resíduos e Água. A escolha cobre os dois problemas centrais do TCC e preserva o código existente. Novas categorias exigem revisão explícita de domínio; não são necessárias para concluir a apresentação. Abrangência conceitual: Perequê. Abrangência técnica demonstrativa: área aproximada definida em DOMAIN, sem valor cartográfico oficial.

## Fora desta versão
IA dentro do produto, chatbots, rankings, recompensas, contato com autoridades, promessa de atendimento oficial, diagnóstico médico, laudos, medição de balneabilidade, notificações externas, recuperação de senha por e-mail, coleta de dados reais, aplicação móvel nativa e deploy público. Não há prova de residência nem validação de identidade real.

## Entrega atual e alvo
Implementado na etapa de persistência: consulta pela API, cadastro, login/logout, sessões, criação/edição do autor e histórico transacional. Seed local com quatro registros fictícios e cinco contas. Participação, imagens e administração continuam previstas; suas rotas ainda não foram entregues. Estado por etapa em PLAN e cenários de aprovação em ACCEPTANCE.

## Sucesso da versão completa
Uma demonstração deve mostrar cadastro, criação, persistência após reinício, contribuição de outra conta, revisão por administrador, acompanhamento, encerramento e histórico. Também deve mostrar uma duplicata, uma contestação, moderação e negação de uma ação sem permissão. Consulta e formulários essenciais devem funcionar em viewport móvel e por teclado. Falha dos tiles não impede consulta ou entrada manual de coordenadas. O roteiro deve ser restaurável sem apagar bases alheias.

## Autoridade e proveniência
As decisões gerais vêm das conversas do projeto; nome CuidAção e primeiro protótipo foram estabelecidos em 07/10/2026. Regras operacionais, limites numéricos e escolhas técnicas da versão 1.0 foram definidos nesta revisão, autorizada pelo usuário após a auditoria. São decisões novas para implementação, não uma alegação de consenso anterior.

DOMAIN governa comportamento; DATA_MODEL e API o operacionalizam; UX define apresentação; ARCHITECTURE define implementação; ACCEPTANCE define evidência de conclusão; PLAN separa trabalho entregue e futuro. Em conflito, corrigir os documentos antes de implementar a parte conflitante.
