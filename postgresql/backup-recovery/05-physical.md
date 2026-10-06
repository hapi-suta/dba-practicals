# Lab 5 — start a separate physical copy

## The task — prove the whole cluster can start elsewhere

Bob asks, “We have a backup, but can we actually start PostgreSQL from it?”
You will make a physical backup and start a separate copy on the same lab server.
There is no simulated disk failure here; SOURCE must stay running.

- **Start:** SOURCE runs on port 5432. Its `suta_shop` has orders 1001–1003,
  totaling 195.00. It also contains the practice databases from earlier labs.
- **Copy:** `pg_basebackup` copies the whole cluster, not just `suta_shop`.
- **Check files:** `pg_verifybackup` checks the backup before you change its settings.
- **Start separately:** COPY uses its own data directory, private socket and port 55433.
- **Prove it works:** check COPY's data directory and restored rows. File verification alone
  does not show that a server starts or that the expected data is usable.
- **Finish:** stop only COPY and keep its files. SOURCE remains on port 5432.

**By the end, you will be able to:**

- Create and verify a physical backup.
- Explain why a recovery copy needs separate storage and connection settings.
- Start, inspect and stop the copy without changing the original server.

**Practice limitation:** both copies are on one lab server. This demonstrates
restoration, not protection against losing that server or its disk.

**Success looks like:**

- A working copy with 3 orders worth 195.00, while the source on port 5432 remains untouched.
- We stop only the copy at the end.

**Pause and discuss before moving on:**

- Show the copy's data directory, port, archiving setting and restored totals.
- Explain how you know it is the COPY, not SOURCE, and why you must check that before running commands.

**Key term:** a PostgreSQL cluster is the set of databases managed by one PostgreSQL server. Its data directory holds its files.

Use your assigned StepUP lab server, not a company server. Read
[the class connection map](CLASS-SETUP.md) first. These are the actual class paths.

A **socket directory** is a folder used for local database connections. Giving
COPY its own socket directory and port keeps its connections separate from SOURCE.

| Cluster | Data directory | Socket | Port |
|---|---|---|---|
| SOURCE — keep running | `/var/lib/postgresql/16/lab` | `/var/run/postgresql` | 5432 |
| COPY — this exercise | `/var/lib/postgresql/suta-backup-lab/physical-copy` | `/var/lib/postgresql/suta-backup-lab/recovery-socket` | 55433 |

