# Lab 3 — someone dropped a table

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

Expect note 1. Confirm `notes.dump` was created successfully in Lab 2.

```sql
DROP TABLE shop.delivery_notes;
```

This is intentional loss of the disposable copy, not production. Do not add CASCADE.

```sql
SELECT to_regclass('shop.delivery_notes');
```

Expect NULL: that table no longer exists.

```psql
\q
```

## Recover

Linux shell:

```bash
pg_restore --exit-on-error -d suta_custom_restore notes.dump
```

Why: restore the complete table-only archive into the lab database where the
table is absent and the schema exists. The good orders table is not replaced.

```bash
psql -X -d suta_custom_restore
```

```sql
SELECT * FROM shop.delivery_notes;
```

Expect note 1, “Leave at reception”.

```psql
\d shop.delivery_notes
```

Expect its primary key and NOT NULL constraints.

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

Expect 4 and 205.00: the later order from Lab 2 survived. A whole-database
replacement would have lost it. In a real incident, rehearse restoration in a
separate recovery target before writing to the live system.

```psql
\q
```

**Explain:** why was restoring only the missing table safer here? What extra
planning would `orders` need because `order_items` references it?
