const categories = ['residuos','agua'];
const statuses = ['received','community_review','confirmed','monitoring','closed','discarded'];
const object = (properties,required=Object.keys(properties)) => ({type:'object',properties,required,additionalProperties:false});
const text = {type:'string'};
const nullableText = {anyOf:[text,{type:'null'}]};
const timestamp = {type:'string',format:'date-time'};
const positive = {type:'integer',minimum:1};
const count = {type:'integer',minimum:0};
const toggle = {type:'string',enum:['true','false']};
// Validate lexical form before Number conversion: no decimals, blanks, exponent,
// repeated query values or silent rounding of large integers.
const page = {type:'string',pattern:'^[1-9][0-9]*$',maxLength:13,default:'1'};
const pageSize = {type:'string',pattern:'^(?:[1-9]|[1-9][0-9]|100)$',default:'20'};
const pagination = {page,pageSize};
const commonQuery = {includeHidden:toggle};
const params = object({id:{type:'string',pattern:'^CA-(?:[0-9]{3}|[0-9]{6,})$',maxLength:100}});
const occurrence = object({
  id:text,authorId:text,title:text,description:text,category:{type:'string',enum:categories},
  latitude:{type:'number'},longitude:{type:'number'},locationLabel:nullableText,
  status:{type:'string',enum:statuses},simulated:{type:'boolean'},version:positive,
  duplicateOfId:nullableText,closureReason:{anyOf:[{const:'resolved'},{type:'null'}]},
  discardReason:{anyOf:[{type:'string',enum:['invalid','out_of_scope']},{type:'null'}]},
  createdAt:timestamp,updatedAt:timestamp
});
const detail = object({...occurrence.properties,counts:object({support:count,contest:count}),flags:object({
  referencesUnavailable:{type:'boolean'},referencesChanged:{type:'boolean'},relationsRemoved:{type:'boolean'},duplicateTargetUnavailable:{type:'boolean'}
})});
const event = object({id:text,action:text,createdAt:timestamp,username:nullableText,reason:nullableText});
const list = item => object({data:{type:'array',items:item},page:positive,pageSize:{...positive,maximum:100},total:count});
export const errorSchema = object({error:object({code:text,message:text,fields:{type:'object',additionalProperties:text},requestId:text},['code','message'])});
const errors = {400:errorSchema,403:errorSchema,404:errorSchema,422:errorSchema,500:errorSchema};
const normalized = query => ({...query,page:Number(query.page),pageSize:Number(query.pageSize)});

export function occurrenceRoutes(app,queries) {
  app.get('/api/v1/occurrences',{
    schema:{querystring:object({...commonQuery,...pagination,category:{type:'string',enum:categories},status:{type:'string',enum:statuses},includeDuplicates:toggle},[]),response:{200:list(occurrence),...errors}}
  },async request => queries.list(normalized(request.query)));
  app.get('/api/v1/occurrences/:id',{
    schema:{params,querystring:object(commonQuery,[]),response:{200:object({data:detail}),...errors}}
  },async request => queries.detail(request.params.id,request.query));
  app.get('/api/v1/occurrences/:id/history',{
    schema:{params,querystring:object({...commonQuery,...pagination},[]),response:{200:list(event),...errors}}
  },async request => queries.history(request.params.id,normalized(request.query)));
}
