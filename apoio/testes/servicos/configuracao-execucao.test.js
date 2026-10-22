import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultApiPort,demoWebOptions} from '../../../configuracao/vite.configuracao.js';

test('API local e proxy Vite compartilham a porta padrão não ocupada',()=>{
 assert.equal(defaultApiPort,3002);
 const options=demoWebOptions('/tmp/cuidacao-runtime-test',5192,defaultApiPort);
 assert.equal(options.server.proxy['/api'].target,'http://127.0.0.1:3002');
});
