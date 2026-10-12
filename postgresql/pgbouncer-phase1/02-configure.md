# Exercise 2 — write your PgBouncer configuration

**The task:** tell PgBouncer where PostgreSQL is and how many connections to use.
**Why:** an installed package does not know your database route or pooling policy.
**Success:** you can log into the admin console and read the known lab identity.

**Before:** Exercise 1 passed. The teacher has installed PgBouncer, prepared the
private credentials and supplied an empty configuration. Do not print `userlist.txt`
or `.pgpass`; they contain credentials.

## 1. Check the empty starting file

**Where to run:** POOLER server, Linux terminal as `ubuntu` (any folder).

```bash
hostname
sudo wc -c /etc/pgbouncer/pgbouncer.ini
```

Expect `suta-pgb-pooler` and **0 bytes**. If the file has contents, it is existing
work: stop and ask which checkpoint to resume. Do not erase it.

## 2. Enter the settings

**Where to run:** POOLER server, Linux terminal as `ubuntu` (any folder).

```bash
sudo -u postgres vi /etc/pgbouncer/pgbouncer.ini
```

Press `i` to enter text. Write:

**Where to run:** POOLER server, inside vi editing `/etc/pgbouncer/pgbouncer.ini` as OS user `postgres`. This is file content, not a shell command.

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

## 3. Start and inspect PgBouncer

**Where to run:** POOLER server, Linux terminal as `ubuntu` (any folder).

```bash
sudo systemctl start pgbouncer
systemctl is-active pgbouncer
```

Expect `active`. If not, stop and inspect `sudo journalctl -u pgbouncer -n 30`.
Do not disable authentication to fix a startup problem.

**Where to run:** POOLER server, Linux terminal as `ubuntu` (any folder).

```bash
sudo -iu postgres
psql -X -w -h 127.0.0.1 -p 6432 -U pooladmin -d pgbouncer
```

`-h` selects this machine; `-p` selects PgBouncer. `-U` selects the database login.
`-w` refuses an interactive password prompt; it uses the prepared private password
file. Database `pgbouncer` is the admin console, not an application database.

**Where to run:** POOLER server, inside psql connected to `pgbouncer` as `pooladmin`, port `6432`.

```sql
SHOW VERSION;
SHOW DATABASES;
SHOW CONFIG;
```

Expect PgBouncer 1.22.0, both mappings, and the settings you wrote. Leave with `\q`.

**Where to run:** POOLER server, Linux terminal as `postgres` (any folder).

```bash
psql -X -w -h 127.0.0.1 -p 6432 -U labuser -d pool_lab
```

**Where to run:** POOLER server, inside psql connected to `pool_lab` as `labuser`, port `6432`.

```sql
SELECT current_database(), current_user;
SELECT name FROM lab_identity;
```

Expect `pool_lab`, `labuser`, and `suta-pgbouncer-phase1`.
Leave with `\q`, then `exit` to return to `ubuntu`.

**Show:** your configuration, running service, version and identity query.
**Discuss:** What is the difference between ports 5432 and 6432? Why is the
client limit different from the server pool size?
