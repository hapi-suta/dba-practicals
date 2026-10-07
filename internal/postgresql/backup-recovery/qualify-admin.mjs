// Disposable QA only. System packages come from the existing test image.
// Root executes instructor directory/permission preparation; postgres configures
// pgBackRest and performs the lab. No student-host use.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fork,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
if(process.env.SUTA_DISPOSABLE_QA!=='yes'||!fs.existsSync('/.dockerenv')||process.getuid()!==0)throw Error('Root in a dedicated disposable QA container only');
for(const p of ['/etc/pgbackrest/pgbackrest.conf','/var/lib/postgresql/16/lab/PG_VERSION'])assert.ok(!fs.existsSync(p),'Refuse existing work: '+p);
if(fs.existsSync('/var/lib/pgbackrest'))assert.deepEqual(fs.readdirSync('/var/lib/pgbackrest'),[],'Refuse nonempty repository');
const guide=fs.readFileSync(new URL('../../../instructor/postgresql/backup-recovery/CONFIG-TRANSITION.md',import.meta.url),'utf8');
const commands=[...guide.matchAll(/```bash\n([\s\S]*?)\n```/g)].flatMap(m=>m[1].split('\n'));
for(const c of commands.filter(c=>/^sudo (install|touch|chown|chmod|ls -l )/.test(c)))execFileSync('bash',['-eu','-c',c.slice(5)]);
assert.equal(fs.statSync('/etc/pgbackrest/pgbackrest.conf').size,0);
const uid=Number(execFileSync('id',['-u','postgres']));
const gid=Number(execFileSync('id',['-g','postgres']));
const child=fork(fileURLToPath(new URL('./qualify.mjs',import.meta.url)),[],{uid,gid,env:{...process.env,HOME:'/var/lib/postgresql'},stdio:['ignore','inherit','inherit','ipc']});
child.on('exit',(code,signal)=>{process.exitCode=signal?1:(code??1);});
