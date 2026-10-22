import test from 'node:test';
import assert from 'node:assert/strict';
import {accountMailer} from '../../../servidor/servicos/email-conta.js';
test('transporte ausente fica desativado; HTTPS e credenciais ficam no servidor',async()=>{
 assert.equal(accountMailer({}),null);
 assert.throws(()=>accountMailer({CUIDACAO_ACCOUNT_MAIL_URL:'http://inseguro.invalid',CUIDACAO_ACCOUNT_MAIL_TOKEN:'segredo'}),/HTTPS/);
 const calls=[],send=accountMailer({CUIDACAO_ACCOUNT_MAIL_URL:'https://mail.example.invalid/send',CUIDACAO_ACCOUNT_MAIL_TOKEN:'segredo'},async(url,options)=>{calls.push({url,options});return {ok:true};});
 await send({to:'conta@example.invalid',purpose:'reset',url:'https://cuidacao.example.invalid/#account-reset=token'});
 assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.headers.Authorization,'Bearer segredo');assert.equal(calls[0].options.method,'POST');
 assert.equal(JSON.parse(calls[0].options.body).purpose,'reset');
 const failure=accountMailer({CUIDACAO_ACCOUNT_MAIL_URL:'https://mail.example.invalid/send',CUIDACAO_ACCOUNT_MAIL_TOKEN:'segredo'},async()=>({ok:false}));
 await assert.rejects(failure({}),/indisponível/);
});
