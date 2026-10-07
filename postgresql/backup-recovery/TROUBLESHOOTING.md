# Help with errors or unfinished work

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

**Expect:** `/var/lib/postgresql/suta-backup-lab`. If it is missing, save the
`pwd` output and the error for your instructor. Do not create another folder
or repeat setup until you know where your earlier work is.

```bash
export PGHOST=/var/run/postgresql PGPORT=5432 PGUSER=postgres
```

```bash
psql -X -h /var/run/postgresql -p 5432 -U postgres -d postgres -c "SHOW data_directory"
```

**Options:**

- `-X`: skip psql startup files so custom settings do not affect this check.
- `-h` and `-p`: choose SOURCE's socket folder and port.
- `-U postgres`: connect as the database user `postgres`.
- `-d postgres`: select the database named `postgres`.
- `-c`: run the quoted SQL and return to the Linux terminal.

**Expect:** `/var/lib/postgresql/16/lab`. Otherwise stop; you have not confirmed
SOURCE. These terminal settings select SOURCE; they do not start or change it.
For COPY, use the lab's explicit private socket and port 55433 instead.

**For Labs 6–11 only, after your Lab 6 configuration already exists:**

```bash
ls -l /etc/pgbackrest/pgbackrest.conf
```

`ls -l` lists the file with its owner, permissions and size.

If absent, return to Lab 6A with the instructor. If you started the older edition,
use the existing-work guidance below; do not create a replacement configuration.
For the fresh edition, clear old terminal overrides:

```bash
unset PGBACKREST_CONFIG PGBACKREST_CONFIG_PATH PGBACKREST_CONFIG_INCLUDE_PATH PGBACKREST_STANZA
```

`unset` removes only the named terminal settings. Each command now uses
`--stanza=shop` explicitly and the standard configuration file.
Find the last step you recorded in [your results sheet](EVIDENCE.md).

- Repeat that step's read-only SELECT or SHOW checks and compare the output with the lab.
- Do not repeat CREATE, INSERT, DELETE, DROP, backup or restore commands merely because you reconnected.
- If you disconnected during Lab 9, its temporary holding tables are gone. Use Lab 9's order checks on SOURCE to see whether order 1001 was already returned. Ask the instructor to confirm the result before importing or inserting anything again.

If you opened this page inside an active transaction, do not leave it hanging:
ask the instructor whether to finish or roll back before reconnecting.

## Existing pgBackRest work

This edition teaches a fresh setup. It does not mean your earlier work is wrong
or should be deleted. If your config is under `suta-backup-lab`, or the standard
file already has active settings, pause the **setup changes**, not the running server.

- Keep all configuration files, backups, archived WAL and recovery copies.
- Show the instructor your last completed lab, the configuration you used and
  SOURCE's `SHOW archive_command;` result.
- Do not paste the new setup over an existing configuration or redirect archiving
  to an empty repository. Older backups still depend on their original WAL.
- Continue the verified earlier edition only after the instructor confirms its
  paths and the step you reached. Do not mix commands from the two editions.
- To practise from scratch again, use a separately assigned fresh environment;
  do not reset completed work on your current server.

The [instructor transition checklist](../../instructor/postgresql/backup-recovery/CONFIG-TRANSITION.md)
explains how to preserve and review an existing setup before any migration.

## 1. Stanza-create fails: pg1-path is wrong

**Where:** Linux terminal as `postgres` for editing your configuration.

```bash
vi /etc/pgbackrest/pgbackrest.conf
```

Press `i` to edit. Under `[shop]`, the exact class setting is:

```ini
pg1-path=/var/lib/postgresql/16/lab
```

This points to SOURCE PGDATA. `/Source_pgdata` and `/SOURCE_PGDATA` are not real
class paths. `repo1-path` separately names your backup folder; do not point pg1-path
there or at a restored copy. Save and quit with `Esc`, `:wq`, Enter.
To quit without saving, use `Esc`, `:q!`, Enter. If editing is denied, ask the
instructor to check file ownership; do not loosen permissions. This correction applies to the fresh edition;
do not edit a different configuration when continuing older work.

```bash
pgbackrest --stanza=shop stanza-create
```

