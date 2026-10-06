# Your class server: connection map

This edition uses the assigned StepUP Ubuntu 24.04 / PostgreSQL 16 servers.
If your machine differs, ask the instructor before using these paths. Passwords,
student names and server addresses stay in your private connection sheet.

## Already prepared

- Your `student` SSH account; `sudo -iu postgres` opens the database OS account.
- The source cluster. Lab 0 creates your shop; it is not already done for you.
- PostgreSQL tools available from the `postgres` user's terminal, plus pgBackRest 2.50 and Node.js.
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
| Instructor config — keep unchanged | `/etc/pgbackrest/pgbackrest.conf` |
| Instructor repository — keep unchanged | `/var/lib/postgresql/prepared-backrest/repo` |

There is no `/LAB` or `/SOURCE_PGDATA` directory to create. Those were placeholders
in the earlier handout. Revised commands use the actual class paths.

- **SOURCE:** the original PostgreSQL cluster you are protecting.
- **COPY:** a separate cluster created from a backup for the recovery exercises.
- **Data directory (PGDATA):** the folder holding a cluster's database files.
- **Socket:** a local connection point. `-h` selects its folder and `-p` selects the port in these labs.
- **Repository:** the folder where pgBackRest keeps backups and archived WAL.

## Know which prompt you are using

| Context | What belongs there | Exit |
|---|---|---|
| Laptop terminal | SSH command from private connection sheet | After SSH connects, `exit` leaves the server session |
| Server Linux terminal as `postgres` | `pg_dump`, `pg_restore`, `nano`, `pg_ctl`, `node` | `exit` |
| Inside `psql` | SQL such as `SELECT` and `SHOW` | `\q` |

`bash` blocks are terminal commands; `sql` blocks are SQL; `conf` and `ini`
blocks are file contents for the named editor. Do not type prompt symbols.

Before a destructive drill, verify both `SHOW data_directory;` and
`SELECT current_database();` in that psql session. A similar prompt is not proof.

## Returning for another class

Stopped servers cannot accept SSH. The instructor must restart them and confirm
current addresses; public IPs can change. Do not provision replacements or reset
work. Get the latest connection sheet and follow [the steps for reconnecting and checking your previous work](TROUBLESHOOTING.md#returning-after-a-disconnect-or-another-help-page).
Agree a shutdown time with the instructor before class; this guide creates no
automatic schedule. Save your evidence before disconnecting.
