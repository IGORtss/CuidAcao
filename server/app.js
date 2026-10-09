import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import staticFiles from '@fastify/static';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {openDatabase} from './db/database.js';
import {authService} from './services/auth.js';
import {occurrenceService} from './services/occurrences.js';
import {fail} from './services/errors.js';
import * as schema from './routes/schemas.js';

export async function createApp({dbPath=resolve('data/cuidacao.sqlite'),origin='http://127.0.0.1:3000',now=()=>new Date(),serveStatic=false}={}) {
  const url=new URL(origin);
  if (url.origin!==origin || (!['http:','https:'].includes(url.protocol))) throw new Error('CUIDACAO_ORIGIN deve ser uma origem HTTP/HTTPS sem caminho.');
  if (url.protocol==='http:' && !['localhost','127.0.0.1','[::1]'].includes(url.hostname)) throw new Error('HTTP é permitido somente em origem local.');
  const db=openDatabase(dbPath);
  const app=Fastify({logger:false,bodyLimit:32*1024,ajv:{customOptions:{removeAdditional:false,coerceTypes:false,useDefaults:false}}});
  app.decorate('db',db);
  app.addHook('onClose',async()=>db.close());
  await app.register(cookie);
  const auth=authService(db,now), records=occurrenceService(db,now), attempts=new Map();
  const cookieOptions={httpOnly:true,sameSite:'lax',path:'/',secure:url.protocol==='https:'};
  app.addHook('onRequest',async(request,reply)=>{
    reply.header('Cache-Control','no-store'); reply.header('X-Content-Type-Options','nosniff');
    if (['POST','PATCH','PUT','DELETE'].includes(request.method)) {
      if (request.headers.origin!==origin) fail(403,'INVALID_ORIGIN','Origem da solicitação não autorizada.');
      if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type']??'')) fail(415,'INVALID_MEDIA','Envie os dados em JSON.');
    }
    request.user=auth.current(request.cookies.cuidacao_session);
  });
  function requireUser(request) { if (!request.user) fail(401,'AUTH_REQUIRED','Entre na sua conta para continuar.'); return request.user; }
  function hidden(request) {
    if (request.query.includeHidden==='true') {
      if (request.user?.role!=='admin') fail(403,'FORBIDDEN','Consulta restrita a administradores.');
      return true;
    }
    return false;
  }
  function rateLimit(request,kind,limit) {
    const time=now().getTime();
    for (const [key,value] of attempts) if (value.until<=time) attempts.delete(key);
    const key=JSON.stringify([kind,request.ip,kind==='login' ? (typeof request.body?.username==='string'?request.body.username.toLowerCase():''):'']);
    const entry=attempts.get(key)??{count:0,until:time+60000};
    if (entry.count>=limit) fail(429,'RATE_LIMIT','Muitas tentativas. Aguarde um minuto.');
    // Bound memory even when different usernames are submitted.
    if (!attempts.has(key) && attempts.size>=10000) fail(429,'RATE_LIMIT','Muitas tentativas. Aguarde um minuto.');
    entry.count++; attempts.set(key,entry);
  }
  app.setErrorHandler((error,request,reply)=>{
    let status=error.statusCode??500;
    if (error.validation) status=422;
    const known=status<500;
    const fields=error.fields??(error.validation ? Object.fromEntries(error.validation.map(issue=>[issue.instancePath.replace(/^\//,'')||issue.params.missingProperty||issue.params.additionalProperty||'form','Valor inválido ou campo não permitido.'])):undefined);
    reply.code(status).send({error:{code:error.validation ? 'INVALID_INPUT':known ? error.code??'REQUEST_ERROR':'INTERNAL_ERROR',message:error.validation ? 'Revise os campos informados.':status===400 ? 'Solicitação JSON inválida.':status===413 ? 'A solicitação excede o tamanho permitido.':known ? error.message:'Não foi possível concluir a operação.',...(fields ? {fields}:{}),...(!known ? {requestId:request.id}:{})}});
  });
  const prefix='/api/v1';
  app.post(`${prefix}/auth/register`,{schema:{body:schema.credentials,response:{201:schema.envelope(schema.user)}},preValidation:async r=>rateLimit(r,'register',5)},async(request,reply)=>reply.code(201).send({data:await auth.register(request.body)}));
  app.post(`${prefix}/auth/login`,{schema:{body:schema.credentials,response:{200:schema.envelope(schema.user)}},preValidation:async r=>rateLimit(r,'login',10)},async(request,reply)=>{
    const session=await auth.login(request.body);
    auth.logout(request.cookies.cuidacao_session);
    reply.setCookie('cuidacao_session',session.token,{...cookieOptions,expires:session.expiresAt});
    return {data:session.user};
  });
  app.get(`${prefix}/auth/me`,{schema:{response:{200:schema.envelope(schema.user)}}},async request=>({data:requireUser(request)}));
  app.post(`${prefix}/auth/logout`,async(request,reply)=>{auth.logout(request.cookies.cuidacao_session);reply.clearCookie('cuidacao_session',cookieOptions);return reply.code(204).send();});
  app.get(`${prefix}/occurrences`,{schema:{querystring:schema.reading,response:{200:schema.listResponse(schema.occurrence)}}},async request=>records.list(request.query,hidden(request)));
  app.get(`${prefix}/occurrences/:id`,{schema:{params:schema.idParams,querystring:schema.object({includeHidden:schema.pagination.includeHidden}),response:{200:schema.envelope(schema.occurrence)}}},async request=>({data:records.get(request.params.id,hidden(request))}));
  app.get(`${prefix}/occurrences/:id/history`,{schema:{params:schema.idParams,querystring:schema.object(schema.pagination),response:{200:schema.listResponse(schema.historyEvent)}}},async request=>records.history(request.params.id,request.query,hidden(request)));
  app.post(`${prefix}/occurrences`,{schema:{body:schema.creation,response:{201:schema.envelope(schema.occurrence)}},preValidation:async r=>requireUser(r)},async(request,reply)=>reply.code(201).send({data:records.create(request.body,request.user)}));
  app.patch(`${prefix}/occurrences/:id`,{schema:{params:schema.idParams,body:schema.editing,response:{200:schema.envelope(schema.occurrence)}},preValidation:async r=>requireUser(r)},async request=>({data:records.edit(request.params.id,request.body,request.user)}));
  if (serveStatic) {
    const root=resolve('dist');
    if (!existsSync(resolve(root,'index.html'))) {await app.close();throw new Error('Execute npm run build antes de npm start.');}
    await app.register(staticFiles,{root});
  }
  app.setNotFoundHandler((request,reply)=>reply.code(404).send({error:{code:'NOT_FOUND',message:'Recurso indisponível.'}}));
  return app;
}
