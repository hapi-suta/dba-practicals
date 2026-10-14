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

**What this means:**

- `sudo -u postgres` runs this one command as the Linux user `postgres`.
- `vi` opens a text editor.
- `/etc/pgbouncer/pgbouncer.ini` is the file to edit. When you leave the editor, you are still `ubuntu`.


Find `default_pool_size = 4`. Press **i**, change `4` to `1`, then press
**Esc**, type `:wq`, and press **Enter**. Keep `pool_mode = transaction`.

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo systemctl reload pgbouncer
```

**What this means:**

- `sudo` gives this command administrator permission.
- `systemctl` manages background services.
- `reload` asks the running service to reread its configuration.
- `pgbouncer` is the service name.


**On APP (`suta-pgb-app`) — Linux, as `ubuntu`:**

```bash
cd /opt/suta/pgbouncer-lab
```

**What this means:**

- `cd` means change directory (folder).
- `/opt/suta/pgbouncer-lab` is the folder containing the lab scripts. This command only moves you into that folder.


**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
sudo python3 app-route.py pooled
```

**What this means:**

- `sudo` gives permission to update Mattermost’s protected configuration.
- `python3` runs the prepared `app-route.py` helper.
- `pooled` selects APP → POOLER → DB.
- The helper restarts Mattermost and checks that it responds. Database passwords stay private; it does not delete messages.


**Expected:** `Mattermost ready`. This restarts the app connections.

## Step 3: Prepare the pool monitor

**On POOLER (`suta-pgb-pooler`), tab C — Linux, as `ubuntu`:**

```bash
sudo -iu postgres
```

**What this means:**

- `sudo` lets you run as another Linux user.
- `-i` starts that user’s login environment, including their home folder.
- `-u postgres` selects the Linux user `postgres`. Here `-i` and `-u` are written together as `-iu`.
- After this command, you are in a new Linux shell as `postgres`. You have not opened a database yet.


**On POOLER (`suta-pgb-pooler`), tab C — Linux, as `postgres`:**

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


**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```sql
SHOW CONFIG;
```

**What this means:**

- `SHOW CONFIG` lists the settings PgBouncer is currently using. Check this after reloading the configuration file.


**Expected:** `default_pool_size` is `1` and `pool_mode` is `transaction`.
If not, stop and check the edited file. Press **q** if a results page shows `(END)`.

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```sql
RECONNECT mattermost;
```

**What this means:**

- `RECONNECT` tells PgBouncer to retire server connections when they can be released safely.
- `mattermost` limits this action to that database mapping. New work will get fresh server connections.


This retires old database connections, which may remain after lowering the limit.

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```sql
SHOW POOLS;
```

**What this means:**

- `SHOW POOLS` lists PgBouncer’s connection pools. Each pool belongs to a database/user pair. Look at the row named in this step.


**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```psql
\watch 1
```

**What this means:**

- `\watch` repeats the last query in this psql session.
- `1` means repeat once every second. Press **Ctrl+C** to stop repeating and return to psql.


Leave C refreshing. Watch the `mattermost` row; the controlled run should use
at most one active backend (`sv_active`). If more remain, ask the teacher before continuing.

## Step 4: Test the small pool before adding a delay

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name small-pool-01 --users 8 --concurrency 8 --seconds 20
```

**What this means:**

- `python3` runs a Python program. `traffic.py` is the prepared message generator.
- `run` starts a workload using the existing test accounts.
- `--name small-pool-01` names the saved report folder. Choose a new name for every repeat.
- `--users 8` logs in eight test users.
- `--concurrency 8` allows at most eight requests to be in progress together.
- `--seconds 20` starts requests for 20 seconds, then finishes pending work and verifies messages.


Wait for it to finish. Record failures and message checks from the report.
One connection may handle short transactions successfully. Do not invent a failure
if there is none. Stop on unexpected errors; keep the report.

## Step 5: Prepare the database activity display

**On DB (`suta-pgb-db`) — Linux, as `ubuntu`:**

```bash
sudo -iu postgres
```

**What this means:**

- `sudo` lets you run as another Linux user.
- `-i` starts that user’s login environment, including their home folder.
- `-u postgres` selects the Linux user `postgres`. Here `-i` and `-u` are written together as `-iu`.
- After this command, you are in a new Linux shell as `postgres`. You have not opened a database yet.


**On DB (`suta-pgb-db`) — Linux, as `postgres`:**

```bash
psql -X -d mattermost
```

**What this means:**

- `psql` opens the PostgreSQL command tool. It also connects to the PgBouncer admin console.
- `-X` ignores personal psql startup settings.
- `-d mattermost` selects the database.
- Without `-h`, this command uses a local connection on DB. The lab PostgreSQL server uses port `5432`.


**On DB (`suta-pgb-db`) — psql, `mattermost`, user `postgres`, port `5432`:**

```sql
SELECT pid, state, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE usename = 'mmuser';
```

**What this means:**

- `SELECT` chooses the process number (`pid`), state, wait information and query text.
- `FROM pg_stat_activity` reads current database activity.
- `WHERE usename = 'mmuser'` limits the display to Mattermost connections. This query does not change data.


**On DB (`suta-pgb-db`) — psql, `mattermost`, user `postgres`, port `5432`:**

```psql
\watch 1
```

**What this means:**

- `\watch` repeats the last query in this psql session.
- `1` means repeat once every second. Press **Ctrl+C** to stop repeating and return to psql.


Leave DB refreshing. The teacher will look for `pg_sleep(6)` during the hold.

## Step 6: Prepare the teacher’s connection

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo -iu postgres
```

