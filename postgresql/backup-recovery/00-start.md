# Lab 0 — connect and prepare known data

**What we’re doing:** connect to your assigned server and create Bob’s small shop.
We record its starting rows so later we can tell whether a restore is correct.
**You finish with:** 3 customers, 3 orders worth 195.00, 3 items and 1 delivery note.

**Goal:** know which server you are changing before taking a backup.

Read [your class connection map](CLASS-SETUP.md). If continuing earlier work,
use [resume help](TROUBLESHOOTING.md), not a fresh run of all CREATE/INSERT steps.

## 1. Sign in

On your laptop, replace the two placeholders with the instructor's values:

```bash
ssh STUDENT_USER@LAB_HOST
```

Why: this opens the lab server's shell. Use only your assigned host. In SutaBot's
already-connected terminal, skip SSH. Do not share keys or passwords in Git.

On a dedicated Linux VM, if the instructor authorizes this account switch:

```bash
sudo -iu postgres
```

Why: the PostgreSQL service account can use the lab's local authentication.
If sudo is unavailable, ask for the assigned database login; do not change HBA.

```bash
whoami
```

Expect `postgres`. The following values are for the assigned StepUP class source.
On another environment, stop and get an instructor-approved connection map:

```bash
export PGHOST=/var/run/postgresql
```

```bash
export PGPORT=5432
```

```bash
export PGUSER=postgres
```

These settings keep the short commands on the same known connection. Never set
them to production. Confirm the supplied host/port before continuing.

```bash
psql -X -d postgres
```

`-X` ignores personal psql startup settings; `-d` selects the database.

```psql
\conninfo
```

```sql
SELECT current_database(), current_user;
```

```sql
SHOW server_version;
```

```sql
SHOW data_directory;
```

Record the connection and version privately. No DROP/DELETE until these match
your assigned lab. Exit psql, not the server:

```psql
\q
```

## 2. Create a private working folder

Linux terminal, still as postgres:

```bash
umask 077
```

Why: new backup files should not be readable by other OS users.

```bash
mkdir suta-backup-lab
```

If it exists, STOP: use the previous work or ask for a new run name, never overwrite.

```bash
cd suta-backup-lab
```

```bash
pwd
```

```bash
df -h .
```

Instructor confirms space. This same-disk folder is for practice, not disaster protection.

```bash
createdb -T template0 suta_shop
```

Why: create an empty lab database. If it exists, stop rather than drop it.

```bash
psql -X -d suta_shop
```

## 3. Build the small shop

Inside psql, one statement at a time. Each CREATE should report success.
**Run each INSERT below once.** A successful insert followed by a repeated insert
can create additional orders/items with new IDs. If unsure, inspect the table first;
do not repeat a write to see whether it worked.

```sql
CREATE SCHEMA shop;
```

```sql
CREATE TABLE shop.customers (customer_id integer PRIMARY KEY, name text NOT NULL);
```

```sql
CREATE TABLE shop.orders (
  order_id integer GENERATED ALWAYS AS IDENTITY (START WITH 1001) PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES shop.customers,
  status text NOT NULL,
  total numeric(10,2) NOT NULL CHECK (total >= 0)
);
```

The identity generates IDs; the foreign key prevents an order for an unknown customer.

```sql
CREATE TABLE shop.order_items (
  item_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id integer NOT NULL REFERENCES shop.orders,
  product text NOT NULL,
  amount numeric(10,2) NOT NULL
);
```

```sql
INSERT INTO shop.customers VALUES (1, 'Maria'), (2, 'Sam'), (3, 'Priya');
```

```sql
INSERT INTO shop.orders (customer_id, status, total) VALUES (1, 'Processing', 120), (2, 'Processing', 50), (3, 'Shipped', 25);
```

```sql
INSERT INTO shop.order_items (order_id, product, amount) VALUES (1001, 'Camera', 120), (1002, 'Bag', 50), (1003, 'Cable', 25);
```

Create a simple independent table for our first safe DROP exercise:

```sql
CREATE TABLE shop.delivery_notes (note_id integer PRIMARY KEY, message text NOT NULL);
```

```sql
INSERT INTO shop.delivery_notes VALUES (1, 'Leave at reception');
```

## 4. Record the baseline

```sql
SELECT * FROM shop.orders ORDER BY order_id;
```

Expect IDs 1001, 1002, 1003 and totals 120, 50, 25.

```sql
SELECT count(*), sum(total) FROM shop.orders;
```

Expect 3 and 195.00. Write this into your evidence sheet.

```sql
SELECT count(*) FROM shop.customers;
```

**Expect:** 3.

```sql
SELECT count(*) FROM shop.order_items;
```

**Expect:** 3, not 6. Stop and inspect duplicates if different.

```sql
SELECT count(*) FROM shop.delivery_notes;
```

**Expect:** 1. These baselines help separate a backup issue from repeated setup.

```psql
\q
```

Stay in this working folder for Labs 1–4. **Explain:** what is the difference
between leaving psql and stopping PostgreSQL?
