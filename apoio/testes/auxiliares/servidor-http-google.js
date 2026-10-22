import {OAuth2Client} from 'google-auth-library';
import {createApp} from '../../../servidor/http/aplicacao.js';
import {googleClientId} from './provedor-google.js';
const client=new OAuth2Client({clientId:googleClientId});
client.transporter.request=async()=>({data:{test_key:process.env.CUIDACAO_TEST_GOOGLE_CERT},headers:new Headers({'cache-control':'public,max-age=0'})});
const app=createApp({databasePath:process.env.CUIDACAO_TEST_GOOGLE_DB,webOrigin:'http://localhost:5173',google:{clientId:googleClientId,client}});
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{app.close().then(()=>process.exit(0));});
await app.listen({host:'127.0.0.1',port:0});console.log(JSON.stringify({port:app.server.address().port}));
