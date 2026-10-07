# PostgreSQL Backup & Recovery — practical labs

StepUP Tech Academy · Student handouts

Bob's shop has customers, orders and order items. Your job is to recover usable
data without overwriting good data that arrived after the backup.

## Start here

[What we’re doing in each lab — one-page overview](LAB-OVERVIEW.md).
Read this first; every individual lab also starts with its purpose and end result.

1. Read [your server connection map](CLASS-SETUP.md): SOURCE 5432 versus COPY 55433.
2. Follow the beginner labs 0–4. Run each write once; record the expected checks.
3. Use [the direct PostgreSQL checks](CHECKS.md) and [help with errors or unfinished work](TROUBLESHOOTING.md).
4. Start Labs 5–11 with your instructor after the earlier labs' data checks pass.

Use only your assigned practice server. Never run these deletion and recovery
exercises against a company database. Keep the original cluster, called SOURCE,
running. Stop a recovery COPY only at the step that tells you to do so, using
its exact path. Do not delete database folders, backups or WAL files.

| Order | Lab | Suggested time | Result |
|---|---|---|---|
| 0 | [Connect and create the shop](00-start.md) | 15–20 min | Known data and correct connection |
| 1 | [Plain SQL backup and restore](01-plain.md) | 15 min | A separate restored database |
| 2 | [Custom, schema and table backups](02-custom.md) | 20 min | Inspect and restore archives |
| 3 | [Recover a dropped table](03-table.md) | 15 min | Delivery-note table, rows and table rules recovered |
| 4 | [Roles and access](04-roles.md) | 15 min | Recovered permissions checked |
| 5 | [Physical backup](05-physical.md) | 25 min | A separate physical cluster copy |
| 6–8 | [pgBackRest, WAL and PITR](06-pgbackrest-pitr.md) | 60–90 min | Configure pgBackRest yourself, take backups and recover before a committed mistake |
| 9–11 | [Incident drills and evidence](09-drills.md) | 30–45 min | Missing rows returned; recovery verified |

Allow time to practise and discuss. Start with Labs 0–4 over as many sessions
as you need. Before Labs 5–11, your instructor must confirm the server setup,
available disk space and completed earlier steps.

**Class edition:** commands now use actual StepUP server paths, not `/LAB`
placeholders. Do not substitute your source directory for a recovery-copy path.
Compare the actual rows and settings with your lab. A file existing is not proof of a successful recovery.

Each command block is one action. `bash` means the Linux terminal; `sql` means
inside psql. `psql` blocks contain psql commands such as `\q`. Do not type the
prompt itself. Compare your command output with the expected result under each
step. A backup file existing does not prove it can restore the data; you must
complete the restore and data checks too.

## Help and what to submit

- [Connection map](CLASS-SETUP.md) — which server, database and port to use.
- [Help with errors or unfinished work](TROUBLESHOOTING.md) — reconnect, check what already ran and avoid overwriting it.
- [Check your progress](CHECKS.md) — a read-only command; no need to read its code.
- [Evidence sheet](EVIDENCE.md) — record what you did and how you proved it worked.

Submit evidence, not passwords or backup files. Your instructor confirms the
server setup before class. No database server runs on GitHub.

**Teaching this course?** Use the separate [instructor area](../../instructor/README.md).
