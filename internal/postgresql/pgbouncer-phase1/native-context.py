"""Installed as lab.py alongside traffic.py on the native application lab node."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
RUNTIME=ROOT/'.runtime'
BASE='http://127.0.0.1:8065'
def state():
 d=json.loads((RUNTIME/'state.json').read_text())
 if d.get('project')!='suta-pgbouncer-phase1' or d.get('base_url')!=BASE:
  raise RuntimeError('Wrong lab identity. Stop.')
 return d
