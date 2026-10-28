import {createApp} from '../servidor/http/aplicacao.js';
import {openDatabase, migrate} from '../servidor/dados/banco-de-dados.js';
import {readFile, realpath, stat} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const defaultSite = fileURLToPath(new URL('../site/', import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon'};

export function createIntegratedApp({databasePath, siteDirectory=defaultSite, webOrigin='http://127.0.0.1:4180'}={}) {
  const db=openDatabase(databasePath);
  let app;
  try { migrate(db); app=createApp({db, webOrigin}); } catch(error) { db.close(); throw error; }
  const root=resolve(siteDirectory);
  app.get('/*', async(request,reply)=>{
    if(request.url.startsWith('/api/'))return reply.code(404).send({error:{message:'Rota não encontrada.'}});
    let pathname;
    try { pathname=decodeURIComponent(new URL(request.url,webOrigin).pathname); } catch { return reply.code(400).send('Endereço inválido'); }
    if(pathname.includes('\0')||pathname.includes('\\'))return reply.code(400).send('Endereço inválido');
    const file=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
    if(!file.startsWith(root+sep))return reply.code(404).send('Página não encontrada');
    try {
      const actualRoot=await realpath(root),actualFile=await realpath(file);
      if(!actualFile.startsWith(actualRoot+sep)||!(await stat(actualFile)).isFile())return reply.code(404).send('Página não encontrada');
      return reply.header('X-Content-Type-Options','nosniff').header('Cache-Control','no-store').type(types[extname(file)]||'application/octet-stream').send(await readFile(actualFile));
    } catch(error) {
      if(['ENOENT','ENOTDIR','EACCES'].includes(error.code))return reply.code(404).send('Página não encontrada');
      throw error;
    }
  });
  app.addHook('onClose',async()=>{if(db.open)db.close();});
  return app;
}
