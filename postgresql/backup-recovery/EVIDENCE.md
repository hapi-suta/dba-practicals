# Your lab results — copy and fill in

Use fictional lab data only. Never include credentials, private keys or real
customer information. Do not publish server addresses or role-backup files such
as `globals.sql`. Fill in the items that apply to your lab; write “not used” for
the others and “not measured” for any timing you did not record.

- Student / date:
- Lab number:
- PostgreSQL server and client versions:
- Original database and restored-copy names (leave out private server details):
- Backup filename / format / completion time:
- Backup command's exit status (`0` for success, or the error you received):
- Recovery target (if applicable), time zone and reason:
- What failure did you simulate?
- What did you restore, and where?
- How did you prove you did not overwrite the source?
- Expected versus observed order IDs, counts and totals:
- Table rules, next generated ID and access checks used in this lab:
- Recovery log evidence that the intended target was reached:
- Did newer valid orders survive?
- Recovery start and verified-finish times:
- Which orders came back? Which later changes are missing from the backup or recovered copy?
- One error, its cause and the correction:
- What would you do differently on a real company database?

## Instructor completion check

Do not mark complete just because a command ran. The student must demonstrate
the restored result, name a limitation, and explain why the chosen target is safe.
Signing in, creating a backup, checking its files, starting the copy and checking
its rows are different results. Record which ones you actually completed.

## Exit questions

1. Which program reads a plain SQL dump? Which reads a custom archive?
2. Why does backing up one database not preserve every cluster role?
3. Why doesn't replication undo an accidental committed DELETE?
4. Why can a successful file restore still require WAL recovery?
5. Why recover to a separate cluster before extracting missing data?
6. What evidence shows you preserved valid orders created after the incident?
