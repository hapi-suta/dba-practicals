// INSTRUCTOR ONLY: creates synthetic state in the dedicated local QA container.
// Refuses ordinary hosts. Never run on student machines.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {observer,defaults as c} from './check-lab.mjs';
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
try{
 // Rehearse unchanged + revised early-lab SQL directly from the handouts first.
 const core=run('node',['/guide/rehearse.mjs']);console.log(core);results.push('Exact Labs 0–4 SQL rehearsal');
 const missing=observer({root:'/var/lib/postgresql/not-created'});missing.preflight();
 assert.equal(missing.checks[0].status,'NOT_STARTED');results.push('Absent copy never marked passed');
 const offline=observer({socket:'/var/lib/postgresql/not-a-socket'});offline.progress();
 assert.equal(offline.checks[0].status,'UNKNOWN');results.push('Unavailable source never marked passed');
 fs.mkdirSync(c.root,{recursive:true});fs.mkdirSync(c.root+'/recovery-socket',{mode:0o700});
 run('initdb',['-D',c.source,'--auth-local=trust','--auth-host=reject','--no-locale']);
 fs.mkdirSync('/var/lib/postgresql/prepared-backrest/repo',{recursive:true});
 const prepared='[global]\nrepo1-path=/var/lib/postgresql/prepared-backrest/repo\nlog-level-file=off\nlock-path=/var/lib/postgresql/prepared-backrest\n[shop]\npg1-path='+c.source+'\npg1-socket-path='+c.socket+'\n';
 fs.writeFileSync('/etc/pgbackrest/pgbackrest.conf',prepared);
 fs.writeFileSync(c.source+'/postgresql.auto.conf',"listen_addresses=''\nunix_socket_directories='/var/run/postgresql'\narchive_mode=on\narchive_command='/usr/bin/pgbackrest --config=/etc/pgbackrest/pgbackrest.conf --stanza=shop archive-push %p'\n");
 run('pg_ctl',['-D',c.source,'-l','/var/lib/postgresql/qa-source.log','-w','start']);sourceStarted=true;
 run('pgbackrest',['--stanza=shop','stanza-create']);run('pgbackrest',['--stanza=shop','check']);
 run('createdb',['suta_shop']);
 const start=fs.readFileSync('/guide/00-start.md','utf8').split('## 3.')[1];
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
 const isolation=fs.readFileSync('/guide/05-physical.md','utf8').match(/```conf\n([\s\S]*?)\n```/)[1];
 const original=fs.readFileSync(physical+'/postgresql.auto.conf','utf8');
 fs.writeFileSync(physical+'/postgresql.auto.conf',original+'\n'+isolation+'\n');
 report('Physical preflight passes exact guide settings',inspect('preflight','physical'));
 fs.appendFileSync(physical+'/postgresql.auto.conf',"unix_socket_directories='/LAB/recovery-socket'\n");
 expectFail('Literal placeholder detected','physical','copy-socket');
 fs.writeFileSync(physical+'/postgresql.auto.conf',original+'\n'+isolation+'\narchive_mode=on\n');
 expectFail('Later duplicate archive override detected','physical','copy-archive-mode');
 fs.writeFileSync(physical+'/postgresql.auto.conf',original+'\n'+isolation+`\ndata_directory='${c.source}'\n`);
 expectFail('Unsupported auto.conf directory setting detected','physical','copy-no-auto-data-directory');
 fs.writeFileSync(physical+'/postgresql.auto.conf',original+'\n'+isolation+'\n');
 const mainConfig=fs.readFileSync(physical+'/postgresql.conf','utf8');
 fs.appendFileSync(physical+'/postgresql.conf',`\ndata_directory='${c.source}'\n`);
 expectFail('Source directory redirection detected','physical','copy-data-directory');
 fs.writeFileSync(physical+'/postgresql.conf',mainConfig);
 run('pg_ctl',['-D',physical,'-l',c.root+'/physical-recovery.log','-w','start']);physicalStarted=true;
 report('Physical copy live identity / isolation / data',inspect('recovery','physical'));
 const databases="SELECT string_agg(datname,',' ORDER BY datname) FROM pg_database WHERE NOT datistemplate";
 assert.equal(run('psql',['-XAt','-h',c.root+'/recovery-socket','-p',c.recoveryPort,'-d','postgres','-c',databases]),sql(databases,'postgres'));
 results.push('Physical copy includes every source database, not just the shop');
 expectFail('Running copy blocked from editing','physical','copy-stopped');
 run('pg_ctl',['-D',physical,'-m','fast','-w','stop']);physicalStarted=false;
 // New student repository: exact published INI, not the instructor repo.
 fs.mkdirSync(c.root+'/repo');
 const ini=fs.readFileSync('/guide/06-pgbackrest-pitr.md','utf8').match(/```ini\n([\s\S]*?)\n```/)[1];
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
 const incident=fs.readFileSync('/guide/06-pgbackrest-pitr.md','utf8').split('## Lab 8A')[1].split('## Lab 8B')[0];
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
 run('pg_ctl',['-D',pitr,'-l',c.root+'/pitr-recovery.log','-w','start']);pitrStarted=true;
 for(let n=0;n<30;n++){
   const state=run('psql',['-XAt','-h',c.root+'/recovery-socket','-p',c.recoveryPort,'-d','suta_shop','-c','SELECT pg_is_wal_replay_paused()']);
   if(state==='t')break;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);
 }
 report('PITR target / paused / expected rows / current log',inspect('recovery','pitr'));
 const copyState=JSON.parse(run('psql',['-XAt','-h',c.root+'/recovery-socket','-p',c.recoveryPort,'-d','suta_shop','-c',stateQuery]));
 assert.deepEqual(copyState,{ids:[1001,1002,1003,1004],count:4,total:235});
 assert.deepEqual(JSON.parse(sql(stateQuery)),sourceState);
 scenario.push({stage:'paused-recovery-copy',...copyState});
 results.push('Same row count does not hide different IDs; source remains unchanged');
 assert.equal(sql('SELECT count(*)||\'|\'||sum(total) FROM shop.orders'),'4|130.00');
 // Execute Lab 9's SQL and psql copy commands directly from the updated guide.
 let recovered=true;
 const chapter=fs.readFileSync('/guide/09-drills.md','utf8').split('## Lab 10')[0];
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
 const lab10=fs.readFileSync('/guide/09-drills.md','utf8').split('## Lab 10')[1].split('## Lab 11')[0];
 // Run all commands in the documented disposable drop drill; psql queries target it explicitly.
 for(const m of lab10.matchAll(/```(bash|sql|psql)\n([\s\S]*?)\n```/g)){
   const command=m[2].trim();
   if(m[1]==='sql')sql(command,'suta_drop_drill');
   if(m[1]==='bash'&&!command.startsWith('psql ')){
     const [bin,...args]=command.split(/\s+/);
     if(!['createdb','dropdb','pg_restore'].includes(bin))throw Error('Unexpected Lab 10 command');
     run(bin,args.map(a=>a==='shop.dump'?c.root+'/shop.dump':a));
   }
 }
 assert.equal(sql("SELECT count(*)||'|'||sum(total) FROM shop.orders",'suta_drop_drill'),'3|195.00');results.push('Guide Lab 10 drop / restore disposable database');
 assert.equal(sql("SELECT string_agg(order_id::text,',' ORDER BY order_id) FROM shop.orders",'suta_drop_drill'),'1001,1002,1003');
 assert.deepEqual(JSON.parse(sql(stateQuery)),mergedState);
 results.push('Lab 10 older snapshot IDs verified; repaired source preserved');
 // Execute the new student troubleshooting drill; exactly one failure is intended.
 const lab11=fs.readFileSync('/guide/09-drills.md','utf8').split('### 11A')[1].split('### Instructor-prepared extensions')[0];
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
 const evidence={date:new Date().toISOString(),postgres:run('postgres',['--version']),pgbackrest:run('pgbackrest',['version']),results,scenario,scope:'Local isolated container; no student servers restarted or changed. Labs 0–4, Lab 8A SQL, Lab 9 SQL/psql, Lab 10 and Lab 11 core commands read from handouts. Fast checkpoints and programmatic configuration used; interactive nano/SSH and advanced Lab 11 faults not replayed.'};
 fs.writeFileSync('/var/lib/postgresql/qualification.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
}finally{
 for(const [started,dir]of[[pitrStarted,pitr],[physicalStarted,physical],[sourceStarted,c.source]])if(started)run('pg_ctl',['-D',dir,'-m','fast','-w','stop']);
}
