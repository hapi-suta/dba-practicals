# Exercise 2: Configure PgBouncer

## What you will achieve

Write the PgBouncer settings, start the service, and connect through it.
The settings tell PgBouncer which database to use and how many connections to allow.
You have succeeded when the admin console opens and the practice database returns
the expected lab identity.

**Before:** Exercise 1 passed. The teacher has installed PgBouncer, prepared the
private credentials and supplied an empty configuration. Do not print `userlist.txt`
or `.pgpass`; they contain credentials.

## Step 1: Check the starting file

**Where to run:** POOLER server (`suta-pgb-pooler`), Linux terminal as `ubuntu` (any folder).

```bash
hostname
```

**What this means:**

- `hostname` prints the name of the server you are logged into. Use it to check the tab before continuing.


**Expected:** `suta-pgb-pooler`. Then check the file size.

**On POOLER (`suta-pgb-pooler`) — Linux, as `ubuntu`:**

```bash
sudo wc -c /etc/pgbouncer/pgbouncer.ini
```

**What this means:**

- `sudo` runs this command with administrator permission so it can read the protected file.
- `wc` is a counting tool. Its name comes from “word count.”
- `-c` tells `wc` to count **bytes**, not words.
- `/etc/pgbouncer/pgbouncer.ini` is the file being measured.
- A result of `0` means the file contains no bytes: it is empty. This command does not change the file.


**Expected:** `0 /etc/pgbouncer/pgbouncer.ini` — the file is empty. If the file has contents, it is existing
work: stop and ask which checkpoint to resume. Do not erase it.

## Step 2: Open the configuration file

**Where to run:** POOLER server (`suta-pgb-pooler`), Linux terminal as `ubuntu` (any folder).

```bash
sudo -u postgres vi /etc/pgbouncer/pgbouncer.ini
```

**What this means:**

- `sudo -u postgres` runs this one command as the Linux user `postgres`.
- `vi` opens a text editor.
- `/etc/pgbouncer/pgbouncer.ini` is the file to edit. When you leave the editor, you are still `ubuntu`.


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

**What this means:**

- `sudo` gives this command administrator permission.
- `systemctl` manages background services.
- `start` starts the service.
- `pgbouncer` is the service name.


Now check that it started.

**On POOLER (`suta-pgb-pooler`) — Linux, as `ubuntu`:**

```bash
systemctl is-active pgbouncer
```

**What this means:**

- `systemctl` manages background services.
- `is-active` checks whether the service is running; it does not change it.
- `pgbouncer` is the service name.


Expect `active`. If not, stop and inspect `sudo journalctl -u pgbouncer -n 30`.
Do not disable authentication to fix a startup problem.

## Step 4: Open the PgBouncer admin console

**Where to run:** POOLER server (`suta-pgb-pooler`), Linux terminal as `ubuntu` (any folder).

```bash
sudo -iu postgres
```

**What this means:**

- `sudo` lets you run as another Linux user.
- `-i` starts that user’s login environment, including their home folder.
- `-u postgres` selects the Linux user `postgres`. Here `-i` and `-u` are written together as `-iu`.
- After this command, you are in a new Linux shell as `postgres`. You have not opened a database yet.


**On POOLER (`suta-pgb-pooler`) — Linux terminal, now as `postgres`:**

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


**Expected:** the `pgbouncer=#` prompt. No password prompt is needed.

`-X` ignores personal psql startup settings. `-h` selects this machine; `-p` selects PgBouncer. `-U` selects the database login.
`-w` refuses an interactive password prompt; it uses the prepared private password
file. Database `pgbouncer` is the admin console, not an application database.

**Where to run:** POOLER server (`suta-pgb-pooler`), inside psql connected to `pgbouncer` as `pooladmin`, port `6432`.

```sql
SHOW VERSION;
```

**What this means:**

- `SHOW VERSION` asks the PgBouncer admin console for its installed version.


**Expected:** PgBouncer `1.22.0`.

**On POOLER (`suta-pgb-pooler`) — same admin psql session, `pooladmin`, port `6432`:**

```sql
SHOW DATABASES;
```

**What this means:**

- `SHOW DATABASES` lists the database names PgBouncer accepts and where it sends their connections.


**Expected:** rows for `mattermost` and `pool_lab`.

**On POOLER (`suta-pgb-pooler`) — same admin psql session:**

```sql
SHOW CONFIG;
```

**What this means:**

- `SHOW CONFIG` lists the settings PgBouncer is currently using. Check this after reloading the configuration file.


**Expected:** `pool_mode` is `session` and `default_pool_size` is `4`.
If the output opens a page showing `(END)`, press **q** to return to the prompt.

**On POOLER (`suta-pgb-pooler`) — inside admin psql:**

```psql
\q
```

**What this means:**

- `\q` closes psql and returns you to the Linux prompt. It does not stop PostgreSQL or PgBouncer.


You are back in Linux as `postgres`.

## Step 5: Test a connection to the practice database

**Where to run:** POOLER server (`suta-pgb-pooler`), Linux terminal as `postgres` (any folder).

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


**Where to run:** POOLER server (`suta-pgb-pooler`), inside psql connected to `pool_lab` as `labuser`, port `6432`.

```sql
SELECT current_database(), current_user;
```

**What this means:**

- `SELECT` asks for values.
- `current_database()` returns the database name. `current_user` returns the database login role. This checks where you connected.


**Expected:** `pool_lab` and `labuser`. Stop if different.

**On POOLER (`suta-pgb-pooler`) — psql, `pool_lab`, user `labuser`, port `6432`:**

```sql
SELECT name FROM lab_identity;
```

**What this means:**

- `SELECT name` asks for the `name` column.
- `FROM lab_identity` reads it from the prepared identity table. The result confirms that you reached the lab database.


**Expected:** `suta-pgbouncer-phase1`.

**On POOLER (`suta-pgb-pooler`) — inside `pool_lab` psql:**

```psql
\q
```

**What this means:**

- `\q` closes psql and returns you to the Linux prompt. It does not stop PostgreSQL or PgBouncer.


**On POOLER (`suta-pgb-pooler`) — Linux terminal, as `postgres`:**

```bash
exit
```

**What this means:**

- `exit` leaves the current Linux shell. After `sudo -iu postgres`, it returns you to `ubuntu`. It is not a SQL command.


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
