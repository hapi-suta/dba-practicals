# Lab 4 — recovered data needs the right access

Dedicated lab cluster only. Roles are cluster-wide, not private to one database.
Do not run this against a shared class cluster without instructor coordination.

Linux shell:

```bash
psql -X -d suta_shop
```

```sql
CREATE ROLE suta_report_reader NOLOGIN;
```

Why: this group role represents read-only reporting access; no password is needed.
If it exists, stop and inspect it rather than replacing it.

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

Why: pg_dump does not save cluster-wide role definitions. Password verifiers are
omitted deliberately; login credentials need separate secure provisioning.

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

Expect 3.

```sql
DELETE FROM shop.orders WHERE order_id = 1001;
```

Expect **permission denied**, with no deletion. This is an intentional negative
test in the disposable restore. If it succeeds, stop: access is too broad.

```sql
RESET ROLE;
```

```sql
SELECT count(*) FROM shop.orders;
```

Expect 3. SET ROLE tests authorization, not network authentication or a password.

```psql
\q
```

Source: [cluster-wide globals](https://www.postgresql.org/docs/18/backup-dump.html#BACKUP-DUMP-ALL).
