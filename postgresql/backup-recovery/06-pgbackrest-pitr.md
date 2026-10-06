# Labs 6–8 — pgBackRest, WAL and point-in-time recovery

**Instructor-led.** Use only your assigned class server. Complete Lab 5 first,
stop its COPY, and keep SOURCE running. Read [the connection map](CLASS-SETUP.md)
and [validation scope](VALIDATION.md). Every path below is an actual class path.
No command here authorizes changing a company database.

**What changes in this lab?** Your source already archives into an instructor
repository. You will create a different student repository and point SOURCE at
it. Keep the old repository/configuration. A new full backup is required in the
student repository; the instructor backup is not part of your new backup chain.

**Returning after a disconnect?** Use [resume help](TROUBLESHOOTING.md). Exports
below must be set again in a new shell. Do not repeat inserts or incident deletes.

## Lab 6A — configure the repository

**What we’re doing:** tell pgBackRest where the source cluster lives and where
to store its backups. A stanza is the named configuration for this cluster.
**You finish with:** the `shop` stanza pointing at the actual source PGDATA,
not the backup folder or restored copy.

**Your task:** create the student repository and configuration, check both
paths, and run `stanza-create` successfully before changing source archiving.

**Pause and discuss:** point to `pg1-path` and `repo1-path` in your file.
Explain which holds the running cluster and which will hold backups. Do not
continue to 6B if stanza creation failed.

**Where:** Linux terminal as `postgres`.

```bash
cd /var/lib/postgresql/suta-backup-lab
```

**Expect:** your existing Lab 0 folder. If absent, stop and locate your work.

```bash
pgbackrest version
```

If missing, stop for instructor preparation. Do not install during a recovery incident.

```bash
mkdir repo
```

```bash
nano pgbackrest.conf
```

Enter this exact configuration for the class server. If the file/repo already
exists, inspect it instead of overwriting it. `[shop]` identifies the protected
cluster, not the database named `suta_shop`.

```ini
[global]
repo1-path=/var/lib/postgresql/suta-backup-lab/repo
repo1-retention-full=2
log-level-console=info
log-level-file=off
lock-path=/var/lib/postgresql/suta-backup-lab
spool-path=/var/lib/postgresql/suta-backup-lab

[shop]
pg1-path=/var/lib/postgresql/16/lab
pg1-port=5432
pg1-socket-path=/var/run/postgresql
```

**Important:** `pg1-path=/var/lib/postgresql/16/lab` is SOURCE's data directory.
It is not `physical-copy`, `pitr-copy`, the repository, or a placeholder.
`repo1-path` is where backups are stored. Do not swap these two paths.

Save with Ctrl+O, Enter; exit with Ctrl+X. Back in the Linux terminal:

```bash
export PGBACKREST_CONFIG=/var/lib/postgresql/suta-backup-lab/pgbackrest.conf
```

```bash
export PGBACKREST_STANZA=shop
```

Why: these set the configuration/stanza for short interactive commands. PostgreSQL's
service does not necessarily inherit them; archive_command uses explicit options.

```bash
pgbackrest stanza-create
```

Expect success. If paths or permissions are wrong, stop and correct the worksheet.
The local repository is for teaching, not protection against loss of this host/disk.

## Lab 6B — enable and prove archiving

**What we’re doing:** send completed WAL segments to the student repository and
check that archiving works. WAL is needed to recover changes after a backup.
**You finish with:** a successful archive check; then take a new full backup
in Lab 7 so this repository has a usable starting point.

**Your task:** verify the source connection, change its archive command to the
student repository, reload and check the effective setting, then prove archiving.

**Pause and discuss:** show the effective archive command and a successful
`pgbackrest check`. Explain why changing a configuration file is not the same
as proving PostgreSQL is successfully archiving WAL.

