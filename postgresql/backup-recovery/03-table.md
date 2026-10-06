# Lab 3 — someone dropped a table

## The incident — recover one table, keep newer work

In Lab 2, you saved `shop.dump` from the original shop, then restored it into
`suta_custom_restore`. You added order 1004, worth 10.00, **only to that copy**.
You also saved the delivery-note table from SOURCE in `notes.dump`.

Now pretend someone dropped the delivery-note table in `suta_custom_restore`.
The orders are still there. Your job is to restore the missing table—not replace
the whole database with the older `shop.dump`.

| Stage | Delivery-note table in the practice copy | Orders in the practice copy |
|---|---|---|
| Before the mistake | Note 1: Leave at reception | 1001–1004; 4 orders / 205.00 |
| After DROP | Table missing, not just empty | Still 1001–1004; 4 / 205.00 |
| After restoring `notes.dump` | Note 1 and its table rules are back | Still 1001–1004; 4 / 205.00 |

**Keep safe:** SOURCE `suta_shop`, the backup files and order 1004 in the copy.
Replacing the whole copy from `shop.dump` would lose that later order.

**By the end, you will be able to:**

- Confirm the target and backup before dropping anything.
- Tell a missing table from a table with no rows.
- Restore only the delivery-note table and check its primary key and required fields.
- Prove order 1004 survived, not just that the restore command succeeded.

This is a simple independent table. Recovering a table with related tables needs
additional checks; this exercise is not a universal production recovery recipe.

**Success looks like:**

- The note and its constraints back, with all 4 orders worth 205.00 still present in `suta_custom_restore`.

**Pause and discuss before moving on:**

- Show the recovered note, its primary key and the newer order.
- Explain what could be lost if you replaced the whole database with the older backup instead of recovering just the missing table.

Prerequisite: Lab 2, including `notes.dump` and the restored custom database.
We damage ONLY `suta_custom_restore`, never the source shop.

## Confirm, then simulate the incident

Linux shell:

```bash
psql -X -d suta_custom_restore
```

```sql
SELECT current_database();
```

Must say `suta_custom_restore`. Otherwise STOP.

```sql
SELECT * FROM shop.delivery_notes;
```

**Expect:**

- Note 1.
- Confirm `notes.dump` was created successfully in Lab 2.

Immediately before the DROP, confirm which server owns this database:

```sql
SHOW data_directory;
```

**Expect:** `/var/lib/postgresql/16/lab`, with database `suta_custom_restore`
from the check above. Otherwise STOP. The database name alone does not identify
the server. This is a one-time incident; if the table is already absent, inspect
your saved step instead of repeating the DROP.

```sql
DROP TABLE shop.delivery_notes;
```

**Safety:** delete this table only in the practice copy, never in production.
Do not add `CASCADE`; it can remove other objects that depend on the table.

```sql
SELECT to_regclass('shop.delivery_notes');
```

**Expect:**

- NULL: that table no longer exists.

```psql
\q
```

## Recover

Linux shell:

```bash
pg_restore --exit-on-error -d suta_custom_restore notes.dump
```

**Why:**

- Restore the complete table-only archive into the lab database where the table is absent and the schema exists.
- The good orders table is not replaced.

```bash
psql -X -d suta_custom_restore
```

```sql
SELECT * FROM shop.delivery_notes;
```

**Expect:**

- Note 1, “Leave at reception”.

```psql
\d shop.delivery_notes
```

**Expect:**

- Its primary key (unique ID) and NOT NULL rules (required values).

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

**Expect:**

- 4 and 205.00: the later order from Lab 2 survived.
- A whole-database replacement would have lost it.
- In a real incident, rehearse restoration in a separate recovery target before writing to the live system.

```sql
SELECT order_id, status, total FROM shop.orders WHERE order_id = 1004;
```

**Expect:** exactly `1004 / New / 10.00`. This checks the particular newer
order we promised to preserve. A matching count and total alone are not enough.
If absent or different, stop and investigate; do not insert a replacement row.

```psql
\q
```

**Explain:** why was restoring only the missing table safer here? What extra
planning would `orders` need because `order_items` references it?