**What this means:**

- `sudo` lets you run as another Linux user.
- `-i` starts that user’s login environment, including their home folder.
- `-u postgres` selects the Linux user `postgres`. Here `-i` and `-u` are written together as `-iu`.
- After this command, you are in a new Linux shell as `postgres`. You have not opened a database yet.


**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `postgres`:**

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U mmuser -d mattermost
```

**What this means:**

- `psql` opens the PostgreSQL command tool. It also connects to the PgBouncer admin console.
- `-X` ignores personal psql startup settings.
- `-w` never prompts for a password; the prepared password file supplies it for normal lab logins.
- `-h 127.0.0.1` selects the server address. `127.0.0.1` means this POOLER server.
- `-p 6432` selects the port.
- `-U mmuser` selects the database login role.
- `-d mattermost` selects the database.


**On POOLER (`suta-pgb-pooler`), tab A — psql, `mattermost`, user `mmuser`, port `6432`:**

```sql
SELECT current_database(), current_user;
```

**What this means:**

- `SELECT` asks for values.
- `current_database()` returns the database name. `current_user` returns the database login role. This checks where you connected.


**Expected:** `mattermost` and `mmuser`. Stop if different. Do not begin the hold yet.

## Step 7: Send traffic, then hold the connection

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name long-transaction-01 --users 8 --concurrency 8 --seconds 20
```

**What this means:**

- `python3` runs a Python program. `traffic.py` is the prepared message generator.
- `run` starts a workload using the existing test accounts.
- `--name long-transaction-01` names the saved report folder. Choose a new name for every repeat.
- `--users 8` logs in eight test users.
- `--concurrency 8` allows at most eight requests to be in progress together.
- `--seconds 20` starts requests for 20 seconds, then finishes pending work and verifies messages.


Start this APP command first. After about five seconds, the teacher runs the whole
block below in A. It must overlap the running traffic. Copy all three lines
together so the transaction commits immediately after the sleep.

**On POOLER (`suta-pgb-pooler`), tab A — psql, `mattermost`, user `mmuser`, port `6432`:**

```sql
BEGIN;
SELECT pg_sleep(6);
COMMIT;
```

**What this means:**

- `BEGIN` starts the transaction.
- `SELECT pg_sleep(6)` makes PostgreSQL wait for six seconds while this transaction holds the connection.
- `COMMIT` ends the transaction and releases the connection.
- **Timing exception:** the teacher submits these three lines together so reading the guide does not accidentally leave the transaction open after the six-second hold.


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

**What this means:**

- `\q` closes psql and returns you to the Linux prompt. It does not stop PostgreSQL or PgBouncer.


**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `postgres`:**

```bash
exit
```

**What this means:**

- `exit` leaves the current Linux shell. After `sudo -iu postgres`, it returns you to `ubuntu`. It is not a SQL command.


**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo -u postgres vi /etc/pgbouncer/pgbouncer.ini
```

**What this means:**

- `sudo -u postgres` runs this one command as the Linux user `postgres`.
- `vi` opens a text editor.
- `/etc/pgbouncer/pgbouncer.ini` is the file to edit. When you leave the editor, you are still `ubuntu`.


Change `default_pool_size = 1` back to `default_pool_size = 4`.
Save with **Esc**, `:wq`, **Enter**.

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo systemctl reload pgbouncer
```

**What this means:**

- `sudo` gives this command administrator permission.
- `systemctl` manages background services.
- `reload` asks the running service to reread its configuration.
- `pgbouncer` is the service name.


In C, press **Ctrl+C**.

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```sql
SHOW CONFIG;
```

**What this means:**

- `SHOW CONFIG` lists the settings PgBouncer is currently using. Check this after reloading the configuration file.


**Expected:** `default_pool_size` is `4`. Stop if it is not.

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name recovery-01 --users 8 --concurrency 8 --seconds 20
```

**What this means:**

- `python3` runs a Python program. `traffic.py` is the prepared message generator.
- `run` starts a workload using the existing test accounts.
- `--name recovery-01` names the saved report folder. Choose a new name for every repeat.
- `--users 8` logs in eight test users.
- `--concurrency 8` allows at most eight requests to be in progress together.
- `--seconds 20` starts requests for 20 seconds, then finishes pending work and verifies messages.


**Expected:** zero failures, matching positive message counts, successful search,
and empty `verification_failures` and `verification_errors`.
Keep both the delayed report and the recovery report. Do not discard failures.

## Step 9: Close the monitors

On DB, press **Ctrl+C** first. C has already stopped watching.

**On POOLER C (`suta-pgb-pooler`) and DB (`suta-pgb-db`) — each psql session:**

```psql
\q
```

**What this means:**

- `\q` closes psql and returns you to the Linux prompt. It does not stop PostgreSQL or PgBouncer.


**On POOLER C (`suta-pgb-pooler`) and DB (`suta-pgb-db`) — Linux, as `postgres`:**

```bash
exit
```

**What this means:**

- `exit` leaves the current Linux shell. After `sudo -iu postgres`, it returns you to `ubuntu`. It is not a SQL command.


## Checkpoint

- [ ] I saw waiting clients and the sleep query during the same hold.
- [ ] I kept the delayed report, including any errors.
- [ ] Pool size is back to 4 and the recovery report passes.
- [ ] No transaction or monitor remains open.

**Discuss:** what held the connection? Why would increasing a connection limit
not fix the underlying long-running transaction?

**Next:** [Exercise 6 — tune and recover](06-tune-recover.md).
