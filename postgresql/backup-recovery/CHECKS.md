# Read-only checks: see where you are

The checker reads your local lab. It does not change data/settings, start/stop
servers, take backups or award completion. It observes current state, not who
performed an earlier action. Node.js is already installed on the class servers.

## Get the updated checker once

**Where:** assigned server Linux terminal as `student`.

```bash
sudo -iu postgres
```

```bash
cd /var/lib/postgresql
```

```bash
git clone https://github.com/hapi-suta/dba-practicals.git dba-practicals
```

**Expect:** a new folder. If it already exists, do not delete it. Check for edits:

```bash
git -C /var/lib/postgresql/dba-practicals status --short
```

If changes appear, ask the instructor. If clean, update it:

```bash
git -C /var/lib/postgresql/dba-practicals pull --ff-only
```

This updates guides, not databases. Stop on Git divergence. The older
`/opt/suta/dba-practicals` snapshot may not contain the corrections.

## Check Labs 0–4

```bash
node /var/lib/postgresql/dba-practicals/postgresql/backup-recovery/check-lab.mjs progress
```

| Result | Meaning / next action |
|---|---|
| PASS | This observation matches; retain evidence |
| PRESENT | Nonempty file only; still prove restoration |
| NOT_STARTED | Object/file absent; find your saved step (absence may be intentional mid-drill) |
| MISMATCH | Different from baseline; investigate, never reset automatically |
| UNKNOWN | Inspection failed; check connection, permissions and step |
| INFO | Explanation or limit, not another pass |

Labs 7–9 intentionally change source data, so early baseline checks can differ.
Table presence cannot prove a previous DROP. This is not an automatic grade.

## Before starting a stopped recovery copy

Lab 5:

```bash
node /var/lib/postgresql/dba-practicals/postgresql/backup-recovery/check-lab.mjs preflight physical
```

Lab 8:

```bash
node /var/lib/postgresql/dba-practicals/postgresql/backup-recovery/check-lab.mjs preflight pitr
```

All safety checks must PASS. UNKNOWN/MISMATCH/NOT_STARTED means stop. This does
not replace backup integrity verification or configuration review.

## After starting the recovery copy

Lab 5:

```bash
node /var/lib/postgresql/dba-practicals/postgresql/backup-recovery/check-lab.mjs recovery physical
```

Lab 8:

```bash
node /var/lib/postgresql/dba-practicals/postgresql/backup-recovery/check-lab.mjs recovery pitr
```

PITR checks include target name, paused state, order IDs and the current startup
log's target-reached entry. Do not resume replay to make a check pass. Share
check output, not credentials, with your instructor.
