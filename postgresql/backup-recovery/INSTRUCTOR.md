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

Lab 0 shows Ubuntu/Debian socket defaults. On another distribution, substitute the
actual connection values before class. Do not ask students to weaken pg_hba.conf.
Our local rehearsal does not prove their SSH/sudo/login setup works.

## Advanced-lab readiness gate — do not skip

Labs 5–11 are instructor-led procedures, NOT qualified against your class host yet.
Fill in this worksheet privately and rehearse there before students run them:

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

The guide's `/LAB/...` paths are deliberate non-working placeholders. Replace them
with the worksheet values in an instructor copy. They are not paths to create
blindly. Environment variables do not remove the need to verify the target.

For Linux packaged binaries, add the correct version's binary directory to PATH
using the instructor's exact value; do not install/upgrade mid-lab without planning.

## Teaching method

Ask students to predict one result, run one action, then explain the observation.
Keep the terminal visible. Explain `-d`, `-f`, `-Fc`, `-t` and `-n` when first used.
After entering psql, point out that SQL is not a shell command. After `\q`, point
out the return to the shell. Never paste a page of commands at once.

For the deliberate permission-denied test, explain in advance that failure is
the expected result. For other errors, stop; don't keep executing later steps.

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
