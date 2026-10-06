# Lab 3 — someone dropped a table

**What we’re doing:**

- Deliberately drop the delivery-note table in the practice copy, then recover only that table.
- We check that a newer order is not lost.

**You finish with:**

- The note and its constraints back, with all 4 orders worth 205.00 still present in `suta_custom_restore`.

**Your task:**

- Check that you are in `suta_custom_restore`.
- Drop only its delivery-note table.
- Restore `notes.dump`, then check the notes and orders.

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

```psql
\q
```

**Explain:** why was restoring only the missing table safer here? What extra
planning would `orders` need because `order_items` references it?
