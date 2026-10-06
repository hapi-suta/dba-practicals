# Labs 9–11 — return missing data and prove recovery

Complete Lab 8's log and data checks before Lab 9. Keep the recovered copy paused.
Work through these exercises with your instructor. The paths below are the class paths.
SOURCE is port 5432; recovered COPY is port 55433. Do not repeat the merge if
order 1001 already exists on SOURCE. Compare it with your saved Lab 9 results
and ask the instructor whether the recovery was already completed.

## Lab 9 — bring back only Maria's missing order

### The incident continues — return the missing order without losing the newer one

Lab 8 recovered an older, safe version of the shop. Maria's order 1001 is there,
but newer order 1005 exists only on SOURCE. We need data from both points in time.

| Place | Orders before this lab | What we do here |
|---|---|---|
| SOURCE, port 5432 | 1002, 1003, 1004, 1005; total 130.00 | Add only missing order 1001 and its item. |
| Paused COPY, port 55433 | 1001, 1002, 1003, 1004; total 235.00 | Read and export order 1001 and its item. Do not change the copy. |
| Temporary staging tables on SOURCE | Not created yet | Load the exported rows and check them before inserting into the shop tables. |

**The recovery path:**

1. Export only Maria's missing order and item from COPY.
2. Load them into temporary staging tables on SOURCE.
3. Compare IDs and values; confirm the customer exists and the order is still missing.
4. Insert the order first, then its item, in the same transaction.
5. Check the rows before committing. If a check fails, run `ROLLBACK;`, save the differing result and stop for instructor review.

**By the end, you will be able to:**

- Explain why you cannot replace SOURCE with the recovered copy.
- Inspect recovered rows before returning them to the original tables.
- Return related rows together without overwriting valid newer work.

**Success:** SOURCE has orders 1001–1005, totaling 250.00, and three items.
Order 1001 is Shipped / 120.00; newer order 1005 is still New / 15.00.
This completes the missing-data recovery begun in Lab 8. Do not repeat the merge.

**Success looks like:**

- 5 orders worth 250.00 and 3 items on source.
- The newer order 1005 survives; the live table is not replaced.

**Pause and discuss:**

- Show orders 1001 and 1005 together on source, with the expected totals and items.
- Explain why replacing the live table with the recovered version would lose valid newer work.

**Why:**

- The live lab source has order 1005, which the recovered copy does not.
- Replacing the entire table would lose valid newer work.
- Real incidents also need control over other writes, checks for related data and business approval.
- This small lab has one missing order and one item.
- Its customer still exists.

**Where:** Linux terminal as `postgres` on your assigned server.
Connect to the recovered COPY, not SOURCE:

```bash
psql -X -h /var/lib/postgresql/suta-backup-lab/recovery-socket -p 55433 -d suta_shop
```

```sql
SHOW data_directory;
```

**Expect:** `/var/lib/postgresql/suta-backup-lab/pitr-copy`. If different, stop
and leave psql with `\q`. Do not export from an unconfirmed server.
In this psql session, export only the missing rows. `\copy` writes files on the
machine running psql: your lab server here. Do not upload these files to Git.

```psql
\copy (SELECT order_id, customer_id, status, total FROM shop.orders WHERE order_id = 1001) TO '/var/lib/postgresql/suta-backup-lab/missing-order.csv' WITH CSV HEADER
```

```psql
\copy (SELECT item_id, order_id, product, amount FROM shop.order_items WHERE order_id = 1001) TO '/var/lib/postgresql/suta-backup-lab/missing-items.csv' WITH CSV HEADER
```

**Expect:** `COPY 1` from each command: one order and one item were exported.
If either number differs, stop before importing them into SOURCE. A real incident
may affect more rows and related tables; this lab recovers only the two identified rows.

```psql
\q
```

