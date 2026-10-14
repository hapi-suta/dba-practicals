# Exercise 2: Configure PgBouncer

**The task:** tell PgBouncer where PostgreSQL is and how many connections to use.
**Why:** an installed package does not know your database route or pooling policy.
**Success:** you can log into the admin console and read the known lab identity.

**Before:** Exercise 1 passed. The teacher has installed PgBouncer, prepared the
private credentials and supplied an empty configuration. Do not print `userlist.txt`
or `.pgpass`; they contain credentials.

## Step 1: Check the starting file

**Where to run:** POOLER server (`suta-pgb-pooler`), Linux terminal as `ubuntu` (any folder).

```bash
hostname
```

**Expected:** `suta-pgb-pooler`. Then check the file size.

**On POOLER (`suta-pgb-pooler`) — Linux, as `ubuntu`:**

```bash
sudo wc -c /etc/pgbouncer/pgbouncer.ini
```

**Expected:** `0 /etc/pgbouncer/pgbouncer.ini` — the file is empty. If the file has contents, it is existing
work: stop and ask which checkpoint to resume. Do not erase it.

## Step 2: Open the configuration file

**Where to run:** POOLER server (`suta-pgb-pooler`), Linux terminal as `ubuntu` (any folder).

```bash
sudo -u postgres vi /etc/pgbouncer/pgbouncer.ini
```

Press `i` to enter text. Write:

**Where to run:** POOLER server (`suta-pgb-pooler`), inside vi editing `/etc/pgbouncer/pgbouncer.ini` as OS user `postgres`. This is file content, not a shell command.

```ini
[databases]
mattermost = host=pg-db port=5432 dbname=mattermost
pool_lab = host=pg-db port=5432 dbname=pool_lab pool_size=1

[pgbouncer]
listen_addr = 127.0.0.1,pg-pooler
listen_port = 6432
unix_socket_dir = /var/run/postgresql
pidfile = /var/run/postgresql/pgbouncer.pid
logfile = /var/log/postgresql/pgbouncer.log
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
admin_users = pooladmin
pool_mode = session
max_client_conn = 50
default_pool_size = 4
reserve_pool_size = 0
server_tls_sslmode = require
server_idle_timeout = 30
query_wait_timeout = 15
max_prepared_statements = 100
```

Press **Esc**, type `:wq`, then press **Enter** to save and leave the editor.
To leave without saving, press Esc and type `:q!`.

For now, focus on these four settings:

| Setting | Meaning |
|---|---|
| `listen_port = 6432` | The port clients use to reach PgBouncer |
| `pool_mode = session` | Keep a database connection until the client disconnects |
| `default_pool_size = 4` | Allow up to four PostgreSQL connections per database/user pool |
| `max_client_conn = 50` | Allow up to 50 incoming client connections overall |

`pg-db` is a prepared private name for your DB server. Do not replace it with a
public IP. `pool_lab` is a small practice database; its pool is limited to one
connection so we can demonstrate sharing later.

<details>
<summary>Reference: the remaining settings</summary>

What the settings mean:

- `[databases]` maps a name requested by a client to a real PostgreSQL database.
- `pg-db` is the instructor-prepared private hostname. Port `5432` is PostgreSQL.
- `pool_lab` is a separate, tiny demonstration database with one backend connection.
  It lets you see reuse clearly without modifying Mattermost tables.
- PgBouncer listens on `6432`; `pg-pooler` resolves to this node's private address.
- `auth_type` requires SCRAM password authentication. `auth_file` supplies private credentials.
- `admin_users` permits the dedicated account to inspect and administer PgBouncer.
- `pool_mode = session` keeps a backend assigned until the client disconnects.
- `max_client_conn = 50` limits incoming clients. `default_pool_size = 4` limits
  server connections **per database/user pool**, unless that mapping overrides it.
