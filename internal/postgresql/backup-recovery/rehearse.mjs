// Instructor-only local qualification. NOT a student shortcut.
// Creates private temporary clusters, never connects to the default service.
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const here=fileURLToPath(new URL('../../../postgresql/backup-recovery/',import.meta.url));
const root=mkdtempSync('/tmp/suta-backup-qa-');chmodSync(root,0o700);
const data=join(root,'data'),socket=join(root,'socket'),work=join(root,'work');
mkdirSync(socket);mkdirSync(work);
const env={...process.env};
for(const key of Object.keys(env))if(key.startsWith('PG'))delete env[key];
Object.assign(env,{PGHOST:socket,PGPORT:'55481',PGUSER:'postgres',PGDATABASE:'postgres',PGSERVICEFILE:'/dev/null',PGPASSFILE:'/dev/null'});
const log=[];let started=false;let db='postgres',role=null;
function run(bin,args,input){
  if(process.env.SUTA_REHEARSAL_LIVE==='1'){
    console.log('\nRUN  '+[bin,...args].join(' '));
    if(input)console.log('INPUT\n'+input);
  }
  const out=execFileSync(bin,args,{cwd:work,env,input,encoding:'utf8',stdio:['pipe','pipe','pipe']});
  log.push({command:[bin,...args].join(' '),input,output:out});
  if(process.env.SUTA_REHEARSAL_LIVE==='1'){
    console.log(out.trim()||'(exit 0; no output)');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,800);
  }
  return out;
}
function sql(text,expectError=false){
  const input=(role?`SET ROLE ${role};\n`:'')+text;
  try{const out=run('psql',['-X','-v','ON_ERROR_STOP=1','-d',db],input);if(expectError)throw Error('Negative test unexpectedly succeeded');return out;}
  catch(e){if(expectError&&String(e.stderr).includes('permission denied')){log.push({expectedFailure:text,error:String(e.stderr)});if(process.env.SUTA_REHEARSAL_LIVE==='1')console.log('EXPECTED REFUSAL: '+String(e.stderr));return;}throw e;}
}
try{
  run('initdb',['-D',data,'-U','postgres','--auth-local=trust','--auth-host=reject','--no-locale']);
  run('pg_ctl',['-D',data,'-l',join(root,'postgres.log'),'-o',`-k ${socket} -p 55481 -c listen_addresses=''`,'-w','start']);started=true;
  run('createdb',['-T','template0','suta_shop']);db='suta_shop';
  for(const file of ['00-start.md','01-plain.md','02-custom.md','03-table.md','04-roles.md']){
    let body=readFileSync(join(here,file),'utf8');if(file==='00-start.md')body=body.slice(body.indexOf('## 3.'));
    for(const m of body.matchAll(/```(bash|sql|psql)\n([\s\S]*?)\n```/g)){
      const [,type,raw]=m,text=raw.trim();
      if(type==='bash'){
        const [bin,...args]=text.split(/\s+/);
        if(bin==='psql'&&!args.includes('-f')){db=args[args.indexOf('-d')+1];role=null;continue;}
        if(['pg_dump','pg_dumpall','pg_restore','createdb','psql'].includes(bin))run(bin,args);
      }else if(type==='sql'){
        if(text.startsWith('SET ROLE ')){role=text.match(/^SET ROLE (\w+);$/)[1];continue;}
        if(text==='RESET ROLE;'){role=null;continue;}
        sql(text,file==='04-roles.md'&&text.startsWith('DELETE '));
      }else if(text!=='\\q')sql(text);
    }
  }
  role=null;
  for(const [name,count,sum]of[['suta_shop',3,195],['suta_plain_restore',3,195],['suta_custom_restore',4,205],['suta_schema_restore',3,195],['suta_access_restore',3,195]]){
    const result=run('psql',['-X','-At','-d',name,'-c','SELECT count(*), sum(total) FROM shop.orders;']).trim();
    assert.equal(result,`${count}|${sum}.00`);
  }
  const notes=run('psql',['-X','-At','-d','suta_custom_restore','-c','SELECT message FROM shop.delivery_notes WHERE note_id=1;']).trim();assert.equal(notes,'Leave at reception');
  const newer=run('psql',['-XAt','-d','suta_custom_restore','-c',"SELECT order_id, total FROM shop.orders WHERE order_id=1004"]).trim();assert.equal(newer,'1004|10.00');
  const globals=readFileSync(join(work,'globals.sql'),'utf8');assert.match(globals,/CREATE ROLE suta_report_reader/);assert.doesNotMatch(globals,/PASSWORD '/);
  writeFileSync(join(root,'result.json'),JSON.stringify({status:'passed',version:run('postgres',['--version']).trim(),scope:'Exact database commands from Labs 0–4; isolated Unix socket, no TCP. SSH/sudo/class environment not tested.',checks:['plain restore','custom restore','schema restore','identity next ID','dropped table recovery','newer order preserved','globals export without passwords','read allowed/delete denied'],log},null,2));
  console.log(JSON.stringify({status:'passed',evidence:join(root,'result.json'),temporaryDataPreserved:root}));
}catch(e){writeFileSync(join(root,'failure.json'),JSON.stringify({error:String(e),stderr:String(e.stderr??''),log},null,2));console.error('FAILED; evidence preserved at '+root);throw e;}
finally{if(started)run('pg_ctl',['-D',data,'-m','fast','-w','stop']);}
