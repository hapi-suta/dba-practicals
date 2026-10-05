# Labs 6–8 — pgBackRest, WAL and point-in-time recovery

**Instructor-led; NOT locally rehearsed with pgBackRest.** Use the exact installed
version's guide. Complete INSTRUCTOR.md's gate first. No commands here authorize
changing a production cluster. `/LAB` and `/SOURCE_PGDATA` must be replaced in an
instructor copy. The source must be a disposable, self-contained standalone cluster.

## Lab 6A — configure the repository

Shell as postgres, inside the private lab working directory:

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

Enter the following after replacing paths, source port and socket. The `[shop]`
stanza identifies one protected cluster; it is not the database named suta_shop.

```ini
[global]
repo1-path=/LAB/repo
repo1-retention-full=2
log-level-console=info
log-level-file=off
lock-path=/LAB
spool-path=/LAB

[shop]
pg1-path=/SOURCE_PGDATA
pg1-port=5432
pg1-socket-path=/var/run/postgresql
```

Save and exit. In the shell:

```bash
export PGBACKREST_CONFIG=/LAB/pgbackrest.conf
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

Instructor edits the **disposable source's** actual PostgreSQL configuration.
Do not paste ALTER SYSTEM changes into an unidentified connection. Set:

```conf
wal_level = replica
archive_mode = on
archive_command = 'pgbackrest --config=/LAB/pgbackrest.conf --stanza=shop archive-push %p'
```

Ensure pgbackrest is in the PostgreSQL service's PATH or use its confirmed absolute
binary path. The instructor restarts ONLY the verified disposable source using
its documented service manager. No generic systemctl restart is supplied because
it could affect another cluster. `archive_mode` requires restart, not just reload.

Reconnect to the source with psql:

```sql
SHOW archive_mode;
```

Expect on.

```sql
SHOW archive_command;
```

Check the intended lab repository/configuration, not a production destination.

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

Shell:

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

No other lab writes should run during these steps. On the source:

```bash
psql -X -d suta_shop
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

Shell. Use a new, absent `pitr-copy` directory. The instructor must verify `/LAB`
is the real working folder and `DIFF_LABEL` is the exact label recorded above:

```bash
pgbackrest --pg1-path=/LAB/pitr-copy --set=DIFF_LABEL --type=name --target=suta_before_delete --target-action=pause restore
```

This is one command; explain each option before running:

- `--pg1-path`: separate recovery files, NEVER the source PGDATA.
- `--set`: specific completed backup before the restore point.
- `--type=name` / `--target`: the safe marker in WAL.
- `--target-action=pause`: stop replay at the target for inspection, not immediate writes.

Do not add delta/force options or restore over a nonempty directory. If the source
has tablespaces or external configuration, this procedure is not qualified for it.

After successful file restore, open `pitr-copy/postgresql.auto.conf` in nano.
**Preserve pgBackRest's generated recovery settings** (restore_command, target and
action). Apply the isolation settings from Lab 5 with the correct socket and port;
ensure no source data_directory override, active standby configuration or external
include can redirect the target. The Lab 5 recovery cluster must already be stopped.

```bash
pg_ctl -D pitr-copy -l pitr-recovery.log -w start
```

PostgreSQL now fetches required WAL through the generated restore_command and
replays it. pg_ctl returning is not proof that the desired target has been reached.

```bash
less pitr-recovery.log
```

Look for reaching the named restore point and pausing recovery. `q` exits.
Missing WAL or “target not reached” is failure, not an acceptable earlier recovery.

```bash
psql -X -h /LAB/recovery-socket -p 55433 -d suta_shop
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

**Reflection:** restore places backup files; recovery replays WAL. Why would the
differential alone miss order 1004? Why must we NOT replace the source with this copy?

Sources: [pgBackRest guide](https://pgbackrest.org/user-guide.html),
[PostgreSQL archive recovery](https://www.postgresql.org/docs/18/continuous-archiving.html).
