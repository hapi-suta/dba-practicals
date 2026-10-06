# Lab 2 — archives, schemas and tables

**Keep the copies straight:**

- SOURCE `suta_shop` keeps orders 1001–1003, totaling 195.00.
- `shop.dump` is taken from SOURCE before the test insert.
- Only `suta_custom_restore` gets order 1004 / 10.00, reaching 4 / 205.00.
- The schema copy is restored from SOURCE's data, so it stays at 3 / 195.00.
- `notes.dump` contains the independent delivery-note table for Lab 3; it does
  not contain the orders table. Keep all these files.

**What you’ll practise:**

- Take a custom-format backup, inspect its contents and restore it with `pg_restore`.
- Then practise selecting one schema or one table to back up.

**Success looks like:**

- Restored copies, a working order-number sequence and a delivery-note backup ready for Lab 3.

**Pause and discuss before moving on:**

- Show 4 orders / 205.00 in the custom copy and 3 / 195.00 in the schema copy.
- Explain why those totals differ and identify the file you will use to recover the delivery-note table in Lab 3.

**Where:** Linux terminal as `postgres`, in `/var/lib/postgresql/suta-backup-lab`,
using the SOURCE connection from Lab 0. If you reconnected, first follow
[the connection steps](TROUBLESHOOTING.md#returning-after-a-disconnect-or-another-help-page).
Keep all previous files.

## Custom archive

```bash
pg_dump -Fc -d suta_shop -f shop.dump
```

**Why:**

- `-Fc` creates a custom archive for pg_restore, not a SQL text file.
- `-d suta_shop`: select the source database. `-f shop.dump`: name the backup file.

```bash
pg_restore -l shop.dump
```

**Why:**

- List the archive's table of contents.
- `-l` means list; it does not restore anything.
- Find the schema, tables, data, sequences, primary keys and foreign keys.
- This proves the file's contents can be listed. The restore and data checks below show whether the saved database can be rebuilt.

```bash
createdb -T template0 suta_custom_restore
```

`-T template0` uses PostgreSQL's clean starting template for the new database.

```bash
pg_restore --exit-on-error -d suta_custom_restore shop.dump
```

**Why:**

- Rebuild the tables, data and other saved objects in an empty database.
- `--exit-on-error`: stop the restore at the first error. `-d suta_custom_restore`: select the database receiving the data.

```bash
psql -X -d suta_custom_restore
```

**Connection options:** `-X` skips psql startup files so custom settings do not
affect the lab. `-d` selects the database to connect to.

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

**Expect:**

- 3 and 195.00.

```psql
\d shop.orders
```

Check more than the number of rows:

- **Identity:** generates the next order ID.
- **Primary key:** keeps each order ID unique.
- **Foreign key:** links each order to an existing customer.

**Run once only.** If you already added order 1004, skip this INSERT and inspect
the existing rows using the query below. Do not add another test order.

```sql
INSERT INTO shop.orders (customer_id, status, total) VALUES (1, 'New', 10) RETURNING order_id;
```

**Expect:** order ID `1004`. PostgreSQL generated the next ID in the restored copy.
If you already ran this step, use the query below instead of repeating the INSERT:

```sql
SELECT order_id, status, total FROM shop.orders WHERE order_id >= 1004 ORDER BY order_id;
```

**Expect after the one-time insert:**

- One row, 1004 / New / 10.00.

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

**Expect:**

- 4 / 205.00.
- If 5 / 215.00, the test order may have been inserted twice. Save the preceding query's rows and follow [the extra-row checks](TROUBLESHOOTING.md#5-too-many-orders-or-items). Do not delete an order or reset the ID counter to force a match.

```psql
\q
```

## Select a schema

```bash
pg_dump -Fc -n shop -d suta_shop -f shop-schema.dump
```

- A **schema** groups related tables and other objects under a name, here `shop`.
- `-n shop` saves that schema and its contents, including rows.
- `--schema-only` means definitions without rows. It is a different option.
- Objects needed from outside `shop` may not be included.

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

**Expect:**

- 3 and 195.00, not the extra order inserted into the other copy.

```psql
\q
```

## Select one table for Lab 3

```bash
pg_dump -Fc -t shop.delivery_notes -d suta_shop -f notes.dump
```

`-t` selects a table. It does not automatically include everything the table
needs, such as its schema or a related table. The restore database must already
have the `shop` schema. Our delivery-note table has no foreign keys or custom
data types, so this first table-recovery exercise stays small.

```bash
pg_restore -l notes.dump
```

Check the list for the table, its data and primary key. In Lab 3, restore the
whole `notes.dump` file so all those saved parts are restored. Do not add
`pg_restore -t`: that option can leave out related parts such as indexes.
Sources:
[pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html),
[pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html).
