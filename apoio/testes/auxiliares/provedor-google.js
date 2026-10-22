// Resposta de certificado controlada e tokens de identidade assinados localmente.
// O verificador do Google ainda valida assinatura, emissor, destinatário e expiração.
import {generateKeyPairSync,sign} from 'node:crypto';
import {OAuth2Client} from 'google-auth-library';
export const googleClientId='controlled-tests.apps.googleusercontent.com';
export function controlledGoogle(){
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const client=new OAuth2Client({clientId:googleClientId});let offline=false;
 client.transporter.request=async()=>{if(offline){const error=new Error('network unavailable');error.code='ENOTFOUND';throw error;}return {data:{test_key:publicKey.export({type:'spki',format:'pem'})},headers:new Headers({'cache-control':'public, max-age=0'})};};
 const token=(nonce,claims={})=>signGoogleToken(privateKey,nonce,claims);
 return {client,token,privateKey:privateKey.export({type:'pkcs8',format:'pem'}),offline(){offline=true;client.certificateExpiry=null;}};
}

export function signGoogleToken(privateKey,nonce,claims={}){const time=Math.floor(Date.now()/1000),encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');const data=encode({alg:'RS256',kid:'test_key',typ:'JWT'})+'.'+encode({iss:'https://accounts.google.com',aud:googleClientId,sub:'stable_test_subject',iat:time,exp:time+3600,nonce,...claims});return data+'.'+sign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url');}
