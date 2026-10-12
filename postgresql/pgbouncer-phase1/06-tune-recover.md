# Exercise 6 — compare, diagnose and recover

**The task:** change one limit at a time and recover from a rejected login.
**Why:** a DBA must distinguish application pooling, PgBouncer pooling and authentication.
**Success:** a measured comparison and a working application at the end.

**Before:** Exercise 5 is complete. PgBouncer uses transaction mode and a pool of 4.
No deliberate sleep or open transaction remains.

## 1. Change only the application pool

**Where:** APP, Linux as `ubuntu`, in `/opt/suta/pgbouncer-lab`.

```bash
sudo python3 app-route.py pooled --open 2 --idle 1
python3 traffic.py run --name app-two-01 --users 8 --concurrency 8 --seconds 20
```

Mattermost now allows at most two open connections in its database pool. PgBouncer's
pool is unchanged. Watch DB connections and PgBouncer clients as before.

Restore the application values and repeat:

```bash
sudo python3 app-route.py pooled --open 8 --idle 2
python3 traffic.py run --name app-eight-01 --users 8 --concurrency 8 --seconds 20
```

Compare failures, throughput and p95. Repeat with new names if background activity
makes the result unclear. This small lab is not a production capacity benchmark.

## 2. Try burst traffic

```bash
python3 traffic.py run --name burst-01 --users 8 --concurrency 8 --seconds 20 --profile burst
```

This changes pauses between actions to create a busy middle period. Watch waiting
and connections. The script is a bounded, closed-loop workload: slower responses
reduce its achieved request rate. It does not simulate unlimited arriving traffic.

## 3. Diagnose a wrong password without changing any account

**Where:** POOLER, Linux as `ubuntu`.

```bash
sudo -iu postgres
PGPASSWORD=deliberately-wrong-lab-password psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab -c 'SELECT 1;'
```

Expect a password-authentication failure. The supplied value is deliberately fake.
It overrides the password file for this one command; it changes no saved password.
Inspect the error: this is a login failure, not a waiting-pool problem.

Retry with the correct prepared password file:

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab -c 'SELECT name FROM lab_identity;'
```

Expect `suta-pgbouncer-phase1`. Do not change `auth_type` to `trust`.
Type `exit` to return to `ubuntu`.

## 4. Practise the direct rollback route

**Where:** APP, Linux as `ubuntu`, in `/opt/suta/pgbouncer-lab`.

```bash
sudo python3 app-route.py direct
python3 traffic.py run --name rollback-01 --users 8 --concurrency 8 --seconds 20
```

This sends the app directly to PostgreSQL again. It is a connection-route rollback,
not a database restore. Check the DB source address and a passing traffic report.

Return to the final working pooled route:

```bash
sudo python3 app-route.py pooled
python3 traffic.py run --name final-01 --users 8 --concurrency 8 --seconds 20
```

## 5. Present your evidence

| Run | Route/mode | App open/idle | PgBouncer pool | Requests | Failures | p95 | Verified messages |
|---|---|---|---|---|---|---|---|
| Direct baseline | | | | | | | |
| Session | | | | | | | |
| Transaction | | | | | | | |
| Long transaction | | | | | | | |
| Final recovery | | | | | | | |

Use your actual reports. Do not copy the instructor's performance numbers.
On APP, still in `/opt/suta/pgbouncer-lab`, verify every earlier acknowledged
message by ID, author, channel and content:

```bash
python3 verify-messages.py
```

Expect a positive `verified_messages` count and an empty `failures` list. Keep all
`posts.json` files: the verifier uses them as its original evidence.

**Discuss:** Which layer limited your workload? What evidence supports that answer?
What would you check before raising a production pool limit?

**Leave:** working pooled route, transaction mode, PgBouncer pool 4, app open 8/idle 2.
Keep reports and all messages. Finish terminal recordings. Shut down only when the
instructor confirms the exact lab instances; do not delete servers or data.
