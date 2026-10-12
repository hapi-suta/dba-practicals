# Start — know where you are

**The task:** identify your three machines and start saving your work.
**Why:** the same command can mean something different on another server.
**Success:** you can name each server's job and find your saved output.

## 1. Open your assigned connections

**Where to run:** your own computer, in its terminal, before connecting to a server.

Use the exact SSH commands on your **private connection sheet**. The teacher
supplies these; do not guess an IP or copy a classmate's credentials.

In each Linux terminal, run:

**Where to run:** Each assigned server: APP (`suta-pgb-app`), POOLER (`suta-pgb-pooler`) and DB (`suta-pgb-db`), Linux terminal as `ubuntu`, after SSH login.

```bash
hostname
whoami
```

| Machine | Expected hostname | Login user | Job |
|---|---|---|---|
| APP | `suta-pgb-app` | `ubuntu` | Mattermost and traffic script |
| POOLER | `suta-pgb-pooler` | `ubuntu` | PgBouncer |
| DB | `suta-pgb-db` | `ubuntu` | PostgreSQL |

If either value differs, stop and ask the instructor to check your connection.
APP means `suta-pgb-app`; POOLER means `suta-pgb-pooler`; DB means `suta-pgb-db`.
Keep the terminals labelled APP, POOLER and DB. Later, two POOLER terminals will
be labelled A and B so you can keep two SQL connections open.

## 2. Save terminal output

**Where to run:** Each assigned server: APP (`suta-pgb-app`), POOLER (`suta-pgb-pooler`) and DB (`suta-pgb-db`), Linux terminal as `ubuntu` (any folder).

```bash
mkdir -p ~/pgbouncer-evidence
script -q -a ~/pgbouncer-evidence/terminal.txt
```

`script` records this terminal session. `-a` adds to the file rather than replacing
previous work. Do not display credentials or type passwords while recording.
The lab already has private password files for SQL connections.

When you finish recording, type `exit` at the **Linux prompt**. The file remains.
Do not type it inside psql: use `\q` there first.

## 3. Check the starting application

**Where to run:** APP server (`suta-pgb-app`), Linux terminal as `ubuntu` (any folder).

```bash
cd /opt/suta/pgbouncer-lab
curl -fsS http://127.0.0.1:8065/api/v4/system/ping
cat .runtime/state.json
```

Expect `status: OK` in the JSON response and `route: direct` in the state file.
The state file records the helper's last requested route; actual connections are
verified in the next lab. If the app is unavailable or the route is already pooled,
ask the instructor to identify the previous checkpoint. Do not reinstall or reset.

## Returning after a disconnect

**Where to run:** reconnect from your own computer, then use the assigned server's Linux terminal as `ubuntu`.

Reconnect using your private sheet, run `hostname`, and return to the folder
shown in the current step. On APP that is `/opt/suta/pgbouncer-lab`.
Open a new recording with `script -q -a` if needed. Read existing reports before
running traffic again. Every new run needs a new name.

**Show:** all three hostnames and the application health response.
**Discuss:** Which machine runs the traffic generator? Which holds the messages?