Now connect to the **source** using the original shell connection settings:

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_shop
```

```sql
SHOW data_directory;
```

**Expect:** `/var/lib/postgresql/16/lab`. If different, leave psql with `\q`
and stop. The tables below are temporary holding tables: you use them to check
the recovered rows before adding anything to the shop tables. They disappear
when this psql connection closes.

```sql
CREATE TEMP TABLE recovered_orders (order_id integer, customer_id integer, status text, total numeric(10,2));
```

```sql
CREATE TEMP TABLE recovered_items (item_id integer, order_id integer, product text, amount numeric(10,2));
```

```psql
\copy recovered_orders FROM '/var/lib/postgresql/suta-backup-lab/missing-order.csv' WITH CSV HEADER
```

```psql
\copy recovered_items FROM '/var/lib/postgresql/suta-backup-lab/missing-items.csv' WITH CSV HEADER
```

```sql
TABLE recovered_orders;
```

**Expect:**

- Order 1001, customer 1, Shipped, 120.00 from Lab 7.

```sql
TABLE recovered_items;
```

**Expect:**

- Item 1, order 1001, Camera, 120.00.

```sql
SELECT * FROM shop.orders WHERE order_id IN (1001, 1005);
```

**Expect:**

- Only 1005.
- Stop if 1001 already exists or if the values differ from the incident evidence.
- Do not overwrite it with ON CONFLICT DO UPDATE.

Start a transaction and briefly exclude competing table writers in this small
lab. Real systems require a planned locking/window strategy to avoid disruption.

```sql
BEGIN;
```

```sql
SET LOCAL lock_timeout = '5s';
```

```sql
LOCK TABLE shop.orders, shop.order_items IN SHARE ROW EXCLUSIVE MODE;
```

If any statement fails, run `ROLLBACK;` in this psql session. Save the full error
and show it to the instructor before retrying. Do not commit only part of the recovery.

```sql
SELECT * FROM shop.orders WHERE order_id = 1001;
```

Still zero rows. The related customer must exist:

```sql
SELECT * FROM shop.customers WHERE customer_id = 1;
```

**Expect:**

- Maria.
- Insert the order first, then its item.
- The item needs an existing order:

```sql
INSERT INTO shop.orders OVERRIDING SYSTEM VALUE SELECT * FROM recovered_orders;
```

**Why:**

- Preserve the original identity value 1001, rather than generate a new ID.

```sql
INSERT INTO shop.order_items OVERRIDING SYSTEM VALUE SELECT * FROM recovered_items;
```

**Expect:**

- INSERT 0 1 for each.
- Primary and foreign keys remain active.

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

**Expect:**

- 5 and 250.00; order 1005 is still present.
- If any check differs, run `ROLLBACK;` instead of `COMMIT;`. Save the differing rows and totals for your instructor.

Before committing, check the actual protected orders and recovered item:

```sql
SELECT order_id, status, total FROM shop.orders WHERE order_id IN (1001, 1005) ORDER BY order_id;
```

**Expect:** `1001 / Shipped / 120.00` and `1005 / New / 15.00`.

```sql
SELECT item_id, order_id, product, amount FROM shop.order_items WHERE order_id = 1001;
```

**Expect:** `1 / 1001 / Camera / 120.00`. If either check differs, issue
`ROLLBACK;` and stop. Only commit when the rows as well as the totals match.

```sql
COMMIT;
```

```sql
SELECT * FROM shop.orders ORDER BY order_id;
```

```sql
SELECT * FROM shop.order_items ORDER BY item_id;
```

**Expect:**

- Five orders, three items.
- This lab deliberately leaves new orders 1004/1005 without items.
- A real application's business rules may not allow that.
- The live sequence was never rolled back or replaced: do not reset it downward.

```psql
\q
```

After your instructor accepts the results, return to the Linux terminal as
`postgres`. Stop only the recovered COPY using its exact path below. Keep its files:

```bash
pg_ctl -D /var/lib/postgresql/suta-backup-lab/pitr-copy -m fast -w stop
```

## Lab 10 — a whole database is dropped

### A separate incident — recover only what the older backup contains

This is a new practice database, not the SOURCE repaired in Lab 9.
We build `suta_drop_drill` from Lab 2's `shop.dump`, drop that practice database,
then rebuild it from the same saved file.

| Stage | `suta_drop_drill` | SOURCE `suta_shop` |
|---|---|---|
| Before DROP | Orders 1001–1003; 3 / 195.00 | Orders 1001–1005; 5 / 250.00 after Lab 9 |
| After DROP | Database missing | Unchanged |
| After restore | Orders 1001–1003; 3 / 195.00 | Unchanged |

**By the end, you will be able to:**

- Confirm exactly which database is safe to drop.
- Re-create and restore that database from a custom-format backup.
- Explain why a successful restore of an old dump does not include later orders.

**Do not confuse this with PITR:** `shop.dump` is an older logical backup.
We are not applying WAL to it. This exercise restores what was saved in that file;
orders 1004 and 1005 remain safely in SOURCE, not in this older practice copy.

**Success looks like:**

- 3 orders worth 195.00.
- You can explain why this older backup cannot contain the changes made after it was taken.

**Pause and discuss:**

- Show 3 orders / 195.00 in the drill database.
- Explain why that is correct here even though source reached 5 / 250.00 in Lab 9.

This independent drill uses the older `shop.dump` from Lab 2. It recovers the
backup snapshot, not the later PITR state. Linux terminal as `postgres`;
all commands below explicitly select SOURCE's socket and port:

```bash
createdb -h /var/run/postgresql -p 5432 -T template0 suta_drop_drill
```

```bash
pg_restore --exit-on-error -h /var/run/postgresql -p 5432 -d suta_drop_drill /var/lib/postgresql/suta-backup-lab/shop.dump
```

Connect, verify the disposable name and its 3 orders, then exit:

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_drop_drill
```

