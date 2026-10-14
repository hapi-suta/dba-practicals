# Exercise 3: Send messages through PgBouncer

**Goal:** change the connection path to **APP → POOLER → DB** and prove it works.
**Before:** Exercise 2 passed. Keep your earlier reports and messages.

## Step 1: Point Mattermost at PgBouncer

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`:**

```bash
cd /opt/suta/pgbouncer-lab
```

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
sudo python3 app-route.py pooled
```

The prepared script changes the database address from `pg-db:5432` to
`pg-pooler:6432` and restarts Mattermost. It does not delete messages.

**Expected:** `Mattermost ready` with route `pooled`.
If it fails, stop and show the teacher the error.

<details>
<summary>Extra: what does the script configure?</summary>

It keeps the password private, sets Mattermost's pool to 8 open/2 idle connections,
and waits for the app to start. It also keeps the tested `binary_parameters=yes`
connection option, needed by this Mattermost/PgBouncer combination.

</details>

## Step 2: Open the pool monitor

**On POOLER (`suta-pgb-pooler`) — Linux terminal, as `ubuntu`:**

```bash
sudo -iu postgres
```

**On POOLER (`suta-pgb-pooler`) — Linux terminal, as `postgres`:**

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U pooladmin -d pgbouncer
```

**Expected:** `pgbouncer=#`. You are in the admin console on port `6432`.

**On POOLER (`suta-pgb-pooler`) — admin psql, user `pooladmin`, database `pgbouncer`, port `6432`:**

```sql
SHOW POOLS;
```

Look for the `mattermost` row. Ignore the `pgbouncer` admin row.

| Column | What it tells you |
|---|---|
| `cl_active` | Clients linked to a server, or idle with no query waiting |
| `cl_waiting` | Clients waiting for a server connection |
| `sv_active` | PostgreSQL connections assigned to clients |
| `sv_idle` | PostgreSQL connections available for reuse |

An assigned connection does not necessarily mean a query is running.

**On POOLER (`suta-pgb-pooler`) — same admin psql session:**

```psql
\watch 1
```

Leave this display running. Switch to APP to send messages.

## Step 3: Send another batch of messages

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name session-01 --users 8 --concurrency 8 --seconds 20
```

Watch POOLER while the run is active. Save a screenshot of the `mattermost` pool.
Then wait for the APP command to finish.

**On APP (`suta-pgb-app`) — same Linux terminal and folder:**

```bash
cat .runtime/runs/session-01/summary.json
```

**Expected:** `failures: 0`, equal positive `acknowledged_posts` and `verified_posts`,
`search_found_run: true`, and empty `verification_failures` and `verification_errors`.
If you repeat the run, use `session-02` in both commands. Keep failed reports too.

## Step 4: Prove the database sees POOLER

**On DB (`suta-pgb-db`) — Linux terminal, as `ubuntu`:**

```bash
sudo -iu postgres
```

**On DB (`suta-pgb-db`) — Linux terminal, as `postgres`:**

```bash
psql -X -d mattermost
```

**On DB (`suta-pgb-db`) — psql, database `mattermost`, user `postgres`, port `5432`:**

```sql
SELECT application_name, client_addr, state, count(*)
FROM pg_stat_activity
WHERE usename = 'mmuser'
GROUP BY application_name, client_addr, state;
```

**Expected:** `client_addr` is now POOLER's private IP from your connection sheet.
Previously it was APP's private IP. That change proves the new route.
If it is still APP's address, stop and ask the teacher to check the route.

## Step 5: Close the monitors

On POOLER, press **Ctrl+C** to stop watching first.

**On POOLER (`suta-pgb-pooler`) and DB (`suta-pgb-db`) — each open psql session:**

```psql
\q
```

**On POOLER (`suta-pgb-pooler`) and DB (`suta-pgb-db`) — Linux terminal, as `postgres`:**

```bash
exit
```

Both tabs should now be at a Linux prompt as `ubuntu`.

## Checkpoint — pause here

- [ ] Messages still pass all checks after changing the route.
- [ ] I can show the `mattermost` pool in PgBouncer.
- [ ] PostgreSQL sees connections from POOLER's private IP.

**Discuss:** what changed between Exercises 1 and 3? Where are messages still stored?

**Stop here for the first lesson.** Show your teacher the results.
When ready, continue to [Exercise 4 — connection reuse](04-pooling-modes.md).
