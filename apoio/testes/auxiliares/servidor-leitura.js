import {dirname,join} from 'node:path';
// Aplicação real em um processo HTTP independente, com banco isolado para o teste.
import {createApp} from '../../../servidor/http/aplicacao.js';
const app=createApp({databasePath:process.argv[2],uploadDirectory:join(dirname(process.argv[2]),'uploads')});
let closing;
function close(){return closing??=(async()=>{await app.close();if(process.connected)process.disconnect();})();}
process.once('SIGTERM',close);
process.once('SIGINT',close);
process.once('disconnect',close);
try {
 const address=await app.listen({host:'127.0.0.1',port:0});
 process.send({address});
} catch(error){if(process.connected)process.send({startupError:error.code??'STARTUP_ERROR'});await close();process.exitCode=1;}
