# Labs 9–11 — return missing data and prove recovery

Lab 9 depends on verified, paused recovery in Lab 8. Instructor-led; see
[validation scope](VALIDATION.md). Paths below are the actual class paths.
SOURCE is port 5432; recovered COPY is port 55433. Do not repeat the merge if
order 1001 already exists on SOURCE. Investigate existing work before continuing.

## Lab 9 — bring back only Maria's missing order

**What we’re doing:** export the missing order and its item from the recovery
copy, inspect them in temporary staging tables, then return only those rows.
**You finish with:** 5 orders worth 250.00 and 3 items on source. The newer
order 1005 survives; the live table is not replaced.

**Your task:** export order 1001 and its item from the paused copy, inspect them
in source-side staging tables, then merge only those verified missing rows.

**Pause and discuss:** show orders 1001 and 1005 together on source, with the
expected totals and items. Explain why replacing the live table with the
recovered version would lose valid newer work.

Why: the live lab source has order 1005, which the recovered copy does not.
Replacing the entire table would lose valid newer work. Real incidents also need
writer coordination, dependency analysis and business approval; this toy exercise
has one known order and one item, with its customer still present.

Connect to the recovered copy, not source:

```bash
psql -X -h /var/lib/postgresql/suta-backup-lab/recovery-socket -p 55433 -d suta_shop
```

```sql
SHOW data_directory;
```

Must be pitr-copy. In psql, export only the identified lost records. `\copy` writes
client-side files; these contain lab data and must stay OUT of Git.

```psql
\copy (SELECT order_id, customer_id, status, total FROM shop.orders WHERE order_id = 1001) TO '/var/lib/postgresql/suta-backup-lab/missing-order.csv' WITH CSV HEADER
```

```psql
\copy (SELECT item_id, order_id, product, amount FROM shop.order_items WHERE order_id = 1001) TO '/var/lib/postgresql/suta-backup-lab/missing-items.csv' WITH CSV HEADER
```

Each should report COPY 1 for this fixture. Do not generalize the row filter to
an entire incident without identifying all affected relationships.

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

Verify this is source PGDATA. Create temporary staging tables, not live replacements:

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

Expected order 1001, customer 1, Shipped, 120.00 from Lab 7.

```sql
TABLE recovered_items;
```

Expected item 1, order 1001, Camera, 120.00.

```sql
SELECT * FROM shop.orders WHERE order_id IN (1001, 1005);
```

Expect only 1005. Stop if 1001 already exists or if the values differ from the
incident evidence. Do not overwrite it with ON CONFLICT DO UPDATE.

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

If any statement fails, issue ROLLBACK and investigate; do not commit partial work.

```sql
SELECT * FROM shop.orders WHERE order_id = 1001;
```

Still zero rows. The related customer must exist:

```sql
SELECT * FROM shop.customers WHERE customer_id = 1;
```

Expect Maria. Insert the parent before its dependent item:

```sql
INSERT INTO shop.orders OVERRIDING SYSTEM VALUE SELECT * FROM recovered_orders;
```

Why: preserve the original identity value 1001, rather than generate a new ID.

```sql
INSERT INTO shop.order_items OVERRIDING SYSTEM VALUE SELECT * FROM recovered_items;
```

Expect INSERT 0 1 for each. Primary and foreign keys remain active.

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

Expected 5 and 250.00; order 1005 is still present. If any check differs, ROLLBACK
instead of COMMIT and retain your evidence for the instructor.

```sql
COMMIT;
```

```sql
SELECT * FROM shop.orders ORDER BY order_id;
```

```sql
SELECT * FROM shop.order_items ORDER BY item_id;
```

Expect five orders, three items. This fixture deliberately leaves new orders
1004/1005 without items. A real application's business rules may not allow that.
The live sequence was never rolled back or replaced: do not reset it downward.

```psql
\q
```

After evidence is accepted, shell: stop ONLY the recovered copy, retaining its files:

```bash
pg_ctl -D /var/lib/postgresql/suta-backup-lab/pitr-copy -m fast -w stop
```

## Lab 10 — a whole database is dropped

**What we’re doing:** create a separate drill database, drop only that database,
then rebuild it from the earlier logical backup.
**You finish with:** 3 orders worth 195.00. You can explain why this older
backup cannot contain the changes made after it was taken.

**Your task:** create and verify `suta_drop_drill`, get the instructor's target
confirmation, drop only that drill database, then restore and verify it again.

**Pause and discuss:** show 3 orders / 195.00 in the drill database. Explain why
that is correct here even though source reached 5 / 250.00 in Lab 9.

This independent drill uses the older `shop.dump` from Lab 2. It recovers the
backup snapshot, not the later PITR state. Shell, original connection:

```bash
createdb -T template0 suta_drop_drill
```

```bash
pg_restore --exit-on-error -d suta_drop_drill shop.dump
```

Connect, verify the disposable name and its 3 orders, then exit:

```bash
psql -X -d suta_drop_drill
```

```sql
SELECT current_database(), count(*) FROM shop.orders;
```

```psql
\q
```

Instructor confirms the target is the drill just created, with no other users.
This deliberately destroys that disposable database; recovery will use shop.dump.

```bash
dropdb suta_drop_drill
```

```bash
createdb -T template0 suta_drop_drill
```

```bash
pg_restore --exit-on-error -d suta_drop_drill shop.dump
```

```bash
psql -X -d suta_drop_drill
```

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

Expect 3 and 195.00, not 5 and 250.00. Explain which later changes this backup
cannot recover. A physical PITR recovery restores a cluster; extracting only one
database afterward is a separate logical dump/restore step.

```psql
\q
```

## Lab 11 — failures, recovery objectives and runbook

**What we’re doing:** investigate one instructor-approved failure in isolation,
record recovery time and data loss, and write steps someone else can follow.
**You finish with:** evidence and a usable recovery runbook—not just a backup
file. The instructor must prepare any fault-injection environment first.

**Your task:** investigate one safely prepared fault with your instructor,
record the evidence and recovery timings, and complete your recovery runbook.

**Pause and discuss:** explain the fault, the evidence behind your diagnosis,
what you recovered and any remaining data loss. Let a classmate read your
runbook and identify the safe target and checks without guessing.

Instructor chooses ONE isolated fault after the successful baseline:

| Fault | Safe exercise boundary | Evidence to collect |
|---|---|---|
| Wrong restore database | Use a nonexistent lab target | Exact error, correct connection |
| Wrong role/ownership | Fresh isolated cluster lacking the lab role | Restore errors and corrected role order |
| Corrupt archive | A new disposable COPY of shop.dump only | Restore/decode failure, original unchanged |
| Missing archived WAL | Cloned offline repository and isolated target only | Recovery log cannot reach target |
| Archive permissions/full disk | Disposable repository or quota-limited test volume only | Failed archive/check, retained WAL risk |

These last three are **instructor-designed extensions**, not provided executable
fault injections. Never corrupt the only backup, remove live WAL, fill a shared
disk or change repository permissions serving another cluster.

Record recovery start, service/data verification finish, latest recovered order
and any missing committed orders. Compare observed data loss with the business
RPO and elapsed end-to-end recovery with RTO. “Restore command took 2 minutes” is
not the entire outage. Do not invent performance numbers.

Write a runbook using EVIDENCE.md. Another student should identify the correct
backup, target and validation checks without relying on your memory.
