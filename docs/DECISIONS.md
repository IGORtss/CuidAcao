# Decisões da consolidação 1.0
07/10/2026 • autorização: usuário pediu aplicar as melhorias da revisão do repositório.

Estas são escolhas novas para preencher lacunas, distintas das decisões gerais anteriores. Não representam funcionalidades já entregues. Referência normativa: DOMAIN; decisões técnicas: ARCHITECTURE.

| Questão | Escolha | Justificativa e consequência |
| --- | --- | --- |
| Confirmação | Admin independente + suporte comunitário referenciado + parecer em contestações | Critério verificável sem apresentar votos como laudo |
| Estados | Seis estados existentes com tabela fechada; encerrada=resolved | Elimina interpretações sobre encerramento por inatividade |
| Reabertura | Pedido com fato novo e decisão administrativa | Preserva ciclo e histórico; exige nova confirmação |
| Categorias | Resíduos e Água fechadas na versão do TCC | Recorte viável ligado aos problemas já escolhidos; demais categorias fora desta versão |
| Território | Caixa explicitamente demonstrativa, validada na API | Não inventa fonte oficial nem bloqueia protótipo aguardando cartografia |
| Cadastro | Funcional, sem e-mail/dados reais; seed complementar | Demonstra contas e autorização sem depender de serviço externo |
| Edição | Autor por 24h em received; depois complemento/correção auditada | Evita reescrever observação já em revisão |
| Duplicatas | Vínculo sem fusão, sem somar votos; principal mais antiga | Preserva rastreabilidade e impede inflar confirmação |
| Moderação | Visibilidade separada do estado, denúncias privadas | Distingue conteúdo inadequado de validade ambiental do relato |
| Evidência | Imagens limitadas e reencodadas; upload após relato | Reduz complexidade e explicita recuperação de falha parcial |
| Histórico | Transação desde criação, controle de versão | Evita perder auditoria e sobrescrever decisões concorrentes |
| Arquitetura | Frontend existente + Fastify + SQLite local | Mantém escopo pequeno, persistência real e testes diretos de API |

## Alterações de escopo explicitadas
A 0.1 deixava categorias e cartografia oficial abertas; a 1.0 fecha duas categorias e usa geografia ilustrativa para o aceite. A expansão ambiental geral e o polígono oficial ficam fora desta versão. A 0.1 sugeria framework futuro: não haverá troca de frontend no escopo atual. Cadastro real no contexto de simulação não é substituído por seletor de papéis. Regras numéricas são convenções desta versão e podem ser revistas conscientemente, nunca alteradas silenciosamente pelo agente.

## Limitações externas
Sem fonte cartográfica oficial incorporada; sem alegação de precisão territorial. Sem revisão de normas específicas da instituição de ensino, pois não foram fornecidas. Sem avaliação de operação pública/produção. Nenhuma dessas limitações impede os critérios funcionais definidos para o TCC demonstrativo.
