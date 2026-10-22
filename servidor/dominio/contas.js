import {randomBytes, createHash} from 'node:crypto';
import {AuthError, hashPassword, normalizeAccountEmail} from './indice.js';
const digest = value => createHash('sha256').update(value).digest('hex');
const unavailable = () => new AuthError(503,'MAIL_UNAVAILABLE','Envio de e-mail indisponível nesta instalação.');
const invalid = () => new AuthError(422,'INVALID_ACCOUNT_LINK','Link inválido, expirado ou já utilizado.');
export function accountService(db, {origin, now = Date.now, sendMail = null} = {}) {
 async function send(user, purpose) {
  if (!sendMail) throw unavailable();
  const token = randomBytes(32).toString('base64url'), hash = digest(token);
  db.prepare('DELETE FROM account_tokens WHERE expiresAt<=?').run(new Date(now()).toISOString());
  db.prepare('INSERT INTO account_tokens(tokenHash,userId,purpose,expiresAt) VALUES(?,?,?,?)')
   .run(hash,user.id,purpose,new Date(now()+(purpose==='reset'?30*60*1000:24*60*60*1000)).toISOString());
  try {await sendMail({to:user.email, purpose, url:`${origin}/#account-${purpose}=${token}`});}
  catch {db.prepare('DELETE FROM account_tokens WHERE tokenHash=?').run(hash); throw unavailable();}
 }
 function consume(token, purpose, update) {
  if (typeof token!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw invalid();
  return db.transaction(()=>{
   const row=db.prepare('SELECT * FROM account_tokens WHERE tokenHash=? AND purpose=? AND expiresAt>?')
    .get(digest(token),purpose,new Date(now()).toISOString());
   if (!row) throw invalid();
   update(row.userId);
   db.prepare('DELETE FROM account_tokens WHERE userId=? AND purpose=?').run(row.userId,purpose);
  }).immediate();
 }
 return {
  configuration:()=>({emailEnabled:Boolean(sendMail)}),
  status(user) {const row=db.prepare('SELECT email,emailVerifiedAt FROM users WHERE id=?').get(user.id);return {email:row.email,verified:Boolean(row.emailVerifiedAt),emailEnabled:Boolean(sendMail)};},
  async requestReset(email) {
   email=normalizeAccountEmail(email);
   if (!sendMail) throw unavailable();
   const user=db.prepare('SELECT id,email FROM users WHERE email=? AND passwordHash IS NOT NULL').get(email);
   if (user) await send(user,'reset');
  },
  async requestVerification(user) {
   const row=db.prepare('SELECT id,email,emailVerifiedAt FROM users WHERE id=?').get(user.id);
   if (!row.email) throw new AuthError(422,'NO_ACCOUNT_EMAIL','Esta conta utiliza Google ou um cadastro antigo sem e-mail.');
   if (!row.emailVerifiedAt) await send(row,'verify');
  },
  verify(token) {consume(token,'verify',id=>db.prepare('UPDATE users SET emailVerifiedAt=?,updatedAt=? WHERE id=?').run(new Date(now()).toISOString(),new Date(now()).toISOString(),id));},
  async reset(token,password) {
   if (typeof password!=='string'||[...password].length<8||[...password].length>128) throw new AuthError(422,'INVALID_PASSWORD','A senha deve ter de 8 a 128 caracteres.');
   const credential=await hashPassword(password);
   consume(token,'reset',id=>{
    db.prepare('UPDATE users SET passwordHash=?,passwordSalt=?,passwordParams=?,updatedAt=? WHERE id=?')
     .run(credential.passwordHash,credential.passwordSalt,credential.passwordParams,new Date(now()).toISOString(),id);
    db.prepare('DELETE FROM sessions WHERE userId=?').run(id);
   });
  }
 };
}
