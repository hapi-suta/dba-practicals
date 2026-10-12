#!/usr/bin/env python3
"""Read-only verification of all acknowledged messages from this lab's traffic runs."""
import json
from traffic import api,login
from lab import RUNTIME,state
state()
a=json.loads((RUNTIME/'accounts.json').read_text());_,token=login(a['admin'])
verified=0;failures=[]
for f in sorted((RUNTIME/'runs').glob('*/posts.json')):
 for post in json.loads(f.read_text()):
  try:
   got=api('GET','/posts/'+post['id'],token=token)[0]
   if not all(got.get(k)==v for k,v in post.items()):raise RuntimeError('ID, author, channel or message mismatch')
   verified+=1
  except Exception as exc:failures.append({'run':f.parent.name,'id':post['id'],'error':str(exc)})
print(json.dumps({'verified_messages':verified,'failures':failures},indent=2))
raise SystemExit(1 if failures else 0)
