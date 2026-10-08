export class ApiError extends Error {
  constructor(message, status=0) {super(message);this.status=status;}
}

export function createHttpClient(fetchImpl=globalThis.fetch) {
  return async function getJSON(path,{signal}={}) {
    let response;
    try {
      response=await fetchImpl(path,{method:'GET',headers:{Accept:'application/json'},credentials:'same-origin',signal});
    } catch(error) {
      if(signal?.aborted || error.name==='AbortError') throw error;
      throw new ApiError('Não foi possível conectar à API. Tente novamente.');
    }
    if(!response.ok) throw new ApiError('Não foi possível concluir a consulta. Tente novamente.',response.status);
    try {return await response.json();}
    catch(error) {
      if(signal?.aborted || error.name==='AbortError') throw error;
      throw new ApiError('A API retornou uma resposta inválida. Tente novamente.');
    }
  };
}
