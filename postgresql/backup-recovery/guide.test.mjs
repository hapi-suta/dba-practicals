import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const files=fs.readdirSync(root).filter(f=>f.endsWith('.md'));
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const commands=text=>[...text.matchAll(/```(?:bash|sql|psql)\n([\s\S]*?)\n```/g)].map(m=>m[1].trim());
function auditStudentContracts(readFile){
 const issues=[];
 const checks=readFile('CHECKS.md');
 if(!checks.includes('cd /var/lib/postgresql/suta-backup-lab'))issues.push('checker-return-folder');
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
  ['CHECKS.md','cd /var/lib/postgresql/suta-backup-lab','pwd','checker-return-folder'],
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
test('relative markdown file links resolve',()=>{
 for(const file of files){
   const text=fs.readFileSync(path.join(root,file),'utf8');
   for(const m of text.matchAll(/\]\(([^\s)]+)\)/g)){
     const target=m[1].split('#')[0];
     if(!target||/^[a-z]+:|^\//i.test(target))continue;
     assert.ok(fs.existsSync(path.resolve(root,decodeURIComponent(target))),file+' -> '+target);
   }
 }
});
test('restore startup keeps mandatory preflight before pg_ctl start',()=>{
 for(const [file,kind]of[['05-physical.md','physical'],['06-pgbackrest-pitr.md','pitr']]){
   const s=fs.readFileSync(path.join(root,file),'utf8');
   assert.ok(s.indexOf('check-lab.mjs preflight '+kind)<s.indexOf(' -w start'));
   assert.match(s,/archive_mode = off/);assert.match(s,/55433/);assert.match(s,/recovery-socket/);
 }
});
