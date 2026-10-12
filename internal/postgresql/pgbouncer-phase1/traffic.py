#!/usr/bin/env python3
"""Bounded Mattermost API traffic for this local lab only; no database writes."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import random
import re
import secrets
import signal
import threading
import time
import urllib.error
import urllib.request
import uuid
from lab import BASE, RUNTIME, state

def api(method, path, body=None, token=None, timeout=8):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(BASE + '/api/v4' + path, data=json.dumps(body).encode() if body is not None else None, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            payload = r.read()
            return json.loads(payload) if payload else {}, dict(r.headers), r.status
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try: error = json.loads(raw).get('id', 'http_error')
        except Exception: error = 'http_error'
        raise RuntimeError(f'HTTP {exc.code} {error}') from None

def login(user):
    data, headers, _ = api('POST', '/users/login', {'login_id': user['username'], 'password': user['password']})
    token = next(v for k, v in headers.items() if k.lower() == 'token')
    if user.get('id') and data['id'] != user['id']: raise RuntimeError('User identity mismatch')
    return data, token

def account_save(data):
    p = RUNTIME / 'accounts.json'
    p.write_text(json.dumps(data, indent=2) + '\n'); p.chmod(0o600)

def setup(count):
    state()
    p = RUNTIME / 'accounts.json'
    data = json.loads(p.read_text()) if p.exists() else {'admin': {'username': 'suta_lab_admin', 'password': secrets.token_hex(20)}, 'users': []}
    account_save(data)
    try: admin, token = login(data['admin'])
    except RuntimeError:
        if data['admin'].get('id'): raise
        api('POST', '/users', {**data['admin'], 'email': 'suta_lab_admin@example.invalid'})
        admin, token = login(data['admin'])
    data['admin']['id'] = admin['id']; account_save(data)
    if 'team_id' not in data:
        try: team = api('GET', '/teams/name/suta-pooling', token=token)[0]
        except RuntimeError as exc:
            if 'HTTP 404' not in str(exc): raise
            team = api('POST', '/teams', {'name': 'suta-pooling', 'display_name': 'SUTA Pooling Lab', 'type': 'O'}, token)[0]
        data['team_id'] = team['id']; account_save(data)
    tid = data['team_id']
    if 'channel_id' not in data:
        try: channel = api('GET', f'/teams/{tid}/channels/name/traffic-lab', token=token)[0]
        except RuntimeError as exc:
            if 'HTTP 404' not in str(exc): raise
            channel = api('POST', '/channels', {'team_id': tid, 'name': 'traffic-lab', 'display_name': 'Traffic Lab', 'type': 'O'}, token)[0]
        data['channel_id'] = channel['id']; account_save(data)
    for i in range(count):
        if len(data['users']) <= i:
            data['users'].append({'username': f'suta_user_{i+1:02d}', 'password': secrets.token_hex(20)})
            account_save(data)
        user = data['users'][i]
        if 'id' not in user:
            try: remote = api('GET', '/users/username/' + user['username'], token=token)[0]
            except RuntimeError as exc:
                if 'HTTP 404' not in str(exc): raise
                remote = api('POST', '/users', {**user, 'email': user['username'] + '@example.invalid'}, token)[0]
            user['id'] = remote['id']; account_save(data)
        for path, body in [(f'/teams/{tid}/members', {'team_id': tid, 'user_id': user['id']}),
                           (f'/channels/{data["channel_id"]}/members', {'user_id': user['id']})]:
            api('POST', path, body, token)
        login(user)
    print(json.dumps({'users_ready': count, 'team_id': tid, 'channel_id': data['channel_id'], 'credentials': 'private .runtime/accounts.json; never copy into evidence'}, indent=2))

def percentile(values, p):
    if not values: return None
    return round(sorted(values)[max(0, math.ceil(len(values)*p)-1)], 2)

def run(args):
    config = state()
    accounts = json.loads((RUNTIME / 'accounts.json').read_text())
    users = accounts['users'][:args.users]
    if len(users) != args.users: raise RuntimeError('Run setup for enough test users first.')
    out = RUNTIME / 'runs' / args.name
    out.mkdir(parents=True, exist_ok=False)
    # Authentication precedes timed workload; tokens are never written to reports.
    clients = [(u, login(u)[1]) for u in users]
    stop = threading.Event()
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    gate = threading.Semaphore(args.concurrency)
    lock = threading.Lock()
    events, posts = [], []
    start = time.monotonic()
    started_at = datetime.now(timezone.utc).isoformat()
    run_id = uuid.uuid4().hex[:12]
    deadline = start + args.seconds
    logfile = (out / 'requests.jsonl').open('x')

    def worker(index, user, token):
        rng = random.Random(args.seed + index)
        seq, root = 0, None
        while not stop.is_set() and time.monotonic() < deadline:
            if not gate.acquire(timeout=0.2): continue
            if stop.is_set() or time.monotonic() >= deadline:
                gate.release(); break
            seq += 1
            operation = 'read' if seq % 3 == 0 else ('reply' if seq % 5 == 0 and root else 'post')
            event = {'user': user['username'], 'operation': operation, 'offset_s': round(time.monotonic()-start, 3)}
            before = time.monotonic()
            try:
                if operation == 'read':
                    _, _, code = api('GET', f'/channels/{accounts["channel_id"]}/posts?per_page=20', token=token)
                else:
                    message = f'SUTA run{run_id} user{index+1} sequence{seq} lessonpooling'
                    body = {'channel_id': accounts['channel_id'], 'message': message}
                    if operation == 'reply': body['root_id'] = root
                    result, _, code = api('POST', '/posts', body, token)
                    if not root: root = result['id']
                    with lock: posts.append({'id': result['id'], 'user_id': user['id'], 'channel_id': accounts['channel_id'], 'message': message})
                    event['post_id'] = result['id']
                event.update(ok=True, status=code)
            except Exception as exc:
                # Do not blindly retry a POST whose outcome may be unknown.
                event.update(ok=False, error=str(exc), write_outcome='unknown' if operation != 'read' else None)
            finally:
                event['latency_ms'] = round((time.monotonic()-before)*1000, 2)
                with lock:
                    events.append(event); logfile.write(json.dumps(event)+'\n'); logfile.flush()
                gate.release()
            pace = {'quiet': 0.6, 'steady': 0.08, 'burst': 0.01 if args.seconds*0.3 < time.monotonic()-start < args.seconds*0.7 else 0.5}[args.profile]
            stop.wait(rng.uniform(pace, pace*1.5))

    with ThreadPoolExecutor(max_workers=args.users) as pool:
        futures = [pool.submit(worker, i, *c) for i,c in enumerate(clients)]
        for f in futures: f.result()
    elapsed = time.monotonic()-start
    logfile.close()
    # Persist acknowledged writes before verification makes further network calls.
    (out/'posts.json').write_text(json.dumps(posts,indent=2)+'\n')
    verified, mismatches, verification_errors = 0, [], []
    searchable = None
    try:
        _, admin_token = login(accounts['admin'])
    except Exception as exc:
        verification_errors.append({'stage': 'login', 'error': str(exc)})
    else:
        for post in posts:
            try:
                got = api('GET', '/posts/' + post['id'], token=admin_token)[0]
                if all(got.get(k) == v for k,v in post.items()): verified += 1
                else: mismatches.append({'id': post['id'], 'error': 'identity/content mismatch'})
            except Exception as exc: mismatches.append({'id': post['id'], 'error': str(exc)})
        try:
            search = api('POST', f'/teams/{accounts["team_id"]}/posts/search', {'terms': 'run'+run_id, 'is_or_search': False}, admin_token)[0]
            searchable = bool(search.get('order')) if posts else None
        except Exception as exc:
            verification_errors.append({'stage': 'search', 'error': str(exc)})
    good = [e for e in events if e['ok']]
    summary = {'name': args.name, 'run_id': run_id, 'started_at_utc': started_at, 'route': config['route'],
               'app_max_open': config['max_open'], 'app_max_idle': config['max_idle'],
               'profile': args.profile, 'users': args.users, 'concurrency': args.concurrency,
               'requested_seconds': args.seconds, 'actual_seconds': round(elapsed,3), 'interrupted': stop.is_set(),
               'requests': len(events), 'successes': len(good), 'failures': len(events)-len(good),
               'requests_per_second': round(len(events)/elapsed,2),
               'latency_ms': {'p50': percentile([e['latency_ms'] for e in good],.5), 'p95': percentile([e['latency_ms'] for e in good],.95), 'max': max([e['latency_ms'] for e in good], default=None)},
               'acknowledged_posts': len(posts), 'verified_posts': verified, 'verification_failures': mismatches, 'verification_errors': verification_errors, 'search_found_run': searchable,
               'errors': sorted(set(e['error'] for e in events if not e['ok']))}
    (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps(summary,indent=2))
    return 1 if summary['failures'] or mismatches or verification_errors or searchable is False else 0

def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('setup'); s.add_argument('--users', type=int, default=8)
    s = sub.add_parser('run'); s.add_argument('--name', required=True); s.add_argument('--users', type=int, default=8)
    s.add_argument('--concurrency', type=int, default=8); s.add_argument('--seconds', type=int, default=20)
    s.add_argument('--profile', choices=['quiet','steady','burst'], default='steady'); s.add_argument('--seed', type=int, default=42)
    args = p.parse_args()
    if not 1 <= args.users <= 50: p.error('users must be 1..50')
    if args.cmd == 'setup': setup(args.users); return 0
    if not 1 <= args.concurrency <= args.users or not 1 <= args.seconds <= 300: p.error('concurrency 1..users; seconds 1..300')
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}', args.name): p.error('Use a short alphanumeric run name.')
    return run(args)

if __name__ == '__main__':
    raise SystemExit(main())
