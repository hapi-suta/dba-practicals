# Lab 5 — restore an entire physical cluster

**Instructor-led; class-host rehearsal required.** Complete INSTRUCTOR.md's
advanced gate. Work as the source cluster's OS owner, never root. Source contains
only our disposable databases, uses compatible installed binaries and has no
external tablespaces/configuration. Instructor provides replication access and
WAL sender capacity for pg_basebackup; do not weaken authentication to get past errors.

## 1. Identify the source

In the source psql session:

```sql
SHOW data_directory;
```

```sql
SHOW server_version;
```

```sql
SELECT spcname, pg_tablespace_location(oid) FROM pg_tablespace;
```

Only default tablespaces with empty external paths are supported in this exercise.
If a custom path appears, stop: a physical restore needs explicit tablespace mapping.

```psql
\q
```

## 2. Take a streaming base backup

Shell, in the lab working directory, with PGHOST/PGPORT pointing to the source:

```bash
pg_basebackup -D physical-copy -X stream -P
```

Why: `-D` names a new target; `-X stream` collects the WAL needed to make the
backup consistent; `-P` shows progress. The destination must not contain previous
work. This copies the cluster, not one database. Do not add `-R`: this exercise
is a standalone restore, not configuring a streaming standby.

```bash
echo $?
```

Expect 0. Then, **before editing any files**:

```bash
pg_verifybackup physical-copy
```

Expect successful verification. This checks backup integrity, not application
usability. Keep a protected original backup for real operations; this disposable
exercise starts this copy itself and therefore changes it.

## 3. Isolate the restored cluster

Instructor substitutes the absolute working directory for `/LAB` below.

```bash
mkdir recovery-socket
```

```bash
chmod 700 recovery-socket
```

```bash
nano physical-copy/postgresql.auto.conf
```

Instructor reviews existing settings first. In this **copy only**, replace any
duplicate settings below and add missing ones. Keep other required compatible
settings. Do not copy these onto the source cluster:

```conf
port = 55433
listen_addresses = ''
unix_socket_directories = '/LAB/recovery-socket'
archive_mode = off
archive_command = ''
primary_conninfo = ''
ssl = off
```

No TCP listeners: students connect through the private socket. Disabling archiving
on the copy prevents it writing into the source's archive. Check there is no
data_directory override redirecting it to the source and no recovery/standby
settings inherited from another drill. If any exist, stop for instructor review.
In nano, Ctrl+O, Enter saves; Ctrl+X exits.

```bash
pg_ctl -D physical-copy -l physical-recovery.log -w start
```

Why: start only the new directory, with its own port/socket. If startup fails,
inspect `physical-recovery.log`; do not change/start/stop the source to compensate.

## 4. Verify the copy

```bash
psql -X -h /LAB/recovery-socket -p 55433 -d suta_shop
```

```sql
SHOW data_directory;
```

Must be the new `physical-copy`, not source PGDATA.

```sql
SELECT pg_is_in_recovery();
```

Expect false once standalone recovery has completed.

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

Compare with the source baseline at backup time (3 and 195 if Labs 0–4 are unchanged).

```psql
\l
```

Notice other lab databases were copied too. Exit, then stop only this copy so
the recovery port is available for the next lab:

```psql
\q
```

```bash
pg_ctl -D physical-copy -m fast -w stop
```

Retain all files. Sources: [pg_basebackup](https://www.postgresql.org/docs/18/app-pgbasebackup.html),
[pg_verifybackup](https://www.postgresql.org/docs/18/app-pgverifybackup.html).