```sql
SELECT current_database(), count(*) FROM shop.orders;
```

```sql
SHOW data_directory;
```

**Expect:** `suta_drop_drill` with three orders, and directory
`/var/lib/postgresql/16/lab`. If either differs, STOP. Do not drop a database
based only on a similar name. Keep this session on the assigned lab server.

```psql
\q
```

Instructor confirms the target is the drill just created, with no other users.
This deliberately destroys that disposable database; recovery will use shop.dump.

```bash
dropdb -h /var/run/postgresql -p 5432 suta_drop_drill
```

```bash
createdb -h /var/run/postgresql -p 5432 -T template0 suta_drop_drill
```

```bash
pg_restore --exit-on-error -h /var/run/postgresql -p 5432 -d suta_drop_drill /var/lib/postgresql/suta-backup-lab/shop.dump
```

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_drop_drill
```

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

**Expect:**

- 3 and 195.00, not 5 and 250.00.
- Explain which later changes this backup cannot recover.
- A physical PITR recovery restores a cluster; extracting only one database afterward is a separate logical dump/restore step.

```sql
SELECT order_id, total FROM shop.orders ORDER BY order_id;
```

**Expect:** IDs 1001, 1002, 1003, worth 120.00, 50.00 and 25.00.

```psql
\q
```

### Prove SOURCE stayed unchanged

In the Linux terminal, after leaving the drill database:

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_shop
```

```sql
SELECT order_id, total FROM shop.orders ORDER BY order_id;
```

**Expect after Lab 9:** IDs 1001–1005, worth 120.00, 50.00, 25.00, 40.00
and 15.00. If different, save these rows and compare them with your Lab 9 results
with the instructor. Do not restore an older backup over SOURCE.

```psql
\q
```

## Lab 11 — failures, recovery objectives and runbook

### The scenario — a restore points at the wrong database

An operator has a valid `shop.dump` but types a database name that does not exist.
The restore fails before loading data. Your job is to read the error, confirm
the target, then restore into a new empty practice database—not overwrite SOURCE.

**By the end, you will be able to:**

- Tell a connection/target error from evidence of a damaged backup.
- Correct the destination without changing the backup or original database.
- Record the failure, correction and verified result in a short runbook.

A **runbook** is a short set of instructions another DBA can follow: the error,
the safe fix and the checks that prove it worked.

| Stage | Expected result |
|---|---|
| Wrong target `suta_restore_typo` | Connection fails because the database does not exist. |
| Correct new target `suta_fault_restore` | Restore succeeds: orders 1001–1003, total 195.00. |
| Protected SOURCE after Lab 9 | Still orders 1001–1005, total 250.00. |

**Success looks like:**

- A verified `suta_fault_restore` and a runbook describing the failure and correction.
- The advanced faults listed afterward need separate instructor preparation.

**Pause and discuss:**

- Explain the fault, the evidence behind your diagnosis, what you recovered and any remaining data loss.
- Let a classmate read your runbook and identify the safe target and checks without guessing.

### 11A — check the target before trying the restore

**Where:** Linux terminal as `postgres`, on your assigned practice server.

```bash
cd /var/lib/postgresql/suta-backup-lab
```

```bash
psql -X -h /var/run/postgresql -p 5432 -d postgres -Atc "SHOW data_directory"
```

**Expect:** `/var/lib/postgresql/16/lab`. Stop if it is a recovery copy or another server.

```bash
psql -X -h /var/run/postgresql -p 5432 -d postgres -Atc "SELECT datname FROM pg_database WHERE datname IN ('suta_restore_typo', 'suta_fault_restore')"
```

