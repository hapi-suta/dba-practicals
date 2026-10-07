import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const repository=fileURLToPath(new URL('../../../',import.meta.url));
const root=path.join(repository,'postgresql/backup-recovery');
const files=fs.readdirSync(root).filter(f=>f.endsWith('.md'));
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const commands=text=>[...text.matchAll(/```(?:bash|sql|psql)\n([\s\S]*?)\n```/g)].map(m=>m[1].trim());
function auditStudentContracts(readFile){
 const issues=[];
 const checks=readFile('CHECKS.md');
 if(!commands(checks).includes('cd /var/lib/postgresql/suta-backup-lab'))issues.push('checks-return-folder');
 for(const file of ['05-physical.md','06-pgbackrest-pitr.md']){
  for(const command of commands(readFile(file)).filter(s=>s.startsWith('pg_ctl ')&&s.endsWith(' start'))){
   if(!/ -l \/var\/lib\/postgresql\/suta-backup-lab\//.test(command))issues.push('absolute-log:'+file);
  }
 }
 const lab3=commands(readFile('03-table.md'));
 const drop=lab3.indexOf('DROP TABLE shop.delivery_notes;');
 if(drop<0||lab3[drop-1]!=='SHOW data_directory;'||!lab3.slice(0,drop).includes('SELECT current_database();'))issues.push('lab3-target-check');
 if(!lab3.some(c=>c.startsWith('SELECT order_id, status, total')&&c.includes('order_id = 1004')))issues.push('lab3-newer-order-proof');
 if(!commands(readFile('01-plain.md')).includes('\\d shop.orders'))issues.push('lab1-constraint-proof');
 const lab10=commands(readFile('09-drills.md').split('## Lab 10')[1].split('## Lab 11')[0]);
 const dropdb=lab10.findIndex(c=>c.startsWith('dropdb '));
 if(dropdb<0||lab10[dropdb-2]!=='SHOW data_directory;'||!lab10[dropdb].includes('-h /var/run/postgresql -p 5432'))issues.push('lab10-target-check');
 return issues;
}
test('student handouts contain the actual safety and result checks promised',()=>{
 assert.deepEqual(auditStudentContracts(read),[]);
});
test('audit detects reintroduced missing checks and relative-log regressions',()=>{
 const mutations=[
  ['CHECKS.md','cd /var/lib/postgresql/suta-backup-lab\n','pwd\n','checks-return-folder'],
  ['05-physical.md','-l /var/lib/postgresql/suta-backup-lab/physical-recovery.log','-l physical-recovery.log','absolute-log:05-physical.md'],
  ['03-table.md','SHOW data_directory;','SELECT 1;','lab3-target-check'],
  ['03-table.md','WHERE order_id = 1004','WHERE order_id = 9999','lab3-newer-order-proof'],
  ['01-plain.md','\\d shop.orders','\\dt','lab1-constraint-proof'],
  ['09-drills.md','dropdb -h /var/run/postgresql -p 5432','dropdb','lab10-target-check']
 ];
 for(const [file,from,to,issue]of mutations){
  const altered=name=>name===file?read(name).replace(from,to):read(name);
  assert.ok(auditStudentContracts(altered).includes(issue),issue);
 }
});
test('bare numeric bullets cannot become accidental nested numbered lists',()=>{
 for(const file of files){
  assert.doesNotMatch(fs.readFileSync(path.join(root,file),'utf8'),/^- \d+\.$/m,file);
 }
});
test('all twelve labs retain purpose, measurable success and discussion without duplicate task lists',()=>{
 for(const file of ['00-start.md','01-plain.md','02-custom.md','03-table.md','04-roles.md','05-physical.md']){
   const s=fs.readFileSync(path.join(root,file),'utf8');assert.match(s,/What you’ll practise:|## The (?:incident|task)/,file);assert.match(s,/Success looks like:/,file);
   assert.doesNotMatch(s,/\*\*Your task:/,file);assert.match(s,/Pause and discuss/,file);
 }
 for(const file of ['06-pgbackrest-pitr.md','09-drills.md']){
   for(const section of fs.readFileSync(path.join(root,file),'utf8').split(/^## Lab /m).slice(1)){
     assert.match(section,/What you’ll practise:|### (?:The |A separate|What the recovered)/);assert.match(section,/Success looks like:/);
     assert.doesNotMatch(section,/\*\*Your task:/);assert.match(section,/Pause and discuss/);
   }
 }
});
test('success and discussion use separated bullet lists',()=>{
 for(const file of ['00-start.md','01-plain.md','02-custom.md','03-table.md','04-roles.md','05-physical.md','06-pgbackrest-pitr.md','09-drills.md']){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  for(const label of ['Success looks like','Pause and discuss']){
   const headings=[...text.matchAll(new RegExp('\\*\\*'+label+'(?: before moving on)?:\\*\\*([^]*?)(?=\\n\\n)','g'))];
   assert.ok(headings.length>0,file+' missing '+label);
   assert.ok(headings.every(m=>m[1]===''),file+' should put '+label+' on its own line');
   assert.match(text,new RegExp('\\*\\*'+label+'(?: before moving on)?:\\*\\*\\n\\n- '),file+' needs bullets under '+label);
  }
 }
});
test('student executable blocks use class paths, not retired placeholders',()=>{
 for(const file of files){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  assert.equal((text.match(/^```/gm)||[]).length%2,0,'Unbalanced fences: '+file);
  for(const m of text.matchAll(/```(?:bash|sql|psql|conf|ini)\n([\s\S]*?)\n```/g)){
    assert.doesNotMatch(m[1],/\/LAB(?:\/|\b)|\/SOURCE_PGDATA|\/Source_pgdata/,file);
  }
 }
});
test('relative markdown file links resolve across student, instructor and internal areas',()=>{
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='.git'?[]:e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.md')?[path.join(dir,e.name)]:[]);
 for(const file of walk(repository)){
   const text=fs.readFileSync(file,'utf8');
   for(const m of text.matchAll(/\]\(([^\s)]+)\)/g)){
     const target=m[1].split('#')[0];
     if(!target||/^[a-z]+:|^\//i.test(target))continue;
     assert.ok(fs.existsSync(path.resolve(path.dirname(file),decodeURIComponent(target))),file+' -> '+target);
   }
 }
});
test('student folder contains only handouts; maintained tools are outside it',()=>{
 const allowed=new Set(['README.md','00-start.md','01-plain.md','02-custom.md','03-table.md','04-roles.md','05-physical.md','06-pgbackrest-pitr.md','09-drills.md','LAB-OVERVIEW.md','CLASS-SETUP.md','CHECKS.md','EVIDENCE.md','TROUBLESHOOTING.md']);
 for(const entry of fs.readdirSync(root,{withFileTypes:true})){
  if(entry.isDirectory()&&fs.readdirSync(path.join(root,entry.name)).length===0)continue;
  assert.ok(entry.isFile()&&allowed.has(entry.name),'Student clutter: '+entry.name);
 }
 for(const file of files){
  const text=read(file);
  for(const m of text.matchAll(/\/var\/lib\/postgresql\/dba-practicals\/([^\s`]+\.mjs)/g))assert.ok(fs.existsSync(path.join(repository,m[1])),file+' stale command '+m[1]);
 }
});
test('restore startup keeps direct before-start checks before pg_ctl start',()=>{
 for(const [file,kind]of[['05-physical.md','physical'],['06-pgbackrest-pitr.md','pitr']]){
   const s=fs.readFileSync(path.join(root,file),'utf8');
   const check=s.indexOf('CHECKS.md#before-starting-a-stopped-copy');
   assert.ok(check>=0&&check<s.indexOf(' -w start'));
   assert.match(s,/archive_mode = off/);assert.match(s,/55433/);assert.match(s,/recovery-socket/);
 }
});
const requiredNativeChecks=['pwd -P','pg_ctl -D . status',
 'readlink -e postgresql.conf postgresql.auto.conf pg_hba.conf pg_ident.conf pg_wal',
 "grep -nE '^[[:space:]]*include' postgresql.conf postgresql.auto.conf",
 "grep -nE '^[[:space:]]*data_directory' postgresql.auto.conf",
 'ls -A pg_tblspc','ls -a','ls -ld /var/lib/postgresql/suta-backup-lab/recovery-socket',
 ...['data_directory','config_file','hba_file','ident_file','port','unix_socket_directories','listen_addresses',
 'archive_mode','archive_command','primary_conninfo','recovery_target_name','recovery_target_action',
 'restore_command','recovery_target','recovery_target_time','recovery_target_xid','recovery_target_lsn'].map(s=>'postgres -D . -C '+s)];
const missingNativeChecks=text=>{
 const lines=commands(text).flatMap(c=>c.split('\n'));
 return requiredNativeChecks.filter(c=>!lines.includes(c));
};
test('native safety checks remain complete; removing any command is detected',()=>{
 const text=read('CHECKS.md');
 assert.deepEqual(missingNativeChecks(text),[]);
 for(const command of requiredNativeChecks){
   assert.ok(missingNativeChecks(text.replace(command+'\n','')).includes(command),command);
 }
 for(const term of ['postmaster.pid','standby.signal','recovery.signal','drwx------','suta_before_delete'])assert.ok(text.includes(term));
});
test('student handouts require neither internal tooling nor nano',()=>{
 for(const file of files){
  const text=read(file);
  assert.doesNotMatch(text,/\bnode\b|Node\.js|check-lab\.mjs|git (?:clone|pull)|\bnano\b|Ctrl\+[OX]/,file);
  if(commands(text).some(c=>/^(sudo )?vi /m.test(c))){
   assert.match(text,/`i` to edit/,file);assert.match(text,/:wq/,file);assert.match(text,/:q!/,file);
  }
 }
});

function auditBackupSetup(text){
 const issues=[];
 const lines=commands(text).flatMap(c=>c.split('\n'));
 if(lines.some(c=>/^sudo |^.*apt-get |^install -d /.test(c)))issues.push('sysadmin-work-in-student-lab');
 if(lines.some(c=>/^export PGBACKREST_/.test(c)))issues.push('hidden-backrest-selection');
 if(!lines.includes('vi /etc/pgbackrest/pgbackrest.conf'))issues.push('standard-config');
 if(!lines.includes("ALTER SYSTEM SET archive_mode = 'on';"))issues.push('student-enables-archiving');
 if(!lines.includes('pg_ctl -D /var/lib/postgresql/16/lab -l /var/lib/postgresql/suta-backup-lab/source-restart.log -m fast -w restart'))issues.push('required-restart');
 if(!lines.includes('pgbackrest --stanza=shop stanza-create'))issues.push('student-creates-stanza');
 if(!/pgbackrest --config=\/etc\/pgbackrest\/pgbackrest.conf --stanza=shop .* restore/.test(text))issues.push('explicit-recovery-config');
 if(!/empty configuration file/.test(text))issues.push('empty-start');
 if(/SOURCE already saves archived WAL|instructor repository intact|archive_mode is already on/.test(text))issues.push('prebuilt-answer');
 return issues;
}
test('sysadmin supplies prerequisites; student configures backup system at standard path',()=>{
 const text=read('06-pgbackrest-pitr.md');
 assert.deepEqual(auditBackupSetup(text),[]);
 const mutations=[
  ['vi /etc/pgbackrest/pgbackrest.conf','vi pgbackrest.conf','standard-config'],
  ["ALTER SYSTEM SET archive_mode = 'on';",'SELECT 1;','student-enables-archiving'],
  ['pg_ctl -D /var/lib/postgresql/16/lab -l /var/lib/postgresql/suta-backup-lab/source-restart.log -m fast -w restart','SELECT pg_reload_conf();','required-restart'],
  ['pgbackrest --stanza=shop stanza-create','pgbackrest --stanza=shop info','student-creates-stanza']
 ];
 for(const [from,to,id]of mutations)assert.ok(auditBackupSetup(text.replace(from,to)).includes(id));
 assert.ok(auditBackupSetup(text+'\nSOURCE already saves archived WAL').includes('prebuilt-answer'));
 assert.match(read('CHECKS.md'),/--stanza=shop/);
 assert.doesNotMatch(read('CHECKS.md'),/printenv PGBACKREST/);
});

// These are known student-reported wording defects, not a comprehension score.
const unclearStudentWording = /\b(?:resume help|resume guide|resume\/error help|stop and investigate|fixture|preparation gate)\b/i;
test('each student page using psql -X explains it outside command blocks',()=>{
 for(const file of files){
  const text=read(file);
  if(!commands(text).some(c=>/^psql -X\b/m.test(c)))continue;
  const prose=text.replace(/```[\s\S]*?```/g,'');
  assert.match(prose,/`-X`[^\n]*(?:skip|startup)/i,file+' needs a psql -X explanation');
 }
 const physical=read('05-physical.md').replace(/```[\s\S]*?```/g,'');
 assert.match(physical,/`-X stream`[^\n]*WAL/);
 assert.match(physical,/does not mean the same thing as `psql -X`/);
});
test('beginner handouts teach visible results rather than shell exit codes',()=>{
 for(const file of files){
  assert.doesNotMatch(read(file),/echo\s+\$\?|exit (?:status|code)|nonzero exit|exit 3/i,file);
 }
 const plain=read('01-plain.md');
 assert.match(plain,/missing\s+or empty/);
 assert.ok(commands(plain).includes('SELECT count(*), sum(total) FROM shop.orders;'));
 assert.ok(commands(read('05-physical.md')).includes('pg_verifybackup physical-copy'));
 assert.match(read('05-physical.md'),/If `pg_basebackup` prints an error, stop/);
});
test('student-reported vague wording stays out of handouts',()=>{
 for(const file of files)assert.doesNotMatch(read(file),unclearStudentWording,file);
 for(const phrase of ['use resume help','use the resume guide','stop and investigate','this fixture','preparation gate']){
  assert.match(phrase,unclearStudentWording,'must detect known regression: '+phrase);
 }
});
test('student troubleshooting links point to existing heading anchors',()=>{
 const anchors=text=>{
  const seen=new Map();
  return new Set([...text.matchAll(/^#{1,6} (.+)$/gm)].map(([,heading])=>{
   const base=heading.toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu,'').replace(/\s/g,'-');
   const count=seen.get(base)||0;seen.set(base,count+1);
   return base+(count?'-'+count:'');
  }));
 };
 for(const file of files){
  for(const [,link] of read(file).matchAll(/\]\(([^\s)]+)\)/g)){
   if(/^[a-z]+:|^\//i.test(link)||!link.includes('#'))continue;
   const [target,fragment]=link.split('#');
   const resolved=path.resolve(root,target||file);
   assert.ok(anchors(fs.readFileSync(resolved,'utf8')).has(decodeURIComponent(fragment)),file+' -> '+link);
  }
 }
 assert.ok(!anchors('# Real section').has('missing-section'),'missing heading must fail');
});
