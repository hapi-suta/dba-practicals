"""Failure-path regression: acknowledged writes must survive verification outages."""
import contextlib
import io
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import traffic

class EvidenceTests(unittest.TestCase):
    def exercise(self, failure):
        with tempfile.TemporaryDirectory() as tmp:
            runtime=Path(tmp)
            (runtime/'accounts.json').write_text(json.dumps({'users':[{'username':'user','id':'u'}], 'admin':{'username':'admin'},'channel_id':'c','team_id':'t'}))
            posts={}
            def login(user):
                if user['username']=='admin' and failure=='login':
                    raise RuntimeError('verification login unavailable')
                return {}, 'test-token'
            def api(method,path,body=None,token=None):
                if path=='/posts':
                    pid=str(len(posts)+1)
                    posts[pid]={'id':pid,'user_id':'u',**body}
                    return posts[pid],{},201
                if path.startswith('/posts/'):
                    return posts[path.rsplit('/',1)[-1]],{},200
                if path.endswith('/posts/search'):
                    if failure=='search':raise RuntimeError('search unavailable')
                    return {'order':list(posts)}, {},200
                return {},{},200
            args=SimpleNamespace(users=1,concurrency=1,name='test',seconds=0.15,seed=42,profile='steady')
            config={'route':'pooled','max_open':8,'max_idle':2}
            with patch.object(traffic,'RUNTIME',runtime),patch.object(traffic,'state',return_value=config),patch.object(traffic,'login',side_effect=login),patch.object(traffic,'api',side_effect=api),patch.object(traffic.signal,'signal'),contextlib.redirect_stdout(io.StringIO()):
                result=traffic.run(args)
            out=runtime/'runs/test'
            acknowledged=json.loads((out/'posts.json').read_text())
            report=json.loads((out/'summary.json').read_text())
            self.assertGreater(len(acknowledged),0)
            self.assertEqual(len(acknowledged),report['acknowledged_posts'])
            self.assertEqual(result,1 if failure else 0)
            self.assertEqual([x['stage'] for x in report['verification_errors']],[failure] if failure else [])
            if failure!='login':self.assertEqual(report['verified_posts'],len(acknowledged))
    def test_verification_login_failure_preserves_evidence(self):self.exercise('login')
    def test_search_failure_preserves_evidence(self):self.exercise('search')
    def test_success_still_verifies_messages(self):self.exercise(None)

if __name__=='__main__':unittest.main()
