# Check your results with PostgreSQL

Use these commands to see what is actually in your database and recovery copy.
You do not need to download a repository or install extra software.

- Run only the section for your current lab.
- Compare each result with the expectation before continuing.
- If a command reports an error or a value differs, stop. Show your instructor the command and output.
- Do not delete files, repeat inserts or reset your work just to match an example.

## Check Labs 0–4

**Where:** Linux terminal as `postgres`. Connect to SOURCE:

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_shop
```

**Options:** `-X` skips psql startup files; `-h` selects the socket folder;
`-p` selects the port; `-d` selects the database.

**Inside psql:**

```sql
SELECT current_database();
SHOW data_directory;
SELECT order_id, status, total FROM shop.orders ORDER BY order_id;
SELECT count(*), sum(total) FROM shop.orders;
```

**Expect after Labs 0–4:**

- Database: `suta_shop`; data directory: `/var/lib/postgresql/16/lab`.
- Order IDs: `1001`, `1002`, `1003`; count: `3`; total: `195.00`.
- Labs 7–9 intentionally change SOURCE. After those labs, use their expected IDs and totals instead.

To check an earlier restore, leave psql with `\q`, then reconnect using the
same connection command but change the database after `-d`:

| Lab | Database to check | Expected orders at that lab's end |
|---|---|---|
| 1 | `suta_plain_restore` | 1001–1003; 3 orders; 195.00 |
| 2 | `suta_custom_restore` | 1001–1004 after the test insert; 4 orders; 205.00 |
| 3 | `suta_custom_restore` | Same 4 orders; delivery notes recovered separately |
| 4 | `suta_access_restore` | 1001–1003; 3 orders; 195.00 |

Repeat the SELECT and SHOW commands above on that database. These totals alone
do not prove all tasks are finished: also run your lab's table-rule, delivery-note
or permission checks. A backup file existing is not proof that it restores.

```psql
\q
```

## Before starting a stopped copy

**Why:** a backup also contains configuration. Starting it with SOURCE's settings
could use the wrong files or send WAL to the wrong archive.

**Where:** Linux terminal as `postgres`. Keep SOURCE running. COPY must be stopped.
Do these checks with your instructor the first time. They read files and settings;
they do not start a server or change data.

### 1. Choose the copy for your lab

Run **one** of these, not both.

**Lab 5 — physical copy:**

```bash
cd /var/lib/postgresql/suta-backup-lab/physical-copy
```

**Lab 8 — PITR copy:**

```bash
cd /var/lib/postgresql/suta-backup-lab/pitr-copy
```

If `cd` fails, stop; do not run commands from the previous folder.

```bash
pwd -P
```

**Expect:** the exact path you chose above. `-P` shows the real folder, resolving
shortcuts (symbolic links). If it shows SOURCE or any other folder, stop.
In the next commands, `.` means this verified COPY folder.

```bash
pg_ctl -D . status
```

**Expect:** `no server running`. `-D` selects the folder; `status` only checks it.
If it says the server is running, do not edit or start it again. Use
[the running-copy checks](TROUBLESHOOTING.md#3-copy-is-running-but-the-guides-connection-fails) with your instructor.

### 2. Check that files stay inside COPY

```bash
readlink -e postgresql.conf postgresql.auto.conf pg_hba.conf pg_ident.conf pg_wal
```

**Why:** `readlink -e` shows the real path of each existing file or folder.

**Expect:** five lines, each inside the COPY folder confirmed by `pwd -P`,
ending with the corresponding name above. Missing lines or paths outside COPY:
stop. This class does not support externally shared configuration or WAL folders.

```bash
grep -nE '^[[:space:]]*include' postgresql.conf postgresql.auto.conf
grep -nE '^[[:space:]]*data_directory' postgresql.auto.conf
```

**Why:** look for settings that load other files or redirect data storage.
`-n` shows matching line numbers; `-E` enables the search pattern. The patterns
ignore commented lines and allow spaces before the setting name.

**Expect:** no output from either command. No match is normal here. A matching
line or a file-read error means stop and ask your instructor; do not delete that
line blindly. This lab does not cover included configuration files or a data
directory override in `postgresql.auto.conf`.

```bash
ls -A pg_tblspc
ls -a
```

**Why:** `ls` lists names. `-A` includes hidden names except `.` and `..`;
`-a` includes all names.

**Expect:**

- The first command prints nothing: no custom tablespaces.
- The second lists COPY's files. There must be **no** `postmaster.pid` or `standby.signal`.
- Lab 5: there must be **no** `recovery.signal`.
- Lab 8: `recovery.signal` **must exist**, created by pgBackRest for archive recovery.
- If any condition differs, stop. Do not remove a PID file or change signal files to force the exercise forward.

### 3. Read the effective settings without starting COPY

`postgres -D . -C setting` reads the chosen setting and exits. `-D .` chooses
COPY; `-C` prints a value without starting PostgreSQL. Check each value in order.

```bash
postgres -D . -C data_directory
postgres -D . -C config_file
postgres -D . -C hba_file
postgres -D . -C ident_file
```

**Expect:**

- Data directory: the exact COPY path from step 1, never `/var/lib/postgresql/16/lab`.
- The other three values: `postgresql.conf`, `pg_hba.conf` and `pg_ident.conf`, each under that COPY path.
- Any error, external path or different result: stop before starting COPY.

```bash
postgres -D . -C port
postgres -D . -C unix_socket_directories
postgres -D . -C listen_addresses
postgres -D . -C archive_mode
postgres -D . -C archive_command
postgres -D . -C primary_conninfo
```

| Setting, in command order | Expected value | Why |
|---|---|---|
| `port` | `55433` | Do not use SOURCE's port. |
| `unix_socket_directories` | `/var/lib/postgresql/suta-backup-lab/recovery-socket` | Use COPY's private connection folder. |
| `listen_addresses` | Empty | No network listener for this practice copy. |
| `archive_mode` | `off` | Do not archive COPY's WAL. |
| `archive_command` | Empty | Do not use SOURCE's archive command. |
| `primary_conninfo` | Empty | Do not connect this copy to a primary as a standby. |

An empty value appears as a blank line. Run one command at a time so you know
which setting it belongs to. If a value differs, keep COPY stopped and return to
your lab's isolation-settings step. After correcting it, repeat these checks.

### 4. Check the private connection folder

```bash
ls -ld /var/lib/postgresql/suta-backup-lab/recovery-socket
```

`-l` shows permissions and owner; `-d` shows the folder itself, not its contents.

**Expect:** permissions `drwx------` and owner `postgres`. This must be a real
directory, not a link (which starts with `l`). If absent, owned by someone else,
or with different permissions, stop and ask your instructor before starting COPY.

### 5. Lab 8 only — check the recovery target

Lab 5 skips this step. For Lab 8, stay inside `pitr-copy`.

```bash
postgres -D . -C recovery_target_name
postgres -D . -C recovery_target_action
postgres -D . -C restore_command
```

**Expect:**

- `suta_before_delete`.
- `pause`.
- A pgBackRest command containing `archive-get`, `%f` and `%p` to retrieve WAL. It must not be empty. Preserve the command generated by pgBackRest; its exact options vary by version.

The generated command may use the configuration variables from your terminal
instead of spelling out the configuration and stanza in the command itself.
Check them before starting COPY:

```bash
printenv PGBACKREST_CONFIG PGBACKREST_STANZA
```

`printenv` displays the named environment variables without changing them.

**Expect two lines, in order:**

- `/var/lib/postgresql/suta-backup-lab/pgbackrest.conf`.
- `shop`.

If either is missing or different, follow [the reconnect steps](TROUBLESHOOTING.md#returning-after-a-disconnect-or-another-help-page)
to set them, then repeat this check. Start COPY from this same terminal so its
WAL-retrieval process inherits these values. If the generated command explicitly
names a different configuration or stanza, stop and ask your instructor.

```bash
postgres -D . -C recovery_target
postgres -D . -C recovery_target_time
postgres -D . -C recovery_target_xid
postgres -D . -C recovery_target_lsn
```

**Expect:** an empty value from each. We use one named target, not a competing
time, transaction or WAL-position target. Any error or nonempty value: stop.

### 6. Return to your lab

**Return to your lab folder before continuing:**

```bash
cd /var/lib/postgresql/suta-backup-lab
```

- Continue to startup in Lab 5 or Lab 8 **only if every check matched**.
- Do not add startup options to override the settings you just checked.
- After startup, your lab checks the running server's identity, settings and rows again.
- Save those results and the current startup log in your [results sheet](EVIDENCE.md).
