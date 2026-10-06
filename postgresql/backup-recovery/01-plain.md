# Lab 1 — restore a plain SQL backup

**What we’re doing:** save the shop as a readable SQL file, then use that file to
rebuild it in a different database. The original stays untouched.
**You finish with:** `suta_plain_restore`, containing 3 orders worth 195.00.

**Your task:** back up `suta_shop` to `shop.sql`, restore it into
`suta_plain_restore`, and compare the restored data with your starting counts.

**Pause and discuss before moving on:** show the restored orders and constraints.
Explain why having `shop.sql` on disk is not enough to prove you can recover.
Which database did you restore into, and why did we leave the source alone?

Prerequisite: Lab 0. Linux shell, postgres user, inside `suta-backup-lab`.
Output names are new for this run; do not rerun over previous files.

## Take the backup

```bash
pg_dump -d suta_shop -f shop.sql
```

Why: save SQL that can rebuild this database. `-f` names the file. This is not
a physical cluster backup and cannot be replayed forward with archived WAL.

```bash
echo $?
```

Expect 0 immediately after pg_dump. A different value means stop and inspect errors.

```bash
ls -lh shop.sql
```

```bash
less shop.sql
```

Inspect CREATE TABLE, COPY and constraint entries. Press `q` to exit less.
Only restore trusted dumps: they execute SQL on the destination.

## Restore into a separate database

```bash
createdb -T template0 suta_plain_restore
```

Why: leave the source untouched. Do not add `--clean` or drop the source.

```bash
psql -X -v ON_ERROR_STOP=1 -d suta_plain_restore -f shop.sql
```

Why: psql reads plain SQL; `ON_ERROR_STOP=1` stops at the first error. This is
not automatically atomic: if it fails, keep the partial target for investigation
and use a new empty target after fixing the cause.

```bash
echo $?
```

Expect 0. Then connect to the restored database:

```bash
psql -X -d suta_plain_restore
```

```sql
SELECT current_database();
```

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

Expect `suta_plain_restore`, then 3 and 195.00.

```sql
SELECT * FROM shop.order_items ORDER BY item_id;
```

Expect three items linked to the original order IDs.

```sql
ANALYZE;
```

Why: refresh optimizer statistics after loading data.

```psql
\q
```

**Check your understanding:** if a fourth order arrives after pg_dump's snapshot,
should this restored copy contain it? No—this file represents the earlier snapshot.

Trouble: `database already exists` → do not overwrite; `permission denied` →
check role/file directory; `role does not exist` → see Lab 4, not `--no-owner` as
an unexplained workaround. Source: [SQL dump](https://www.postgresql.org/docs/18/backup-dump.html).
