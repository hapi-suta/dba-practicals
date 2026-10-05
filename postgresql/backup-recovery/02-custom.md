# Lab 2 — archives, schemas and tables

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

```sql
INSERT INTO shop.orders (customer_id, status, total) VALUES (1, 'New', 10) RETURNING order_id;
```

Expect 1004: the restored identity sequence works. This insert affects ONLY the copy.

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
