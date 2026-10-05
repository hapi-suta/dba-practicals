// Local, visible real-command rehearsal. No shell, remote hosts or credentials.
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const clients=new Set(),events=[];let child=null,state='Ready — not started';
function emit(text){const event={at:new Date().toISOString(),text};events.push(event);for(const res of clients)res.write('data: '+JSON.stringify(event)+'\n\n');}
const html=`<!doctype html><html><head><meta charset="utf-8"><title>Live PostgreSQL lab rehearsal</title><style>
body{background:#0c172a;color:#e8eef8;font:17px system-ui;margin:24px;max-width:1300px}h1{margin-bottom:8px}p{line-height:1.5}button{padding:12px 20px;font:inherit;background:#47dec6;border:0;border-radius:8px;cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#07101f;padding:20px;border:1px solid #405572;border-radius:8px;font:15px/1.5 monospace;max-height:68vh;overflow:auto}.badge{color:#61e2ce}label{margin-left:20px}
</style></head><body><h1>PostgreSQL backup labs · live rehearsal</h1><p class="badge">Real local PostgreSQL commands and output · NOT a recording or simulated terminal</p><p>Labs 0–4: plain/custom/schema restores, dropped-table recovery, preserved newer orders and permissions.<br>Private temporary cluster; no TCP connections; no class/cloud server changes. Advanced PITR is not being tested here.</p><button id="run">Run the isolated rehearsal</button><label><input type="checkbox" id="follow" checked> Follow output</label><p id="status">Ready — not started</p><pre id="output">Waiting to start. Each command appears before it executes.\n</pre><script>
const output=document.querySelector('#output'),status=document.querySelector('#status'),button=document.querySelector('#run');
const stream=new EventSource('/events');stream.onmessage=e=>{const event=JSON.parse(e.data);output.textContent+=event.text+'\\n';if(document.querySelector('#follow').checked)output.scrollTop=output.scrollHeight;if(event.text.startsWith('STATUS:'))status.textContent=event.text.slice(7);};
button.onclick=async()=>{button.disabled=true;const r=await fetch('/run',{method:'POST'});if(!r.ok)status.textContent=await r.text();};
</script></body></html>`;
const server=http.createServer((req,res)=>{
  if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;}
  if(req.method==='GET'&&req.url==='/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});for(const e of events)res.write('data: '+JSON.stringify(e)+'\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;}
  if(req.method==='POST'&&req.url==='/run'){
    if(req.headers.origin!==`http://127.0.0.1:${server.address().port}`){res.writeHead(403);res.end('Local page only');return;}
    if(child){res.writeHead(409);res.end('This server runs one rehearsal only; existing evidence is retained.');return;}
    state='Running actual commands';emit('STATUS: '+state);
    child=spawn(process.execPath,[fileURLToPath(new URL('./rehearse.mjs',import.meta.url))],{env:{...process.env,SUTA_REHEARSAL_LIVE:'1'},stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',b=>emit(b.toString()));child.stderr.on('data',b=>emit(b.toString()));
    child.on('error',e=>emit('STATUS: Failed to start — '+e.message));
    child.on('exit',code=>{state=code===0?'PASSED — temporary test cluster stopped; evidence retained':'FAILED — inspect output and retained evidence';emit('STATUS: '+state);});
    res.end('Started');return;
  }
  res.writeHead(404);res.end('Not found');
});
server.listen(0,'127.0.0.1',()=>console.log('Open http://127.0.0.1:'+server.address().port+'/'));
