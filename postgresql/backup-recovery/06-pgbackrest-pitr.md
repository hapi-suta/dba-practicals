# Labs 6–8 — pgBackRest, WAL and point-in-time recovery

**Before you start — instructor-led:**

- Use only your assigned class server, never a company database.
- Finish Lab 5 and stop its COPY. Keep SOURCE running.
- Read [the connection map](CLASS-SETUP.md) and [what has been tested](VALIDATION.md).
- The paths below are the actual class paths.

**What changes in this lab?**

- SOURCE already saves archived WAL in the instructor's backup folder (repository).
- You will create your own repository and tell SOURCE to use it.
- Keep the instructor's repository and configuration unchanged.
- Take a new full backup in your repository. The instructor's backup is not part of your new backup set.

**Returning after a disconnect?** Use [resume help](TROUBLESHOOTING.md). Exports
below must be set again in a new shell. Do not repeat inserts or incident deletes.

### Terms used below

- **pgBackRest:** the tool we use to back up and recover PostgreSQL.
- **Repository:** the place where pgBackRest stores backups and archived WAL.
- **WAL:** PostgreSQL's record of changes. Recovery replays it to recover changes made after a backup.
- **PITR (point-in-time recovery):** recover to a chosen safe point using a physical backup and the required WAL.
- **Stanza:** a named set of pgBackRest settings for one PostgreSQL cluster.

## Lab 6A — configure the repository

**What we’re doing:**

- Tell pgBackRest where the source cluster lives and where to store its backups.
- A stanza is the named configuration for this cluster.

**You finish with:**

- The `shop` stanza pointing at the actual source PGDATA, not the backup folder or restored copy.

**Your task:**

- Create the student backup folder and configuration file.
- Check the source path and backup path carefully.
- Run `stanza-create`. It must succeed before you change source archiving.

**Pause and discuss:**

- Point to `pg1-path` and `repo1-path` in your file.
- Explain which holds the running cluster and which will hold backups.
- Do not continue to 6B if stanza creation failed.

**Where:**

- Linux terminal as `postgres`.

```bash
cd /var/lib/postgresql/suta-backup-lab
```

**Expect:**

- Your existing Lab 0 folder.
- If absent, stop and locate your work.

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

**Important — these paths have different jobs:**

- `pg1-path=/var/lib/postgresql/16/lab`: the running SOURCE cluster's data files.
- `repo1-path=/var/lib/postgresql/suta-backup-lab/repo`: the folder for backups.
- Do not swap them. Never use `physical-copy`, `pitr-copy` or a placeholder for SOURCE's path.

Save with Ctrl+O, Enter; exit with Ctrl+X. Back in the Linux terminal:

```bash
export PGBACKREST_CONFIG=/var/lib/postgresql/suta-backup-lab/pgbackrest.conf
```

```bash
export PGBACKREST_STANZA=shop
```

**Why:**

- These tell commands in this terminal which configuration and stanza to use.
- The PostgreSQL service may not receive these terminal settings.
- Its `archive_command` therefore includes the full configuration options.

```bash
pgbackrest stanza-create
```

**Expect:**

- Success.
- If paths or permissions are wrong, stop and correct the paths or permissions in your setup.
- The local repository is for teaching, not protection against loss of this host/disk.

## Lab 6B — enable and prove archiving

**What we’re doing:**

- Send completed WAL segments to the student repository and check that archiving works.
- WAL is needed to recover changes after a backup.

**You finish with:**

- A successful archive check; then take a new full backup in Lab 7 so this repository has a usable starting point.

**Your task:**

- Check that you are connected to SOURCE.
- Change its archive command to use the student backup folder.
- Reload the settings, check the command in use, then test archiving.

**Pause and discuss:**

- Show the effective archive command and a successful `pgbackrest check`.
- Explain why changing a configuration file is not the same as proving PostgreSQL is successfully archiving WAL.

**Where:**

