import {createHttpClient,ApiError} from './http.js';
import {adaptOccurrence,adaptDetail,adaptHistoryEvent} from './occurrence-adapter.js';

export function createOccurrenceClient(fetchImpl) {
  const getJSON=createHttpClient(fetchImpl);
  async function allPages(path,filters,{signal}={}) {
    const items=[];
    const ids=new Set();
    let total;
    let page=1;
    do {
      signal?.throwIfAborted();
      const query=new URLSearchParams({...filters,page:String(page),pageSize:'100'});
      const result=await getJSON(`${path}?${query}`,{signal});
      if(!result || !Array.isArray(result.data) || !Number.isSafeInteger(result.total) || result.total<0 ||
        result.page!==page || result.pageSize!==100 || (total!==undefined && result.total!==total)) {
        throw new ApiError('A consulta mudou ou retornou uma página inválida. Tente novamente.');
      }
      total=result.total;
      const expected=Math.min(100,Math.max(0,total-(page-1)*100));
      if(result.data.length!==expected) throw new ApiError('A consulta retornou uma página incompleta. Tente novamente.');
      for(const item of result.data) {
        if(!item || typeof item.id!=='string' || ids.has(item.id)) throw new ApiError('A consulta retornou registros repetidos ou inválidos. Tente novamente.');
        ids.add(item.id);items.push(item);
      }
      page++;
    } while(items.length<total);
    return items;
  }
  return {
    async list({category='',status='',signal}={}) {
      const filters={};
      if(category)filters.category=category;
      if(status)filters.status=status;
      return (await allPages('/api/v1/occurrences',filters,{signal})).map(adaptOccurrence);
    },
    async detail(id,{signal}={}) {
      const result=await getJSON(`/api/v1/occurrences/${encodeURIComponent(id)}`,{signal});
      const item=adaptDetail(result?.data);
      if(item.id!==id) throw new ApiError('A API retornou outro identificador. Tente novamente.');
      return item;
    },
    async history(id,{signal}={}) {
      return (await allPages(`/api/v1/occurrences/${encodeURIComponent(id)}/history`,{},{signal})).map(adaptHistoryEvent);
    }
  };
}

// Abort saves work; the generation check also guards late responses that ignored it.
export function createRequestScope() {
  let generation=0;
  let controller;
  return {
    begin() {
      controller?.abort();controller=new AbortController();
      const request=++generation, current=controller;
      return {signal:current.signal,isCurrent:()=>request===generation && !current.signal.aborted};
    },
    cancel() {generation++;controller?.abort();}
  };
}
