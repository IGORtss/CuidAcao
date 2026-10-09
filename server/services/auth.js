import {scrypt, randomBytes, randomUUID, createHash, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {fail} from './errors.js';
const derive = promisify(scrypt);
const params = {N:131072,r:8,p:1,keylen:64,maxmem:256*1024*1024};
let active = 0;
const waiting = [];
async function limitedDerive(password, salt, p) {
  if (active >= 2) await new Promise(resolve => waiting.push(resolve)); else active++;
  try { return await derive(password, salt, p.keylen, p); }
  finally { const next = waiting.shift(); if (next) next(); else active--; }
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return {passwordSalt:salt,passwordHash:(await limitedDerive(password,salt,params)).toString('hex'),passwordParams:JSON.stringify(params)};
}
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export const publicUser = user => ({id:user.id,username:user.username,role:user.role});
export function authService(db, now = () => new Date()) {
  function username(value) {
    const normalized = value.toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(normalized)) fail(422,'INVALID_USERNAME','Use de 3 a 30 letras, números ou sublinhados.',{username:'Nome de usuário inválido.'});
    return normalized;
  }
  async function register(input) {
    const name = username(input.username);
    if (db.prepare('SELECT id FROM users WHERE username=?').get(name)) fail(409,'USERNAME_TAKEN','Nome de usuário já utilizado.');
    const secret = await hashPassword(input.password);
    const date = now().toISOString();
    const user = {id:randomUUID(),username:name,role:'user',createdAt:date,updatedAt:date,...secret};
    try { db.prepare('INSERT INTO users VALUES(@id,@username,@passwordHash,@passwordSalt,@passwordParams,@role,@createdAt,@updatedAt)').run(user); }
    catch (error) { if (error.code==='SQLITE_CONSTRAINT_UNIQUE') fail(409,'USERNAME_TAKEN','Nome de usuário já utilizado.'); throw error; }
    return publicUser(user);
  }
  async function login(input) {
    const name = input.username.toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE username=?').get(name);
    // Derive even for an absent account, avoiding a fast account-existence path.
    const salt = user?.passwordSalt ?? '00000000000000000000000000000000';
    const candidate = await limitedDerive(input.password,salt,user ? JSON.parse(user.passwordParams) : params);
    if (!user || !timingSafeEqual(candidate,Buffer.from(user.passwordHash,'hex'))) fail(401,'INVALID_LOGIN','Usuário ou senha inválidos.');
    const token = randomBytes(32).toString('hex');
    const date = now(); const expiresAt = new Date(date.getTime()+8*60*60*1000);
    db.transaction(() => {
      db.prepare('DELETE FROM sessions WHERE expiresAt<=?').run(date.toISOString());
      db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(randomUUID(),user.id,tokenHash(token),expiresAt.toISOString(),date.toISOString());
    })();
    return {user:publicUser(user),token,expiresAt};
  }
  function current(token) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const user = db.prepare('SELECT u.id,u.username,u.role FROM users u JOIN sessions s ON s.userId=u.id WHERE s.tokenHash=? AND s.expiresAt>?').get(tokenHash(token),now().toISOString());
    return user ?? null;
  }
  function logout(token) { if (token) db.prepare('DELETE FROM sessions WHERE tokenHash=?').run(tokenHash(token)); }
  return {register,login,current,logout};
}
