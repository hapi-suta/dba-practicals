# Exercise 4: See when a connection is shared

## What you will achieve

Compare session pooling with transaction pooling using two clients and one
database connection. You will see when the second client waits and what releases
the connection. Finish with transaction pooling selected and the practice sessions closed.
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
```

**What this means:**

- `hostname` prints the name of the server you are logged into. Use it to check the tab before continuing.


**Expected:** `suta-pgb-pooler`. Next check the Linux user.

**On POOLER (`suta-pgb-pooler`), each tab — Linux, as `ubuntu`:**

```bash
whoami
```

**What this means:**

- `whoami` prints your current Linux username. It tells you whether you are using `ubuntu` or `postgres`.


**Expected:** `suta-pgb-pooler` and `ubuntu` in all three tabs. Stop if different.

## Step 2: Prepare the teacher’s monitor in C

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


**Expected:** `pool_mode` is `session`. If not, ask the teacher where to resume.
Press **q** if a results page shows `(END)`.

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


Leave C refreshing. The teacher looks at the `pool_lab` row.

## Step 3: Let A take the one connection

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
psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab
```

**What this means:**

- `psql` opens the PostgreSQL command tool. It also connects to the PgBouncer admin console.
- `-X` ignores personal psql startup settings.
- `-w` never prompts for a password; the prepared password file supplies it for normal lab logins.
- `-h 127.0.0.1` selects the server address. `127.0.0.1` means this POOLER server.
- `-p 6432` selects the port.
- `-U labuser` selects the database login role.
- `-d pool_lab` selects the database.


**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
SELECT name FROM lab_identity;
```

**What this means:**

- `SELECT name` asks for the `name` column.
- `FROM lab_identity` reads it from the prepared identity table. The result confirms that you reached the lab database.


**Expected:** `suta-pgbouncer-phase1`. Stop if different.

**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
SELECT pg_backend_pid();
```

**What this means:**

- `SELECT` asks PostgreSQL for a result.
- `pg_backend_pid()` returns the process number serving this connection. Matching numbers demonstrate reuse of the same PostgreSQL process.


**Expected:** a number. Write it down. It identifies the PostgreSQL process
serving this client. **Leave A connected.**

## Step 4: Make B wait, then disconnect A

**On POOLER (`suta-pgb-pooler`), tab B — Linux, as `ubuntu`:**

```bash
sudo -iu postgres
```

**What this means:**

- `sudo` lets you run as another Linux user.
- `-i` starts that user’s login environment, including their home folder.
- `-u postgres` selects the Linux user `postgres`. Here `-i` and `-u` are written together as `-iu`.
- After this command, you are in a new Linux shell as `postgres`. You have not opened a database yet.


**On POOLER (`suta-pgb-pooler`), tab B — Linux, as `postgres`:**

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab
```

**What this means:**

- `psql` opens the PostgreSQL command tool. It also connects to the PgBouncer admin console.
- `-X` ignores personal psql startup settings.
- `-w` never prompts for a password; the prepared password file supplies it for normal lab logins.
- `-h 127.0.0.1` selects the server address. `127.0.0.1` means this POOLER server.
- `-p 6432` selects the port.
- `-U labuser` selects the database login role.
- `-d pool_lab` selects the database.


Read these three actions first:

1. Run the query below in B. It should wait instead of returning a number.
2. The teacher checks C: `cl_waiting` should show `1` for `pool_lab`.
3. Immediately switch to A and type `\q` as shown below, before 15 seconds pass.

**On POOLER (`suta-pgb-pooler`), tab B — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
SELECT pg_backend_pid();
```

**What this means:**

- `SELECT` asks PostgreSQL for a result.
- `pg_backend_pid()` returns the process number serving this connection. Matching numbers demonstrate reuse of the same PostgreSQL process.


**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```psql
\q
```

**What this means:**

- `\q` closes psql and returns you to the Linux prompt. It does not stop PostgreSQL or PgBouncer.


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

**What this means:**

- `\q` closes psql and returns you to the Linux prompt. It does not stop PostgreSQL or PgBouncer.


**On POOLER (`suta-pgb-pooler`), tabs A and B — Linux, as `postgres`:**

```bash
exit
```

**What this means:**

- `exit` leaves the current Linux shell. After `sudo -iu postgres`, it returns you to `ubuntu`. It is not a SQL command.


**Expected:** both A and B now show a Linux prompt as `ubuntu`.

## Step 6: Change to transaction pooling

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo -u postgres vi /etc/pgbouncer/pgbouncer.ini
```

**What this means:**

- `sudo -u postgres` runs this one command as the Linux user `postgres`.
- `vi` opens a text editor.
- `/etc/pgbouncer/pgbouncer.ini` is the file to edit. When you leave the editor, you are still `ubuntu`.


Find `pool_mode = session`. Press **i** and change only that line to
`pool_mode = transaction`. Press **Esc**, type `:wq`, then press **Enter**.

**On POOLER (`suta-pgb-pooler`), tab A — Linux, as `ubuntu`:**

```bash
sudo systemctl reload pgbouncer
```

**What this means:**

- `sudo` gives this command administrator permission.
- `systemctl` manages background services.
- `reload` asks the running service to reread its configuration.
- `pgbouncer` is the service name.


In C, press **Ctrl+C** to stop the monitor.

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```sql
SHOW CONFIG;
```

**What this means:**

- `SHOW CONFIG` lists the settings PgBouncer is currently using. Check this after reloading the configuration file.


**Expected:** `pool_mode` is `transaction`. Stop if it is not.

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


## Step 7: Open fresh connections in A and B

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
psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab
```

