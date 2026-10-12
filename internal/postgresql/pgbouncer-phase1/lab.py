#!/usr/bin/env python3
"""Controls only the named, local, disposable Phase 1 Compose project."""
import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parent
RUNTIME = ROOT / '.runtime'
PROJECT = 'suta-pgbouncer-phase1'
BASE = 'http://127.0.0.1:18065'

def compose(*args, capture=True, check=True, input=None, timeout=120):
    return subprocess.run(['docker', 'compose', '-p', PROJECT, '-f', str(ROOT / 'compose.yaml'), *args],
                          text=True, input=input, capture_output=capture, check=check, timeout=timeout)

def state():
    data = json.loads((RUNTIME / 'state.json').read_text())
    if data.get('project') != PROJECT or data.get('base_url') != BASE:
        raise RuntimeError('Unexpected lab identity; stop.')
    return data

def save(data):
    p = RUNTIME / 'state.json'
    p.write_text(json.dumps(data, indent=2) + '\n')
    p.chmod(0o600)

def app_env(data):
    host, port = ('db', 5432) if data['route'] == 'direct' else ('pooler', 6432)
    env = {
        'MM_SQLSETTINGS_DRIVERNAME': 'postgres',
        'MM_SQLSETTINGS_DATASOURCE': f"postgres://mmuser:{data['passwords']['mmuser']}@{host}:{port}/mattermost?sslmode=disable&connect_timeout=5&application_name=mattermost-phase1",
        'MM_SQLSETTINGS_MAXOPENCONNS': str(data['max_open']),
        'MM_SQLSETTINGS_MAXIDLECONNS': str(data['max_idle']),
        'MM_SQLSETTINGS_QUERYTIMEOUT': '10',
        'MM_SERVICESETTINGS_SITEURL': BASE,
        'MM_SERVICESETTINGS_ENABLELOCALMODE': 'true',
        'MM_SERVICESETTINGS_ENABLEOUTGOINGWEBHOOKS': 'false',
        'MM_EMAILSETTINGS_SENDEMAILNOTIFICATIONS': 'false',
        'MM_EMAILSETTINGS_REQUIREEMAILVERIFICATION': 'false',
        'MM_EMAILSETTINGS_SENDPUSHNOTIFICATIONS': 'false',
        'MM_LOGSETTINGS_ENABLEDIAGNOSTICS': 'false',
        'MM_PLUGINSETTINGS_ENABLE': 'false',
        'MM_SERVICESETTINGS_ENABLESECURITYFIXALERT': 'false',
    }
    p = RUNTIME / 'app.env'
    p.write_text(''.join(f'{k}={v}\n' for k, v in env.items()))
    p.chmod(0o600)

def ready(timeout=120):
    start = time.monotonic()
    while time.monotonic() - start < timeout:
        try:
            with urllib.request.urlopen(BASE + '/api/v4/system/ping', timeout=3) as r:
                if r.status == 200:
                    print('Mattermost API ready at ' + BASE)
                    return
        except Exception:
            time.sleep(1)
    raise RuntimeError('Mattermost not ready; inspect this project logs. Do not reset data.')

def prepare():
    if RUNTIME.exists():
        raise RuntimeError('Runtime already exists; use status/resume. Prepare never overwrites.')
    existing = subprocess.run(['docker', 'ps', '-aq', '--filter', f'label=com.docker.compose.project={PROJECT}'], capture_output=True, text=True, check=True)
    volumes = subprocess.run(['docker', 'volume', 'ls', '-q', '--filter', f'label=com.docker.compose.project={PROJECT}'], capture_output=True, text=True, check=True)
    if existing.stdout.strip() or volumes.stdout.strip():
        raise RuntimeError('Project containers/volumes already exist; investigate instead of resetting.')
    RUNTIME.mkdir(mode=0o700)
    (RUNTIME / 'pgbouncer').mkdir()
    data = {'project': PROJECT, 'base_url': BASE, 'route': 'direct', 'max_open': 8, 'max_idle': 2,
            'passwords': {u: secrets.token_hex(20) for u in ['postgres', 'mmuser', 'labuser', 'pooladmin']}}
    save(data)
    (RUNTIME / 'postgres-password').write_text(data['passwords']['postgres'])
    (RUNTIME / 'init.sql').write_text(
        f"CREATE ROLE mmuser LOGIN PASSWORD '{data['passwords']['mmuser']}';\n"
        "CREATE DATABASE mattermost OWNER mmuser;\n"
        f"CREATE ROLE labuser LOGIN PASSWORD '{data['passwords']['labuser']}';\n"
        "CREATE DATABASE pool_lab OWNER labuser;\n"
        "\\connect pool_lab\nCREATE TABLE lab_identity (name text PRIMARY KEY);\n"
        "INSERT INTO lab_identity VALUES ('suta-pgbouncer-phase1');\nGRANT SELECT ON lab_identity TO labuser;\n")
    (RUNTIME / 'pgbouncer' / 'userlist.txt').write_text(''.join(f'"{u}" "{data["passwords"][u]}"\n' for u in ['mmuser', 'labuser', 'pooladmin']))
    (RUNTIME / 'pgbouncer' / 'pgbouncer.ini').touch()
    pgpass = RUNTIME / 'pgpass'
    pgpass.write_text(''.join(f'*:*:*:{u}:{data["passwords"][u]}\n' for u in ['mmuser', 'labuser', 'pooladmin']))
    for p in [RUNTIME / 'postgres-password', RUNTIME / 'init.sql', RUNTIME / 'pgbouncer' / 'userlist.txt', pgpass]:
        p.chmod(0o600)
    app_env(data)
    print('Created private lab credentials and EMPTY pgbouncer.ini. No pooler settings supplied.')
    compose('up', '-d', 'db', 'pooler', 'app', capture=False)
    ready()