**Expect:** no rows. Both names must be unused. If either exists, inspect previous
work with the instructor. Do not drop it or rerun a restore over it.

```bash
pg_restore -l shop.dump
```

**Why:** check that the saved archive can be opened and listed. A listing alone
does not prove that all its data can be restored. If this fails, stop: that is
not the connection failure this exercise is designed to demonstrate.

### 11B — observe the intended error

**Where:** the same Linux terminal. This command is deliberately aimed at an
absent database. Do not substitute `suta_shop` or another existing database.

Record your practice start time before causing the error:

```bash
date -Is
```

```bash
pg_restore --exit-on-error -h /var/run/postgresql -p 5432 -d suta_restore_typo shop.dump
```

**Expect:** a nonzero exit and an error saying database `suta_restore_typo` does
not exist. Record the actual error. This expected failure is the lesson, not a
reason to add `--clean`, weaken permissions or recreate SOURCE.

**If different:** an authentication error, missing file or unreachable server is
a different problem. Save the exact error and the connection results from 11A
for your instructor before continuing. If the command
succeeds, stop: the supposedly absent target was not absent.

### 11C — correct the destination and prove recovery

**Where:** the same Linux terminal. Run creation and restoration once.

```bash
createdb -h /var/run/postgresql -p 5432 -T template0 suta_fault_restore
```

**Why:** create a new empty destination. If creation fails, do not run the restore.

```bash
pg_restore --exit-on-error -h /var/run/postgresql -p 5432 -d suta_fault_restore shop.dump
```

**Expect:** successful completion. On failure, keep the partial target and error
for instructor review; do not run the restore into that partly filled database again.

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_fault_restore -c "SELECT current_database(), count(*), sum(total) FROM shop.orders"
```

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_fault_restore -c "SELECT order_id, total FROM shop.orders ORDER BY order_id"
```

**Expect:** `suta_fault_restore`, three orders totaling 195.00; IDs 1001, 1002
and 1003 with values 120.00, 50.00 and 25.00.

```bash
psql -X -h /var/run/postgresql -p 5432 -d suta_shop -c "SELECT order_id, total FROM shop.orders ORDER BY order_id"
```

**Expect after Lab 9:** SOURCE still has 1001–1005 with values 120.00, 50.00,
25.00, 40.00 and 15.00. If different, save the rows and compare them with your
Lab 9 results with the instructor; do not overwrite SOURCE.
Keep the new practice database and backup for review. No cleanup is required.

After all checks match, record the finish time:

```bash
date -Is
```

### Instructor-prepared extensions — not part of the tested drill above

These are separate scenarios, not ready-to-run commands. Each requires an
isolated setup, a rehearsed failure and correction, and its own evidence before
students attempt it. Do not treat completion of 11A–11C as completion of these.

| Fault | Safe exercise boundary | Evidence to collect |
|---|---|---|
| Wrong role/ownership | Fresh isolated cluster lacking the lab role | Restore errors and corrected role order |
| Corrupt archive | A new disposable COPY of shop.dump only | Restore/decode failure, original unchanged |
| Missing archived WAL | Cloned offline repository and isolated target only | Recovery log cannot reach target |
| Archive permissions/full disk | Disposable repository or quota-limited test volume only | Failed archive/check, retained WAL risk |

Never corrupt the only backup, remove live WAL, fill a shared disk or change
repository permissions serving another cluster.

### Record what you learned

For this practice drill, record:

- The start time just before the intended error in 11B.
- The finish time after all data checks in 11C pass, including SOURCE's rows.
- The elapsed time, including diagnosis, correction and verification—not only
  the restore command. If you did not record a time, write “not measured”.
- Which data was saved in the older dump, and which later orders it cannot contain.

Discuss these separately; this drill does not set or prove business targets:

- **RPO:** how much data loss the business can accept, usually expressed as time.
- **RTO:** how long the business can wait for service to return.
- In a real incident, measure service downtime from loss of service through
  verified restoration. Here, SOURCE remains available; there is no simulated outage.

Write a runbook using [the results sheet](EVIDENCE.md). Another student should identify the correct
backup, target and validation checks without relying on your memory.

**Timing limit:** this drill measures your diagnosis and restore exercise, not
a real application outage. The older dump restores only its saved data; do not
claim zero production data loss or an achieved business RPO/RTO from this test.

Source: [PostgreSQL 16 pg_restore — destination and error behavior](https://www.postgresql.org/docs/16/app-pgrestore.html).
