import {fileURLToPath} from "node:url";
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
process.env.CUIDACAO_E2E_LINK_CREDENTIALS??=join(tmpdir(),'cuidacao-e2e-accounts-'+randomUUID()+'.json');
process.env.CUIDACAO_E2E_ADMIN_CREDENTIALS??=join(tmpdir(),'cuidacao-e2e-accounts-'+randomUUID()+'.json');
process.env.CUIDACAO_E2E_TRANSITION_CREDENTIALS??=join(tmpdir(),'cuidacao-e2e-accounts-'+randomUUID()+'.json');
for(const device of ['DESKTOP','MOBILE'])process.env['CUIDACAO_E2E_INTEGRATED_'+device+'_CREDENTIALS']??=join(tmpdir(),'cuidacao-e2e-accounts-'+randomUUID()+'.json');
process.env.CUIDACAO_E2E_GOOGLE_KEY??=join(tmpdir(),'cuidacao-e2e-google-'+randomUUID()+'.pem');
process.env.CUIDACAO_E2E_DEMO_DIRECTORY??=join(tmpdir(),'cuidacao-demo-e2e-'+randomUUID());
import {defineConfig,devices} from '@playwright/test';
const google='**/google.spec.js';
const writing='**/escrita-ocorrencia.spec.js',contributions='**/contribuicoes.spec.js',stances='**/manifestacoes.spec.js',transitions='**/transicoes.spec.js',administration='**/administracao.spec.js',links='**/vinculos.spec.js',integrated='**/integrado.spec.js',demo='**/demonstracao.spec.js';
export default defineConfig({
  testDir:'../apoio/testes/ponta-a-ponta',
  outputDir:'../apoio/resultados-testes',
  use:{baseURL:'http://127.0.0.1:5180',launchOptions:process.env.CUIDACAO_CHROMIUM_PATH?{executablePath:process.env.CUIDACAO_CHROMIUM_PATH,args:['--no-sandbox']}:{}},
  projects:[
    {name:'desktop',testIgnore:[google,writing,contributions,stances,transitions,administration,links,integrated,demo],use:{...devices['Desktop Chrome']}},
    {name:'mobile',testIgnore:[google,writing,contributions,stances,transitions,administration,links,integrated,demo],use:{...devices['Pixel 7']}},
    {name:'write-desktop',testMatch:writing,use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5181'}},
    {name:'write-mobile',testMatch:writing,use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:5181'}},
    {name:'contributions-desktop',testMatch:contributions,use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5182'}},
    {name:'contributions-mobile',testMatch:contributions,use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:5182'}},
    {name:'stances-desktop',testMatch:stances,use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5183'}},
    {name:'stances-mobile',testMatch:stances,use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:5183'}},
    {name:'transitions-desktop',testMatch:transitions,use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5184'}},
    {name:'transitions-mobile',testMatch:transitions,use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:5184'}},
    {name:'admin-desktop',testMatch:administration,use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5185'}},
    {name:'admin-mobile',testMatch:administration,use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:5185'}},
    {name:'links-desktop',testMatch:links,use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5186'}},
    {name:'links-mobile',testMatch:links,use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:5186'}},
    {name:'integrated-desktop',testMatch:integrated,use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5187'}},
    {name:'integrated-mobile',testMatch:integrated,use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:5188'}},
    {name:'google-desktop',testMatch:google,use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5191'}},
    {name:'google-mobile',testMatch:google,use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:5191'}},
    {name:'demo-desktop',testMatch:demo,use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5190'}},
    {name:'demo-mobile',testMatch:demo,use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:5190'}}
  ],
  // Os cenários de escrita usam API e banco separados. Assim, não alteram os
  // 105 registros fixos da leitura nem consomem seus limites de autenticação.
  webServer:[
    {cwd:fileURLToPath(new URL('..',import.meta.url)),command:'node apoio/testes/ponta-a-ponta/servidor.js',url:'http://127.0.0.1:5180',reuseExistingServer:false},
    {cwd:fileURLToPath(new URL('..',import.meta.url)),command:'CUIDACAO_E2E_PORT=5181 CUIDACAO_E2E_API_PORT=3101 node apoio/testes/ponta-a-ponta/servidor.js',url:'http://127.0.0.1:5181',reuseExistingServer:false},
    {cwd:fileURLToPath(new URL('..',import.meta.url)),command:'CUIDACAO_E2E_PORT=5182 CUIDACAO_E2E_API_PORT=3102 node apoio/testes/ponta-a-ponta/servidor.js',url:'http://127.0.0.1:5182',reuseExistingServer:false},
    {cwd:fileURLToPath(new URL('..',import.meta.url)),command:'CUIDACAO_E2E_PORT=5183 CUIDACAO_E2E_API_PORT=3103 node apoio/testes/ponta-a-ponta/servidor.js',url:'http://127.0.0.1:5183',reuseExistingServer:false},
    {cwd:fileURLToPath(new URL('..',import.meta.url)),command:'CUIDACAO_E2E_PORT=5184 CUIDACAO_E2E_API_PORT=3104 node apoio/testes/ponta-a-ponta/servidor.js',url:'http://127.0.0.1:5184',reuseExistingServer:false},
    {cwd:fileURLToPath(new URL('..',import.meta.url)),command:'CUIDACAO_E2E_PORT=5185 CUIDACAO_E2E_API_PORT=3105 node apoio/testes/ponta-a-ponta/servidor.js',url:'http://127.0.0.1:5185',reuseExistingServer:false},
    {cwd:fileURLToPath(new URL('..',import.meta.url)),command:'CUIDACAO_E2E_PORT=5186 CUIDACAO_E2E_API_PORT=3106 node apoio/testes/ponta-a-ponta/servidor.js',url:'http://127.0.0.1:5186',reuseExistingServer:false},
    {cwd:fileURLToPath(new URL('..',import.meta.url)),command:'CUIDACAO_E2E_PORT=5187 CUIDACAO_E2E_API_PORT=3107 node apoio/testes/ponta-a-ponta/servidor.js',url:'http://127.0.0.1:5187',reuseExistingServer:false},
    {cwd:fileURLToPath(new URL('..',import.meta.url)),command:'CUIDACAO_E2E_PORT=5188 CUIDACAO_E2E_API_PORT=3108 node apoio/testes/ponta-a-ponta/servidor.js',url:'http://127.0.0.1:5188',reuseExistingServer:false},
    {cwd:fileURLToPath(new URL('..',import.meta.url)),command:'node apoio/testes/ponta-a-ponta/servidor-google.js',url:'http://127.0.0.1:5191',reuseExistingServer:false},
    {cwd:fileURLToPath(new URL('..',import.meta.url)),command:'node apoio/testes/ponta-a-ponta/servidor-demonstracao.js',url:'http://127.0.0.1:5190',reuseExistingServer:false}
  ]
});