**Already attempted this lab?** Follow [the steps for checking existing folders and databases](TROUBLESHOOTING.md#6-folderdatabase-exists-or-postmasterpid-exists) before continuing.
Do not overwrite `physical-copy`, repeat a backup into it, or remove a PID file.

## 1. Check the source

**Where:**

- Linux terminal as `postgres`.
- Switch with `sudo -iu postgres` first if you are still the `student` OS user.

```bash
cd /var/lib/postgresql/suta-backup-lab
```

**Why:**

- Keep this work in the folder created in Lab 0.
- If absent, finish Lab 0.

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_shop
```

**Now inside psql on SOURCE:**

```sql
SHOW data_directory;
```

**Expect:**

- `/var/lib/postgresql/16/lab`.
- Any other value: stop.

```sql
SELECT spcname, pg_tablespace_location(oid) FROM pg_tablespace;
```

**Expect:**

- Default tablespaces only, with empty external locations.
- Ask the instructor if any custom location exists; this exercise does not map tablespaces.

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

**Expect:**

- `3` and `195.00` after Labs 0–4.
- If different, do not take the backup yet. Follow [the order and item checks](TROUBLESHOOTING.md#5-too-many-orders-or-items) and compare the results with Lab 0. Do not change rows just to match the expected total.

```psql
\q
```

## 2. Copy and verify

**Where:**

- Linux terminal as `postgres`, in the lab folder.

```bash
pg_basebackup -h /var/run/postgresql -p 5432 -D physical-copy -X stream -P
```

**Why:**

- Copy the whole SOURCE cluster and stream the WAL needed for consistency.
- The destination must be new.
- Do not add `-R`: we are not creating a standby.
- PostgreSQL may first write changed data to disk (a checkpoint). This can delay the first progress message. Leave this command running; do not launch a second backup.

**Expect:**

- Wait for the backup to finish and the terminal prompt to return.
- If `pg_basebackup` prints an error, stop and save it for your instructor. Do not continue to verification or startup.
- Next, check the copied files with `pg_verifybackup`. A progress display alone does not prove the backup is usable.

```bash
pg_verifybackup physical-copy
```

**Expect:**

- Successful verification, **before editing or starting this copy**.
- This checks the backup files.
- You must still start the copy and check its data.
- This practice lab starts the backup itself.
- In real operations, also keep an untouched backup.

## 3. Isolate the stopped COPY

Here, **isolate** means give COPY its own connection settings and turn off its
WAL archiving. We must not start it using SOURCE's settings.

**Where:**

- Linux terminal as `postgres`, in `/var/lib/postgresql/suta-backup-lab`.
- Keep SOURCE running.

```bash
mkdir recovery-socket
```

If `recovery-socket` already exists, stop here. Follow [the steps for checking existing folders](TROUBLESHOOTING.md#6-folderdatabase-exists-or-postmasterpid-exists) with your instructor before continuing. Do not delete the folder.

```bash
chmod 700 recovery-socket
```

**Why:**

- Restrict the copy's connection directory to its owner.

```bash
pg_ctl -D /var/lib/postgresql/suta-backup-lab/physical-copy status
```

**Expect:**

- `no server running`. This is the expected result: COPY must be stopped before you edit its settings.
- If the output says `server is running`, stop here. Do not run the configuration-editing commands below.
- Ask your instructor to help confirm which server is running. Follow [the checks for a running COPY](TROUBLESHOOTING.md#3-copy-is-running-but-the-guides-connection-fails).
- Do not edit the running COPY or stop SOURCE on port 5432.

```bash
cp -n physical-copy/postgresql.auto.conf physical-copy/postgresql.auto.conf.before-lab5
```

**Why:**

- Preserve the original settings; `-n` keeps any earlier saved copy.

```bash
nano physical-copy/postgresql.auto.conf
```

**Only edit the STOPPED COPY.** Replace existing entries for these settings and
add missing entries. Keep unrelated settings. Keep one active entry per setting.

```conf
port = 55433
listen_addresses = ''
unix_socket_directories = '/var/lib/postgresql/suta-backup-lab/recovery-socket'
archive_mode = off
archive_command = ''
primary_conninfo = ''
ssl = off
```

Save: Ctrl+O, Enter. Exit: Ctrl+X.

**Why:**

- The backup includes the source configuration.
- The copy needs its own port/socket and must not use the source's archive.
- `postgresql.auto.conf` overrides `postgresql.conf`; the last duplicate setting wins.
- Manual editing here is limited to the stopped recovery copy, not a running source.

## 4. Check BEFORE starting

**Where:**

- Linux terminal as `postgres`.
- Follow [the checker setup steps](CHECKS.md#get-the-updated-checker-once) first. You run the supplied command; you do not need to read or edit its code.

After that page, return here in the Linux terminal as `postgres`:

```bash
cd /var/lib/postgresql/suta-backup-lab
```

```bash
node /var/lib/postgresql/dba-practicals/internal/postgresql/backup-recovery/check-lab.mjs preflight physical
```

**Expect:**

- All safety checks PASS.
- INFO lines explain what a check can and cannot prove.
- Any MISMATCH, UNKNOWN or NOT_STARTED: **do not start the copy**.
- Save the failing check's name, expected value and actual value for your instructor. Correct the named problem before running the checks again.
- The checker does not modify files or start PostgreSQL.

To inspect the archiving setting yourself:

```bash
postgres -D /var/lib/postgresql/suta-backup-lab/physical-copy -C archive_mode
```

**Expect:**

- `off`.
- `-C` reads the effective setting without starting the server.
- If it says `on`, return to step 3 while COPY is still stopped. Set `archive_mode = off` in COPY's file, save it and repeat all of step 4. Do not change SOURCE.

## 5. Start and verify the COPY

**Where:** Linux terminal as `postgres`. Continue only after step 4 passes.

```bash
pg_ctl -D /var/lib/postgresql/suta-backup-lab/physical-copy -l /var/lib/postgresql/suta-backup-lab/physical-recovery.log -w start
```

**Expect:**

- `server started`.
- If startup fails, open `/var/lib/postgresql/suta-backup-lab/physical-recovery.log` with `less`.
- Copy the error and press `q` to return to the terminal. Send the error to your instructor before retrying.
- Do not stop SOURCE to free a port.

```bash
psql -X -h /var/lib/postgresql/suta-backup-lab/recovery-socket -p 55433 -d suta_shop
```

**Now inside psql on COPY:**

```sql
SHOW data_directory;
```

**Expect:**

- `/var/lib/postgresql/suta-backup-lab/physical-copy`.
- If it differs, leave psql with `\q` and stop this exercise. You have not confirmed that you are connected to COPY.

```sql
SHOW archive_mode;
```

**Expect:**

- `off`.

If this running COPY reports `on`, do not edit its file while it is running.
Follow [the running-COPY checks](TROUBLESHOOTING.md#3-copy-is-running-but-the-guides-connection-fails) with your instructor first.

```sql
SELECT pg_is_in_recovery();
```

**Expect:**

- `false` once this standalone copy finishes recovery.

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

**Expect:**

- `3` and `195.00`, matching source at backup time.

```psql
\q
```

**Back in the Linux terminal:**

```bash
node /var/lib/postgresql/dba-practicals/internal/postgresql/backup-recovery/check-lab.mjs recovery physical
```

**Expect:**

- Recovery checks PASS.
- Keep the output as evidence.

## 6. Stop ONLY this COPY

**Where:** back in the Linux terminal as `postgres`, after leaving COPY's psql
session with `\q`. Use the exact data-directory path below; do not substitute SOURCE's path.

```bash
pg_ctl -D /var/lib/postgresql/suta-backup-lab/physical-copy -m fast -w stop
```

**Expect:**

- `server stopped`.
- Keep the copied files and startup log for review.
- SOURCE stays running on port 5432; the recovery port is now available for Lab 8.

**Explain:** why is archiving off on COPY but on for SOURCE?

Sources: [configuration precedence](https://www.postgresql.org/docs/16/config-setting.html),
[postgres -C](https://www.postgresql.org/docs/16/app-postgres.html),
[physical backup](https://www.postgresql.org/docs/16/app-pgbasebackup.html),
[verification](https://www.postgresql.org/docs/16/app-pgverifybackup.html).
