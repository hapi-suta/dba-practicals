# Exercise 5: Find why requests wait

**Goal:** see requests wait while one long transaction uses the available connection.
Then restore normal access. We do not change any message rows.

**Before:** finish Exercise 4. Transaction pooling is active, the pool size is 4,
and the practice sessions are closed.

> **Teacher-led exercise.** Prepare the monitors before starting traffic.
> The teacher runs the six-second hold in POOLER A. The student watches C.
> This is a later lesson, not part of the first setup session.

## Step 1: Prepare the tabs

Keep APP open. Open two fresh SSH tabs to POOLER, labelled **A** and **C**, and
one to DB. Use your private sheet. Start each at the Linux prompt as `ubuntu`.
Check `hostname` and `whoami` before continuing.

| Tab | Hostname | Purpose |
|---|---|---|
| APP | `suta-pgb-app` | Send messages |
| A | `suta-pgb-pooler` | Run the teacher's long transaction |
| C | `suta-pgb-pooler` | Watch waiting clients |
| DB | `suta-pgb-db` | Watch the database query |

Stop if a hostname differs. Use only your assigned lab servers.

## Step 2: Reduce the Mattermost pool to one connection

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo -u postgres vi /etc/pgbouncer/pgbouncer.ini
```

Find `default_pool_size = 4`. Press **i**, change `4` to `1`, then press
**Esc**, type `:wq`, and press **Enter**. Keep `pool_mode = transaction`.

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo systemctl reload pgbouncer
```

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`:**

```bash
cd /opt/suta/pgbouncer-lab
```

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
sudo python3 app-route.py pooled
```

**Expected:** `Mattermost ready`. This restarts the app connections.

## Step 3: Prepare the pool monitor

**On POOLER (`suta-pgb-pooler`), tab C — Linux, as `ubuntu`:**

```bash
sudo -iu postgres
```

**On POOLER (`suta-pgb-pooler`), tab C — Linux, as `postgres`:**

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U pooladmin -d pgbouncer
```

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```sql
SHOW CONFIG;
```

**Expected:** `default_pool_size` is `1` and `pool_mode` is `transaction`.
If not, stop and check the edited file. Press **q** if a results page shows `(END)`.

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```sql
RECONNECT mattermost;
```

This retires old database connections, which may remain after lowering the limit.

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```sql
SHOW POOLS;
```

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```psql
\watch 1
```

Leave C refreshing. Watch the `mattermost` row; the controlled run should use
at most one active backend (`sv_active`). If more remain, ask the teacher before continuing.

## Step 4: Test the small pool before adding a delay

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name small-pool-01 --users 8 --concurrency 8 --seconds 20
```

Wait for it to finish. Record failures and message checks from the report.
One connection may handle short transactions successfully. Do not invent a failure
if there is none. Stop on unexpected errors; keep the report.

## Step 5: Prepare the database activity display

**On DB (`suta-pgb-db`) — Linux, as `ubuntu`:**

```bash
sudo -iu postgres
```

**On DB (`suta-pgb-db`) — Linux, as `postgres`:**

```bash
psql -X -d mattermost
```

**On DB (`suta-pgb-db`) — psql, `mattermost`, user `postgres`, port `5432`:**

```sql
SELECT pid, state, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE usename = 'mmuser';
```

**On DB (`suta-pgb-db`) — psql, `mattermost`, user `postgres`, port `5432`:**

```psql
\watch 1
```

Leave DB refreshing. The teacher will look for `pg_sleep(6)` during the hold.

## Step 6: Prepare the teacher’s connection

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo -iu postgres
```

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `postgres`:**

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U mmuser -d mattermost
```

**On POOLER (`suta-pgb-pooler`), tab A — psql, `mattermost`, user `mmuser`, port `6432`:**

```sql
SELECT current_database(), current_user;
```

**Expected:** `mattermost` and `mmuser`. Stop if different. Do not begin the hold yet.

## Step 7: Send traffic, then hold the connection

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name long-transaction-01 --users 8 --concurrency 8 --seconds 20
```

Start this APP command first. After about five seconds, the teacher runs the whole
block below in A. It must overlap the running traffic. Copy all three lines
together so the transaction commits immediately after the sleep.

**On POOLER (`suta-pgb-pooler`), tab A — psql, `mattermost`, user `mmuser`, port `6432`:**

```sql
BEGIN;
SELECT pg_sleep(6);
COMMIT;
```

**During the six seconds:**

- In C, look for `cl_waiting` greater than zero on the `mattermost` row.
- On DB, look for the deliberate `pg_sleep(6)` query.
- After COMMIT, waiting should clear and traffic should continue.

Save screenshots. If the short window is missed, it is not a pass: prepare both
monitors again and repeat with a new traffic run name. Do not extend the sleep or
change timeout settings. If interrupted in A, enter `ROLLBACK;` in that same psql
session before leaving it.

## Step 8: Restore four connections

**On POOLER (`suta-pgb-pooler`), tab A — psql, `mattermost`, user `mmuser`, port `6432`:**

```psql
\q
```

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `postgres`:**

```bash
exit
```

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo -u postgres vi /etc/pgbouncer/pgbouncer.ini
```

Change `default_pool_size = 1` back to `default_pool_size = 4`.
Save with **Esc**, `:wq`, **Enter**.

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo systemctl reload pgbouncer
```

In C, press **Ctrl+C**.

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```sql
SHOW CONFIG;
```

**Expected:** `default_pool_size` is `4`. Stop if it is not.

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name recovery-01 --users 8 --concurrency 8 --seconds 20
```

**Expected:** zero failures, matching positive message counts, successful search,
and empty `verification_failures` and `verification_errors`.
Keep both the delayed report and the recovery report. Do not discard failures.

## Step 9: Close the monitors

On DB, press **Ctrl+C** first. C has already stopped watching.

**On POOLER C (`suta-pgb-pooler`) and DB (`suta-pgb-db`) — each psql session:**

```psql
\q
```

**On POOLER C (`suta-pgb-pooler`) and DB (`suta-pgb-db`) — Linux, as `postgres`:**

```bash
exit
```

## Checkpoint

- [ ] I saw waiting clients and the sleep query during the same hold.
- [ ] I kept the delayed report, including any errors.
- [ ] Pool size is back to 4 and the recovery report passes.
- [ ] No transaction or monitor remains open.

**Discuss:** what held the connection? Why would increasing a connection limit
not fix the underlying long-running transaction?

**Next:** [Exercise 6 — tune and recover](06-tune-recover.md).
