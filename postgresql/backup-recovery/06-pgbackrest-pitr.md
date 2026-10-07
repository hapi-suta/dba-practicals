# Labs 6–8 — pgBackRest, WAL and point-in-time recovery

**Before you start — instructor-led:**

- Use only your assigned class server, never a company database.
- Finish Lab 5 and stop its COPY. Keep SOURCE running.
- Read [the connection map](CLASS-SETUP.md). Your instructor must confirm that the server is prepared for these exercises.
- The paths below are the actual class paths.

**What you are building from scratch:**

- Your own pgBackRest settings in `/etc/pgbackrest/pgbackrest.conf`.
- A stanza using the empty repository directory `/var/lib/pgbackrest`.
- WAL archiving, followed by your own full, incremental and differential backups.
- A separate recovery copy to prove those backups work.

The instructor installs the packages and prepares directories, permissions and
an empty configuration file. You supply the configuration, create the stanza,
enable archiving and take the backups.

**Already started the older edition?** Do not replace a configuration, move a
repository or repeat the incident. Read [existing-work guidance](TROUBLESHOOTING.md#existing-pgbackrest-work)
with your instructor first. The fresh setup below is only for an unused backup setup.

**Returning after a disconnect?** Follow [the steps for reconnecting and checking your previous work](TROUBLESHOOTING.md#returning-after-a-disconnect-or-another-help-page).
Use the standard configuration and explicit `--stanza=shop` commands below.
Do not repeat inserts or incident deletes.

### Terms used below

- **pgBackRest:** the tool we use to back up and recover PostgreSQL.
- **Repository:** the place where pgBackRest stores backups and archived WAL.
- **WAL:** PostgreSQL's record of changes. Recovery replays it to recover changes made after a backup.
- **PITR (point-in-time recovery):** recover to a chosen safe point using a physical backup and the required WAL.
- **Stanza:** a named set of pgBackRest settings for one PostgreSQL cluster.
- **PGDATA:** the folder holding that cluster's database files. It is not the backup folder.

## Lab 6A — configure the repository

**The task:** connect two different places in the configuration: SOURCE's data
directory is what we protect; the repository is where backups and archived WAL
will be stored. You fill in the empty configuration here; Lab 6B enables archiving
and creates the stanza. Neither step takes a backup.

**What you’ll practise:**

- Tell pgBackRest where the source cluster lives and where to store its backups.
- A stanza is the named configuration for this cluster.

**Success looks like:**

- The `shop` stanza pointing at the actual source PGDATA, not the backup folder or restored copy.

**Pause and discuss:**

- Point to `pg1-path` and `repo1-path` in your file.
- Explain which holds the running cluster and which will hold backups.
- Do not continue to 6B if the configuration or permissions are incorrect.

**Where:**

- Linux terminal as `postgres`, on your assigned practice server.

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

First confirm SOURCE, rather than copying an unknown path into the configuration:

```bash
psql -X -h /var/run/postgresql -p 5432 -d postgres -c "SHOW data_directory"
```

`-X` skips psql startup files; `-h` and `-p` select SOURCE's socket and port;
`-d` selects the database; `-c` runs the query and returns to the terminal.
Expect `/var/lib/postgresql/16/lab`. Stop if different.

**Stay in the Linux terminal as `postgres`.** The instructor installs the software,
creates the directories and prepares an empty, editable configuration file.
You write the settings yourself.

Check your starting point:

```bash
ls -l /etc/pgbackrest/pgbackrest.conf
cat /etc/pgbackrest/pgbackrest.conf
ls -ld /var/lib/pgbackrest /var/log/pgbackrest
ls -A /var/lib/pgbackrest
```

- `ls -l` shows the file's owner and permissions. Expect `postgres postgres` and `-rw-r-----`.
- `cat` displays its contents. Expect an empty file, not a completed configuration.
- `ls -ld` shows directory ownership. Both directories must belong to `postgres`;
  the repository should show `drwx------`, and the log directory `drwxr-x---`.
- `ls -A` lists entries, including hidden ones. Expect no entries in the fresh repository.
- Missing file, permission error or existing settings/backups: stop and show the
  instructor. Do not erase or replace earlier work.

Open the empty file:

```bash
vi /etc/pgbackrest/pgbackrest.conf
```

Press `i` to edit. Enter the following yourself, explaining each setting.
`[shop]` names the cluster's backup configuration, not the database `suta_shop`.

```ini
[global]
repo1-path=/var/lib/pgbackrest
repo1-retention-full=2
log-level-console=info
log-level-file=info
log-path=/var/log/pgbackrest

[shop]
pg1-path=/var/lib/postgresql/16/lab
pg1-port=5432
pg1-socket-path=/var/run/postgresql
```

**Important — these paths have different jobs:**

- `pg1-path=/var/lib/postgresql/16/lab`: the running SOURCE cluster's data files.
- `repo1-path=/var/lib/pgbackrest`: the folder for backups and archived WAL.
- Do not swap them. Never use `physical-copy`, `pitr-copy` or a placeholder for SOURCE's path.
- `repo1-retention-full=2` keeps two full backup sets under the retention policy;
  this is a small lab policy, not a production retention recommendation.
- `log-level-console` and `log-level-file` choose how much progress is shown and saved.
- `pg1-port` and `pg1-socket-path` tell pgBackRest how to connect to SOURCE.

Save and quit: press `Esc`, type `:wq`, then press Enter.
To quit without saving, press `Esc`, type `:q!`, then press Enter.
Back in the `postgres` terminal, clear old config overrides if this terminal
was used with an earlier handout:

```bash
unset PGBACKREST_CONFIG PGBACKREST_CONFIG_PATH PGBACKREST_CONFIG_INCLUDE_PATH PGBACKREST_STANZA
cat /etc/pgbackrest/pgbackrest.conf
```

`unset` removes these terminal overrides; it does not edit a file or change the
running server. `cat` displays your file. Expect the settings you just entered,
without a permission error. This step does not erase older backup setups.

**Expect:**

- Your configuration is readable as `postgres`; the repository is owned by `postgres`.
- If a path or permission differs, stop before Lab 6B and show the output to the instructor.
- The local repository is for teaching, not protection against loss of this host/disk.

## Lab 6B — enable and prove archiving

**The task:** enable WAL archiving yourself, create the stanza, then prove
PostgreSQL can send completed WAL files to your repository. A successful check is
not a completed recovery: Lab 7 takes backups and Lab 8 tests recovery from them.

**What you’ll practise:**

- Send completed WAL segments to the student repository and check that archiving works.
- WAL is needed to recover changes after a backup.

**Success looks like:**

- A successful archive check; then take a new full backup in Lab 7 so this repository has a usable starting point.

**Pause and discuss:**

- Show the effective archive command and a successful `pgbackrest --stanza=shop check`.
- Explain why changing a configuration file is not the same as proving PostgreSQL is successfully archiving WAL.

**Where:**

- Linux terminal as `postgres`.
- Connect explicitly to SOURCE:

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_shop
```

**Connection options used throughout these labs:**

- `-X`: skip psql startup files so saved custom settings do not affect the commands.
- `-h`: choose the local socket folder; `-p`: choose the port.
- `-d suta_shop`: connect to the shop database on that cluster.
- SOURCE uses port `5432`; COPY uses its own socket folder and port `55433`.

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

- `replica` on a fresh PostgreSQL 16 cluster. We explicitly set it below.

```sql
SHOW archive_mode;
```

**Expect:**

- `off` on a fresh setup. You will turn it on and restart this practice SOURCE.
- If already `on`, stop and review existing-work guidance; do not redirect existing archiving blindly.

```sql
SHOW archive_command;
```

With archiving off, PostgreSQL may display `(disabled)` rather than the saved
empty archive command. Record all three settings. Any existing
archive destination must be preserved and reviewed before changing it.

```sql
SHOW archive_library;
```

Expect an empty value. This lab uses a shell archive command, not an archive
library. If a library is configured, stop and have the instructor review it.

```sql
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command = '/usr/bin/pgbackrest --stanza=shop archive-push %p';
```

**Why:**

- Enable WAL archiving using your standard configuration.
- `--stanza=shop` selects the cluster configuration. `archive-push` stores the completed WAL file; PostgreSQL replaces `%p` with its path.
- `ALTER SYSTEM` saves this setting in `postgresql.auto.conf`, which takes priority over the same setting in `postgresql.conf`.
- Run this change only on your assigned practice SOURCE, with the instructor.

```psql
\q
```

**Restart only your practice SOURCE — instructor confirms the target first.**
This briefly disconnects its sessions. Finish or roll back your transactions
and agree the restart with anyone using this assigned server. Do not do this
on a shared or production server. A reload cannot enable `archive_mode`.

**Where:** Linux terminal as `postgres`. This class uses a standalone cluster
managed with `pg_ctl`, not a service manager. Check its exact directory:

```bash
pg_ctl -D /var/lib/postgresql/16/lab status
pg_ctl -D /var/lib/postgresql/16/lab -l /var/lib/postgresql/suta-backup-lab/source-restart.log -m fast -w restart
```

`-D` selects SOURCE. `-l` saves server messages in the named log file.
`-m fast` disconnects sessions and rolls back unfinished
transactions; `-w` waits for restart. Expect the server to start successfully.
If it fails, save the error and stop; do not initialize another cluster.
Read `/var/lib/postgresql/suta-backup-lab/source-restart.log` with `less`
to see the startup error; press `q` to leave the log viewer.

Reconnect to check the settings actually in use:

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_shop
```

```sql
SHOW data_directory;
SHOW wal_level;
SHOW archive_mode;
SHOW archive_command;
```

**Expect:**

- SOURCE's path, `replica`, `on`, and the archive command above.
- If different, stop before backups and show the results to the instructor.

```psql
\q
```

**Where:** Linux terminal as `postgres`. Create the stanza now:

```bash
pgbackrest --stanza=shop stanza-create
pgbackrest --stanza=shop check
```

- `stanza-create` writes the repository metadata for this cluster, not a backup.
- `check` tests the configuration and WAL archiving. Wait for successful completion.
- Archiving may report a missing stanza between restart and stanza creation.
  PostgreSQL retries; do not delete WAL or ignore continuing failures.
- If stanza creation fails, save the complete error and use [path troubleshooting](TROUBLESHOOTING.md#1-stanza-create-fails-pg1-path-is-wrong).
- Do not start Lab 7 until both commands succeed.

Connect to SOURCE again and record the archiver counters before the test:

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_shop
```

```sql
SELECT archived_count, last_archived_wal, last_archived_time, failed_count FROM pg_stat_archiver;
```

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
- `failed_count` includes earlier failures. A number greater than zero does not by itself mean this attempt failed; compare it with your earlier reading.
- Record the values before and after the check.

```psql
\q
```

**Where:** back in the Linux terminal as `postgres`.

```bash
pgbackrest --stanza=shop check
```

**Expect:**

- Success.
- If it fails, save the full error and the preceding archiver query results. Show them to your instructor before taking a backup. Do not switch to another repository to get a passing result.
- This check still does not replace a restore.

## Lab 7 — create and inspect the backup chain

### The task — track changes through three backup types

The shop still has orders 1001–1003, totaling 195.00. We will change shipping
statuses, not add orders. That lets us see what changed without changing the total.

| Stage | Change on SOURCE | Backup taken afterward |
|---|---|---|
| Starting shop | Original order statuses | Full: the starting backup for this set |
| First change | Order 1001 becomes Shipped | Incremental: changes since the preceding backup |
| Second change | Order 1002 becomes Shipped | Differential: changes since the full backup |

**By the end, you will be able to:**

- Match each completed backup label to the changes made before it.
- Explain why the differential includes both shipping-status changes.
- Explain why restoring this differential needs its full backup, but not the earlier incremental.

**Keep safe:** do not remove any backup or archived WAL to prove a dependency.
Inspect `pgbackrest --stanza=shop info`; let pgBackRest select required files during restoration.

**This lab ends** with successful backups and the saved differential label.
It does not prove recovery yet. Lab 8 restores that backup and replays later WAL.

**Success looks like:**

- `pgbackrest --stanza=shop info` lists completed backups, and you have recorded the differential backup's label. pgBackRest selects the required files when you restore it in Lab 8.

**Pause and discuss:**

- Show your backup inventory and identify the differential you will use.
- Explain which earlier backup it depends on.
- Do not begin the incident drill until the backups have completed successfully.

**Where:**

- Linux terminal as `postgres`, using the configuration created in Lab 6.
- If an error says the stanza does not exist, return to [Lab 6A](#lab-6a--configure-the-repository) and check the configuration path and stanza name. Do not change repositories to clear an error.
- Run each backup once and wait for it to finish before moving on.

```bash
pgbackrest --stanza=shop --type=full backup
```

`--type=full` selects a full backup. Later, `--type=incr` selects an incremental
backup and `--type=diff` selects a differential backup.

**Why:**

- Take the full backup that later incremental and differential backups will depend on.
- Wait for successful completion.

```bash
pgbackrest --stanza=shop info
```

Record the full backup label. Connect to suta_shop and make a known change:

Here `psql -X` skips startup files and `-d` chooses the database. Without `-h`
and `-p`, these commands use your saved SOURCE connection settings from Lab 0.

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
pgbackrest --stanza=shop --type=incr backup
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
pgbackrest --stanza=shop --type=diff backup
```

- A **differential** backup covers changes since the full backup.
- To restore this differential, pgBackRest needs it and the full backup—not the earlier incremental.
- These are pgBackRest backup types, not PostgreSQL's separate native incremental feature.

```bash
pgbackrest --stanza=shop info
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

**Success looks like:**

- A known mistake and evidence of which orders recovery must retrieve—and which newer order must survive on the source.

**Pause and discuss:**

- Explain which order was deleted, which order existed before the safe point, and which arrived afterward.
- Predict what should be in the recovery copy before starting Lab 8B.

**Run this incident sequence ONCE.** No other lab writes should run. If you are
continuing earlier work, compare your saved results with the incident table above
and the final order query in Lab 8B. Ask the instructor to confirm which actions
already completed before making another change. Do not create the named restore
point or insert the test orders a second time.

**Where:**

- Linux terminal as `postgres`; connect to SOURCE explicitly:

Reminder: `psql -X` skips startup files; `-h`, `-p` and `-d` select the socket
folder, port and database. Keep SOURCE's port `5432` for this incident.

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
SHOW data_directory;
```

**Expect:** `/var/lib/postgresql/16/lab`. If either the database or directory
differs, STOP before BEGIN or DELETE. The recovery copy also contains a database
named `suta_shop`, so the name alone is not enough.

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
pgbackrest --stanza=shop check
```

Wait for `pgbackrest --stanza=shop check` to succeed. If it fails, save the error and stop before
Lab 8B. Recovery needs the archived WAL; a completed backup alone is not enough.

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

**Success looks like:**

- A paused recovery copy containing orders 1001–1004, worth 235.00, with logs confirming the intended recovery point.

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
- Replace **only `DIFF_LABEL`** below with the exact completed differential label from your own `pgbackrest --stanza=shop info`.
- Unlike the paths, that label is unique to your backup and cannot be prefilled.

```bash
cd /var/lib/postgresql/suta-backup-lab
```

If you reconnected, follow [the steps to reconnect and set your terminal variables](TROUBLESHOOTING.md#returning-after-a-disconnect-or-another-help-page)
first. This does not mean repeating the incident.

```bash
pgbackrest --config=/etc/pgbackrest/pgbackrest.conf --stanza=shop --pg1-path=/var/lib/postgresql/suta-backup-lab/pitr-copy --set=DIFF_LABEL --type=name --target=suta_before_delete --target-action=pause restore
```

This is one command; explain each option before running:

- `--pg1-path`: separate recovery files, NEVER the source PGDATA.
- `--config`: the standard pgBackRest configuration file. Passing it explicitly
  keeps the generated WAL-retrieval command independent of your terminal settings.
- `--stanza=shop`: the backup configuration for SOURCE.
- `--set`: specific completed backup before the restore point.
- `--type=name` / `--target`: the safe marker in WAL.
- `--target-action=pause`: stop replay at the target for inspection, not immediate writes.

Do not add `--delta` or `--force`, and do not restore over an existing copy.
If SOURCE uses data folders outside its main data directory (tablespaces) or
separate configuration files not covered by this class setup, stop. Your instructor
must prepare and test instructions for those paths first.

After successful file restore:

```bash
cp -n pitr-copy/postgresql.auto.conf pitr-copy/postgresql.auto.conf.before-isolation
```

`cp -n` saves a copy without replacing an earlier saved file of the same name.

```bash
vi pitr-copy/postgresql.auto.conf
```

Press `i` to edit. **Preserve all pgBackRest-generated recovery settings**, including restore_command,
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

Save and quit: press `Esc`, type `:wq`, then press Enter.
To quit without saving, press `Esc`, type `:q!`, then press Enter.

Complete [the before-start checks](CHECKS.md#before-starting-a-stopped-copy),
choosing **Lab 8 — PITR copy**, including its named recovery target checks.
The `recovery-socket` folder from Lab 5 must still exist.
These are direct PostgreSQL and Linux checks; no extra software or repository checkout is needed.

**Expect:**

- Every result must match the expectation on that page.
- If a result differs or prints an error, save the command and its output for your instructor. Do not start COPY.

```bash
pg_ctl -D /var/lib/postgresql/suta-backup-lab/pitr-copy -l /var/lib/postgresql/suta-backup-lab/pitr-recovery.log -w start
```

`-D` selects COPY's data directory. `-l` saves server messages to the named log.
`-w` waits for startup; it does not guarantee that WAL replay has reached our target.

PostgreSQL now fetches required WAL through the generated restore_command and
replays it. pg_ctl returning is not proof that the desired target has been reached.

```bash
less /var/lib/postgresql/suta-backup-lab/pitr-recovery.log
```

Press `G` to go to the end. Check messages from **this startup**, using their timestamps,
not a successful recovery from an earlier attempt. Look for
`recovery stopping at restore point "suta_before_delete"` and `recovery has paused`.
`q` exits.
Missing WAL or “target not reached” is failure, not an acceptable earlier recovery.

```bash
psql -X -h /var/lib/postgresql/suta-backup-lab/recovery-socket -p 55433 -d suta_shop
```

`-X` skips psql startup files. `-h` and `-p 55433` select COPY's connection;
`-d suta_shop` selects the database inside COPY.

```sql
SHOW data_directory;
```

**Expect:** `/var/lib/postgresql/suta-backup-lab/pitr-copy`.
If different, leave psql with `\q` and stop. You are not on the verified recovery copy.

```sql
SHOW port;
SHOW unix_socket_directories;
SHOW listen_addresses;
SHOW archive_mode;
SHOW recovery_target_name;
SHOW recovery_target_action;
```

**Expect, in order:**

- `55433`.
- `/var/lib/postgresql/suta-backup-lab/recovery-socket`.
- An empty value for `listen_addresses` (local socket connections only).
- `off` for archiving: COPY must not archive into SOURCE's backup repository.
- `suta_before_delete` and `pause` for the recovery target and action.
- Any difference: stop before exporting data and show the output to your instructor.

```sql
SELECT pg_is_in_recovery(), pg_is_wal_replay_paused();
```

**Expect:**

- Both values must be `true` (psql may display `t`). The log must also name `suta_before_delete` as the point reached. If either check differs, stop before exporting any data.

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
keep the recovered cluster read-only and paused, then export from it in Lab 9.
Do not turn this older copy into the shop's live database; it lacks order 1005.

```psql
\q
```

Keep the current startup log, connection settings, paused-state result and order
IDs as your evidence. Do not resume recovery or promote this copy; Lab 9 exports
from the paused copy.

**Reflection:** restore places backup files; recovery replays WAL. Why would the
differential alone miss order 1004? Why must we NOT replace the source with this copy?

Sources: [pgBackRest 2.50 guide](https://pgbackrest.org/prior/2.50/user-guide.html),
[PostgreSQL 16 archive recovery](https://www.postgresql.org/docs/16/continuous-archiving.html),
[named recovery targets and pause](https://www.postgresql.org/docs/16/runtime-config-wal.html#RUNTIME-CONFIG-WAL-RECOVERY-TARGET).
