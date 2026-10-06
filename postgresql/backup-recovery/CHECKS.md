# Read-only checks: see where you are

Run these supplied commands to compare your lab with the expected results.
You do not need to study or edit the checker code.

- It does not change data or settings, start or stop servers, or take backups.
- It reports what exists now. It cannot prove who performed an earlier step.
- Node.js, which runs the checker, is already installed on the class servers.

## Get the updated checker once

The checker is a maintained tool, not code you need to study or edit. Update
the repository before using the commands below; its implementation now lives
in `internal/`, separate from your lab handouts.

**Where:** assigned server Linux terminal. If `whoami` already says `postgres`,
skip the account switch below. Otherwise, run it from your `student` account:

```bash
sudo -iu postgres
```

```bash
cd /var/lib/postgresql
```

```bash
git clone https://github.com/hapi-suta/dba-practicals.git dba-practicals
```

**Expect:** a new `dba-practicals` folder. If Git says that folder already exists,
do not delete it or clone again. Use the next command to check for local edits:

```bash
git -C /var/lib/postgresql/dba-practicals status --short
```

If filenames appear, there are local edits: show the output to the instructor
before updating. If there is no output, continue with the update:

```bash
git -C /var/lib/postgresql/dba-practicals pull --ff-only
```

This updates guides, not databases. If Git says it cannot fast-forward, stop
and share the message with your instructor; do not force the update. The older
`/opt/suta/dba-practicals` snapshot may not contain the corrections.

**Return to your lab folder before continuing:**

```bash
cd /var/lib/postgresql/suta-backup-lab
```

```bash
pwd
```

**Expect:** `/var/lib/postgresql/suta-backup-lab`. If absent, stop and finish
Lab 0 or locate your previous work with the instructor. Do not create a second
working folder to hide the problem. If you opened a new login shell, also follow
the [steps for reconnecting to the lab](TROUBLESHOOTING.md#returning-after-a-disconnect-or-another-help-page).

## Check Labs 0–4

```bash
node /var/lib/postgresql/dba-practicals/internal/postgresql/backup-recovery/check-lab.mjs progress
```

| Result | Meaning / next action |
|---|---|
| PASS | This result matches. Save the output. |
| PRESENT | A file exists and is not empty. You still need to restore it and check its data. |
| NOT_STARTED | A file or database object is missing. Compare with your last completed step; some drills deliberately delete objects. |
| MISMATCH | The result differs from the expected value. Save both values and follow the matching troubleshooting section. Do not reset your data. |
| UNKNOWN | The checker could not read the result. Save its error and confirm your lab connection with the instructor. |
| INFO | Extra explanation, not a passed check. |

Labs 7–9 intentionally change SOURCE's data, so checks against Lab 0's starting data can differ.
Table presence cannot prove a previous DROP. This is not an automatic grade.

## Before starting a stopped recovery copy

The `preflight` command checks the copy's settings before startup. Keep the copy
stopped until these safety checks pass.

Lab 5:

```bash
node /var/lib/postgresql/dba-practicals/internal/postgresql/backup-recovery/check-lab.mjs preflight physical
```

Lab 8:

```bash
node /var/lib/postgresql/dba-practicals/internal/postgresql/backup-recovery/check-lab.mjs preflight pitr
```

All safety checks must PASS. If a check says UNKNOWN, MISMATCH or NOT_STARTED,
do not start COPY. Save the check name and its message for the instructor.
You must also complete the backup-file and configuration checks in the lab.

## After starting the recovery copy

Lab 5:

```bash
node /var/lib/postgresql/dba-practicals/internal/postgresql/backup-recovery/check-lab.mjs recovery physical
```

Lab 8:

```bash
node /var/lib/postgresql/dba-practicals/internal/postgresql/backup-recovery/check-lab.mjs recovery pitr
```

PITR checks include target name, paused state, order IDs and the current startup
log's target-reached entry. Do not resume replay to make a check pass. Share
check output, not credentials, with your instructor.
