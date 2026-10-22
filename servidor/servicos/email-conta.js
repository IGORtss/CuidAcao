/** Transporte privado: endpoint HTTPS configurado pelo operador, nunca pelo cliente. */
export function accountMailer(env = process.env, fetchImpl = globalThis.fetch) {
 const endpoint = env.CUIDACAO_ACCOUNT_MAIL_URL, secret = env.CUIDACAO_ACCOUNT_MAIL_TOKEN;
 if (!endpoint || !secret) return null;
 const url = new URL(endpoint);
 if (url.protocol !== 'https:' || url.username || url.password) throw new Error('O transporte de e-mail exige HTTPS.');
 return async (message) => {
  const response = await fetchImpl(url, {method:'POST', redirect:'error', signal:AbortSignal.timeout(10000),
   headers:{'Content-Type':'application/json',Authorization:`Bearer ${secret}`}, body:JSON.stringify(message)});
  if (!response.ok) throw new Error('Transporte de e-mail indisponível.');
 };
}
