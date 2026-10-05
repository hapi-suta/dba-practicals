# Student evidence — copy and fill in

Use fictional lab data only. Never include credentials, private keys or real
customer information. Do not publish private server addresses or globals dumps.

- Student / date:
- Lab number:
- PostgreSQL server and client versions:
- Instructor-approved source and destination names (redacted if shared):
- Backup filename / format / completion time:
- Backup tool exit status:
- Recovery target (if applicable), time zone and reason:
- What failure did you simulate?
- What did you restore, and where?
- How did you prove you did not overwrite the source?
- Expected versus observed order IDs, counts and totals:
- Constraints, sequence and permission checks:
- Recovery log evidence that the intended target was reached:
- Did newer valid orders survive?
- Recovery start and verified-finish times:
- Latest recovered data point and any known lost changes:
- One error, its cause and the correction:
- What would you do differently on production?

## Instructor completion check

Do not mark complete just because a command ran. The student must demonstrate
the restored result, name a limitation, and explain why the chosen target is safe.
SSH access, backup success, integrity verification, startup, target recovery and
business validation are separate observations.

## Exit questions

1. Which program reads a plain SQL dump? Which reads a custom archive?
2. Why does backing up one database not preserve every cluster role?
3. Why doesn't replication undo an accidental committed DELETE?
4. Why can a successful file restore still require WAL recovery?
5. Why recover to a separate cluster before extracting missing data?
6. What evidence shows you preserved valid orders created after the incident?
