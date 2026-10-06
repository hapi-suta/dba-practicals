import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const files=fs.readdirSync(root).filter(f=>f.endsWith('.md'));
test('all twelve labs have a purpose and outcome',()=>{
 for(const file of ['00-start.md','01-plain.md','02-custom.md','03-table.md','04-roles.md','05-physical.md']){
   const s=fs.readFileSync(path.join(root,file),'utf8');assert.match(s,/What we’re doing:/,file);assert.match(s,/You finish with:/,file);
 }
 for(const file of ['06-pgbackrest-pitr.md','09-drills.md']){
   for(const section of fs.readFileSync(path.join(root,file),'utf8').split(/^## Lab /m).slice(1)){
     assert.match(section,/What we’re doing:/);assert.match(section,/You finish with:/);
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