- The reserve is zero so our small-pool behaviour is predictable.
- `query_wait_timeout = 15` bounds how long a query waits for a backend.
- `server_idle_timeout = 30` closes unused server connections after 30 seconds.
- `server_tls_sslmode = require` encrypts PgBouncer's connection to PostgreSQL.
  Certificate identity verification is a later security exercise.
- `max_prepared_statements` enables protocol-level prepared-statement tracking.
- Socket, PID and log paths are the prepared Ubuntu package paths.

These small values are teaching settings, not production sizing advice. APP to
PgBouncer uses the restricted private lab network without TLS in this phase.

</details>

## Step 3: Start PgBouncer

**Where to run:** POOLER server (`suta-pgb-pooler`), Linux terminal as `ubuntu` (any folder).

```bash
sudo systemctl start pgbouncer
```

Now check that it started.

**On POOLER (`suta-pgb-pooler`) — Linux, as `ubuntu`:**

```bash
systemctl is-active pgbouncer
```

Expect `active`. If not, stop and inspect `sudo journalctl -u pgbouncer -n 30`.
Do not disable authentication to fix a startup problem.

## Step 4: Open the PgBouncer admin console

**Where to run:** POOLER server (`suta-pgb-pooler`), Linux terminal as `ubuntu` (any folder).

```bash
sudo -iu postgres
```

**On POOLER (`suta-pgb-pooler`) — Linux terminal, now as `postgres`:**

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U pooladmin -d pgbouncer
```

**Expected:** the `pgbouncer=#` prompt. No password prompt is needed.

`-X` ignores personal psql startup settings. `-h` selects this machine; `-p` selects PgBouncer. `-U` selects the database login.
`-w` refuses an interactive password prompt; it uses the prepared private password
file. Database `pgbouncer` is the admin console, not an application database.

**Where to run:** POOLER server (`suta-pgb-pooler`), inside psql connected to `pgbouncer` as `pooladmin`, port `6432`.

```sql
SHOW VERSION;
```

**Expected:** PgBouncer `1.22.0`.

**On POOLER (`suta-pgb-pooler`) — same admin psql session, `pooladmin`, port `6432`:**

```sql
SHOW DATABASES;
```

**Expected:** rows for `mattermost` and `pool_lab`.

**On POOLER (`suta-pgb-pooler`) — same admin psql session:**

```sql
SHOW CONFIG;
```

**Expected:** `pool_mode` is `session` and `default_pool_size` is `4`.
If the output opens a page showing `(END)`, press **q** to return to the prompt.

**On POOLER (`suta-pgb-pooler`) — inside admin psql:**

```psql
\q
```

You are back in Linux as `postgres`.

## Step 5: Test a connection to the practice database

**Where to run:** POOLER server (`suta-pgb-pooler`), Linux terminal as `postgres` (any folder).

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab
```

**Where to run:** POOLER server (`suta-pgb-pooler`), inside psql connected to `pool_lab` as `labuser`, port `6432`.

```sql
SELECT current_database(), current_user;
```

**Expected:** `pool_lab` and `labuser`. Stop if different.

**On POOLER (`suta-pgb-pooler`) — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
SELECT name FROM lab_identity;
```

**Expected:** `suta-pgbouncer-phase1`.

**On POOLER (`suta-pgb-pooler`) — inside `pool_lab` psql:**

```psql
\q
```

**On POOLER (`suta-pgb-pooler`) — Linux terminal, as `postgres`:**

```bash
exit
```

You are back at `ubuntu`. If a connection check failed, stop here and use
[Troubleshooting](TROUBLESHOOTING.md). Do not change the prepared passwords.

## Checkpoint

- [ ] PgBouncer reports `active`.
- [ ] The admin console shows my settings.
- [ ] The practice query returns `suta-pgbouncer-phase1`.

Show these results to your teacher.

**Discuss:** What is the difference between ports 5432 and 6432? Why is the
client limit different from the server pool size?

**Next:** [Exercise 3 — connect Mattermost](03-connect-app.md).
