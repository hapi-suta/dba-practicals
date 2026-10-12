#!/usr/bin/env python3
"""Instructor-installed helper: change only the disposable Mattermost lab's connection/pool."""
import argparse,json,os,pathlib,subprocess,time,urllib.request
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('route',choices=['direct','pooled']);p.add_argument('--open',type=int,default=8);p.add_argument('--idle',type=int,default=2)
a=p.parse_args()
if os.geteuid()!=0 or os.uname().nodename!='suta-pgb-app':raise SystemExit('Run with sudo on suta-pgb-app only.')
if not 1<=a.open<=32 or not 0<=a.idle<=a.open:raise SystemExit('open 1..32; idle 0..open')
assert pathlib.Path('/etc/suta/lab-id').read_text().strip()=='suta-pgbouncer-phase1'
private=json.loads(pathlib.Path('/etc/suta/phase1.json').read_text())
f=pathlib.Path('/opt/mattermost/config/config.json');cfg=json.loads(f.read_text())
host,port,tls=('pg-db',5432,'require') if a.route=='direct' else ('pg-pooler',6432,'disable')
cfg['SqlSettings'].update(DataSource=f"postgres://mmuser:{private['passwords']['mmuser']}@{host}:{port}/mattermost?sslmode={tls}&connect_timeout=5&application_name=mattermost-phase1&binary_parameters=yes",MaxOpenConns=a.open,MaxIdleConns=a.idle)
f.write_text(json.dumps(cfg,indent=2)+'\n')
subprocess.run(['systemctl','restart','mattermost'],check=True)
r=pathlib.Path('/opt/suta/pgbouncer-lab/.runtime/state.json');state=json.loads(r.read_text());state.update(route=a.route,max_open=a.open,max_idle=a.idle);r.write_text(json.dumps(state))
for i in range(60):
 try:
  with urllib.request.urlopen('http://127.0.0.1:8065/api/v4/system/ping',timeout=2) as resp:
   if resp.status==200:break
 except Exception:time.sleep(1)
else:raise SystemExit('API not ready. Save journal output; do not reset database.')
print(f'Mattermost ready: route={a.route}, host={host}, port={port}, max_open={a.open}, max_idle={a.idle}')
