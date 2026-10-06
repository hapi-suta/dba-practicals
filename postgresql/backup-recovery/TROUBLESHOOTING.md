# Resume safely: do not start the lab again from the top

**First:** confirm the instructor has started your assigned server and supplied
its current address. A stopped server cannot accept SSH. Keep existing data,
backups and logs. Do not recreate/drop a database to clear an error.

## Returning after a disconnect or another help page

On your assigned server, run `whoami` in the Linux terminal. If it says `student`,
run `sudo -iu postgres`. If it already says `postgres`, do not switch again.
If you are inside psql, use `\q` to return to the Linux terminal first.

```bash
cd /var/lib/postgresql/suta-backup-lab
```

```bash
pwd
```

**Expect:** the exact folder above. If absent, stop and locate existing work.

```bash
export PGHOST=/var/run/postgresql PGPORT=5432 PGUSER=postgres
```

```bash
psql -X -h /var/run/postgresql -p 5432 -U postgres -d postgres -c "SHOW data_directory"
```

**Expect:** `/var/lib/postgresql/16/lab`. Otherwise stop; you have not confirmed
SOURCE. These terminal settings select SOURCE; they do not start or change it.
For COPY, use the lab's explicit private socket and port 55433 instead.

**For Labs 6–11 only, after your student configuration already exists:**

```bash
ls -l /var/lib/postgresql/suta-backup-lab/pgbackrest.conf
```

If absent, return to Lab 6A with the instructor. Do not switch to the instructor
config. If present, restore the two terminal settings:

```bash
export PGBACKREST_CONFIG=/var/lib/postgresql/suta-backup-lab/pgbackrest.conf PGBACKREST_STANZA=shop
```

Now find your last saved checkpoint and inspect current data before continuing.
Do not rerun CREATE, INSERT, DELETE, DROP, backup or restore commands merely
because you reconnected. A disconnect during Lab 9 loses its temporary staging
tables; inspect whether the merge committed before recreating any staging work.

If you opened this page inside an active transaction, do not leave it hanging:
ask the instructor whether to finish or roll back before reconnecting.

## 1. Stanza-create fails: pg1-path is wrong

**Where:** Linux terminal as `postgres`.

```bash
nano /var/lib/postgresql/suta-backup-lab/pgbackrest.conf
```

Under `[shop]`, the exact class setting is:

```ini
pg1-path=/var/lib/postgresql/16/lab
```

This points to SOURCE PGDATA. `/Source_pgdata` and `/SOURCE_PGDATA` are not real
class paths. `repo1-path` separately names your backup folder; do not point pg1-path
there or at a restored copy. Save and exit. Restore your shell settings:

```bash
export PGBACKREST_CONFIG=/var/lib/postgresql/suta-backup-lab/pgbackrest.conf
```

```bash
export PGBACKREST_STANZA=shop
```

```bash
pgbackrest stanza-create
```

**Expect:** successful completion. If not, retain the complete error and ask the
instructor. Do not switch to the instructor repository just to get a success message.
Return to Lab 6B only after this succeeds.

## 2. Copy will not start: `/LAB/recovery-socket` does not exist

That was a placeholder in the old handout. For these servers the COPY needs:

```conf
unix_socket_directories = '/var/lib/postgresql/suta-backup-lab/recovery-socket'
```

Check the COPY's status before changing its file:

```bash
pg_ctl -D /var/lib/postgresql/suta-backup-lab/physical-copy status
```

If stopped, follow Lab 5 steps 3–4: save old config, edit the copy, then run the
preflight check. Do not create a fake `/LAB` directory to satisfy the old setting.

## 3. Copy is running, but the guide's connection fails

**Where:** Linux terminal as `postgres`.

```bash
postgres -D /var/lib/postgresql/suta-backup-lab/physical-copy -C unix_socket_directories
```

```bash
postgres -D /var/lib/postgresql/suta-backup-lab/physical-copy -C port
```

These read disk settings, not necessarily settings loaded by an already-running
server. Ask the instructor to connect using the observed socket/port and confirm
`SHOW data_directory;` in that session. Never guess that port 5432 is your copy.
If the verified physical COPY is running with wrong isolation settings, stop only it:

```bash
pg_ctl -D /var/lib/postgresql/suta-backup-lab/physical-copy -m fast -w stop
```

This disconnects COPY sessions. Then follow Lab 5 steps 3–5. No new backup is
needed just to correct the copy's port/socket. Leave SOURCE running.

## 4. pgBackRest reports a working-directory / pg1-path mismatch

On these class copies, this error can occur when inherited source archiving is
still enabled on COPY. Inspect the COPY's effective archive_mode. Lab 5 requires
`off` and an empty archive_command on COPY, while SOURCE stays `on`.

Do not "fix" this by changing the source stanza's pg1-path to physical-copy.
Stop the verified copy first, then correct its isolation settings and preflight it.
For PITR, retain the generated restore_command: fetching archived WAL during
recovery is different from archiving new WAL from a running copy.

## 5. Too many orders or items

**Where:** inside psql on the database whose count differs. Confirm its identity:

```sql
SELECT current_database();
```

```sql
SELECT order_id, customer_id, status, total FROM shop.orders ORDER BY order_id;
```

```sql
SELECT order_id, product, count(*) FROM shop.order_items GROUP BY order_id, product HAVING count(*) > 1;
```

At the end of Lab 2, custom restore should have four orders totalling 205.00.
Two `New / 10.00` rows suggest the one-time test insert was repeated. Source should
have three items; duplicate Camera/Bag/Cable rows suggest the fixture insert was
repeated. These observations are clues, not permission to delete rows.

Record the result and ask the instructor which rows belong to the exercise.
Preserve a backup before any separately approved correction. Do not reset identity
sequences, drop a database or silently add ON CONFLICT to hide the difference.

## 6. Folder/database exists or `postmaster.pid` exists

Existing work is not an error to erase. Run [the progress checker](CHECKS.md),
compare with your saved step, and resume after the last verified action.
A PID-file warning can mean a cluster is already running. Use `pg_ctl status`;
never remove the PID file while a process may own it. Ask the instructor if stale.

Do not run pg_verifybackup after editing/starting the same copy and interpret
that as verification of the original backup. Keep the original verification
result; if a new integrity test is needed, use a separately authorized fresh backup.

## What to send the instructor

Lab/step number, current OS user, database name, data directory, port/socket,
exact error and read-only check output. Do not send passwords or full dumps.
