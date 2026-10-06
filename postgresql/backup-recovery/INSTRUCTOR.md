# Instructor — start the class here

## Today: teach the rehearsed core first

Open README.md and follow Labs 0–4. Allow roughly 80–90 minutes including setup,
questions and verification. If time is shorter, finish 0–3 and assign 4 afterward.
Do not spend class time configuring PITR before students can restore a dump.

Before distributing commands, confirm:

- Each student has a disposable cluster, its login and the approved socket/port.
- PostgreSQL client/server major versions match for this course; the commands are
  reviewed for 14–18, but only the version in VALIDATION.md was rehearsed here.
- `postgres` can write its lab folder; backup and restore names do not already exist.
- Disk space covers the original, backup and several restored copies with headroom.
- No application, other student's work or production data uses these targets.

Lab 0 uses the prepared StepUP server values. Give students the
[lab overview](LAB-OVERVIEW.md) and [connection map](CLASS-SETUP.md) first.
Use [the private connection sheet](CONNECTION-SHEET.md) for individual logins.
On another environment, prepare and test a separate edition; do not ask students
to guess paths or weaken pg_hba.conf. Local tests do not prove current SSH access.

## Advanced-lab readiness gate — do not skip

Labs 5–11 remain instructor-led. Read [the exact tested scope](VALIDATION.md),
then verify this worksheet against the host before students run commands:

| Setting | Instructor-confirmed value |
|---|---|
| OS and PostgreSQL major/minor | |
| Binary directory containing pg_ctl, postgres and pg_basebackup | |
| Disposable source PGDATA | |
| Source port and socket directory | |
| Lab user's absolute working directory | |
| Empty recovery target directory | |
| Recovery port (examples use 55433) | |
| Private recovery socket directory | |
| Backup repository path and available space | |
| pgBackRest version and configuration path | |
| Permitted source-cluster restart procedure | |

Physical examples require a standalone, self-contained cluster: configuration
inside PGDATA, no external tablespaces, no symlinks to live data, no Patroni or
other manager, no standby.signal, no external include files, no production
archive/replication destinations. If this is not your topology, STOP and adapt
the procedure. Never start a copied production configuration unchanged.

The class edition uses `/var/lib/postgresql/16/lab` as SOURCE and
`/var/lib/postgresql/suta-backup-lab` for work. Source is port 5432; copies use
55433 and the private recovery socket. There are no `/LAB` or `/SOURCE_PGDATA`
values to fill in. Only the personal login and generated backup label vary.
Do not use the old frozen `/opt/suta/dba-practicals` checkout for new instructions.
Use the updated checkout described in [CHECKS.md](CHECKS.md).

Before starting a copy, require the relevant `preflight` checks to pass. A failure
is a stop sign, not a prompt to disable the check. After startup require identity,
isolation and data checks; PITR also requires the intended target in current logs.

For Linux packaged binaries, add the correct version's binary directory to PATH
using the instructor's exact value; do not install/upgrade mid-lab without planning.

## Teaching method

Ask students to predict one result, run one action, then explain the observation.
Keep the terminal visible. Explain `-d`, `-f`, `-Fc`, `-t` and `-n` when first used.
After entering psql, point out that SQL is not a shell command. After `\q`, point
out the return to the shell. Never paste a page of commands at once.

For the deliberate permission-denied test, explain in advance that failure is
the expected result. For other errors, stop; don't keep executing later steps.

## Resume and assess without changing student work

Use [the read-only checker](CHECKS.md) and [teacher snapshot](TEACHER-DASHBOARD.md).
A backup file existing is not completion. Assess the student's explanation and
restored data, constraints and permissions. For duplicates, inspect IDs/items;
do not delete rows or reset sequences simply to match the guide.

Before class, agree and record a shutdown time **including time zone**, how
students save evidence, and who stops the servers. Warn students before that
time. Shutdown is an instructor action, not performed by these scripts.
Stopped cloud hosts may get new IPs when started; reissue private login sheets.
Before stopping, close or roll back lab transactions, save evidence, and stop
only the identified recovery copy. Do not delete student clusters/backups.

## Cleanup and sharing

No destructive cleanup script is provided. Keep lab data and backups until the
instructor has checked evidence. Stop only an explicitly identified disposable
recovery cluster after its drill; never stop or delete a shared server.

Share only the Markdown and rehearsal source. Do not upload dumps, globals,
server logs, keys, real host details, student data or credentials. This folder is
the publication unit, not the entire dirty Vizlect repository.

## Repository

Owner-selected student repository: https://github.com/hapi-suta/dba-practicals .
This course lives under `postgresql/backup-recovery/`. Use the GitHub landing page
to navigate the handouts. Do not commit test databases or generated dumps.

The [live rehearsal viewer](WATCH.md) runs locally on the instructor's machine;
GitHub renders the guides but does not run PostgreSQL or host the live test server.
