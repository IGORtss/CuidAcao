# Instruções para agentes — CuidAção

Leia integralmente docs/PRODUCT.md, DOMAIN.md, UX.md, ARCHITECTURE.md e PLAN.md antes de editar. README descreve execução; DOMAIN governa regras do produto. Em conflito, preserve decisões confirmadas do usuário e registre a divergência antes de alterar o domínio.

## Escopo e método
- TCC funcional sobre o Perequê (Guarujá); usar português brasileiro na interface.
- Trabalhar por fatias verificáveis, atualizar PLAN e documentação quando comportamento mudar.
- Não criar chatbots, pontuação, rankings, integração com autoridades ou decisões automáticas sem requisito.
- Não afirmar que simulações são denúncias reais ou laudos ambientais.
- Preservar arquivos e trabalho existente. Não publicar/deployar o site sem solicitação.
- Decisões técnicas podem ser tomadas com justificativa; não apresentar propostas novas como decisões anteriores.
- Não solicitar dados pessoais nem adicionar credenciais ao repositório.

## Qualidade
Usar HTML semântico, controles operáveis por teclado, foco visível, layout móvel, estados de vazio/erro e texto legível. Inserir texto externo por textContent, nunca HTML não confiável. Manter dados separados de apresentação. Não representar autorizações apenas com controles escondidos: na futura API, verificar permissões no servidor.

Antes de concluir: npm test, npm run build e npm run test:e2e. Testes E2E exigem Chromium (npx playwright install chromium). Relatar qualquer verificação indisponível. Atualizar docs/PLAN.md com entregas e limites; não declarar funcionalidades futuras prontas. Não commitar node_modules, dist, relatórios, dados pessoais ou segredos.
