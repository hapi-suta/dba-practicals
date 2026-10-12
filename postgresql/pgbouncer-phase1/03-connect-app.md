# Exercise 3 — send Mattermost traffic through PgBouncer

**The task:** change the application's database endpoint and verify the full path.
**Why:** a successful SQL login alone does not prove the application works.
**Success:** login, posting, reading, replies and search pass through PgBouncer.

**Before:** Exercise 2 passed. Keep the direct baseline and existing messages.

## 1. Change the endpoint

**Where:** APP, Linux terminal as `ubuntu`.

```bash
cd /opt/suta/pgbouncer-lab
sudo python3 app-route.py pooled
```

This instructor-installed helper updates Mattermost's protected `SqlSettings.DataSource`
from `pg-db:5432` to `pg-pooler:6432`, keeps the password private, sets its pool to
8 open/2 idle connections, restarts Mattermost and waits for its API.
The helper also sets `binary_parameters=yes`, required by the tested Mattermost
driver/PgBouncer combination when we later use transaction mode. Omitting it caused
real startup errors during rehearsal; the corrected helper was retested.
A brief interruption is expected. It changes no messages or database passwords.

Expect `Mattermost ready` with route `pooled`. On error, stop and use troubleshooting.

## 2. Repeat the application test

```bash
python3 traffic.py run --name session-01 --users 8 --concurrency 8 --seconds 20
```

Expect zero failures, all acknowledged messages verified, and successful search.
The script signs in each user, then checks messages by ID, author, channel and text.

## 3. Observe both sides

**Where:** POOLER, Linux terminal as `ubuntu`.

```bash
sudo -iu postgres
psql -X -w -h 127.0.0.1 -p 6432 -U pooladmin -d pgbouncer
```

**In the admin console, while the APP traffic runs:**

```sql
SHOW CLIENTS;
SHOW SERVERS;
SHOW POOLS;
```

Clients are Mattermost-to-PgBouncer connections. Servers are PgBouncer-to-PostgreSQL
connections. Look at the `mattermost` row, not the admin-console row.
`sv_active` means assigned to a client; it does not prove a SQL query is running.

On DB, repeat Exercise 1's `pg_stat_activity` query. Now the application database
connections should originate from POOLER's private address. This proves the route.
Leave SQL sessions with `\q`, then `exit` from the `postgres` OS account.

**Show:** the passing traffic report, a pool snapshot and the changed database source address.
**Discuss:** Why did the database connection source change? Does reaching the login
page alone prove that sending messages works?
