# Exercise 1: Send messages before adding PgBouncer

## What you will achieve

Send messages as eight test users and see APP connect directly to DB.
You will save a passing traffic report and a screenshot of the database connections.
This gives you a result to compare with after adding PgBouncer.

**Before:** finish Exercise 0. Keep your APP and DB tabs open.
Keep Mattermost open in your computer’s browser at **SUTA Pooling Lab → Traffic Lab**.
If you closed it, follow [Exercise 0, Step 5](00-start.md#step-5-open-your-mattermost-website).

The teacher has already created eight test users. The script logs in as those users.

## Step 1: Open the database

**On DB (`suta-pgb-db`) — Linux terminal, as `ubuntu`:**

```bash
sudo -iu postgres
```

**What this means:**

- `sudo` lets you run as another Linux user.
- `-i` starts that user’s login environment, including their home folder.
- `-u postgres` selects the Linux user `postgres`. Here `-i` and `-u` are written together as `-iu`.
- After this command, you are in a new Linux shell as `postgres`. You have not opened a database yet.


You are now using the Linux account that manages PostgreSQL.

**On DB (`suta-pgb-db`) — Linux terminal, as `postgres`:**

```bash
psql -X -d mattermost
```

**What this means:**

- `psql` opens the PostgreSQL command tool. It also connects to the PgBouncer admin console.
- `-X` ignores personal psql startup settings.
- `-d mattermost` selects the database.
- Without `-h`, this command uses a local connection on DB. The lab PostgreSQL server uses port `5432`.


**Expected:** the psql prompt `mattermost=#`. This is the `mattermost` database on port `5432`.
`-X` ignores personal psql startup settings; `-d` selects the database.
If it does not open, stop and show the teacher the error.

## Step 2: Watch the app's database connections

**On DB (`suta-pgb-db`) — inside psql, database `mattermost`, user `postgres`, port `5432`:**

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


`mmuser` is Mattermost's database login. `client_addr` shows the private IP of
the connecting server. `count` is the number of connections in that row.

**Expected:** connections from APP's **private** IP, listed on your connection sheet.
This is different from the public IP used for SSH.
`active` means running a query; `idle` means waiting for another query.

**On DB (`suta-pgb-db`) — same psql session:**

```psql
\watch 1
```

**What this means:**

- `\watch` repeats the last query in this psql session.
- `1` means repeat once every second. Press **Ctrl+C** to stop repeating and return to psql.


The result refreshes once a second. **Leave it running and switch to your APP tab.**

## Step 3: Send messages

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`:**

```bash
cd /opt/suta/pgbouncer-lab
```

**What this means:**

- `cd` means change directory (folder).
- `/opt/suta/pgbouncer-lab` is the folder containing the lab scripts. This command only moves you into that folder.


**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name baseline-01 --users 8 --concurrency 8 --seconds 20
```

**What this means:**

- `python3` runs a Python program. `traffic.py` is the prepared message generator.
- `run` starts a workload using the existing test accounts.
- `--name baseline-01` names the saved report folder. Choose a new name for every repeat.
- `--users 8` logs in eight test users.
- `--concurrency 8` allows at most eight requests to be in progress together.
- `--seconds 20` starts requests for 20 seconds, then finishes pending work and verifies messages.


This signs in eight test users, then sends, reads, and replies to messages for
20 seconds. Final message checks take additional time. Wait for the Linux prompt
before running another command on APP.

While it runs, look at your DB tab. Take a screenshot of the connection rows.
Eight website users do not necessarily need eight database connections.

**On your own computer — Mattermost browser tab:** open **Traffic Lab** and
look for new messages starting with `SUTA run` and check their timestamps.
The message text uses a generated run ID; `baseline-01` names the saved report
folder and does not appear in the message text.
The script sends these messages as the test users. You do not need to type them
yourself. The report below verifies all accepted messages, including replies.

**If you already used `baseline-01`:** replace it with `baseline-02` in the command
and in the report path below. Never delete an earlier report to reuse its name.

## Step 4: Check the result

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
cat .runtime/runs/baseline-01/summary.json
```

**What this means:**

- `cat` displays a file’s contents without changing it.
- `.runtime/runs/baseline-01/summary.json` is the report or state file to read. The path is relative to your current lab folder.


Find these fields. Counts vary; do not try to match someone else's count.

| Field | Expected | Meaning |
|---|---|---|
| `failures` | `0` | No workload requests failed |
| `acknowledged_posts` | A number greater than zero | Messages the app accepted |
| `verified_posts` | Same as `acknowledged_posts` | All accepted messages were read back correctly |
| `search_found_run` | `true` | Search found this run's messages |
| `verification_failures` | `[]` | No message mismatches |
| `verification_errors` | `[]` | No errors during the final checks |

If a check differs, stop and show the teacher the report. Keep it even if the run failed.

<details>
<summary>Extra: what else is saved?</summary>

`requests.jsonl` contains request results. `posts.json` contains message IDs, authors,
channels and text. Keep these files; a later exercise checks the messages again.
`p95` is a response time: 95% of successful requests took no longer than that time.
Failures are counted separately.

</details>

## Step 5: Leave the database terminal

**On DB (`suta-pgb-db`):** press **Ctrl+C** to stop watching.

**On DB (`suta-pgb-db`) — inside psql:**

```psql
\q
```

**What this means:**

- `\q` closes psql and returns you to the Linux prompt. It does not stop PostgreSQL or PgBouncer.


**On DB (`suta-pgb-db`) — Linux terminal, as `postgres`:**

```bash
exit
```

**What this means:**

- `exit` leaves the current Linux shell. After `sudo -iu postgres`, it returns you to `ubuntu`. It is not a SQL command.


You are back at the Linux prompt as `ubuntu`.

## Checkpoint

- [ ] My traffic report passes all six checks above.
- [ ] I saved a screenshot showing connections from APP's private IP.

**Discuss:** where are the messages stored? Why might the number of connections
be different from the number of users?

**Next:** [Exercise 2 — configure PgBouncer](02-configure.md).
