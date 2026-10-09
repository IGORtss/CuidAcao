import {randomBytes,randomUUID} from 'node:crypto';
import {hashPassword} from '../services/auth.js';
import {occurrenceService} from '../services/occurrences.js';
import {occurrences as fixtures} from '../../src/data/occurrences.js';
export async function seed(db) {
  if (db.prepare('SELECT count(*) AS n FROM users').get().n || db.prepare('SELECT count(*) AS n FROM occurrences').get().n) throw new Error('Seed recusado: base já contém dados.');
  const accounts=[];
  for (const [username,role] of [['morador_demo','user'],['vizinho_demo','user'],['colaborador_demo','user'],['admin_demo','admin'],['revisor_demo','admin']]) {
    const password=randomBytes(18).toString('base64url');
    accounts.push({id:randomUUID(),username,role,password,...await hashPassword(password),createdAt:'2026-10-01T10:00:00.000Z',updatedAt:'2026-10-01T10:00:00.000Z'});
  }
  db.transaction(()=>{
    if (db.prepare('SELECT count(*) AS n FROM users').get().n || db.prepare('SELECT count(*) AS n FROM occurrences').get().n) throw new Error('Seed recusado: base já contém dados.');
    for (const account of accounts) db.prepare('INSERT INTO users VALUES(@id,@username,@passwordHash,@passwordSalt,@passwordParams,@role,@createdAt,@updatedAt)').run(account);
    const records=occurrenceService(db);
    const [author,neighbor,,admin]=accounts;
    for (let index=0;index<fixtures.length;index++) {
      const fixture=fixtures[index],date=fixture.createdAt;
      db.prepare("INSERT INTO occurrences(id,authorId,title,description,category,latitude,longitude,locationLabel,status,version,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,'received',1,?,?)").run(fixture.id,author.id,fixture.title,fixture.description,fixture.category==='Água'?'agua':'residuos',fixture.latitude,fixture.longitude,fixture.locationLabel,date,date);
      records.event({occurrenceId:fixture.id,actorId:author.id,action:'created',after:records.get(fixture.id),date});
      let hour=Date.parse(date);
      function transition(to,references=[]) {
        hour+=3600000;const time=new Date(hour).toISOString(),before=records.get(fixture.id);
        db.prepare('UPDATE occurrences SET status=?,closureReason=?,version=version+1,updatedAt=? WHERE id=?').run(to,to==='closed'?'resolved':null,time,fixture.id);
        records.event({occurrenceId:fixture.id,actorId:admin.id,action:`transition:${to}`,before,after:records.get(fixture.id),reason:'Revisão independente de dados fictícios para demonstração acadêmica.',references,date:time});
      }
      function supplement(kind,text) {
        hour+=3600000;const time=new Date(hour).toISOString(),id=randomUUID();
        db.prepare("INSERT INTO contributions(id,occurrenceId,authorId,type,kind,text,createdAt,updatedAt) VALUES(?,?,?,'supplement',?,?,?,?)").run(id,fixture.id,neighbor.id,kind,text,time,time);
        db.prepare('UPDATE occurrences SET version=version+1,updatedAt=? WHERE id=?').run(time,fixture.id);
        records.event({occurrenceId:fixture.id,entityType:'contribution',entityId:id,actorId:neighbor.id,action:'supplement_created',after:{id,kind,text,authorId:neighbor.id},date:time});
        return {type:'contribution',id,snapshot:{...db.prepare('SELECT * FROM contributions WHERE id=?').get(id)}};
      }
      if (index!==1) transition('community_review');
      if (index>=2) {
        const support=supplement('observation','Observação independente fictícia: resíduos permanecem no local ilustrativo.');
        transition('confirmed',[support]);
        const update=supplement('observation','Atualização fictícia do acompanhamento do problema no local ilustrativo.');
        transition('monitoring',[update]);
        if (index===3) transition('closed',[supplement('resolution','Resolução fictícia relatada: os resíduos foram retirados neste exemplo demonstrativo.')]);
      }
    }
  }).immediate();
  return accounts.map(({username,role,password})=>({username,role,password}));
}
