# Exercise 5 — find why requests wait

**The task:** observe a small pool, then occupy it with one long transaction.
**Why:** a waiting request needs a diagnosis, not an automatic increase in connections.
**Success:** identify the waiting clients and see them recover when the transaction ends.

**Before:** transaction mode is active, previous SQL sessions are closed, APP works.
This is an instructor-led drill on the isolated lab. It changes no message rows.

## 1. Use one backend for Mattermost

**Where to run:** POOLER server, Linux terminal as `ubuntu` (any folder).

```bash
sudo -u postgres vi /etc/pgbouncer/pgbouncer.ini
```

Change `default_pool_size = 4` to `default_pool_size = 1`. Keep transaction mode.

**Where to run:** POOLER server, Linux terminal as `ubuntu` (any folder).

```bash
sudo systemctl reload pgbouncer
```

**Where to run:** APP server, Linux terminal as `ubuntu` (any folder).

Restart its connections with `sudo python3 /opt/suta/pgbouncer-lab/app-route.py pooled`.
Previously opened backends can remain after reducing a pool limit.

**Where to run:** POOLER server, inside psql connected to `pgbouncer` as `pooladmin`, port `6432`.

Use `RECONNECT mattermost;` and inspect `SHOW POOLS;` before measuring.
Expect at most one active Mattermost backend during the controlled test.

**Where to run:** APP server, Linux terminal as `ubuntu` (any folder).

```bash
cd /opt/suta/pgbouncer-lab
python3 traffic.py run --name small-pool-01 --users 8 --concurrency 8 --seconds 20
```

A one-connection pool may still serve short transactions well. Record what actually
happens; do not invent an error if none occurs.

## 2. Occupy the one connection

**Where to run:** POOLER server, terminal A, Linux terminal as `ubuntu` (any folder).

```bash
sudo -iu postgres
psql -X -w -h 127.0.0.1 -p 6432 -U mmuser -d mattermost
```

**Where to run:** POOLER server, terminal A, inside psql connected to `mattermost` as `mmuser`, port `6432`.

```sql
SELECT current_database(), current_user;
```

Expect `mattermost` and `mmuser`. Stop if different.

**Where to run:** APP server, Linux terminal as `ubuntu`, in `/opt/suta/pgbouncer-lab`.

```bash
python3 traffic.py run --name long-transaction-01 --users 8 --concurrency 8 --seconds 20
```

Wait about five seconds so the users have signed in and the timed workload has
started. Then, **in POOLER A psql**, execute this single block:

**Where to run:** POOLER server, terminal A, inside psql connected to `mattermost` as `mmuser`, port `6432`.

```sql
BEGIN;
SELECT pg_sleep(6);
COMMIT;
```

`pg_sleep(6)` deliberately waits six seconds while holding this backend. This is a
controlled demonstration, not a tuning command. COMMIT releases the connection.
If interrupted, enter `ROLLBACK;` before leaving the session.

**Where to run:** POOLER server, inside psql connected to `pgbouncer` as `pooladmin`, port `6432`. Use a second POOLER terminal.

During those six seconds, run `SHOW POOLS;`. Expect waiting Mattermost clients. On DB, inspect:

**Where to run:** DB server, inside psql connected to `mattermost` as `postgres`, port `5432`.

```sql
SELECT pid, state, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE usename = 'mmuser';
```

Run that query inside DB's `sudo -iu postgres` → `psql -X -d mattermost` session.
You should be able to identify the deliberate sleep. Save observations before and
after it completes. Traffic response times should show the delay; failures, if any,
must be reported rather than discarded.

## 3. Restore the working size

Leave A with `\q` and `exit`. On POOLER, as `ubuntu`:

**Where to run:** POOLER server, Linux terminal as `ubuntu` (any folder).

```bash
sudo -u postgres vi /etc/pgbouncer/pgbouncer.ini
```

Change `default_pool_size` back to `4`, save, then:

**Where to run:** POOLER server, Linux terminal as `ubuntu` (any folder).

```bash
sudo systemctl reload pgbouncer
```

**Where to run:** POOLER server, inside psql connected to `pgbouncer` as `pooladmin`, port `6432`.

Run `SHOW CONFIG;` and confirm the value is `4`.
On APP, in `/opt/suta/pgbouncer-lab`:

**Where to run:** APP server, Linux terminal as `ubuntu`, in `/opt/suta/pgbouncer-lab`.

```bash
python3 traffic.py run --name recovery-01 --users 8 --concurrency 8 --seconds 20
```

Expect successful requests and matching message verification counts. Leave no
transaction open.

**Show:** the waiting snapshot, blocking query, delayed report and recovery report.
**Discuss:** What caused the delay? Why is adding connections different from fixing
a long transaction or a lock?
