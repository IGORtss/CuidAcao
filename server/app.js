import Fastify from 'fastify';
import {randomUUID} from 'node:crypto';
import {openDatabase} from './db/connection.js';
import {occurrenceQueries, QueryError} from './services/occurrence-query.js';
import {occurrenceRoutes} from './routes/occurrences.js';

export function createApp({db, databasePath, logger=false} = {}) {
  const app = Fastify({logger,exposeHeadRoutes:false,genReqId:()=>randomUUID(),requestIdHeader:false,
    routerOptions:{onBadUrl(_path,_request,response) {
      response.writeHead(400,{'content-type':'application/json; charset=utf-8'});
      response.end(JSON.stringify({error:{code:'INVALID_REQUEST',message:'Requisição inválida.'}}));
    }},
    ajv:{customOptions:{removeAdditional:false,coerceTypes:false}}});
  const ownedDatabase = !db;
  const database = db ?? openDatabase(databasePath);
  if (ownedDatabase) app.addHook('onClose',async () => database.close());
  app.setErrorHandler((error,request,reply) => {
    if (error.validation) {
      const fields = {};
      for (const failure of error.validation) {
        const field = failure.params.additionalProperty || failure.params.missingProperty || failure.instancePath.split('/').filter(Boolean).at(-1) || error.validationContext;
        Object.defineProperty(fields,field,{value:'Valor inválido ou campo não permitido.',enumerable:true,configurable:true});
      }
      return reply.code(422).send({error:{code:'VALIDATION_ERROR',message:'Parâmetros de consulta inválidos.',fields}});
    }
    if (error instanceof QueryError) return reply.code(error.statusCode).send({error:{code:error.code,message:error.message}});
    if (error.code==='FST_ERR_BAD_URL') return reply.code(400).send({error:{code:'INVALID_REQUEST',message:'Requisição inválida.'}});
    // Do not trust DB errors' statusCode or return their message/stack/SQL.
    request.log.error({requestId:request.id},'Falha interna na consulta.');
    return reply.code(500).send({error:{code:'INTERNAL_ERROR',message:'Não foi possível concluir a consulta.',requestId:request.id}});
  });
  app.setNotFoundHandler((_request,reply) => reply.code(404).send({error:{code:'NOT_FOUND',message:'Recurso indisponível.'}}));
  occurrenceRoutes(app,occurrenceQueries(database));
  return app;
}
