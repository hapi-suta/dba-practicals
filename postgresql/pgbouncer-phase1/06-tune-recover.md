# Exercise 6: Tune and recover

**The task:** change one limit at a time and recover from a rejected login.
**Why:** a DBA must distinguish application pooling, PgBouncer pooling and authentication.
**Success:** a measured comparison and a working application at the end.

**Before:** Exercise 5 is complete. PgBouncer uses transaction mode and a pool of 4.
No deliberate sleep or open transaction remains. All tabs are back at Linux prompts
as `ubuntu`. This is a follow-up lesson, after the basic pooling demonstration.

If a command fails, stop at that step. Keep the report and ask the teacher; do not
keep changing settings until it works.

## Step 1: Try two application connections

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`:**

```bash
cd /opt/suta/pgbouncer-lab
```

Mattermost keeps its own set of database connections. We will change that set
while leaving PgBouncer's four-connection limit unchanged.

**Where to run:** APP server (`suta-pgb-app`), Linux terminal as `ubuntu`, in `/opt/suta/pgbouncer-lab`.

```bash
sudo python3 app-route.py pooled --open 2 --idle 1
```

**Expected:** `Mattermost ready` with the route selected above. Stop on error.

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name app-two-01 --users 8 --concurrency 8 --seconds 20
```

Mattermost now allows at most two open connections in its database pool. PgBouncer's
pool is unchanged. Record the report. Expect zero failures and all message checks to pass.
If you want to watch connections too, the full monitor steps are in
[Exercise 3](03-connect-app.md#step-2-open-the-pool-monitor).

## Step 2: Restore eight application connections

Restore the original values and send the same workload again:

**Where to run:** APP server (`suta-pgb-app`), Linux terminal as `ubuntu`, in `/opt/suta/pgbouncer-lab`.

```bash
sudo python3 app-route.py pooled --open 8 --idle 2
```

**Expected:** `Mattermost ready` with the route selected above. Stop on error.

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name app-eight-01 --users 8 --concurrency 8 --seconds 20
```

Expect zero failures and all message checks to pass again.
Compare requests, failures and p95. `p95` is the response time within which 95% of
successful requests finished; a lower number means faster responses for that measure. Repeat with new names if background activity
makes the result unclear. This small lab is not a production capacity benchmark.

## Step 3: Try a burst of messages

**Where to run:** APP server (`suta-pgb-app`), Linux terminal as `ubuntu`, in `/opt/suta/pgbouncer-lab`.

```bash
python3 traffic.py run --name burst-01 --users 8 --concurrency 8 --seconds 20 --profile burst
```

This sends messages with shorter pauses in the middle of the run.
Expect zero failures and all message checks to pass. Record the actual result.
The script slows down when responses are slow; this is a classroom test, not a
production capacity measurement.

## Step 4: Try a deliberately wrong password

**Where to run:** POOLER server (`suta-pgb-pooler`), Linux terminal as `ubuntu` (any folder).

```bash
sudo -iu postgres
```

**On POOLER (`suta-pgb-pooler`) — Linux, now as `postgres`:**

```bash
PGPASSWORD=deliberately-wrong-lab-password psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab -c 'SELECT 1;'
```

Expect a password-authentication failure. The supplied value is deliberately fake.
It overrides the password file for this one command; it changes no saved password.
Inspect the error: this is a login failure, not a waiting-pool problem.

Retry with the correct prepared password file:

**Where to run:** POOLER server (`suta-pgb-pooler`), Linux terminal as `postgres` (any folder).

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab -c 'SELECT name FROM lab_identity;'
```

Expect `suta-pgbouncer-phase1`. Do not change `auth_type` to `trust`.

**On POOLER (`suta-pgb-pooler`) — Linux, as `postgres`:**

```bash
exit
```

You are back at `ubuntu`.

## Step 5: Return temporarily to the direct route

**Where to run:** APP server (`suta-pgb-app`), Linux terminal as `ubuntu`, in `/opt/suta/pgbouncer-lab`.

```bash
sudo python3 app-route.py direct
```

**Expected:** `Mattermost ready` with the route selected above. Stop on error.

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name rollback-01 --users 8 --concurrency 8 --seconds 20
```

This sends the app directly to PostgreSQL again. It is a connection-route rollback,
not a database restore. Expect `Mattermost ready` with route `direct` and a passing
traffic report. To check the source address, use the full DB connection and query
steps in [Exercise 3, Step 4](03-connect-app.md#step-4-prove-the-database-sees-pooler);
expect APP’s private IP while direct. Close that psql session afterwards.

## Step 6: Restore the pooled route

Put Mattermost back through PgBouncer:

**Where to run:** APP server (`suta-pgb-app`), Linux terminal as `ubuntu`, in `/opt/suta/pgbouncer-lab`.

```bash
sudo python3 app-route.py pooled
```

**Expected:** `Mattermost ready` with the route selected above. Stop on error.

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
python3 traffic.py run --name final-01 --users 8 --concurrency 8 --seconds 20
```

## Step 7: Compare your reports

**Where to run:** APP server (`suta-pgb-app`), Linux terminal as `ubuntu`, in
`/opt/suta/pgbouncer-lab`. Read the saved reports there and fill in this table
in your own notes.

Start with this short comparison in your own notes:

| Report name | Requests | Failures | p95 | All accepted messages verified? |
|---|---|---|---|---|
| `app-two-01` | | | | |
| `app-eight-01` | | | | |
| `burst-01` | | | | |
| `rollback-01` | | | | |
| `final-01` | | | | |

Read each saved `summary.json`. Here is the first one:

**On APP (`suta-pgb-app`) — Linux, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
cat .runtime/runs/app-two-01/summary.json
```

Replace `app-two-01` with the other report names in the table, one at a time.
If you used different names, use those instead. A passing report has zero failures,
matching positive `acknowledged_posts` and `verified_posts`, `search_found_run: true`,
and empty `verification_failures` and `verification_errors`.

Use your actual reports. Do not copy the instructor's performance numbers.
On APP, still in `/opt/suta/pgbouncer-lab`, verify every earlier acknowledged
message by ID, author, channel and content:

**Where to run:** APP server (`suta-pgb-app`), Linux terminal as `ubuntu`, in `/opt/suta/pgbouncer-lab`.

```bash
python3 verify-messages.py
```

Expect a positive `verified_messages` count and an empty `failures` list. Keep all
`posts.json` files: the verifier uses them as its original evidence.

**Discuss:** Which layer limited your workload? What evidence supports that answer?
What would you check before raising a production pool limit?

## Checkpoint

- [ ] I compared two and eight app connections using saved reports.
- [ ] The deliberately wrong password failed; the correct login worked.
- [ ] The final pooled traffic report passes.
- [ ] The cross-run message check has no failures.

**Leave:** working pooled route, transaction mode, PgBouncer pool 4, app open 8/idle 2.
Keep reports and all messages. Finish terminal recordings. Shut down only when the
instructor confirms the exact lab instances; do not delete servers or data.
