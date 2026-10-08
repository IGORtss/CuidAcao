// Only reads a database prepared by the parent test. No preparation/write routes.
import {createApp} from '../../server/app.js';
const app=createApp({databasePath:process.argv[2]});
let closing;
function close(){return closing??=(async()=>{await app.close();if(process.connected)process.disconnect();})();}
process.once('SIGTERM',close);
process.once('SIGINT',close);
process.once('disconnect',close);
try {
 const address=await app.listen({host:'127.0.0.1',port:0});
 process.send({address});
} catch(error){await close();throw error;}
