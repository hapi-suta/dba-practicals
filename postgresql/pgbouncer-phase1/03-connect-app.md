# Exercise 3: Send messages through PgBouncer

## What you will achieve

Change Mattermost to use **APP → POOLER → DB**.
You will prove the new path with a passing message report, PgBouncer pool details,
and database connections arriving from POOLER.
**Before:** Exercise 2 passed. Keep your earlier reports and messages.

## Step 1: Point Mattermost at PgBouncer

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`:**

```bash
cd /opt/suta/pgbouncer-lab
```

**What this means:**

- `cd` means change directory (folder).
- `/opt/suta/pgbouncer-lab` is the folder containing the lab scripts. This command only moves you into that folder.


**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
sudo python3 app-route.py pooled
```

**What this means:**

- `sudo` gives permission to update Mattermost’s protected configuration.
- `python3` runs the prepared `app-route.py` helper.
- `pooled` selects APP → POOLER → DB.
- The helper restarts Mattermost and checks that it responds. Database passwords stay private; it does not delete messages.


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

**What this means:**

- `sudo` lets you run as another Linux user.
- `-i` starts that user’s login environment, including their home folder.
- `-u postgres` selects the Linux user `postgres`. Here `-i` and `-u` are written together as `-iu`.
- After this command, you are in a new Linux shell as `postgres`. You have not opened a database yet.


**On POOLER (`suta-pgb-pooler`) — Linux terminal, as `postgres`:**

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U pooladmin -d pgbouncer
```

**What this means:**

- `psql` opens the PostgreSQL command tool. It also connects to the PgBouncer admin console.
- `-X` ignores personal psql startup settings.
- `-w` never prompts for a password; the prepared password file supplies it for normal lab logins.
- `-h 127.0.0.1` selects the server address. `127.0.0.1` means this POOLER server.
- `-p 6432` selects the port.
- `-U pooladmin` selects the database login role.
- `-d pgbouncer` selects the database.


**Expected:** `pgbouncer=#`. You are in the admin console on port `6432`.

**On POOLER (`suta-pgb-pooler`) — admin psql, user `pooladmin`, database `pgbouncer`, port `6432`:**

```sql
SHOW POOLS;
```

**What this means:**

- `SHOW POOLS` lists PgBouncer’s connection pools. Each pool belongs to a database/user pair. Look at the row named in this step.


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

**What this means:**

- `\watch` repeats the last query in this psql session.
- `1` means repeat once every second. Press **Ctrl+C** to stop repeating and return to psql.


Leave this display running. Switch to APP to send messages.

## Step 3: Send another batch of messages

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name session-01 --users 8 --concurrency 8 --seconds 20
```

**What this means:**

- `python3` runs a Python program. `traffic.py` is the prepared message generator.
- `run` starts a workload using the existing test accounts.
- `--name session-01` names the saved report folder. Choose a new name for every repeat.
- `--users 8` logs in eight test users.
- `--concurrency 8` allows at most eight requests to be in progress together.
- `--seconds 20` starts requests for 20 seconds, then finishes pending work and verifies messages.


Watch POOLER while the run is active. Save a screenshot of the `mattermost` pool.
Then wait for the APP command to finish.

**On APP (`suta-pgb-app`) — same Linux terminal and folder:**

```bash
cat .runtime/runs/session-01/summary.json
```

**What this means:**

- `cat` displays a file’s contents without changing it.
- `.runtime/runs/session-01/summary.json` is the report or state file to read. The path is relative to your current lab folder.


**Expected:** `failures: 0`, equal positive `acknowledged_posts` and `verified_posts`,
`search_found_run: true`, and empty `verification_failures` and `verification_errors`.
If you repeat the run, use `session-02` in both commands. Keep failed reports too.

## Step 4: Prove the database sees POOLER

**On DB (`suta-pgb-db`) — Linux terminal, as `ubuntu`:**

```bash
sudo -iu postgres
```

**What this means:**

- `sudo` lets you run as another Linux user.
- `-i` starts that user’s login environment, including their home folder.
- `-u postgres` selects the Linux user `postgres`. Here `-i` and `-u` are written together as `-iu`.
- After this command, you are in a new Linux shell as `postgres`. You have not opened a database yet.


**On DB (`suta-pgb-db`) — Linux terminal, as `postgres`:**

```bash
psql -X -d mattermost
```

**What this means:**

- `psql` opens the PostgreSQL command tool. It also connects to the PgBouncer admin console.
- `-X` ignores personal psql startup settings.
- `-d mattermost` selects the database.
- Without `-h`, this command uses a local connection on DB. The lab PostgreSQL server uses port `5432`.


**On DB (`suta-pgb-db`) — psql, database `mattermost`, user `postgres`, port `5432`:**

```sql
SELECT application_name, client_addr, state, count(*)
FROM pg_stat_activity
WHERE usename = 'mmuser'
GROUP BY application_name, client_addr, state;
```

**What this means:**

- `SELECT` chooses the columns to show; `count(*)` counts connections in each group.
- `FROM pg_stat_activity` reads PostgreSQL’s current connection activity.
- `WHERE usename = 'mmuser'` shows only Mattermost’s database login.
- `GROUP BY` combines rows with the same app name, client address and state. This is one read-only query written over several lines.


**Expected:** `client_addr` is now POOLER's private IP from your connection sheet.
Previously it was APP's private IP. That change proves the new route.
If it is still APP's address, stop and ask the teacher to check the route.

## Step 5: Close the monitors

On POOLER, press **Ctrl+C** to stop watching first.

**On POOLER (`suta-pgb-pooler`) and DB (`suta-pgb-db`) — each open psql session:**

```psql
\q
```

**What this means:**

- `\q` closes psql and returns you to the Linux prompt. It does not stop PostgreSQL or PgBouncer.


**On POOLER (`suta-pgb-pooler`) and DB (`suta-pgb-db`) — Linux terminal, as `postgres`:**

```bash
exit
```

**What this means:**

- `exit` leaves the current Linux shell. After `sudo -iu postgres`, it returns you to `ubuntu`. It is not a SQL command.


Both tabs should now be at a Linux prompt as `ubuntu`.

## Checkpoint — pause here

- [ ] Messages still pass all checks after changing the route.
- [ ] I can show the `mattermost` pool in PgBouncer.
- [ ] PostgreSQL sees connections from POOLER's private IP.

**Discuss:** what changed between Exercises 1 and 3? Where are messages still stored?

**Stop here for the first lesson.** Show your teacher the results.
When ready, continue to [Exercise 4 — connection reuse](04-pooling-modes.md).