def sql(kind, query, check=True):
    state()
    if kind == 'db':
        args = ['exec', '-T', 'db', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'mattermost']
    else:
        database, user = ('pgbouncer', 'pooladmin') if kind == 'admin' else ('pool_lab', 'labuser')
        args = ['exec', '-T', 'pooler', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', '6432', '-U', user, '-d', database]
    return compose(*args, '-c', query, check=check)

def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest='cmd', required=True)
    for c in ['prepare', 'status', 'resume', 'stop', 'pool-start', 'pool-reload', 'versions', 'ready']:
        sub.add_parser(c)
    s = sub.add_parser('sql'); s.add_argument('target', choices=['db', 'admin', 'demo']); s.add_argument('query')
    s = sub.add_parser('app'); s.add_argument('--route', choices=['direct', 'pooled']); s.add_argument('--max-open', type=int); s.add_argument('--max-idle', type=int)
    args = p.parse_args()
    if args.cmd == 'prepare': prepare(); return
    data = state()
    if args.cmd == 'status':
        print(json.dumps({k: data[k] for k in ['project', 'base_url', 'route', 'max_open', 'max_idle']}, indent=2))
        compose('ps', capture=False)
    elif args.cmd == 'resume':
        compose('up', '-d', capture=False)
        print('Containers resumed; pooler needs pool-start if its container was stopped. Do not rerun prepare.')
    elif args.cmd == 'stop': compose('stop', capture=False)
    elif args.cmd == 'ready': ready()
    elif args.cmd == 'pool-start':
        if not (RUNTIME / 'pgbouncer' / 'pgbouncer.ini').read_text().strip():
            raise RuntimeError('pgbouncer.ini is empty. Complete student configuration first.')
        compose('exec', '-T', 'pooler', 'pgbouncer', '-d', '/etc/pgbouncer/pgbouncer.ini', capture=False)
        print('PgBouncer start requested. Verify with SHOW VERSION and a database query.')
    elif args.cmd == 'pool-reload': print(sql('admin', 'RELOAD;').stdout)
    elif args.cmd == 'sql':
        r = sql(args.target, args.query, check=False); print(r.stdout, end=''); print(r.stderr, end='', file=sys.stderr); sys.exit(r.returncode)
    elif args.cmd == 'versions':
        for service, command in [('db', ['postgres', '--version']), ('pooler', ['pgbouncer', '--version']), ('app', ['/mattermost/bin/mattermost', 'version'])]:
            print(service + ':'); print(compose('exec', '-T', service, *command).stdout)
    elif args.cmd == 'app':
        if args.route: data['route'] = args.route
        if args.max_open is not None: data['max_open'] = args.max_open
        if args.max_idle is not None: data['max_idle'] = args.max_idle
        if not (1 <= data['max_open'] <= 32 and 0 <= data['max_idle'] <= data['max_open']):
            raise RuntimeError('Lab limits: open 1..32; idle 0..open.')
        if data['route'] == 'pooled': sql('admin', 'SHOW VERSION;')
        save(data); app_env(data)
        compose('up', '-d', '--no-deps', '--force-recreate', 'app', capture=False)
        ready()
        print(f"route={data['route']} max_open={data['max_open']} max_idle={data['max_idle']}")

if __name__ == '__main__':
    try: main()
    except (RuntimeError, subprocess.CalledProcessError) as exc:
        print(str(exc), file=sys.stderr)
        if isinstance(exc, subprocess.CalledProcessError) and exc.stderr: print(exc.stderr, file=sys.stderr)
        sys.exit(1)
