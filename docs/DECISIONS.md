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


## Direção de frontend aprovada em 08/10/2026 — V6

**Fonte:** iterações de composição e aprovação explícita do usuário após a V6. [Especificação detalhada](FRONTEND_DESIGN.md) e [Figma editável](https://www.figma.com/design/I2Qk0iFboOAnJ5oENX5DNu). Esta seção complementa a consolidação 1.0; não modifica o domínio.

| Tema | Decisão | Consequência |
| --- | --- | --- |
| Protagonismo | **Mapa artístico abstrato** em tela inteira, assimetria editorial, texto integrado à cartografia | Evitar hero padronizado em duas colunas e fotografia genérica |
| Direção visual | Atmosfera azul-petróleo/grafite/tons terrosos, superfície de leitura clara só quando necessária, mapa relativamente minimalista | Substitui a antiga referência genérica de papel claro/verde da UX |
| Hero | Sem CTA “Explorar o mapa” | A rolagem normal revela a exploração; navegação pode oferecer salto acessível |
| Passagem | Transição suave da ilustração para **Leaflet/OSM real** | Arte não representa limite/ruas reais; movimento reduzido deve ter caminho direto |
| Exploração | Mapa dominante, filtros legítimos e painel comunitário adaptativo | Desktop compacto/expansível; móvel bottom sheet, com lista alternativa |
| Painel | Destaques de problemas em acompanhamento, não painel de números genéricos ou feed de comentários | Seleção transparente por registros/atualização, sem gravidade ou validação deduzida |
| Detalhes | Prévia contextual → leitura ampla, preservando contexto do mapa; ações Acompanhar → Discutir → Contribuir | Não equivale a serviço de assinatura ou notificações; respeitar DOMAIN D05 |
| Discussão e histórico | Conversa visualmente própria, histórico de alterações separado | Threading real e feed global requerem mudanças futuras de API/modelo; não inventar |
| Integridade visual | Fotos só quando houver evidência vinculada; senão recorte do mapa funcional ou texto | Proibir mapa/registro fabricados para representar situação real |

**Estado:** V6 aprovada como **identidade**; quadros 02–04 do Figma são **estudos** e ainda têm pequenos problemas de composição, texto e um filtro “Vegetação” inválido para a versão 1.0. Não considerar imagens, animação, responsividade ou funcionalidades do mockup como já implementadas.


## Retomada do desenvolvimento funcional — 09/10/2026
O usuário pediu continuar a sequência funcional do TCC e interrompeu novas tarefas de frontend. Entrega desta etapa concentra persistência, identidade e criação (itens 3–5 da sequência). Histórico é antecipado ao item 11 porque D09 exige auditoria desde a primeira escrita. Controles mínimos de formulário integram o backend, sem nova direção visual.

A branch remota consultada continha somente leitura estática. Esta entrega parte desse estado e não afirma incorporar o frontend local mais recente do usuário. Integração futura deve preservar as alterações locais e resolver diferenças conscientemente.
