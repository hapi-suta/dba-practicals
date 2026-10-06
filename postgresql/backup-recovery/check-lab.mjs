// Read-only observer. No repairs, service changes, backup actions or grading.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const defaults={root:'/var/lib/postgresql/suta-backup-lab',source:'/var/lib/postgresql/16/lab',socket:'/var/run/postgresql',port:'5432',recoveryPort:'55433'};
export function observer(options={}) {
  const c={...defaults,...options};
  const checks=[];
  function add(id,status,detail){checks.push({id,status,detail});}
  function run(bin,args){return execFileSync(bin,args,{encoding:'utf8',timeout:8000,maxBuffer:256*1024,env:{...process.env,PGSERVICE:'',PGSERVICEFILE:'/dev/null',PGPASSFILE:'/dev/null',PGCONNECT_TIMEOUT:'3',PGOPTIONS:'-c default_transaction_read_only=on -c statement_timeout=3000 -c lock_timeout=500'}}).trim();}
  // Remove inherited connection/credential/service overrides; always pass target.
  function sql(db,query,copy=false){
    const env={...process.env};for(const k of Object.keys(env))if(k.startsWith('PG'))delete env[k];
    Object.assign(env,{PGCONNECT_TIMEOUT:'3',PGSERVICEFILE:'/dev/null',PGPASSFILE:'/dev/null',PGOPTIONS:'-c default_transaction_read_only=on -c statement_timeout=3000 -c lock_timeout=500'});
    return execFileSync('psql',['-X','-w','-At','-P','pager=off','-v','ON_ERROR_STOP=1','-h',copy?path.join(c.root,'recovery-socket'):c.socket,'-p',copy?c.recoveryPort:c.port,'-U','postgres','-d',db,'-c',query],{encoding:'utf8',timeout:8000,maxBuffer:256*1024,env,stdio:['ignore','pipe','pipe']}).trim();
  }
  const same=(a,b)=>{try{return fs.realpathSync(a)===fs.realpathSync(b);}catch{return false;}};
  function assess(id,actual,expected){add(id,actual===expected?'PASS':'MISMATCH',`expected ${JSON.stringify(expected)}; observed ${JSON.stringify(actual)}`);}
  function safe(id,fn){try{fn();}catch{add(id,'UNKNOWN','Could not inspect. Check connection, permissions and syntax; no repair attempted.');}}
  function source(){
    const actual=sql('postgres','SHOW data_directory');
    if(!same(actual,c.source))throw Error('Wrong source');
    add('source-identity','PASS','Connected to the expected source PGDATA.');
  }
  function preflight(copy='physical'){
    if(!['physical','pitr'].includes(copy))throw Error('Choose physical or pitr');
    const dir=path.join(c.root,copy+'-copy');
    if(!fs.existsSync(dir)){add('copy','NOT_STARTED','No copy directory. Complete the backup/restore step first.');return;}
    if(fs.lstatSync(dir).isSymbolicLink()||same(dir,c.source)){add('copy-identity','MISMATCH','Copy must be a separate non-symlink directory, never source PGDATA.');return;}
    if(fs.existsSync(path.join(dir,'postmaster.pid')))add('copy-stopped','MISMATCH','PID file exists. Use pg_ctl status; do not edit a running copy or delete the PID file.');
    else add('copy-stopped','PASS','No PID file; still verify pg_ctl status before editing.');
    safe('copy-self-contained',()=>{
      for(const file of ['postgresql.conf','postgresql.auto.conf']){
        const p=path.join(dir,file),content=fs.readFileSync(p,'utf8');
        assess('copy-local-'+file,fs.realpathSync(p).startsWith(fs.realpathSync(dir)+path.sep),true);
        // Classroom topology is intentionally self-contained; do not follow includes.
        assess('copy-no-includes-'+file,/^\s*include(?:_dir|_if_exists)?\s*(?:=|\s)/m.test(content),false);
        if(file==='postgresql.auto.conf')assess('copy-no-auto-data-directory',/^\s*data_directory\s*=/m.test(content),false);
      }
      assess('copy-local-wal',fs.realpathSync(path.join(dir,'pg_wal')).startsWith(fs.realpathSync(dir)+path.sep),true);
    });
    safe('copy-settings',()=>{
      const get=k=>run('postgres',['-D',dir,'-C',k]);
      assess('copy-data-directory',same(get('data_directory'),dir),true);
      assess('copy-port',get('port'),c.recoveryPort);
      assess('copy-socket',get('unix_socket_directories'),path.join(c.root,'recovery-socket'));
      assess('copy-network',get('listen_addresses'),'');
      assess('copy-archive-mode',get('archive_mode'),'off');
      assess('copy-archive-command',get('archive_command'),'');
      assess('copy-upstream',get('primary_conninfo'),'');
      for(const key of ['config_file','hba_file','ident_file']){
        const resolved=fs.realpathSync(get(key));
        assess('copy-'+key,resolved.startsWith(fs.realpathSync(dir)+path.sep),true);
      }
      if(copy==='pitr'){
        for(const key of ['recovery_target','recovery_target_time','recovery_target_xid','recovery_target_lsn'])assess('pitr-no-'+key,get(key),'');
        assess('pitr-target',get('recovery_target_name'),'suta_before_delete');
        assess('pitr-action',get('recovery_target_action'),'pause');
        assess('pitr-restore-command-present',get('restore_command').length>0,true);
      }
    });
    for(const name of ['standby.signal',...(copy==='physical'?['recovery.signal']:[])])assess('absent-'+name,fs.existsSync(path.join(dir,name)),false);
    if(copy==='pitr')assess('pitr-recovery-signal',fs.existsSync(path.join(dir,'recovery.signal')),true);
    safe('copy-tablespaces',()=>assess('copy-tablespaces',fs.readdirSync(path.join(dir,'pg_tblspc')).length,0));
    safe('socket-directory',()=>{
      const sock=path.join(c.root,'recovery-socket'),st=fs.statSync(sock);
      assess('socket-type',st.isDirectory(),true);
      assess('socket-owner',st.uid,process.getuid());
      assess('socket-private',st.mode&0o777,0o700);
      fs.accessSync(sock,fs.constants.W_OK|fs.constants.X_OK);
    });
    add('preflight-limit','INFO','Settings inspection is not backup-integrity verification or proof of a successful restore. No server was started.');
  }
  function progress(){
    try{source();}catch{add('source-identity','UNKNOWN','Expected source unavailable or different PGDATA. No other database checks performed.');return;}
    const names=sql('postgres',"SELECT datname FROM pg_database WHERE datname IN ('suta_shop','suta_plain_restore','suta_custom_restore','suta_schema_restore','suta_access_restore')").split('\n');
    for(const [db,n,total]of[['suta_shop',3,'195.00'],['suta_plain_restore',3,'195.00'],['suta_custom_restore',4,'205.00'],['suta_schema_restore',3,'195.00'],['suta_access_restore',3,'195.00']]){
      if(!names.includes(db)){add(db,'NOT_STARTED','Database not present.');continue;}
      safe(db,()=>{
        assess(db+'-orders',sql(db,"SELECT count(*)||'|'||coalesce(sum(total),0)::text FROM shop.orders"),`${n}|${total}`);
        assess(db+'-customers',sql(db,'SELECT count(*) FROM shop.customers'),'3');
        assess(db+'-items',sql(db,'SELECT count(*) FROM shop.order_items'),'3');
        assess(db+'-duplicate-items',sql(db,'SELECT count(*) FROM (SELECT order_id,product FROM shop.order_items GROUP BY order_id,product HAVING count(*)>1) d'),'0');
        assess(db+'-notes',sql(db,'SELECT count(*) FROM shop.delivery_notes'),'1');
        if(db==='suta_access_restore')assess('lab4-permissions',sql(db,"SELECT has_schema_privilege('suta_report_reader','shop','USAGE')::text||'|'||has_table_privilege('suta_report_reader','shop.orders','SELECT')::text||'|'||has_table_privilege('suta_report_reader','shop.orders','DELETE')::text"),'true|true|false');
      });
    }
    for(const file of ['shop.sql','shop.dump','shop-schema.dump','notes.dump','globals.sql','shop-with-access.dump']){
      const p=path.join(c.root,file);
      if(!fs.existsSync(p))add(file,'NOT_STARTED','File absent at guide path.');
      else safe(file,()=>add(file,fs.statSync(p).size>0?'PRESENT':'MISMATCH','File presence/size only; contents and recoverability not certified.'));
    }
    add('scope','INFO','Baseline is Labs 0–4. Later intentional Lab 7–9 changes can differ. Results do not prove every action, a prior DROP or the learner\'s understanding. No data is changed.');
  }
  function recovery(copy='physical'){
    const dir=path.join(c.root,copy+'-copy');
    safe('recovery',()=>{
      const actual=sql('postgres','SHOW data_directory',true);
      if(!same(actual,dir)){add('recovery-identity','MISMATCH','Connected to the wrong recovery directory; no row checks run.');return;}
      add('recovery-identity','PASS','Connected to the expected separate copy.');
      assess('recovery-archive-mode',sql('postgres','SHOW archive_mode',true),'off');
      assess('recovery-port',sql('postgres','SHOW port',true),c.recoveryPort);
      assess('recovery-socket',sql('postgres','SHOW unix_socket_directories',true),path.join(c.root,'recovery-socket'));
      assess('recovery-network',sql('postgres','SHOW listen_addresses',true),'');
      assess('recovery-state',sql('postgres',copy==='physical'?'SELECT pg_is_in_recovery()':"SELECT pg_is_in_recovery()::text||'|'||pg_is_wal_replay_paused()::text",true),copy==='physical'?'f':'true|true');
      assess('recovery-orders',sql('suta_shop',"SELECT count(*)||'|'||sum(total)::text FROM shop.orders",true),copy==='physical'?'3|195.00':'4|235.00');
      if(copy==='pitr'){
        assess('recovery-target-name',sql('postgres','SHOW recovery_target_name',true),'suta_before_delete');
        assess('recovery-target-action',sql('postgres','SHOW recovery_target_action',true),'pause');
        assess('recovery-order-ids',sql('suta_shop',"SELECT string_agg(order_id::text,',' ORDER BY order_id) FROM shop.orders",true),'1001,1002,1003,1004');
        const log=fs.readFileSync(path.join(c.root,'pitr-recovery.log'),'utf8');
        const start=log.lastIndexOf('starting PostgreSQL');
        assess('recovery-target-log',/recovery stopping at restore point "suta_before_delete"/.test(log.slice(Math.max(0,start))),true);
      }
    });
  }
  return {checks,progress,preflight,recovery};
}
export function main(args){
  const allowed=new Set(['progress','preflight','recovery']);
  const mode=args[0]??'progress',copy=args[1]??'physical';
  if(!allowed.has(mode)||!['physical','pitr'].includes(copy)||args.length>2)throw Error('Usage: node check-lab.mjs [progress|preflight|recovery] [physical|pitr]');
  const o=observer();o[mode](copy);
  console.log('READ-ONLY LAB CHECK — evidence, not completion grades');
  for(const x of o.checks)console.log(`${x.status.padEnd(11)} ${x.id}: ${x.detail}`);
  return o.checks.some(x=>['MISMATCH','UNKNOWN'].includes(x.status)||(mode!=='progress'&&x.status==='NOT_STARTED'))?1:0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{process.exitCode=main(process.argv.slice(2));}catch(e){console.error('UNKNOWN: '+e.message);process.exitCode=1;}
}
