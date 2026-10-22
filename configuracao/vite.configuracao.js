import {defineConfig} from "vite";
import {fileURLToPath} from "node:url";

export const defaultApiPort = 3002;
const apiPort = Number(process.env.CUIDACAO_PORT || defaultApiPort);

// Vite must never bypass API authorization by serving local private data.
// Preserve its built-in deny list while adding this presentation's data roots.
export const privateWebFiles=[
 '.env','.env.*','*.{crt,pem,key,p12,pfx,cer,der}','.npmrc','.yarnrc.yml','**/.git/**',
 '**/demo-data/**','**/cuidacao-demo*/**','**/data/**','**/credentials.json','**/*.sqlite*'
];
export function demoWebOptions(root,port,apiPort){
 return {configFile:fileURLToPath(import.meta.url),server:{host:'127.0.0.1',port,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:'+apiPort,changeOrigin:false}},fs:{deny:[...privateWebFiles,root+'/**']}}};
}

export default defineConfig({server:{fs:{deny:privateWebFiles},proxy:{"/api":{target:"http://127.0.0.1:"+apiPort,changeOrigin:false}}}});