**Where:** Linux terminal as `postgres`. Connect explicitly to SOURCE:

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_shop
```

**Inside psql:**

```sql
SHOW data_directory;
```

**Expect:** `/var/lib/postgresql/16/lab`. If it says `physical-copy` or `pitr-copy`,
exit and use the correct connection. Do not change that copy's archiving.

```sql
SHOW wal_level;
```

**Expect:** `replica` on the prepared class source.

```sql
SHOW archive_mode;
```

**Expect:** `on` on the prepared source. If off, stop for instructor preparation:
enabling it needs a source restart. Do not improvise a restart during class.

```sql
SHOW archive_command;
```

Record the previous command. On these class servers it initially references
`/etc/pgbackrest/pgbackrest.conf`. Only after your student stanza-create succeeds:

```sql
ALTER SYSTEM SET archive_command = '/usr/bin/pgbackrest --config=/var/lib/postgresql/suta-backup-lab/pgbackrest.conf --stanza=shop archive-push %p';
```

**Why:** move SOURCE archiving to the student repository. ALTER SYSTEM writes the
effective override; editing postgresql.conf alone may be overridden by an earlier
postgresql.auto.conf setting. This change is authorized only on your disposable source.

```sql
SELECT pg_reload_conf();
```

**Expect:** `true` means the reload was requested, not that every setting applied.
Because archive_mode is already on, changing archive_command needs a reload,
not a restart. Recheck:

```sql
SHOW archive_command;
```

**Expect:** the command above, pointing to your student config. If it still names
the instructor config, stop and inspect effective settings; do not take a backup yet.

```sql
SELECT pg_switch_wal();
```

Why: request a segment switch so completed WAL can be archived. Permission is required.

```sql
SELECT archived_count, last_archived_wal, last_archived_time, failed_count FROM pg_stat_archiver;
```

Archiving is asynchronous: allow it to complete and repeat this read-only query.
Look for a recent successful archive; historical failed_count alone does not
mean the current attempt failed. Record before/after values.

```psql
\q
```

Shell:

```bash
pgbackrest check
```

Expect success. Investigate errors before backup. This check still does not replace a restore.

## Lab 7 — create and inspect the backup chain

**What we’re doing:** take a full backup, make a change, take an incremental,
make another change and take a differential. Inspect their dependencies.
**You finish with:** a verified backup inventory and the differential label
you will select for recovery. pgBackRest resolves the required backup files.

**Your task:** follow the full → change → incremental → change → differential
sequence below. Save the completed backup labels from `pgbackrest info`.

**Pause and discuss:** show your backup inventory and identify the differential
you will use. Explain which earlier backup it depends on. Do not begin the
incident drill until the backups have completed successfully.

**Where:** Linux terminal as `postgres`, with the two Lab 6 exports still set.
The failed/nonexistent-stanza error is a stop sign, not a reason to switch configs.
Run each backup once and wait for it to finish before moving on.

```bash
pgbackrest --type=full backup
```

Why: establish the complete backup basis. Wait for successful completion.

```bash
pgbackrest info
```

Record the full backup label. Connect to suta_shop and make a known change:

```bash
psql -X -d suta_shop
```

```sql
UPDATE shop.orders SET status = 'Shipped' WHERE order_id = 1001;
```

```sql
SELECT order_id, status FROM shop.orders WHERE order_id = 1001;
```

Expect Shipped.

```psql
\q
```

```bash
pgbackrest --type=incr backup
```

An incremental captures changes since the preceding backup in its chain.

```bash
psql -X -d suta_shop
```

```sql
UPDATE shop.orders SET status = 'Shipped' WHERE order_id = 1002;
```

```psql
\q
```

```bash
pgbackrest --type=diff backup
```

A differential covers changes since its full backup. The earlier incremental is
not an extra restore dependency for this differential. These are pgBackRest types,
not PostgreSQL's newer native incremental feature.

```bash
pgbackrest info
```

Record the exact completed differential label; call it `DIFF_LABEL` below.
pgBackRest chooses required files from that set and its dependencies, not a manual
full-then-incremental-then-differential command sequence.

## Lab 8A — create an incident with a known safe boundary

**What we’re doing:** add an order, mark a safe recovery point, then deliberately
delete an older order and add a newer one in this disposable lab.
**You finish with:** a known mistake and evidence of which orders recovery
must retrieve—and which newer order must survive on the source.

**Your task:** run the incident sequence once, record the safe restore point
and order IDs, and confirm the required WAL was archived.

**Pause and discuss:** explain which order was deleted, which order existed
before the safe point, and which arrived afterward. Predict what should be in
the recovery copy before starting Lab 8B.

**Run this incident sequence ONCE.** No other lab writes should run. If you are
resuming, inspect existing rows and your recorded restore point first. Reusing a
restore-point name or repeating an insert makes the evidence ambiguous.
**Where:** Linux terminal as `postgres`; connect to SOURCE explicitly:

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_shop
```

```sql
INSERT INTO shop.orders (customer_id, status, total) VALUES (3, 'New', 40) RETURNING order_id;
```

Expected 1004 if the source was unchanged. Record the actual ID. This order is
AFTER the differential and demonstrates why file restore alone is insufficient.

```sql
SELECT pg_create_restore_point('suta_before_delete');
```

Why: mark a reproducible safe WAL boundary after the committed insert, before
the damage. This lab uses a named target; it avoids pretending a statement log
timestamp is necessarily the transaction's commit timestamp.

```sql
SELECT clock_timestamp(), current_setting('TimeZone');
```

Record time and zone as incident evidence. Confirm current database before DELETE:

```sql
SELECT current_database();
```

Must be suta_shop on the disposable source. Delete dependent items first so the
foreign key is respected, and commit both changes together:

```sql
BEGIN;
```

```sql
DELETE FROM shop.order_items WHERE order_id = 1001;
```

```sql
DELETE FROM shop.orders WHERE order_id = 1001;
```

```sql
COMMIT;
```

```sql
SELECT * FROM shop.orders WHERE order_id = 1001;
```

