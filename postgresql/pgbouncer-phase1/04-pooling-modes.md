# Exercise 4: See when a connection is shared

**Goal:** see the difference between session pooling and transaction pooling.
**Before:** finish Exercise 3. Stop any traffic runs. PgBouncer should still use
`pool_mode = session`. Do not change another student's server.

We use `pool_lab`, a practice database limited to **one PostgreSQL connection**.
Two clients will try to use that one connection. No message rows are changed.

> **Do this with your teacher.** A waiting query times out after 15 seconds.
> Read each short experiment before starting it. The teacher watches tab C while
> you use tabs A and B. You do not need to race between three screens.

## Step 1: Open three POOLER tabs

From your computer, use your private sheet to open **three SSH connections to
`suta-pgb-pooler`**. Label them A, B and C. These all connect to the same server.
Start each tab at the Linux prompt as `ubuntu`.

**On POOLER (`suta-pgb-pooler`), each tab — Linux, as `ubuntu`:**

```bash
hostname
whoami
```

**Expected:** `suta-pgb-pooler` and `ubuntu` in all three tabs. Stop if different.

## Step 2: Prepare the teacher’s monitor in C

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

**Expected:** `pool_mode` is `session`. If not, ask the teacher where to resume.
Press **q** if a results page shows `(END)`.

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```sql
SHOW POOLS;
```

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```psql
\watch 1
```

Leave C refreshing. The teacher looks at the `pool_lab` row.

## Step 3: Let A take the one connection

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo -iu postgres
```

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `postgres`:**

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab
```

**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
SELECT name FROM lab_identity;
```

**Expected:** `suta-pgbouncer-phase1`. Stop if different.

**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
SELECT pg_backend_pid();
```

**Expected:** a number. Write it down. It identifies the PostgreSQL process
serving this client. **Leave A connected.**

## Step 4: Make B wait, then disconnect A

**On POOLER (`suta-pgb-pooler`), tab B — Linux, as `ubuntu`:**

```bash
sudo -iu postgres
```

**On POOLER (`suta-pgb-pooler`), tab B — Linux, as `postgres`:**

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab
```

Read these three actions first:

1. Run the query below in B. It should wait instead of returning a number.
2. The teacher checks C: `cl_waiting` should show `1` for `pool_lab`.
3. Immediately switch to A and type `\q` as shown below, before 15 seconds pass.

**On POOLER (`suta-pgb-pooler`), tab B — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
SELECT pg_backend_pid();
```

**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```psql
\q
```

**Expected:** B returns the number you recorded in A.
A had to disconnect before B could use its PostgreSQL connection.
That is **session pooling**.

If B timed out first, use the recovery box at the bottom. A timeout is not proof
that the connection was shared.

## Step 5: Close B and return both tabs to ubuntu

**On POOLER (`suta-pgb-pooler`), tab B — psql, `pool_lab`, user `labuser`, port `6432`:**

```psql
\q
```

**On POOLER (`suta-pgb-pooler`), tabs A and B — Linux, as `postgres`:**

```bash
exit
```

**Expected:** both A and B now show a Linux prompt as `ubuntu`.

## Step 6: Change to transaction pooling

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo -u postgres vi /etc/pgbouncer/pgbouncer.ini
```

Find `pool_mode = session`. Press **i** and change only that line to
`pool_mode = transaction`. Press **Esc**, type `:wq`, then press **Enter**.

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo systemctl reload pgbouncer
```

In C, press **Ctrl+C** to stop the monitor.

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```sql
SHOW CONFIG;
```

**Expected:** `pool_mode` is `transaction`. Stop if it is not.

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```sql
SHOW POOLS;
```

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```psql
\watch 1
```

## Step 7: Open fresh connections in A and B

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo -iu postgres
```

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `postgres`:**

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab
```

**On POOLER (`suta-pgb-pooler`), tab B — Linux, as `ubuntu`:**

```bash
sudo -iu postgres
```

**On POOLER (`suta-pgb-pooler`), tab B — Linux, as `postgres`:**

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab
```

**Expected:** A and B show `pool_lab=>`. C is still watching pools.

## Step 8: Hold the connection until COMMIT

**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
BEGIN;
```

**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
SELECT pg_backend_pid();
```

Record the number from A. `BEGIN` starts a transaction and keeps this connection
assigned to A until the transaction ends.

Read the next actions first: run B's query, let the teacher observe waiting in C,
then immediately run `COMMIT;` in A. Do not wait for B to finish before committing.

**On POOLER (`suta-pgb-pooler`), tab B — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
SELECT pg_backend_pid();
```

**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
COMMIT;
```

**Expected:** B returns A's number. **A is still connected to PgBouncer.**
Ending the transaction was enough to release the PostgreSQL connection.
That is **transaction pooling**.

## Step 9: Try ROLLBACK too

Repeat the same short sequence. `ROLLBACK` ends the transaction without saving
changes. This read-only demonstration has no changes to discard.

**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
BEGIN;
```

**On POOLER (`suta-pgb-pooler`), tab B — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
SELECT pg_backend_pid();
```

**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
ROLLBACK;
```

**Expected:** B waits until A rolls back, then returns a number.

## Step 10: Close the practice sessions

**On POOLER (`suta-pgb-pooler`), tabs A and B — `pool_lab` psql:**

```psql
\q
```

**On POOLER (`suta-pgb-pooler`), tabs A and B — Linux, as `postgres`:**

```bash
exit
```

In C, press **Ctrl+C**.

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```psql
\q
```

**On POOLER (`suta-pgb-pooler`), tab C — Linux, as `postgres`:**

```bash
exit
```

All three tabs should now be at Linux prompts as `ubuntu`.

## Step 11: Check Mattermost in transaction mode

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`:**

```bash
cd /opt/suta/pgbouncer-lab
```

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
sudo python3 app-route.py pooled
```

**Expected:** `Mattermost ready`. This gives the app fresh connections.

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name transaction-01 --users 8 --concurrency 8 --seconds 20
```

**Expected:** zero failures, matching positive message counts, successful search,
and empty `verification_failures` and `verification_errors`. Use a new name for a repeat.
If a check fails, stop and keep the report.

## Checkpoint

| Mode | What A did to let B run |
|---|---|
| Session | Disconnected with `\q` |
| Transaction | Ended the transaction with `COMMIT` or `ROLLBACK` |

- [ ] I recorded the shared process numbers and waiting observation.
- [ ] Mattermost passed its transaction-mode traffic test.
- [ ] No practice transaction remains open.

**Discuss:** can B use the connection while A's transaction is still open?
Why can A stay connected after COMMIT in transaction mode?

<details>
<summary>If the 15-second timeout interrupts the demonstration</summary>

Stop the experiment. In A's existing psql session, enter `ROLLBACK;` if a transaction
is open, then `\q`. In B, use `\q` if it is still inside psql. In each tab, use
`whoami` at the Linux prompt; if it says `postgres`, type `exit` once to return to
`ubuntu`. Do not run `exit` repeatedly or erase configuration.

With the teacher, reopen A/B using the full login blocks above. Repeat only the
experiment for the current pooling mode. C can remain watching throughout.

</details>

This checks the selected lab workflows, not every plugin or future app upgrade.
**Next, with the teacher:** [Exercise 5 — waiting](05-waiting.md).