- Linux terminal as `postgres`.
- Connect explicitly to SOURCE:

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_shop
```

**Inside psql:**

```sql
SHOW data_directory;
```

**Expect:**

- `/var/lib/postgresql/16/lab`.
- If it says `physical-copy` or `pitr-copy`, exit and use the correct connection.
- Do not change that copy's archiving.

```sql
SHOW wal_level;
```

**Expect:**

- `replica` on the prepared class source.

```sql
SHOW archive_mode;
```

**Expect:**

- `on` on the prepared source.
- If off, stop for instructor preparation: enabling it needs a source restart.
- Do not improvise a restart during class.

```sql
SHOW archive_command;
```

Record the previous command. On these class servers it initially references
`/etc/pgbackrest/pgbackrest.conf`. Only after your student stanza-create succeeds:

```sql
ALTER SYSTEM SET archive_command = '/usr/bin/pgbackrest --config=/var/lib/postgresql/suta-backup-lab/pgbackrest.conf --stanza=shop archive-push %p';
```

**Why:**

- Move SOURCE archiving to the student repository.
- ALTER SYSTEM writes the effective override; editing postgresql.conf alone may be overridden by an earlier postgresql.auto.conf setting.
- This change is authorized only on your disposable source.

```sql
SELECT pg_reload_conf();
```

**Expect:**

- `true` means the reload was requested, not that every setting applied.
- Because archive_mode is already on, changing archive_command needs a reload, not a restart.
- Recheck:

```sql
SHOW archive_command;
```

**Expect:**

- The command above, pointing to your student config.
- If it still names the instructor config, stop and inspect effective settings; do not take a backup yet.

```sql
SELECT pg_switch_wal();
```

**Why:**

- Request a segment switch so completed WAL can be archived.
- Permission is required.

```sql
SELECT archived_count, last_archived_wal, last_archived_time, failed_count FROM pg_stat_archiver;
```

- Archiving runs in the background. Wait for it, then repeat this read-only query.
- Look for a recent successful archive.
- `failed_count` includes earlier failures. A nonzero count alone does not prove the current attempt failed.
- Record the values before and after the check.

```psql
\q
```

Shell:

```bash
pgbackrest check
```

**Expect:**

- Success.
- Investigate errors before backup.
- This check still does not replace a restore.

## Lab 7 — create and inspect the backup chain

**What we’re doing:**

- Take a full backup, make a change, take an incremental, make another change and take a differential.
- Inspect their dependencies.

**You finish with:**

- A verified backup inventory and the differential label you will select for recovery. pgBackRest resolves the required backup files.

**Your task:**

- Take a full backup.
- Change an order, then take an incremental backup.
- Change another order, then take a differential backup.
- Save the completed backup labels shown by `pgbackrest info`.

**Pause and discuss:**

- Show your backup inventory and identify the differential you will use.
- Explain which earlier backup it depends on.
- Do not begin the incident drill until the backups have completed successfully.

**Where:**

- Linux terminal as `postgres`, with the two Lab 6 exports still set.
- The failed/nonexistent-stanza error is a stop sign, not a reason to switch configs.
- Run each backup once and wait for it to finish before moving on.

```bash
pgbackrest --type=full backup
```

**Why:**

- Take the full backup that later incremental and differential backups will depend on.
- Wait for successful completion.

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

**Expect:**

- Shipped.

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

- A **differential** backup covers changes since the full backup.
- To restore this differential, pgBackRest needs it and the full backup—not the earlier incremental.
- These are pgBackRest backup types, not PostgreSQL's separate native incremental feature.

```bash
pgbackrest info
```

Record the exact completed differential label; call it `DIFF_LABEL` below.
pgBackRest chooses required files from that set and its dependencies, not a manual
full-then-incremental-then-differential command sequence.

## Lab 8A — create an incident with a known safe boundary

### The incident — read this before running commands

Bob's shop has a completed differential backup from Lab 7. Customers keep
placing orders after that backup. Someone then deletes Maria's order and its
item, and commits the mistake. Another valid order arrives afterward.

**Your job:** recover the missing order without losing valid newer orders.

| Stage | What happens on SOURCE | Why it matters |
|---|---|---|
| Backup completed | Orders 1001, 1002 and 1003 are saved. | This is the backup we will restore. |
| New order arrives | Order 1004 is saved, worth 40.00. | It is not in that backup. WAL is needed to recover it. |
| Safe point recorded | We create `suta_before_delete`. | The recovery copy must stop here. |
| Mistake committed | Maria's order 1001 and its item are deleted. | The missing order was worth 120.00. |
| Business continues | Order 1005 is saved, worth 15.00. | It is valid newer work that must stay on SOURCE. |

**Two labs, two different results:**

- **Lab 8:** build and check a separate recovery copy containing the missing data.
- **Lab 9:** bring only the missing order and item back into SOURCE.
- We do not replace SOURCE with the older copy. That would lose order 1005.

**This is a controlled practice incident:**

- We create a named safe point deliberately, before making the mistake.
- A real unexpected deletion may have no such marker. Finding a safe recovery
  target from incident evidence is a separate investigation.
- This lab uses a named target, not a clock-time target. Recording the time does
  not change the target type used by the restore command.
- These IDs assume the earlier labs were followed without extra inserts. If
  yours differ, stop and review the existing rows with the instructor; do not
  delete rows or reset the sequence to force a match.

**What we’re doing:**

- Add an order, mark a safe recovery point, then deliberately delete an older order and add a newer one in this disposable lab.

**You finish with:**

- A known mistake and evidence of which orders recovery must retrieve—and which newer order must survive on the source.

**Your task:**

- Run the practice incident once.
- Record the safe restore-point name and the order IDs.
- Check that the required WAL has been archived.

**Pause and discuss:**

- Explain which order was deleted, which order existed before the safe point, and which arrived afterward.
- Predict what should be in the recovery copy before starting Lab 8B.

**Run this incident sequence ONCE.** No other lab writes should run. If you are
resuming, inspect existing rows and your recorded restore point first. Reusing a
restore-point name or repeating an insert makes the evidence ambiguous.

**Where:**

- Linux terminal as `postgres`; connect to SOURCE explicitly:

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_shop
```

