# Exercise 1: Send messages before adding PgBouncer

**Goal:** send test messages and see the app connect directly to PostgreSQL.
This gives us a result to compare with after adding PgBouncer.

**Before:** finish Exercise 0. Keep your APP and DB tabs open.
The teacher has already created eight test users. The script logs in as those users.

## Step 1: Open the database

**On DB (`suta-pgb-db`) — Linux terminal, as `ubuntu`:**

```bash
sudo -iu postgres
```

You are now using the Linux account that manages PostgreSQL.

**On DB (`suta-pgb-db`) — Linux terminal, as `postgres`:**

```bash
psql -X -d mattermost
```

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

`mmuser` is Mattermost's database login. `client_addr` shows the private IP of
the connecting server. `count` is the number of connections in that row.

**Expected:** connections from APP's **private** IP, listed on your connection sheet.
This is different from the public IP used for SSH.
`active` means running a query; `idle` means waiting for another query.

**On DB (`suta-pgb-db`) — same psql session:**

```psql
\watch 1
```

The result refreshes once a second. **Leave it running and switch to your APP tab.**

## Step 3: Send messages

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`:**

```bash
cd /opt/suta/pgbouncer-lab
```

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name baseline-01 --users 8 --concurrency 8 --seconds 20
```

This signs in eight test users, then sends, reads, and replies to messages for
20 seconds. Final message checks take additional time. Wait for the Linux prompt
before running another command on APP.

While it runs, look at your DB tab. Take a screenshot of the connection rows.
Eight website users do not necessarily need eight database connections.

**If you already used `baseline-01`:** replace it with `baseline-02` in the command
and in the report path below. Never delete an earlier report to reuse its name.

## Step 4: Check the result

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
cat .runtime/runs/baseline-01/summary.json
```

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

**On DB (`suta-pgb-db`) — Linux terminal, as `postgres`:**

```bash
exit
```

You are back at the Linux prompt as `ubuntu`.

## Checkpoint

- [ ] My traffic report passes all six checks above.
- [ ] I saved a screenshot showing connections from APP's private IP.

**Discuss:** where are the messages stored? Why might the number of connections
be different from the number of users?

**Next:** [Exercise 2 — configure PgBouncer](02-configure.md).
