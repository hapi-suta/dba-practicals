# Your class server: connection map

This edition uses the assigned StepUP Ubuntu 24.04 / PostgreSQL 16 servers.
If your machine differs, ask the instructor before using these paths. Passwords,
student names and server addresses stay in your private connection sheet.

## Already prepared

- Your `student` SSH account; `sudo -iu postgres` opens the database OS account.
- The source cluster. Lab 0 creates your shop; it is not already done for you.
- PostgreSQL tools in the postgres user's PATH, pgBackRest 2.50 and Node.js.
- An **instructor** pgBackRest repository used for setup testing. Lab 6 creates
  your **student** repository; do not mix their configurations.

| Purpose | Exact class value |
|---|---|
| SOURCE data directory | `/var/lib/postgresql/16/lab` |
| SOURCE socket / port | `/var/run/postgresql` / `5432` |
| Working folder (Lab 0) | `/var/lib/postgresql/suta-backup-lab` |
| Physical COPY (Lab 5) | `/var/lib/postgresql/suta-backup-lab/physical-copy` |
| PITR COPY (Lab 8) | `/var/lib/postgresql/suta-backup-lab/pitr-copy` |
| COPY socket / port | `/var/lib/postgresql/suta-backup-lab/recovery-socket` / `55433` |
| Student pgBackRest config | `/var/lib/postgresql/suta-backup-lab/pgbackrest.conf` |
| Student repository | `/var/lib/postgresql/suta-backup-lab/repo` |
| Instructor config — retain | `/etc/pgbackrest/pgbackrest.conf` |
| Instructor repository — retain | `/var/lib/postgresql/prepared-backrest/repo` |

There is no `/LAB` or `/SOURCE_PGDATA` directory to create. Those were placeholders
in the earlier handout. Revised commands use the actual class paths.

## Know which prompt you are using

| Context | What belongs there | Exit |
|---|---|---|
| Laptop terminal | SSH command from private connection sheet | `exit` after server session |
| Server Linux terminal as `postgres` | `pg_dump`, `pg_restore`, `nano`, `pg_ctl`, `node` | `exit` |
| Inside `psql` | SQL such as `SELECT` and `SHOW` | `\q` |

`bash` blocks are terminal commands; `sql` blocks are SQL; `conf` and `ini`
blocks are file contents for the named editor. Do not type prompt symbols.

Before a destructive drill, verify both `SHOW data_directory;` and
`SELECT current_database();` in that psql session. A similar prompt is not proof.

## Returning for another class

Stopped servers cannot accept SSH. The instructor must restart them and confirm
current addresses; public IPs can change. Do not provision replacements or reset
work. Get the latest connection sheet and use [resume help](TROUBLESHOOTING.md).
Agree a shutdown time with the instructor before class; this guide creates no
automatic schedule. Save your evidence before disconnecting.
