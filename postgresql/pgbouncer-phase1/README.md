# Phase 1 — understand PgBouncer with Mattermost

**StepUP Tech Academy · SUTA Labs**

Your team uses Mattermost to send messages. You will place PgBouncer between
Mattermost and PostgreSQL, watch connections being reused, and investigate waiting.

**The connection path:** Mattermost → PgBouncer → PostgreSQL.

| Order | Exercise | What you will show |
|---|---|---|
| 0 | [Get ready](00-start.md) | Correct machines, tools and saved output |
| 1 | [Measure direct traffic](01-baseline.md) | A working app and a baseline |
| 2 | [Configure PgBouncer](02-configure.md) | Your configuration reaches the right database |
| 3 | [Connect Mattermost](03-connect-app.md) | Messages pass through the pooler |
| 4 | [Prove connection reuse](04-pooling-modes.md) | Session versus transaction behaviour |
| 5 | [Diagnose waiting](05-waiting.md) | A queue and its actual cause |
| 6 | [Tune and recover](06-tune-recover.md) | Measured changes and restored application access |

**Before class:** know how to SSH, edit a file, run a SELECT, and distinguish a
Linux terminal from a SQL prompt. Review BEGIN, COMMIT and ROLLBACK with the teacher.

Use only the three assigned lab machines. The instructor installs packages,
creates credentials and databases, and supplies an **empty** PgBouncer configuration.
You write the pooling settings. Do not change another student's environment.

Tested software: Ubuntu 24.04, PostgreSQL 16.15, PgBouncer 1.22.0 and Mattermost
Team Edition 11.7.12. Read [the instructor validation record](../../internal/postgresql/pgbouncer-phase1/VALIDATION.md)
for executed checks and limits. The earlier local-container run used a different
PgBouncer version; it does not replace the native-server evidence.

A browser user is not a database connection. Mattermost has its own connection
pool; PgBouncer has another. We will observe both.

[If something differs](TROUBLESHOOTING.md) · [Instructor preparation](../../instructor/postgresql/pgbouncer-phase1/README.md)
