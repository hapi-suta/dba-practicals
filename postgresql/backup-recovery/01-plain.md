# Lab 1 — restore a plain SQL backup

**The task:** prove that Bob's saved SQL file can rebuild his shop in a separate
database. There is no deletion in this lab. SOURCE stays intact; the restore
should show the same three orders and values saved by the backup.

**What you’ll practise:**

- Save the shop as a readable SQL file, then use that file to rebuild it in a different database.
- The original stays untouched.

**Success looks like:**

- `suta_plain_restore`, containing 3 orders worth 195.00.

**Pause and discuss before moving on:**

- Show the restored orders and constraints.
- Explain why having `shop.sql` on disk is not enough to prove you can recover.
- Which database did you restore into, and why did we leave the source alone?

**Before you start:**

- Finish Lab 0.
- Use the Linux terminal as `postgres`, inside `suta-backup-lab`.
- Use new output files. Do not overwrite an earlier backup.

## Take the backup

```bash
pg_dump -d suta_shop -f shop.sql
```

**Why:**

- Save SQL commands that can rebuild this database.
- `-f` names the backup file.
- This saves one database, not the whole PostgreSQL cluster.
- You cannot apply WAL (PostgreSQL's record of changes) to this SQL file to recover later changes.

**Expect:**

- Wait for the command to finish and the terminal prompt to return. `pg_dump` may finish without printing a success message.
- If it prints an error, stop and save that message. Do not try to restore this file yet.
- The next command checks whether the backup file was created. The restore later in this lab tests whether it can rebuild the data.

```bash
ls -lh shop.sql
```

**Expect:** `shop.sql` is listed with a size greater than zero. If it is missing
or empty, stop and show the backup command's output to your instructor.

```bash
less shop.sql
```

- `CREATE TABLE` rebuilds tables.
- `COPY` loads their rows.
- Constraints are rules for the data, such as unique IDs.
- Press `q` to close the file viewer.

**Safety:** restore only trusted backups. Their SQL commands run in the target database.

## Restore into a separate database

```bash
createdb -T template0 suta_plain_restore
```

**Why:**

- Leave the source untouched.
- Do not add `--clean` or drop the source.

```bash
psql -X -v ON_ERROR_STOP=1 -d suta_plain_restore -f shop.sql
```

**Why:**

- `psql` runs the SQL in this file.
- `ON_ERROR_STOP=1` stops at the first error.
- Earlier commands may already have changed the restore database.
- If it fails, save the first error and keep the partly restored database. Do not run the restore into it again.
- Ask your instructor to help correct the error and choose a new empty database for the next attempt.

**Expect:**

- Wait for the SQL commands to finish. If an error appears, stop and follow the instructions above.
- Then connect to the restored database and check its rows and table rules. These checks show whether the restore produced the expected result:

```bash
psql -X -d suta_plain_restore
```

```sql
SELECT current_database();
```

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

**Expect:**

- `suta_plain_restore`, then 3 and 195.00.

```sql
SELECT * FROM shop.order_items ORDER BY item_id;
```

**Expect:**

- Three items linked to the original order IDs.

```psql
\d shop.orders
```

**Expect:** an identity column for `order_id`, a primary key, a foreign key
to `shop.customers` and a check that `total` is not negative. These are restored
table rules, not just restored rows. If any is missing, stop and compare with
SOURCE's table definition with the instructor.

```sql
ANALYZE;
```

**Why:**

- Collect table information that PostgreSQL uses to choose how to run queries.

```psql
\q
```

**Check your understanding:** if a fourth order arrives after the backup's view of the data was taken,
should this restored copy contain it?

- **Answer:** no. The backup only contains data visible at that earlier point.

### If something goes wrong

- `database already exists`: stop and follow [the existing-work checks](TROUBLESHOOTING.md#6-folderdatabase-exists-or-postmasterpid-exists). Do not drop that database.
- `permission denied`: save the full error, including any named file or role, and confirm you followed Lab 0's `postgres` login steps. Ask the instructor to check access; do not grant broad permissions.
- `role does not exist`: read [why roles need a separate backup in Lab 4](04-roles.md). Ask the instructor to confirm the missing role before retrying. Do not add `--no-owner` to hide the error; it changes object ownership on restore.

Source: [SQL dump](https://www.postgresql.org/docs/18/backup-dump.html).
