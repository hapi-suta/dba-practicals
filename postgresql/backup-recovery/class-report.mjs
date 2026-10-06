// Teacher-run, on-demand snapshot. Inventory and generated reports stay private.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
export function validateInventory(items){
  if(!Array.isArray(items)||!items.length||items.length>30)throw Error('Use 1–30 inventory entries');
  for(const x of items){
    if(Object.keys(x).some(k=>!['name','host','identityFile','knownHostsFile'].includes(k)))throw Error('Unknown field; never include passwords');
    if(typeof x.name!=='string'||x.name.length>80||!x.name.trim())throw Error('Invalid name');
    if(!/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}$/.test(x.host))throw Error('Invalid SSH host');
    for(const k of ['identityFile','knownHostsFile'])if(typeof x[k]!=='string'||!path.isAbsolute(x[k])||/[\r\n\0]/.test(x[k]))throw Error('Use absolute key/known-hosts paths');
  }
  return items;
}
const esc=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function renderReport(results,at=new Date().toISOString()){
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>StepUP lab progress</title><style>body{font:16px system-ui;background:#0d182b;color:#edf3fc;margin:0;padding:32px}main{max-width:1100px;margin:auto}h1{font-size:30px}p{color:#b8c7dc;line-height:1.6}section{border:1px solid #35455e;border-radius:14px;padding:20px;margin:18px 0;background:#132238}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:10px;border-bottom:1px solid #35455e;overflow-wrap:anywhere}th{color:#91bffc}.PASS{color:#68e6bd}.MISMATCH,.UNKNOWN{color:#ffbc8a}.NOT_STARTED,.PRESENT,.INFO{color:#b8c7dc}small{color:#b8c7dc}@media(max-width:600px){body{padding:14px}td,th{padding:6px;font-size:13px}}</style><main><small>STEPUP TECH ACADEMY · DBA PRACTICALS</small><h1>Class progress snapshot</h1><p>Checked ${esc(at)}. Read-only, on demand—not live monitoring or a completion grade. Labs 0–4 baseline only; later exercises intentionally change data. Missing evidence and unreachable servers never count as passed.</p>${results.map(r=>`<section><h2>${esc(r.name)}</h2>${r.error?`<p class="UNKNOWN">UNKNOWN — ${esc(r.error)}</p>`:`<table><thead><tr><th>Result</th><th>Check</th><th>Evidence / next step</th></tr></thead><tbody>${r.checks.map(c=>`<tr><td class="${['PASS','MISMATCH','UNKNOWN','NOT_STARTED','PRESENT','INFO'].includes(c.status)?c.status:'UNKNOWN'}">${esc(c.status)}</td><td>${esc(c.id)}</td><td>${esc(c.detail)}</td></tr>`).join('')}</tbody></table>`}</section>`).join('')}<p>Retain this report privately. It contains learner progress. No server addresses or credentials are rendered.</p></main></html>`;
}
export async function collect(items){
 validateInventory(items);
 const source=fs.readFileSync(new URL('./check-lab.mjs',import.meta.url),'utf8');
 const payload=source+"\nconst report=observer();report.progress();console.log(JSON.stringify(report.checks));\n";
 const results=[];
 // Limit simultaneous probes to three; no loops/schedules or repairs.
 for(let i=0;i<items.length;i+=3)results.push(...await Promise.all(items.slice(i,i+3).map(x=>new Promise(resolve=>{
   const child=execFile('ssh',['-o','StrictHostKeyChecking=yes','-o',`UserKnownHostsFile=${x.knownHostsFile}`,'-o','BatchMode=yes','-o','ConnectTimeout=5','-i',x.identityFile,`ubuntu@${x.host}`,'sudo -n -iu postgres node --input-type=module'],{timeout:45000,maxBuffer:512*1024},(e,out)=>{
     if(e){resolve({name:x.name,error:'Server unreachable, access refused or check failed. It may be stopped. No repair or restart attempted.'});return;}
     try{const checks=JSON.parse(out);if(!Array.isArray(checks)||!checks.length||checks.some(c=>!c.id||!c.status||typeof c.detail!=='string'))throw Error();resolve({name:x.name,checks});}
     catch{resolve({name:x.name,error:'Invalid observer response. No completion inferred.'});}
   });
   child.stdin.on('error',()=>{});child.stdin.end(payload);
 }))));
 return results;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
   const [inventory,output]=process.argv.slice(2);
   if(!inventory||!output)throw Error('Usage: node class-report.mjs PRIVATE-INVENTORY.json PRIVATE-REPORT.html');
   const results=await collect(JSON.parse(fs.readFileSync(inventory,'utf8')));
   fs.writeFileSync(output,renderReport(results),{mode:0o600,flag:'wx'});
   console.log('Saved private read-only snapshot. Existing reports are never overwritten.');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
