import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirebaseIdentityClient,createGoogleClient} from '../../../codigo-fonte/servicos/api.js';
test('cliente Google usa JSON same-origin e adapta somente identidade local pública',async()=>{
 const calls=[],user={id:'local-user',username:'google_user',role:'user'};
 const client=createGoogleClient(async(path,options)=>{calls.push({path,options});return {ok:true,status:200,json:async()=>({data:path.endsWith('verify')?{needsUsername:true}:{user:{...user,email:'private@example.invalid',credential:'private-token'}}})};});
 assert.deepEqual(await client.verify('signed-token'),{needsUsername:true});assert.deepEqual(await client.complete('google_user'),{user});
 assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.method,'POST');assert.equal(calls[0].options.headers['Content-Type'],'application/json');assert.deepEqual(JSON.parse(calls[0].options.body),{credential:'signed-token'});assert.deepEqual(JSON.parse(calls[1].options.body),{username:'google_user'});
});
test('cliente Google não declara sucesso com resposta inválida, rede ou erro do servidor',async()=>{
 const malformed=createGoogleClient(async()=>({ok:true,status:200,json:async()=>({data:{user:{username:'forged'}}})}));await assert.rejects(malformed.complete('google_user'),/sessão inválidos/);
 const unavailable=createGoogleClient(async()=>({ok:false,status:503,json:async()=>({error:{message:'Google indisponível nesta instalação.'}})}));await assert.rejects(unavailable.challenge(),error=>error.status===503&&error.message.includes('indisponível'));
 const offline=createGoogleClient(async()=>{throw new Error('offline');});await assert.rejects(offline.challenge(),/rascunho foi mantido/);
});
test('cliente Firebase envia somente ID token e projeta a sessão local',async()=>{
 const calls=[],user={id:'local-firebase',username:'firebase_user',role:'user'};
 const client=createFirebaseIdentityClient(async(path,options)=>{calls.push({path,options});return {ok:true,status:200,json:async()=>({data:path.endsWith('verify')?{needsUsername:true}:{user:{...user,email:'ignored@example.invalid'}}})};});
 assert.deepEqual(await client.verify('firebase-id-token'),{needsUsername:true});assert.deepEqual(await client.complete('firebase_user'),{user});
 assert.equal(calls[0].options.credentials,'same-origin');assert.deepEqual(JSON.parse(calls[0].options.body),{idToken:'firebase-id-token'});assert.deepEqual(JSON.parse(calls[1].options.body),{username:'firebase_user'});
});