**Expect:** successful completion. If not, retain the complete error and ask the
instructor. Do not switch repositories just to get a success message.
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

`-D` selects the COPY's data directory. `status` checks whether that server is running.

If it reports `no server running`, follow [Lab 5, step 3](05-physical.md#3-isolate-the-stopped-copy)
and then step 4: save the old settings, edit COPY's file and run the safety
checks before startup. Do not create a `/LAB` folder to match the old placeholder.

## 3. Copy is running, but the guide's connection fails

**Where:** Linux terminal as `postgres`.

```bash
postgres -D /var/lib/postgresql/suta-backup-lab/physical-copy -C unix_socket_directories
```

```bash
postgres -D /var/lib/postgresql/suta-backup-lab/physical-copy -C port
```

These read disk settings, not necessarily settings loaded by an already-running
server. They do not start or change PostgreSQL.

For `postgres`, `-D` selects the data directory and `-C` prints the named setting.
These options belong to the `postgres` program, not the psql client.

- Expected socket folder: `/var/lib/postgresql/suta-backup-lab/recovery-socket`.
- Expected port: `55433`.
- Save both results. Ask the instructor to confirm the running server's connection and run `SHOW data_directory;` there.
- That result must be `/var/lib/postgresql/suta-backup-lab/physical-copy`. Never assume port 5432 is COPY.
- If the instructor cannot confirm the running server, stop here. Do not run the stop command below.

Only after confirming this is the physical COPY and its settings need correction,
return to the Linux terminal as `postgres` and stop it using its exact path:

```bash
pg_ctl -D /var/lib/postgresql/suta-backup-lab/physical-copy -m fast -w stop
```

`-D` selects only this COPY. `-m fast` disconnects its sessions and rolls back
unfinished transactions. `-w` waits for shutdown to finish.

This disconnects COPY sessions. Follow [Lab 5, step 3](05-physical.md#3-isolate-the-stopped-copy),
then complete steps 4–5 before checking its data. No new backup is needed to
correct only COPY's port or socket. Leave SOURCE running.

## 4. pgBackRest reports a working-directory / pg1-path mismatch

On these class copies, this error can occur when inherited source archiving is
still enabled on COPY. After confirming COPY's data directory, run
`SHOW archive_mode;` in that COPY's psql session. Lab 5 requires `off` and
an empty `archive_command` on COPY. SOURCE is initially `off`; Lab 6B turns it `on`.

Do not "fix" this by changing the source stanza's pg1-path to physical-copy.
For the physical COPY, follow section 3 above to confirm and stop it, then repeat
Lab 5's configuration and before-starting safety checks. For a PITR COPY, stop
the exercise and show the instructor its data directory and error before making changes.
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
have three items at the end of Lab 0; duplicate Camera/Bag/Cable rows suggest
the practice INSERT was repeated. Later incident labs deliberately change the
data, so compare with the expected result for your current step. Do not delete rows
based only on this count.

Record the result and ask the instructor which rows belong to the exercise.
Preserve a backup before any separately approved correction. Do not reset identity
sequences, drop a database or silently add ON CONFLICT to hide the difference.

## 6. Folder/database exists or `postmaster.pid` exists

Do not delete the existing folder, database or file to clear the message.

- For Labs 0–4, run [the progress check](CHECKS.md#check-labs-04) and compare it with your saved step and that lab's expected data.
- For a Lab 5 copy, use the exact `pg_ctl ... status` command in [Lab 5, step 3](05-physical.md#3-isolate-the-stopped-copy). If it is running, use section 3 above; do not edit its settings yet.
- For Labs 6–11, show your last completed step and current error to the instructor before repeating a backup, restore or incident command.
- `postmaster.pid` records information about a running PostgreSQL server. Do not remove it yourself, even if you suspect it was left behind after a crash.

Do not run pg_verifybackup after editing/starting the same copy and interpret
that as verification of the original backup. Keep the original verification
result; if a new integrity test is needed, use a separately authorized fresh backup.

## What to send the instructor

- Lab number and step.
- Linux user (`whoami` in the terminal).
- Database name and data directory, if connected.
- Port and socket folder used by your connection command.
- The exact error and the check output that differs from the lab.

Do not send passwords or database backup files.
