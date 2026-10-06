# Lab 4 — recovered data needs the right access

**The task:** the report reader must read orders but must not delete them after
a restore. A successful SELECT is only half the proof: DELETE must be refused.
We test permissions in `suta_access_restore`, not by deleting from SOURCE.

**What you’ll practise:**

- Give a reporting role read-only access, save role definitions separately from the database backup, and verify permissions in a restored copy.

**Success looks like:**

- A reader that can SELECT orders but cannot DELETE them.

**Pause and discuss before moving on:**

- Show SELECT succeeding, DELETE being denied and all 3 orders still present.
- Explain why this expected error is a good result, and why role definitions need a separate backup from `pg_dump`.

Dedicated lab cluster only. Roles are cluster-wide, not private to one database.
Do not run this against a shared class cluster without instructor coordination.

Linux shell:

```bash
psql -X -d suta_shop
```

```sql
CREATE ROLE suta_report_reader NOLOGIN;
```

**Why:**

- This role groups the permissions we want a report reader to have.
- `NOLOGIN` means the role cannot sign in directly, so no password is needed.
- If it exists, stop and inspect it rather than replacing it.

```sql
GRANT USAGE ON SCHEMA shop TO suta_report_reader;
```

```sql
GRANT SELECT ON ALL TABLES IN SCHEMA shop TO suta_report_reader;
```

These grant use of the schema and reading of its current tables. They do not
grant write access or privileges on all future tables.

```psql
\q
```

## Save globals and a new database backup

```bash
pg_dumpall --globals-only --no-role-passwords -f globals.sql
```

**Why:**

- `pg_dump` does not save the roles shared by all databases in the cluster.
- `pg_dumpall --globals-only` saves those role definitions and other shared objects.
- `--no-role-passwords` leaves out saved password hashes.
- Any login passwords must be set up separately and securely.

```bash
less globals.sql
```

Find the group role. Press `q`. Do not upload globals or dumps: even without
passwords, they can expose role names and configuration.

```bash
pg_dump -Fc -d suta_shop -f shop-with-access.dump
```

```bash
createdb -T template0 suta_access_restore
```

```bash
pg_restore --exit-on-error -d suta_access_restore shop-with-access.dump
```

Same-cluster restore already has the role. **Do not replay globals.sql here**:
existing roles cause conflicts. On a separate fresh cluster, the instructor must
inspect globals for existing roles and tablespace paths, apply the required role
definitions first, then restore the database. Do not drop existing cluster roles.

## Test access, not just data

```bash
psql -X -d suta_access_restore
```

```sql
SET ROLE suta_report_reader;
```

```sql
SELECT count(*) FROM shop.orders;
```

**Expect:**

- Three orders are readable.

```sql
DELETE FROM shop.orders WHERE order_id = 1001;
```

**Expect:**

- **permission denied**, with no rows deleted.
- This error is the result we want: the reader must not be allowed to delete orders.
- If deletion succeeds, stop and ask the instructor to check the permissions.

```sql
RESET ROLE;
```

```sql
SELECT count(*) FROM shop.orders;
```

**Expect:**

- All three orders remain; the denied deletion changed nothing.
- `SET ROLE` tests what this role is allowed to do.
- It does not test signing in over the network or using a password.

```psql
\q
```

Source: [cluster-wide globals](https://www.postgresql.org/docs/18/backup-dump.html#BACKUP-DUMP-ALL).
