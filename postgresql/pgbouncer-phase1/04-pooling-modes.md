# Exercise 4 — see exactly when a connection is released

**The task:** make two clients share a pool with only one server connection.
**Why:** this makes the difference between session and transaction pooling visible.
**Success:** client B waits, then runs when client A releases the backend.

**Before:** finish Exercise 3. Stop traffic runs. Use only `pool_lab`; it contains
one read-only identity row. Open **three POOLER SSH terminals**, labelled A, B and C.
Confirm `hostname` on each. A and B run the demo; C is the admin console.

Prepare C first so you can observe the short wait without rushing. On POOLER C:

**Where to run:** POOLER server, terminal C, Linux terminal as `ubuntu` (any folder).

```bash
sudo -iu postgres
psql -X -w -h 127.0.0.1 -p 6432 -U pooladmin -d pgbouncer
```

Keep this admin console open.

## 1. Session pooling: the client must disconnect

**Where to run:** POOLER server, terminal A, Linux terminal as `ubuntu` (any folder).

```bash
sudo -iu postgres
psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab
```

**Where to run:** POOLER server, terminal A, inside psql connected to `pool_lab` as `labuser`, port `6432`.

```sql
SELECT name FROM lab_identity;
SELECT pg_backend_pid();
```

Expect the known identity and a number. Record that number: it identifies the
PostgreSQL process serving this connection. Keep A connected and idle.

In POOLER B, run the same login command, then:

**Where to run:** POOLER server, terminal B, inside psql connected to `pool_lab` as `labuser`, port `6432`.

```sql
SELECT pg_backend_pid();
```

B should wait because A still owns the only backend. Within 15 seconds, use
the already-open admin console in POOLER C and run:

**Where to run:** POOLER server, terminal C, inside psql connected to `pgbouncer` as `pooladmin`, port `6432`.

```sql
SHOW POOLS;
```

Expect `cl_waiting = 1` for `pool_lab`. **Now type `\q` in A.** B should return
A's backend number. If B reaches the 15-second timeout first, save the error,
disconnect A and B, and repeat this read-only experiment more promptly.

Leave B with `\q`. Keep admin terminal C open.

## 2. Change to transaction pooling

**Where to run:** POOLER server, Linux terminal as `ubuntu` (any folder).

```bash
sudo -u postgres vi /etc/pgbouncer/pgbouncer.ini
```

Change only `pool_mode = session` to `pool_mode = transaction`. Save with Esc, `:wq`.

**Where to run:** POOLER server, Linux terminal as `ubuntu` (any folder).

```bash
sudo systemctl reload pgbouncer
```

**Where to run:** POOLER server, terminal C, inside psql connected to `pgbouncer` as `pooladmin`, port `6432`.

Run `SHOW CONFIG;` and confirm `pool_mode` is `transaction`.
A reload reads your file; checking the effective value proves it took effect.
Use fresh A/B logins for the next experiment.

## 3. An open transaction still holds the connection

In POOLER terminal A, start from the Linux shell as `ubuntu` and repeat Step 1's
login block: `sudo -iu postgres`, then the `psql` command for `labuser` and `pool_lab`.

**Where to run:** POOLER server, terminal A, inside psql connected to `pool_lab` as `labuser`, port `6432`.

```sql
BEGIN;
SELECT pg_backend_pid();
```

Record the PID. Reconnect B and run `SELECT pg_backend_pid();` there.
B waits. In C run `SHOW POOLS;` to see it.

**Where to run:** POOLER server, terminal A, inside psql connected to `pool_lab` as `labuser`, port `6432`.

```sql
COMMIT;
```

B now completes with A's PID, even though A remains connected to PgBouncer.
This is transaction pooling: the backend is reusable when the transaction ends.

For the repeat, stay inside the `pool_lab` psql sessions: enter `BEGIN` in
POOLER A, a query in POOLER B, and `ROLLBACK` in POOLER A. B must run after rollback too.
Close A and B with `\q`. Leave no open transaction.

## 4. Check the actual application in transaction mode

**Where to run:** APP server, Linux terminal as `ubuntu` (any folder).

```bash
cd /opt/suta/pgbouncer-lab
sudo python3 app-route.py pooled
python3 traffic.py run --name transaction-01 --users 8 --concurrency 8 --seconds 20
```

The helper restarts the application so its connections are fresh. Expect the same
functional checks to pass. This tests our selected workflows and versions; it does
not prove every plugin or future migration is compatible with transaction pooling.

**Show:** PIDs and pool snapshots before and after disconnect/commit/rollback.
**Discuss:** Does transaction pooling release a backend in the middle of a transaction?
Why must an application avoid relying on untracked session state between transactions?