**What this means:**

- `psql` opens the PostgreSQL command tool. It also connects to the PgBouncer admin console.
- `-X` ignores personal psql startup settings.
- `-w` never prompts for a password; the prepared password file supplies it for normal lab logins.
- `-h 127.0.0.1` selects the server address. `127.0.0.1` means this POOLER server.
- `-p 6432` selects the port.
- `-U labuser` selects the database login role.
- `-d pool_lab` selects the database.


**On POOLER (`suta-pgb-pooler`), tab B — Linux, as `ubuntu`:**

```bash
sudo -iu postgres
```

**What this means:**

- `sudo` lets you run as another Linux user.
- `-i` starts that user’s login environment, including their home folder.
- `-u postgres` selects the Linux user `postgres`. Here `-i` and `-u` are written together as `-iu`.
- After this command, you are in a new Linux shell as `postgres`. You have not opened a database yet.


**On POOLER (`suta-pgb-pooler`), tab B — Linux, as `postgres`:**

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab
```

**What this means:**

- `psql` opens the PostgreSQL command tool. It also connects to the PgBouncer admin console.
- `-X` ignores personal psql startup settings.
- `-w` never prompts for a password; the prepared password file supplies it for normal lab logins.
- `-h 127.0.0.1` selects the server address. `127.0.0.1` means this POOLER server.
- `-p 6432` selects the port.
- `-U labuser` selects the database login role.
- `-d pool_lab` selects the database.


**Expected:** A and B show `pool_lab=>`. C is still watching pools.

## Step 8: Hold the connection until COMMIT

**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
BEGIN;
```

**What this means:**

- `BEGIN` starts a SQL transaction: a group of work that ends with `COMMIT` or `ROLLBACK`. The semicolon ends the SQL command.


**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
SELECT pg_backend_pid();
```

**What this means:**

- `SELECT` asks PostgreSQL for a result.
- `pg_backend_pid()` returns the process number serving this connection. Matching numbers demonstrate reuse of the same PostgreSQL process.


Record the number from A. `BEGIN` starts a transaction and keeps this connection
assigned to A until the transaction ends.

Read the next actions first: run B's query, let the teacher observe waiting in C,
then immediately run `COMMIT;` in A. Do not wait for B to finish before committing.

**On POOLER (`suta-pgb-pooler`), tab B — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
SELECT pg_backend_pid();
```

**What this means:**

- `SELECT` asks PostgreSQL for a result.
- `pg_backend_pid()` returns the process number serving this connection. Matching numbers demonstrate reuse of the same PostgreSQL process.


**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
COMMIT;
```

**What this means:**

- `COMMIT` ends the transaction and saves any changes. In transaction pooling, this lets another client use the PostgreSQL connection.


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

**What this means:**

- `BEGIN` starts a SQL transaction: a group of work that ends with `COMMIT` or `ROLLBACK`. The semicolon ends the SQL command.


**On POOLER (`suta-pgb-pooler`), tab B — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
SELECT pg_backend_pid();
```

**What this means:**

- `SELECT` asks PostgreSQL for a result.
- `pg_backend_pid()` returns the process number serving this connection. Matching numbers demonstrate reuse of the same PostgreSQL process.


**On POOLER (`suta-pgb-pooler`), tab A — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
ROLLBACK;
```

**What this means:**

- `ROLLBACK` ends the transaction and discards any changes made within it. It also releases the connection in transaction pooling.


**Expected:** B waits until A rolls back, then returns a number.

## Step 10: Close the practice sessions

**On POOLER (`suta-pgb-pooler`), tabs A and B — `pool_lab` psql:**

```psql
\q
```

**What this means:**

- `\q` closes psql and returns you to the Linux prompt. It does not stop PostgreSQL or PgBouncer.


**On POOLER (`suta-pgb-pooler`), tabs A and B — Linux, as `postgres`:**

```bash
exit
```

**What this means:**

- `exit` leaves the current Linux shell. After `sudo -iu postgres`, it returns you to `ubuntu`. It is not a SQL command.


In C, press **Ctrl+C**.

**On POOLER (`suta-pgb-pooler`), tab C — psql, `pgbouncer`, user `pooladmin`, port `6432`:**

```psql
\q
```

**What this means:**

- `\q` closes psql and returns you to the Linux prompt. It does not stop PostgreSQL or PgBouncer.


**On POOLER (`suta-pgb-pooler`), tab C — Linux, as `postgres`:**

```bash
exit
```

**What this means:**

- `exit` leaves the current Linux shell. After `sudo -iu postgres`, it returns you to `ubuntu`. It is not a SQL command.


All three tabs should now be at Linux prompts as `ubuntu`.

## Step 11: Check Mattermost in transaction mode

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


**Expected:** `Mattermost ready`. This gives the app fresh connections.

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name transaction-01 --users 8 --concurrency 8 --seconds 20
```

**What this means:**

- `python3` runs a Python program. `traffic.py` is the prepared message generator.
- `run` starts a workload using the existing test accounts.
- `--name transaction-01` names the saved report folder. Choose a new name for every repeat.
- `--users 8` logs in eight test users.
- `--concurrency 8` allows at most eight requests to be in progress together.
- `--seconds 20` starts requests for 20 seconds, then finishes pending work and verifies messages.


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