Expect zero rows. Now prove we must preserve newer valid work:

```sql
INSERT INTO shop.orders (customer_id, status, total) VALUES (2, 'New', 15) RETURNING order_id;
```

Expected 1005. Record the actual value.

```sql
SELECT pg_switch_wal();
```

```psql
\q
```

```bash
pgbackrest check
```

Require success and the needed archived history before recovery.

## Lab 8B — restore files, then replay WAL

**What we’re doing:** restore a separate cluster from the selected backup, then
replay archived WAL to the safe point before the deletion. Do not rewind source.
**You finish with:** a paused recovery copy containing orders 1001–1004,
worth 235.00, with logs confirming the intended recovery point.

**Your task:** restore the selected differential into `pitr-copy`, isolate it,
pass preflight, start recovery and verify that replay paused at your safe point.

**Pause and discuss:** show the target-reached log entry, paused state and
orders 1001–1004. Explain how order 1004 returned even though it was created
after the differential backup. Keep the copy paused for Lab 9.

**Where:** Linux terminal as `postgres`. Keep SOURCE running; the Lab 5 copy must
be stopped. Use a new, absent `pitr-copy` directory. Replace **only `DIFF_LABEL`**
below with the exact completed differential label from your own `pgbackrest info`.
Unlike the paths, that label is unique to your backup and cannot be prefilled.

```bash
pgbackrest --pg1-path=/var/lib/postgresql/suta-backup-lab/pitr-copy --set=DIFF_LABEL --type=name --target=suta_before_delete --target-action=pause restore
```

This is one command; explain each option before running:

- `--pg1-path`: separate recovery files, NEVER the source PGDATA.
- `--set`: specific completed backup before the restore point.
- `--type=name` / `--target`: the safe marker in WAL.
- `--target-action=pause`: stop replay at the target for inspection, not immediate writes.

Do not add delta/force options or restore over a nonempty directory. If the source
has tablespaces or external configuration, this procedure is not qualified for it.

After successful file restore:

```bash
cp -n pitr-copy/postgresql.auto.conf pitr-copy/postgresql.auto.conf.before-isolation
```

```bash
nano pitr-copy/postgresql.auto.conf
```

**Preserve all pgBackRest-generated recovery settings**, including restore_command,
target name and pause action. Do not replace the whole file. Change/add only these
isolation settings in the STOPPED PITR COPY, keeping one active entry per setting:

```conf
port = 55433
listen_addresses = ''
unix_socket_directories = '/var/lib/postgresql/suta-backup-lab/recovery-socket'
archive_mode = off
archive_command = ''
primary_conninfo = ''
ssl = off
```

Save and exit. The private recovery-socket directory from Lab 5 must still exist.

```bash
node /var/lib/postgresql/dba-practicals/postgresql/backup-recovery/check-lab.mjs preflight pitr
```

**Expect:** all safety checks PASS. Otherwise stop; do not start the copy.

```bash
pg_ctl -D /var/lib/postgresql/suta-backup-lab/pitr-copy -l pitr-recovery.log -w start
```

PostgreSQL now fetches required WAL through the generated restore_command and
replays it. pg_ctl returning is not proof that the desired target has been reached.

```bash
less pitr-recovery.log
```

Look for reaching the named restore point and pausing recovery. `q` exits.
Missing WAL or “target not reached” is failure, not an acceptable earlier recovery.

```bash
psql -X -h /var/lib/postgresql/suta-backup-lab/recovery-socket -p 55433 -d suta_shop
```

```sql
SHOW data_directory;
```

Must be pitr-copy.

```sql
SELECT pg_is_in_recovery(), pg_is_wal_replay_paused();
```

Expect true / true at the requested pause; also inspect the target log entry.

```sql
SELECT * FROM shop.orders ORDER BY order_id;
```

Expected: Maria 1001 exists; pre-incident 1004 exists; later 1005 does NOT.
This proves replay added data created after the differential but excluded later work.

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

Expected 4 and 235.00 with this exact fixture.

Do not resume replay before inspection. For this selective-recovery exercise,
keep the recovered cluster read-only/paused and export from it in Lab 9. A new
production primary/promotion/cutover is a separate decision, not required here.

```psql
\q
```

**Back in the Linux terminal:**

```bash
node /var/lib/postgresql/dba-practicals/postgresql/backup-recovery/check-lab.mjs recovery pitr
```

**Expect:** target/paused-state/data checks PASS. Keep the logs and check output.
Do not resume recovery or promote this copy; Lab 9 exports from the paused copy.

**Reflection:** restore places backup files; recovery replays WAL. Why would the
differential alone miss order 1004? Why must we NOT replace the source with this copy?

Sources: [pgBackRest 2.50 guide](https://pgbackrest.org/prior/2.50/user-guide.html),
[PostgreSQL 16 archive recovery](https://www.postgresql.org/docs/16/continuous-archiving.html).
