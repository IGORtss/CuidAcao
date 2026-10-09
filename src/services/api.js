export async function api(path, {method='GET',body}={}) {
  let response;
  try {
    response=await fetch(`/api/v1${path}`,{method,credentials:'same-origin',...(method!=='GET'?{headers:{'Content-Type':'application/json'}}:{}),...(body!==undefined?{body:JSON.stringify(body)}:{})});
  } catch {throw new Error('Não foi possível acessar o servidor. Confira se a API está em execução.');}
  if (response.status===204) return null;
  const result=await response.json();
  if (!response.ok) {const error=new Error(result.error?.message??'Não foi possível concluir a operação.');Object.assign(error,{status:response.status,fields:result.error?.fields});throw error;}
  return result;
}
export async function allPages(path) {
  const result=[],separator=path.includes('?')?'&':'?';
  let page=1,total=0;
  do {const response=await api(`${path}${separator}page=${page}&pageSize=100`);result.push(...response.data);total=response.total;page++;} while (result.length<total);
  return result;
}
const categories={residuos:'Resíduos',agua:'Água'};
const statuses={received:'Recebida',community_review:'Verificação comunitária',confirmed:'Confirmada',monitoring:'Acompanhamento',closed:'Encerrada',discarded:'Descartada'};
export function viewOccurrence(item, events=[]) {
  return {...item,category:categories[item.category],status:statuses[item.status],statusCode:item.status,categoryCode:item.category,evidence:[],history:events.map(event=>({date:event.createdAt,text:`${event.actor} · ${event.action.startsWith('transition:') ? `Estado alterado para ${statuses[event.action.slice(11)]}.`:event.action==='created' ? 'Registro criado.':event.action==='edited' ? 'Relato editado.':event.action==='supplement_created' ? 'Complemento demonstrativo registrado.':event.action}${event.reason ? ` ${event.reason}`:''}`}))};
}
