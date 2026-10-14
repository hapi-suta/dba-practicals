# PgBouncer with Mattermost

Learn how PgBouncer lets applications reuse PostgreSQL connections.

You have three servers. The teacher has already installed the software and created
all accounts. You do not need to install packages or create databases.

| Server | Name shown after login | What it does |
|---|---|---|
| APP | `suta-pgb-app` | Runs Mattermost and sends test messages |
| POOLER | `suta-pgb-pooler` | Runs PgBouncer |
| DB | `suta-pgb-db` | Stores the messages in PostgreSQL |

Use the IP addresses and passwords on **your private login sheet**.
The hostnames are the same for every student; the IP addresses are different.

## First lesson: get the application working through PgBouncer

Start here. Do one page at a time.

| Step | Guide | You will see |
|---|---|---|
| 0 | [Connect to your servers](00-start.md) | The correct server names |
| 1 | [Send test messages](01-baseline.md) | Mattermost talking directly to PostgreSQL |
| 2 | [Configure PgBouncer](02-configure.md) | PgBouncer running and accepting a connection |
| 3 | [Send messages through PgBouncer](03-connect-app.md) | The new connection path working |

**Pause after Exercise 3.** Show your teacher the result before continuing.
You have changed the path from **APP → DB** to **APP → POOLER → DB**.

## Second lesson: understand connection reuse

[Exercise 4 — session and transaction pooling](04-pooling-modes.md).
Work with the teacher for the short two-connection demonstration.

## Then practise diagnosis and recovery

These are follow-up exercises. Do them after you can explain Exercise 4.

- [Exercise 5 — why requests wait](05-waiting.md): teacher-led timing exercise.
- [Exercise 6 — tune and recover](06-tune-recover.md): compare settings and restore access.

If a check fails, stop at that step and use [Troubleshooting](TROUBLESHOOTING.md).
Do not reset your server or erase work to start again.

## How to read these guides

Each step names the server and the user, gives the command, and tells you what to expect.
Only copy command boxes. Text labelled **Expected** describes the result.

`ubuntu` is your Linux login. `postgres` is another Linux account used for database
commands. A psql prompt means you are inside the database command tool.
[Exercise 0](00-start.md) explains how to move between them.

Tested: Ubuntu 24.04, PostgreSQL 16.15, PgBouncer 1.22.0, Mattermost 11.7.12.
[Instructor preparation](../../instructor/postgresql/pgbouncer-phase1/README.md) ·
[Validation and limits](../../internal/postgresql/pgbouncer-phase1/VALIDATION.md)
