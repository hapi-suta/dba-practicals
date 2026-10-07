// INSTRUCTOR ONLY: creates synthetic state in the dedicated local QA container.
// Refuses ordinary hosts. Never run on student machines.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {observer,defaults as c} from './check-lab.mjs';
const guide=fileURLToPath(new URL('../../../postgresql/backup-recovery/',import.meta.url));
if(process.env.SUTA_DISPOSABLE_QA!=='yes'||!fs.existsSync('/.dockerenv'))throw Error('Dedicated disposable QA container required');
if(fs.existsSync(c.source+'/PG_VERSION'))throw Error('Refusing to reuse a source cluster');
process.umask(0o077);
const env={...process.env,PGHOST:c.socket,PGPORT:c.port,PGUSER:'postgres'};
for(const key of ['PGSERVICE','PGDATABASE','PGOPTIONS'])delete env[key];
const results=[];
const scenario=[];
function run(bin,args,input){return execFileSync(bin,args,{input,encoding:'utf8',env,timeout:180000,maxBuffer:2*1024*1024,stdio:['pipe','pipe','pipe']}).trim();}
const sql=(q,db='suta_shop')=>run('psql',['-XAt','-v','ON_ERROR_STOP=1','-d',db,'-c',q]);
const report=(label,checks)=>{assert.ok(!checks.some(x=>['MISMATCH','UNKNOWN','NOT_STARTED'].includes(x.status)),JSON.stringify(checks));results.push(label);console.log('PASS '+label);};
const inspect=(method,copy)=>{const o=observer();o[method](copy);return o.checks;};
const expectFail=(label,copy,id)=>{const checks=inspect('preflight',copy);assert.ok(checks.some(x=>x.id===id&&x.status==='MISMATCH'),JSON.stringify(checks));results.push(label);console.log('PASS '+label);};
let sourceStarted=false,physicalStarted=false,pitrStarted=false;
const physical=c.root+'/physical-copy',pitr=c.root+'/pitr-copy';
// Execute the student's actual read-only commands, independently of the observer.
const nativeGuide=fs.readFileSync(guide+'CHECKS.md','utf8');
function nativeChecks(kind){
 const copy=kind==='physical'?physical:pitr;
 const section=nativeGuide.split('## Before starting a stopped copy')[1].split('### 6. Return')[0];
 const selected=kind==='physical'?section.split('### 5. Lab 8 only')[0]:section;
 const commandList=[...selected.matchAll(/```bash\n([\s\S]*?)\n```/g)].flatMap(m=>m[1].split('\n')).filter(c=>!c.startsWith('cd '));
 const expected={data_directory:copy,config_file:copy+'/postgresql.conf',hba_file:copy+'/pg_hba.conf',ident_file:copy+'/pg_ident.conf',port:'55433',unix_socket_directories:c.root+'/recovery-socket',listen_addresses:'',archive_mode:'off',archive_command:'',primary_conninfo:'',recovery_target_name:'suta_before_delete',recovery_target_action:'pause',recovery_target:'',recovery_target_time:'',recovery_target_xid:'',recovery_target_lsn:''};
 for(const command of commandList){
  const r=spawnSync('bash',['-c',command],{cwd:copy,env,encoding:'utf8',timeout:10000});
  assert.ifError(r.error);const out=r.stdout.trim();
  if(command.startsWith('grep ')){assert.equal(r.status,1,command);assert.equal(out,'');assert.equal(r.stderr,'');continue;}
  if(command==='pg_ctl -D . status'){assert.equal(r.status,3);assert.match(out,/no server running/);continue;}
  assert.equal(r.status,0,command+': '+r.stderr);
  if(command==='pwd -P')assert.equal(out,copy);
  else if(command.startsWith('readlink '))assert.deepEqual(out.split('\n'),['postgresql.conf','postgresql.auto.conf','pg_hba.conf','pg_ident.conf','pg_wal'].map(n=>copy+'/'+n));
  else if(command==='ls -A pg_tblspc')assert.equal(out,'');
  else if(command==='ls -a'){
    const names=out.split('\n');assert.ok(!names.includes('postmaster.pid'));assert.ok(!names.includes('standby.signal'));
    assert.equal(names.includes('recovery.signal'),kind==='pitr');
  }else if(command.startsWith('ls -ld ')){assert.match(out,/^drwx------\s+\d+\s+postgres\s/);}
  else if(command==='printenv PGBACKREST_CONFIG PGBACKREST_STANZA')assert.equal(out,c.root+'/pgbackrest.conf\nshop');
  else if(command.startsWith('postgres -D . -C ')){
    const setting=command.split(' ').at(-1);
    if(setting==='restore_command'){assert.match(out,/archive-get/);assert.ok(out.includes('%f'));assert.ok(out.includes('%p'));}
    else {assert.ok(Object.hasOwn(expected,setting));assert.equal(out,expected[setting],setting);}
  }else throw Error('Unexpected native command '+command);
 }
}
function nativeLiveChecks(file,kind){
 const text=fs.readFileSync(guide+file,'utf8');
 const afterStart=text.slice(text.indexOf(' -w start'));
 const queries=[...afterStart.matchAll(/```sql\n([\s\S]*?)\n```/g)].flatMap(m=>m[1].split('\n')).filter(q=>q.startsWith('SHOW '));
 const expected={data_directory:kind==='physical'?physical:pitr,port:'55433',unix_socket_directories:c.root+'/recovery-socket',listen_addresses:'',archive_mode:'off',recovery_target_name:'suta_before_delete',recovery_target_action:'pause'};
 for(const query of queries){const key=query.slice(5,-1);assert.equal(run('psql',['-XAt','-h',c.root+'/recovery-socket','-p',c.recoveryPort,'-d','suta_shop','-c',query]),expected[key],query);}
}
try{
 // Rehearse unchanged + revised early-lab SQL directly from the handouts first.
 const core=run('node',[fileURLToPath(new URL('./rehearse.mjs',import.meta.url))]);console.log(core);results.push('Exact Labs 0–4 SQL rehearsal');
 const missing=observer({root:'/var/lib/postgresql/not-created'});missing.preflight();
 assert.equal(missing.checks[0].status,'NOT_STARTED');results.push('Absent copy never marked passed');
 const offline=observer({socket:'/var/lib/postgresql/not-a-socket'});offline.progress();
 assert.equal(offline.checks[0].status,'UNKNOWN');results.push('Unavailable source never marked passed');
 fs.mkdirSync(c.root,{recursive:true});fs.mkdirSync(c.root+'/recovery-socket',{mode:0o700});
 const checksGuide=fs.readFileSync(guide+'CHECKS.md','utf8');
 const returnCommand=checksGuide.split('**Return to your lab folder before continuing:**')[1].match(/```bash\n([\s\S]*?)\n```/)[1];
 assert.equal(run('bash',['-eu','-c',`cd /var/lib/postgresql\n${returnCommand}\npwd`]),c.root);
 results.push('Direct safety-check page returns to the existing lab folder');
 run('initdb',['-D',c.source,'--auth-local=trust','--auth-host=reject','--no-locale']);
 fs.mkdirSync('/var/lib/postgresql/prepared-backrest/repo',{recursive:true});
 const prepared='[global]\nrepo1-path=/var/lib/postgresql/prepared-backrest/repo\nlog-level-file=off\nlock-path=/var/lib/postgresql/prepared-backrest\n[shop]\npg1-path='+c.source+'\npg1-socket-path='+c.socket+'\n';
 fs.writeFileSync('/etc/pgbackrest/pgbackrest.conf',prepared);
 fs.writeFileSync(c.source+'/postgresql.auto.conf',"listen_addresses=''\nunix_socket_directories='/var/run/postgresql'\narchive_mode=on\narchive_command='/usr/bin/pgbackrest --config=/etc/pgbackrest/pgbackrest.conf --stanza=shop archive-push %p'\n");
 run('pg_ctl',['-D',c.source,'-l','/var/lib/postgresql/qa-source.log','-w','start']);sourceStarted=true;
 run('pgbackrest',['--stanza=shop','stanza-create']);run('pgbackrest',['--stanza=shop','check']);
 run('createdb',['suta_shop']);
 const start=fs.readFileSync(guide+'00-start.md','utf8').split('## 3.')[1];
 for(const m of start.matchAll(/```sql\n([\s\S]*?)\n```/g))sql(m[1]);
 run('pg_dump',['-Fc','-f',c.root+'/shop.dump','suta_shop']);
 for(const db of ['suta_plain_restore','suta_custom_restore','suta_schema_restore','suta_access_restore']){run('createdb',[db]);run('pg_restore',['--exit-on-error','-d',db,c.root+'/shop.dump']);}
 sql("INSERT INTO shop.orders(customer_id,status,total) VALUES(1,'New',10)",'suta_custom_restore');
 sql('CREATE ROLE suta_report_reader');sql('GRANT USAGE ON SCHEMA shop TO suta_report_reader','suta_access_restore');sql('GRANT SELECT ON ALL TABLES IN SCHEMA shop TO suta_report_reader','suta_access_restore');
 let checks=inspect('progress');assert.ok(!checks.some(x=>['MISMATCH','UNKNOWN'].includes(x.status)),JSON.stringify(checks));results.push('Progress positive baseline');
 assert.equal(checks.find(x=>x.id==='shop.dump').status,'PRESENT');results.push('Backup file existence is not a restore pass');
 sql("INSERT INTO shop.orders(customer_id,status,total) VALUES(1,'New',10)",'suta_custom_restore');
 assert.ok(inspect('progress').some(x=>x.id==='suta_custom_restore-orders'&&x.status==='MISMATCH'));results.push('Repeated test insert detected');
 sql('DELETE FROM shop.orders WHERE order_id=1005','suta_custom_restore');
 sql("INSERT INTO shop.order_items(order_id,product,amount) VALUES(1001,'Camera',120)");
 assert.ok(inspect('progress').some(x=>x.id==='suta_shop-duplicate-items'&&x.status==='MISMATCH'));results.push('Duplicate fixture detected');
 sql('DELETE FROM shop.order_items WHERE item_id=4');
 run('pg_basebackup',['-D',physical,'-X','stream','-c','fast']);run('pg_verifybackup',[physical]);results.push('Physical integrity before edits');
 const isolation=fs.readFileSync(guide+'05-physical.md','utf8').match(/```conf\n([\s\S]*?)\n```/)[1];
 const original=fs.readFileSync(physical+'/postgresql.auto.conf','utf8');
 fs.writeFileSync(physical+'/postgresql.auto.conf',original+'\n'+isolation+'\n');
 report('Physical preflight passes exact guide settings',inspect('preflight','physical'));
 nativeChecks('physical');results.push('Exact student native physical before-start commands pass');
 fs.appendFileSync(physical+'/postgresql.auto.conf',"unix_socket_directories='/LAB/recovery-socket'\n");
 expectFail('Literal placeholder detected','physical','copy-socket');
 assert.throws(()=>nativeChecks('physical'),/unix_socket_directories/);results.push('Student native socket check reveals wrong socket');
 fs.writeFileSync(physical+'/postgresql.auto.conf',original+'\n'+isolation+'\narchive_mode=on\n');
 expectFail('Later duplicate archive override detected','physical','copy-archive-mode');
 assert.throws(()=>nativeChecks('physical'),/archive_mode/);results.push('Student native archive check reveals unsafe override');
 fs.writeFileSync(physical+'/postgresql.auto.conf',original+'\n'+isolation+`\ndata_directory='${c.source}'\n`);
 expectFail('Unsupported auto.conf directory setting detected','physical','copy-no-auto-data-directory');
 assert.throws(()=>nativeChecks('physical'),/grep/);results.push('Student native config inspection reveals auto.conf data redirection');
 fs.writeFileSync(physical+'/postgresql.auto.conf',original+'\n'+isolation+'\n');
 const mainConfig=fs.readFileSync(physical+'/postgresql.conf','utf8');
 fs.appendFileSync(physical+'/postgresql.conf',`\ndata_directory='${c.source}'\n`);
 expectFail('Source directory redirection detected','physical','copy-data-directory');
 assert.throws(()=>nativeChecks('physical'),/data_directory/);results.push('Student native data-directory check reveals source redirection');
 fs.writeFileSync(physical+'/postgresql.conf',mainConfig);
 const startFromGuide=file=>{
   const text=fs.readFileSync(guide+file,'utf8');
   const command=[...text.matchAll(/```bash\n([\s\S]*?)\n```/g)].map(m=>m[1].trim()).find(s=>s.startsWith('pg_ctl ')&&s.endsWith(' start'));
   assert.ok(command);run('bash',['-eu','-c',`cd /var/lib/postgresql\n${command}`]);
 };
 startFromGuide('05-physical.md');physicalStarted=true;
 assert.ok(fs.existsSync(c.root+'/physical-recovery.log'));results.push('Physical startup uses guide command and correct log from another folder');
 report('Physical copy live identity / isolation / data',inspect('recovery','physical'));
 nativeLiveChecks('05-physical.md','physical');results.push('Exact student physical SHOW checks match running copy');
 const databases="SELECT string_agg(datname,',' ORDER BY datname) FROM pg_database WHERE NOT datistemplate";
 assert.equal(run('psql',['-XAt','-h',c.root+'/recovery-socket','-p',c.recoveryPort,'-d','postgres','-c',databases]),sql(databases,'postgres'));
 results.push('Physical copy includes every source database, not just the shop');
 expectFail('Running copy blocked from editing','physical','copy-stopped');
 assert.throws(()=>nativeChecks('physical'));results.push('Student native status check reveals running copy');
 run('pg_ctl',['-D',physical,'-m','fast','-w','stop']);physicalStarted=false;
 // New student repository: exact published INI, not the instructor repo.
 fs.mkdirSync(c.root+'/repo');
 const ini=fs.readFileSync(guide+'06-pgbackrest-pitr.md','utf8').match(/```ini\n([\s\S]*?)\n```/)[1];
 fs.writeFileSync(c.root+'/pgbackrest.conf',ini+'\n');
 env.PGBACKREST_CONFIG=c.root+'/pgbackrest.conf';env.PGBACKREST_STANZA='shop';
 run('pgbackrest',['stanza-create']);
 sql(`ALTER SYSTEM SET archive_command = '/usr/bin/pgbackrest --config=${c.root}/pgbackrest.conf --stanza=shop archive-push %p'`);
 sql('SELECT pg_reload_conf()');run('pgbackrest',['check']);
 assert.ok(sql('SHOW archive_command').includes(c.root+'/pgbackrest.conf'));results.push('Prepared-to-student repository transition');
 run('pgbackrest',['--type=full','--start-fast','backup']);
 sql("UPDATE shop.orders SET status='Shipped' WHERE order_id=1001");
 run('pgbackrest',['--type=incr','--start-fast','backup']);
 sql("UPDATE shop.orders SET status='Shipped' WHERE order_id=1002");
 run('pgbackrest',['--type=diff','--start-fast','backup']);
 assert.equal(sql("SELECT string_agg(order_id::text||':'||status,',' ORDER BY order_id) FROM shop.orders WHERE order_id IN (1001,1002)"),'1001:Shipped,1002:Shipped');
 const info=JSON.parse(run('pgbackrest',['--output=json','info']));
 const diff=info[0].backup.findLast?info[0].backup.findLast(b=>b.type==='diff'):info[0].backup.filter(b=>b.type==='diff').at(-1);
 assert.ok(diff);results.push('Full incremental differential chain');
 const stateQuery="SELECT json_build_object('ids',array_agg(order_id ORDER BY order_id),'count',count(*),'total',sum(total)) FROM shop.orders";
 const backupState=JSON.parse(sql(stateQuery));
 assert.deepEqual(backupState,{ids:[1001,1002,1003],count:3,total:195});
 scenario.push({stage:'source-after-differential',...backupState});
 // One persistent session preserves the handout's explicit BEGIN/COMMIT.
 const incident=fs.readFileSync(guide+'06-pgbackrest-pitr.md','utf8').split('## Lab 8A')[1].split('## Lab 8B')[0];
 const incidentSQL=[...incident.matchAll(/```sql\n([\s\S]*?)\n```/g)].map(m=>m[1]).join('\n');
 assert.ok(incidentSQL.includes("pg_create_restore_point('suta_before_delete')"));
 run('psql',['-X','-v','ON_ERROR_STOP=1','-d','suta_shop'],incidentSQL);
 run('pgbackrest',['check']);
 const sourceState=JSON.parse(sql(stateQuery));
 assert.deepEqual(sourceState,{ids:[1002,1003,1004,1005],count:4,total:130});
 scenario.push({stage:'source-after-committed-delete-and-new-order',...sourceState});
 results.push('Exact Lab 8A SQL produces the documented incident');
 run('pgbackrest',[`--pg1-path=${pitr}`,`--set=${diff.label}`,'--type=name','--target=suta_before_delete','--target-action=pause','restore']);
 fs.appendFileSync(pitr+'/postgresql.auto.conf','\n'+isolation+'\n');
 report('PITR preflight preserves generated recovery settings',inspect('preflight','pitr'));
 nativeChecks('pitr');results.push('Exact student native PITR commands and generated archive-get target pass');
 startFromGuide('06-pgbackrest-pitr.md');pitrStarted=true;
 for(let n=0;n<30;n++){
   const state=run('psql',['-XAt','-h',c.root+'/recovery-socket','-p',c.recoveryPort,'-d','suta_shop','-c','SELECT pg_is_wal_replay_paused()']);
   if(state==='t')break;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);
 }
 report('PITR target / paused / expected rows / current log',inspect('recovery','pitr'));
 nativeLiveChecks('06-pgbackrest-pitr.md','pitr');results.push('Exact student PITR SHOW checks match running paused copy');
 const copyState=JSON.parse(run('psql',['-XAt','-h',c.root+'/recovery-socket','-p',c.recoveryPort,'-d','suta_shop','-c',stateQuery]));
 assert.deepEqual(copyState,{ids:[1001,1002,1003,1004],count:4,total:235});
 assert.deepEqual(JSON.parse(sql(stateQuery)),sourceState);
 scenario.push({stage:'paused-recovery-copy',...copyState});
 results.push('Same row count does not hide different IDs; source remains unchanged');
 assert.equal(sql('SELECT count(*)||\'|\'||sum(total) FROM shop.orders'),'4|130.00');
 // Execute Lab 9's SQL and psql copy commands directly from the updated guide.
 let recovered=true;
 const chapter=fs.readFileSync(guide+'09-drills.md','utf8').split('## Lab 10')[0];
 // One persistent psql session is needed for TEMP tables and the merge transaction.
 const sections=chapter.split('Now connect to the **source**');
 for(const m of sections[0].matchAll(/```(sql|psql)\n([\s\S]*?)\n```/g))if(m[2].trim()!=='\\q')run('psql',['-X','-v','ON_ERROR_STOP=1','-h',c.root+'/recovery-socket','-p',c.recoveryPort,'-d','suta_shop'],m[2]);
 const merge=[...sections[1].matchAll(/```(sql|psql)\n([\s\S]*?)\n```/g)].map(m=>m[2]).filter(x=>x.trim()!=='\\q').join('\n');
 run('psql',['-X','-v','ON_ERROR_STOP=1','-d','suta_shop'],merge);
 assert.equal(sql("SELECT count(*)||'|'||sum(total) FROM shop.orders"),'5|250.00');
 assert.equal(sql('SELECT count(*) FROM shop.order_items'),'3');results.push('Guide Lab 9 selective merge preserves newer order');
 const mergedState=JSON.parse(sql(stateQuery));
 assert.deepEqual(mergedState,{ids:[1001,1002,1003,1004,1005],count:5,total:250});
 scenario.push({stage:'source-after-selective-merge',...mergedState});
 const lab10=fs.readFileSync(guide+'09-drills.md','utf8').split('## Lab 10')[1].split('## Lab 11')[0];
 let lab10Database='suta_drop_drill';
 // Run all commands in the documented disposable drop drill; psql queries target it explicitly.
 for(const m of lab10.matchAll(/```(bash|sql|psql)\n([\s\S]*?)\n```/g)){
   const command=m[2].trim();
   if(m[1]==='sql')sql(command,lab10Database);
   if(m[1]==='bash'&&command.startsWith('psql ')){
     const args=command.split(/\s+/);lab10Database=args[args.indexOf('-d')+1];
     assert.ok(['suta_drop_drill','suta_shop'].includes(lab10Database));
   }
   if(m[1]==='bash'&&!command.startsWith('psql ')){
     const [bin,...args]=command.split(/\s+/);
     if(!['createdb','dropdb','pg_restore'].includes(bin))throw Error('Unexpected Lab 10 command');
     // Deliberately wrong inherited connection and working folder: the handout
     // must explicitly select the right source and absolute backup path.
     const previous=env.PGPORT;env.PGPORT='65432';
     try{run(bin,args);}finally{env.PGPORT=previous;}
   }
 }
 assert.equal(sql("SELECT count(*)||'|'||sum(total) FROM shop.orders",'suta_drop_drill'),'3|195.00');results.push('Guide Lab 10 drop / restore disposable database');
 assert.equal(sql("SELECT string_agg(order_id::text,',' ORDER BY order_id) FROM shop.orders",'suta_drop_drill'),'1001,1002,1003');
 assert.deepEqual(JSON.parse(sql(stateQuery)),mergedState);
 results.push('Lab 10 older snapshot IDs verified; repaired source preserved');
 results.push('Lab 10 ignores wrong inherited port and uses an absolute backup path');
 // Execute the new student troubleshooting drill; exactly one failure is intended.
 const lab11=fs.readFileSync(guide+'09-drills.md','utf8').split('### 11A')[1].split('### Instructor-prepared extensions')[0];
 const backupHash=()=>createHash('sha256').update(fs.readFileSync(c.root+'/shop.dump')).digest('hex');
 const beforeHash=backupHash();let intendedFailures=0;
 assert.equal(sql("SELECT count(*) FROM pg_database WHERE datname IN ('suta_restore_typo','suta_fault_restore')",'postgres'),'0');
 for(const m of lab11.matchAll(/```bash\n([\s\S]*?)\n```/g)){
   const command=m[1].trim();
   if(command.startsWith('pg_restore ')&&command.includes('-d suta_restore_typo ')){
     let failure;
     try{run('bash',['-eu','-c',`cd ${c.root}\n${command}`]);}catch(error){failure=error;}
     assert.ok(failure,'Wrong-target restore must fail');
     assert.match(String(failure.stderr),/database "suta_restore_typo" does not exist/);
     intendedFailures++;
   }else run('bash',['-eu','-c',`cd ${c.root}\n${command}`]);
 }
 assert.equal(intendedFailures,1);
 assert.deepEqual(JSON.parse(sql(stateQuery,'suta_fault_restore')),{ids:[1001,1002,1003],count:3,total:195});
 assert.deepEqual(JSON.parse(sql(stateQuery)),mergedState);assert.equal(backupHash(),beforeHash);
 results.push('Exact Lab 11 wrong-target failure and corrected restore; source and backup unchanged');
 scenario.push({stage:'lab11-corrected-target',...JSON.parse(sql(stateQuery,'suta_fault_restore'))});
 const evidence={date:new Date().toISOString(),postgres:run('postgres',['--version']),pgbackrest:run('pgbackrest',['version']),results,scenario,scope:'Local isolated container; no student servers restarted or changed. Native CHECKS commands, copy SHOW checks, Labs 0–4, Lab 8A SQL, Lab 9 SQL/psql, Lab 10 and Lab 11 core commands read from handouts. Fast checkpoints and programmatic configuration used; interactive vi/SSH and advanced Lab 11 faults not replayed. Human comparison of expected results remains required.',inputHashes:Object.fromEntries(['CHECKS.md','05-physical.md','06-pgbackrest-pitr.md'].map(f=>[f,createHash('sha256').update(fs.readFileSync(guide+f)).digest('hex')]))};
 fs.writeFileSync('/var/lib/postgresql/qualification.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
}finally{
 for(const [started,dir]of[[pitrStarted,pitr],[physicalStarted,physical],[sourceStarted,c.source]])if(started)run('pg_ctl',['-D',dir,'-m','fast','-w','stop']);
}
