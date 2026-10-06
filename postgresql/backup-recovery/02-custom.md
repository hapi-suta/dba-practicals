# Lab 2 — archives, schemas and tables

**What we’re doing:** take a custom-format backup, inspect its contents and restore
it with `pg_restore`. Then practise selecting one schema or one table to back up.
**You finish with:** restored copies, a working order-number sequence and a
delivery-note backup ready for Lab 3.

**Your task:** inspect and restore a custom archive, test its order-number
sequence once, then make the schema and delivery-note backups shown below.

**Pause and discuss before moving on:** show 4 orders / 205.00 in the custom
copy and 3 / 195.00 in the schema copy. Explain why those totals differ and
identify the file you will use to recover the delivery-note table in Lab 3.

Linux shell in the same folder and connection as Lab 1. Keep all previous files.

## Custom archive

```bash
pg_dump -Fc -d suta_shop -f shop.dump
```

Why: `-Fc` creates a custom archive for pg_restore, not a SQL text file.

```bash
pg_restore -l shop.dump
```

Why: list the archive's table of contents. Find the schema, tables, data,
sequences, primary keys and foreign keys. Listing alone does not prove restore.

```bash
createdb -T template0 suta_custom_restore
```

```bash
pg_restore --exit-on-error -d suta_custom_restore shop.dump
```

Why: reconstruct all archive objects in an empty target and stop on error.

```bash
psql -X -d suta_custom_restore
```

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

Expect 3 and 195.00.

```psql
\d shop.orders
```

Check the identity, primary key and customer foreign key, not only row count.

**Run once only.** If you already added order 1004, skip this INSERT and inspect
the existing rows using the query below. Do not add another test order.

```sql
INSERT INTO shop.orders (customer_id, status, total) VALUES (1, 'New', 10) RETURNING order_id;
```

**Run that INSERT once only.** Expect 1004: the restored identity sequence works.
This affects ONLY the copy. If returning to this step, inspect existing rows
first instead of repeating the INSERT:

```sql
SELECT order_id, status, total FROM shop.orders WHERE order_id >= 1004 ORDER BY order_id;
```

**Expect after the one-time insert:** one row, 1004 / New / 10.00.

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

**Expect:** 4 / 205.00. If 5 / 215.00, investigate with the instructor; do not
delete an order or reset the sequence to make the numbers match.

```psql
\q
```

## Select a schema

```bash
pg_dump -Fc -n shop -d suta_shop -f shop-schema.dump
```

`-n shop` selects the schema and its contents, including data. It does NOT mean
“definitions only”; that is `--schema-only`. Dependencies outside it may be absent.

```bash
createdb -T template0 suta_schema_restore
```

```bash
pg_restore --exit-on-error -d suta_schema_restore shop-schema.dump
```

```bash
psql -X -d suta_schema_restore
```

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

Expect 3 and 195.00, not the extra order inserted into the other copy.

```psql
\q
```

## Select one table for Lab 3

```bash
pg_dump -Fc -t shop.delivery_notes -d suta_shop -f notes.dump
```

`-t` selects a table. It is NOT a guarantee that external dependencies are included.
The target must already have the `shop` schema. This deliberately simple table
has no foreign keys or custom types; real tables need dependency planning.

```bash
pg_restore -l notes.dump
```

Check for the table, its data and primary key. Restoring the entire table-only
archive keeps its included objects; `pg_restore -t` selection has different
limitations and can omit subsidiary objects. Sources:
[pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html),
[pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html).
