# Exercise 1 — measure Mattermost without PgBouncer

**The task:** generate messages and observe direct database connections.
**Why:** you need a baseline before deciding whether a change helped.
**Success:** requests succeed and every acknowledged message is read back correctly.

**Before:** finish Start. The instructor has created eight synthetic test users and
one dedicated traffic channel. Keep their credentials private. The route is direct.

## 1. Run a small workload

**Where:** APP, Linux terminal as `ubuntu`.

```bash
cd /opt/suta/pgbouncer-lab
python3 traffic.py run --name baseline-01 --users 8 --concurrency 8 --seconds 20
```

- `--users 8`: sign in as eight different test users before timing begins.
- `--concurrency 8`: allow at most eight requests in progress together.
- `--seconds 20`: stop starting requests after 20 seconds; finish bounded in-flight requests.
- `--name`: keep this run's files separate. Use a new name for every repeat.

The script posts, reads and replies through the **Mattermost API**. It does not
insert messages directly into PostgreSQL. It pauses briefly between actions.

Expect `failures: 0`, matching `acknowledged_posts` and `verified_posts`, and
`search_found_run: true`, with empty `verification_failures` and `verification_errors` lists. Actual counts and timings vary. If anything fails, save
the report and inspect the error; do not claim the baseline passed.

## 2. Watch connections while traffic runs

**Where:** DB, Linux terminal as `ubuntu`. Open this before starting another named run.

```bash
sudo -iu postgres
psql -X -d mattermost
```

`sudo -iu postgres` switches to the database OS account. `psql` opens the named
database. `-X` avoids personal startup settings changing the exercise.

**Now in psql on DB:**

```sql
SELECT current_database(), current_user;
SELECT application_name, client_addr, state, count(*)
FROM pg_stat_activity
WHERE usename = 'mmuser'
GROUP BY application_name, client_addr, state;
```

Expect database `mattermost`, user `postgres`, and application connections from
APP's private address. `active` means executing; `idle` means waiting for another
client command. Counts may change between observations.

```psql
\watch 1
```

This repeats the last query once a second. Press **Ctrl+C** to stop watching.
Type `\q` to leave psql, then `exit` to return from the `postgres` OS account.

## 3. Read your result

**Where:** APP, Linux terminal as `ubuntu`, in `/opt/suta/pgbouncer-lab`.

```bash
cat .runtime/runs/baseline-01/summary.json
```

The folder also contains `requests.jsonl` and `posts.json`. The latter records
actual message IDs, authors, channels and text for verification. Keep the files.
`p95` means 95% of successful requests took no longer than this time. Failed
requests are counted separately, not hidden inside successful timings.

**Show:** the report and a database connection observation taken during the run.
**Discuss:** Why are eight users not necessarily eight database connections?
Why must we keep the workload the same when comparing settings?
