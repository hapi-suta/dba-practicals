# Lab 5 — start a separate physical copy

**What we’re doing:** copy the whole PostgreSQL cluster with `pg_basebackup`,
verify the backup, then safely start a separate copy on port 55433.
**You finish with:** a working copy with 3 orders worth 195.00, while the source
on port 5432 remains untouched. We stop only the copy at the end.

**Goal:** copy the whole cluster, then start the copy without changing the source.
Use your assigned StepUP lab server, not a company server. Read
[the class connection map](CLASS-SETUP.md) first. These are the actual class paths.

| Cluster | Data directory | Socket | Port |
|---|---|---|---|
| SOURCE — keep running | `/var/lib/postgresql/16/lab` | `/var/run/postgresql` | 5432 |
| COPY — this exercise | `/var/lib/postgresql/suta-backup-lab/physical-copy` | `/var/lib/postgresql/suta-backup-lab/recovery-socket` | 55433 |

**Already attempted this lab?** Use [resume help](TROUBLESHOOTING.md).
Do not overwrite `physical-copy`, repeat a backup into it, or remove a PID file.

## 1. Check the source

**Where:** Linux terminal as `postgres`. Switch with `sudo -iu postgres` first
if you are still the `student` OS user.

```bash
cd /var/lib/postgresql/suta-backup-lab
```

**Why:** keep this work in the folder created in Lab 0. If absent, finish Lab 0.

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_shop
```

**Now inside psql on SOURCE:**

```sql
SHOW data_directory;
```

**Expect:** `/var/lib/postgresql/16/lab`. Any other value: stop.

```sql
SELECT spcname, pg_tablespace_location(oid) FROM pg_tablespace;
```

**Expect:** default tablespaces only, with empty external locations. Ask the
instructor if any custom location exists; this exercise does not map tablespaces.

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

**Expect:** `3` and `195.00` after Labs 0–4. If different, investigate before copying.

```psql
\q
```

## 2. Copy and verify

**Where:** Linux terminal as `postgres`, in the lab folder.

```bash
pg_basebackup -h /var/run/postgresql -p 5432 -D physical-copy -X stream -P
```

**Why:** copy the whole SOURCE cluster and stream the WAL needed for consistency.
The destination must be new. Do not add `-R`: we are not creating a standby.
The initial checkpoint can take time; do not launch another backup during a pause.

```bash
echo $?
```

**Expect:** `0`. Otherwise stop and retain the error.

```bash
pg_verifybackup physical-copy
```

**Expect:** successful verification, **before editing or starting this copy**.
This checks integrity, not application usability. This disposable exercise starts
the backup itself; real operations should also retain an untouched backup.

## 3. Isolate the stopped COPY

**Where:** same Linux terminal. Keep SOURCE running.

```bash
mkdir recovery-socket
```

If the directory already exists, use the resume guide; do not delete it.

```bash
chmod 700 recovery-socket
```

**Why:** restrict the copy's connection directory to its owner.

```bash
pg_ctl -D /var/lib/postgresql/suta-backup-lab/physical-copy status
```

**Expect:** `no server running` (exit 3 is normal). If running, inspect it using
resume help; do not edit a running copy or stop the source.

```bash
cp -n physical-copy/postgresql.auto.conf physical-copy/postgresql.auto.conf.before-lab5
```

**Why:** preserve the original settings; `-n` keeps any earlier saved copy.

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

**Why:** the backup includes the source configuration. The copy needs its own
port/socket and must not use the source's archive. `postgresql.auto.conf` overrides
`postgresql.conf`; the last duplicate setting wins. Manual editing here is limited
to the stopped recovery copy, not a running source.

## 4. Check BEFORE starting

**Where:** Linux terminal as `postgres`. Install the [checker](CHECKS.md) first.

```bash
node /var/lib/postgresql/dba-practicals/postgresql/backup-recovery/check-lab.mjs preflight physical
```

**Expect:** all safety checks PASS. INFO explains limits. Any MISMATCH, UNKNOWN
or NOT_STARTED: **do not start the copy**. Show the instructor the check name.
The checker does not modify files or start PostgreSQL.

To inspect the archiving setting yourself:

```bash
postgres -D /var/lib/postgresql/suta-backup-lab/physical-copy -C archive_mode
```

**Expect:** `off`. `-C` reads the effective setting without starting the server.
If it says `on`, correct the COPY's settings, not the source.

## 5. Start and verify the COPY

```bash
pg_ctl -D /var/lib/postgresql/suta-backup-lab/physical-copy -l physical-recovery.log -w start
```

**Expect:** `server started`. On failure, inspect `physical-recovery.log` rather
than repeatedly starting it or stopping the source to free a port.

```bash
psql -X -h /var/lib/postgresql/suta-backup-lab/recovery-socket -p 55433 -d suta_shop
```

**Now inside psql on COPY:**

```sql
SHOW data_directory;
```

**Expect:** `/var/lib/postgresql/suta-backup-lab/physical-copy`.

```sql
SHOW archive_mode;
```

**Expect:** `off`.

```sql
SELECT pg_is_in_recovery();
```

**Expect:** `false` once this standalone copy finishes recovery.

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

**Expect:** `3` and `195.00`, matching source at backup time.

```psql
\q
```

**Back in the Linux terminal:**

```bash
node /var/lib/postgresql/dba-practicals/postgresql/backup-recovery/check-lab.mjs recovery physical
```

**Expect:** recovery checks PASS. Keep the output as evidence.

## 6. Stop ONLY this COPY

After recording results:

```bash
pg_ctl -D /var/lib/postgresql/suta-backup-lab/physical-copy -m fast -w stop
```

**Expect:** `server stopped`. Retain all files. SOURCE stays running on port 5432;
the recovery port is now available for Lab 8.

**Explain:** why is archiving off on COPY but on for SOURCE?

Sources: [configuration precedence](https://www.postgresql.org/docs/16/config-setting.html),
[postgres -C](https://www.postgresql.org/docs/16/app-postgres.html),
[physical backup](https://www.postgresql.org/docs/16/app-pgbasebackup.html),
[verification](https://www.postgresql.org/docs/16/app-pgverifybackup.html).