```sql
INSERT INTO shop.orders (customer_id, status, total) VALUES (3, 'New', 40) RETURNING order_id;
```

**Expect:**

- 1004 if the source was unchanged.
- Record the actual ID.
- This order is AFTER the differential and demonstrates why file restore alone is insufficient.

```sql
SELECT pg_create_restore_point('suta_before_delete');
```

**Why:**

- Mark a named safe point after the new order was saved, but before the delete.
- We will tell recovery to stop at this name.
- A query's timestamp in a log is not always the time its transaction committed.

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

**Expect:**

- Zero rows.
- Now prove we must preserve newer valid work:

```sql
INSERT INTO shop.orders (customer_id, status, total) VALUES (2, 'New', 15) RETURNING order_id;
```

**Expect:**

- Order ID `1005`.
- Record the actual value.

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

### What the recovered copy should contain

Restore the completed Lab 7 differential into separate storage. pgBackRest
retrieves the required files from that differential and its full backup.
When the copy starts, PostgreSQL replays the required archived WAL up to
`suta_before_delete`. The earlier incremental is not needed for this differential.

| Check | SOURCE after the incident, port 5432 | Recovery COPY at the safe point, port 55433 |
|---|---|---|
| Order 1001 | Missing | Present: the deletion has not been replayed. |
| Order 1004 | Present | Present: WAL recovered this post-backup order. |
| Order 1005 | Present | Absent: it was created after the safe point. |
| All order IDs | 1002, 1003, 1004, 1005 | 1001, 1002, 1003, 1004 |
| Count and total | 4 orders / 130.00 | 4 orders / 235.00 |

**Notice:** both databases contain four orders, but they are not the same four.
Check the IDs and values, not just the row count.

**By the end, you will be able to:**

- Explain why backup files alone cannot recover order 1004.
- Restore into a separate cluster without overwriting SOURCE.
- Recover to the named safe point using archived WAL.
- Verify the target-reached log entry, paused recovery state and actual rows.
- Explain why Lab 9 must return only the missing data rather than replace SOURCE.

**What we’re doing:**

- Restore a separate cluster from the selected backup, then replay archived WAL to the safe point before the deletion.
- Do not rewind source.

**You finish with:**

- A paused recovery copy containing orders 1001–1004, worth 235.00, with logs confirming the intended recovery point.

**Your task:**

- Restore the selected differential backup into `pitr-copy`.
- Set up the copy's separate connections and pass the safety checks.
- Start recovery and check that it pauses at the safe point.
- Check the recovered orders. Keep the copy paused for Lab 9.

**Pause and discuss:**

- Show the target-reached log entry, paused state and orders 1001–1004.
- Explain how order 1004 returned even though it was created after the differential backup.
- Keep the copy paused for Lab 9.

**Before proceeding:** use your incident evidence to confirm SOURCE still has
order 1005. Do not reconnect the shop to the recovery copy or promote it.

**Where:**

- Linux terminal as `postgres`.
- Keep SOURCE running; the Lab 5 copy must be stopped.
- Use a new, absent `pitr-copy` directory.
- Replace **only `DIFF_LABEL`** below with the exact completed differential label from your own `pgbackrest info`.
- Unlike the paths, that label is unique to your backup and cannot be prefilled.

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

**Expect:**

- All safety checks PASS.
- Otherwise stop; do not start the copy.

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

**Expect:**

- True / true at the requested pause; also inspect the target log entry.

```sql
SELECT * FROM shop.orders ORDER BY order_id;
```

**Expect:**

- Maria 1001 exists; pre-incident 1004 exists; later 1005 does NOT.
- This proves replay added data created after the differential but excluded later work.

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

**Expect:**

- 4 orders worth 235.00 with this lab's data.

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

**Expect:**

- Target/paused-state/data checks PASS.
- Keep the logs and check output.
- Do not resume recovery or promote this copy; Lab 9 exports from the paused copy.

**Reflection:** restore places backup files; recovery replays WAL. Why would the
differential alone miss order 1004? Why must we NOT replace the source with this copy?

Sources: [pgBackRest 2.50 guide](https://pgbackrest.org/prior/2.50/user-guide.html),
[PostgreSQL 16 archive recovery](https://www.postgresql.org/docs/16/continuous-archiving.html),
[named recovery targets and pause](https://www.postgresql.org/docs/16/runtime-config-wal.html#RUNTIME-CONFIG-WAL-RECOVERY-TARGET).
