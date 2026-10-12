# If your result differs

Stop at the first unexpected result. Save the command and complete error.

| Symptom | Where to run | First check | Safe next step |
|---|---|---|---|
| Wrong hostname | Assigned server; Linux shell as `ubuntu` | `hostname` | Reconnect using your private sheet; do not continue |
| Nonempty initial config | POOLER; Linux shell as `ubuntu` | `sudo wc -c /etc/pgbouncer/pgbouncer.ini` | Resume with instructor; never erase previous work |
| PgBouncer not active | POOLER; Linux shell as `ubuntu` | `sudo journalctl -u pgbouncer -n 30` on POOLER | Correct the named setting/path, then retry start |
| Password rejected | POOLER; Linux shell as `postgres`, using the failed psql login command | Host, port, database and login role | Use prepared private password file; do not disable auth |
| Query waits | POOLER admin psql (`pgbouncer`, `pooladmin`, 6432); then DB psql (`mattermost`, `postgres`, 5432) | `SHOW POOLS;`, then DB activity | Find the client/transaction holding a backend |
| `query_wait_timeout` | POOLER; the affected A/B psql sessions | The demo's 15-second wait limit | Close demo sessions; repeat the read-only steps in order |
| `bind message supplies ... parameters` after changing mode | APP; instructor in Linux shell as `ubuntu`, using sudo for protected configuration | Corrected Mattermost helper and `binary_parameters=yes` | Instructor restores the tested connection option and restarts; keep the failure log |
| API unavailable | APP; Linux shell as `ubuntu` | `systemctl is-active mattermost` on APP | Instructor checks `sudo journalctl -u mattermost -n 30` |
| Traffic run directory exists | APP; Linux shell as `ubuntu`, `/opt/suta/pgbouncer-lab` | List `.runtime/runs` on APP | Read old report; choose a new name, never overwrite |
| Traffic returns nonzero | APP; Linux shell as `ubuntu`, `/opt/suta/pgbouncer-lab` | Read that run's `summary.json` and `requests.jsonl` | Preserve failures; resolve the cause before repeating |
| Nonempty `verification_errors` | APP; Linux shell as `ubuntu`, `/opt/suta/pgbouncer-lab` | The failed login/search stage in `summary.json` | Restore API access; preserve `posts.json` and rerun `verify-messages.py` before a new named workload |
| Search/readback mismatch | APP; Linux shell as `ubuntu`, `/opt/suta/pgbouncer-lab` | Recorded post IDs and request errors | Keep the report; do not claim successful message preservation |
| Interrupted SQL transaction | POOLER; the same A/B psql connection that started the transaction | In that same psql session | `ROLLBACK;`, then `\q`; inspect pool again |

**Reconnect:** check hostname, return to `/opt/suta/pgbouncer-lab` on APP,
and inspect the latest report. Reopen SQL using the explicit role/database/port
from your exercise. A reconnect is not permission to replay account setup.

**Privacy:** do not paste `config.json`, `.pgpass`, `userlist.txt`, account credentials
or raw sensitive logs into public issue trackers. Ask the instructor to sanitize them.
