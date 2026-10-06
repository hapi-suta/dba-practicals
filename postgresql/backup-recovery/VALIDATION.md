# Qualification — honest scope

## Revised class edition — 2026-10-05 Pacific / 2026-10-06 UTC

Passed a new isolated local Docker rehearsal with **PostgreSQL 16.13**, Debian,
**pgBackRest 2.59.3**, Node.js 20.19.2. The container had no external network,
published ports, cloud credentials or student data. All test clusters were stopped
after the run. The six student servers were not started or modified.

`qualify.mjs` recorded **21 successful checks**, including:

- Exact Labs 0–4 SQL via the existing handout-extraction rehearsal.
- Correct baseline counts/permissions; duplicate items and repeated inserts detected.
- Absent/unavailable evidence never passed; a dump's presence remains PRESENT only.
- Physical backup integrity before configuration changes, safe copy startup and rows.
- Literal socket placeholder, archiving override, source redirection and running-copy
  preflight failures; unsupported auto.conf data-directory settings rejected.
- Transition from the instructor repository to the separate student repository.
- Full/incremental/differential backups; restore of the selected differential set.
- Named-target WAL recovery, paused state, correct IDs/totals and target log evidence.
- Exact Lab 9 SQL/psql selective merge: five orders / 250.00, newer order preserved.
- Exact Lab 10 drill commands: dropped disposable database restored to 3 / 195.00.

The six `guide.test.mjs` / `report.test.mjs` tests also pass: lab summaries and
outcomes, retired-placeholder guard, Markdown links/fences, preflight ordering,
inventory validation and escaped dashboard output. Script syntax and diff checks pass.

Evidence: [sanitized qualification record](evidence/class-edition-20261006.json).
Local retained run container: `dba-practicals-lab-fixes-20261006-v3`.
The original pre-edit source snapshot was preserved before this revision.

**Failure preserved:** v1's negative test placed `data_directory` in auto.conf,
which did not redirect the effective directory. The fixture now tests a real
main-config redirection, and preflight additionally rejects that unsupported
auto.conf placement. The failed v1 container is retained stopped; v2 and v3 pass.
An initial static test incorrectly matched the legitimate lowercase `/lab` path;
its retired-placeholder rule was corrected and all six tests rerun.

### Exact limits

- Prepared student hosts were Ubuntu 24.04, PostgreSQL 16.15, pgBackRest 2.50.
  This new full-chain rehearsal uses the versions above, **not** an identical
  class-host image. Version-matched 2.50 documentation was reviewed separately.
- Historical provisioning checks covered Linux login, core labs and isolated
  physical/named-PITR restore, but are not a live retest of these revised files.
- Automated rehearsal uses fast checkpoints and programmatic config edits;
  SSH, typing into nano, Git clone and an actual classroom session are not replayed.
- Teacher report validation/rendering uses synthetic learners. Live SSH collection
  against stopped student hosts has not been run; it remains for the next class.
- Lab 11's fault-injection extensions are **not executed** by this rehearsal.
  They require the instructor's own isolated plan; no production fault is authorized.
- This edition supports the documented self-contained class topology, not arbitrary
  external tablespaces, config includes, symlinked WAL, HA managers or production.

## Reproduce locally — instructor only

From the repository root, build the Dockerfile, start a new isolated container
with this guide mounted read-only at `/guide`, then run as the postgres OS user:

```bash
node --test postgresql/backup-recovery/guide.test.mjs postgresql/backup-recovery/report.test.mjs
```

The separate `qualify.mjs` entry requires both a Docker container and the explicit
`SUTA_DISPOSABLE_QA=yes` environment flag. It refuses an existing source PG_VERSION.
Never run it on students' machines. It creates synthetic data, performs destructive
drills on that data and retains evidence; it is not the read-only checker.

## Historical first release

## Passed locally

PostgreSQL 14.20 (Homebrew), macOS, isolated temporary cluster with a private Unix
socket and **TCP disabled**. No cloud server was created. No existing server or
service was stopped, changed or used. The temporary cluster was stopped after testing.

`rehearse.mjs` executed the database commands extracted from the student handouts:

- Lab 0 shop schema and fixture creation.
- Lab 1 plain dump and separate restore: 3 orders / 195.00.
- Lab 2 custom and schema archives; next identity value 1004.
- Lab 3 drop/recover delivery_notes; newer order preserved: 4 / 205.00.
- Lab 4 globals export without passwords; SELECT succeeds, DELETE denied; rows intact.

Result: passed. Original local evidence:
`/tmp/suta-backup-qa-Xiq72v/result.json`.
Generated temporary databases/dumps were retained locally, not packaged for Git.

Initial harness attempt failed because it set PGSERVICE to an empty string;
libpq treated that as an undefined service. Fixed by removing inherited PG
variables before setting isolated connection values. Failure evidence retained:
`/tmp/suta-backup-qa-xG5jEj/failure.json`. No student SQL defect was concealed.

### Limits of that historical macOS run

- Student Linux SSH/sudo, installed binaries, socket paths and permissions.
- Actual class PostgreSQL version or shared-host safety.
- Labs 5–11 physical restore, pgBackRest installation/configuration, archive/PITR
  and selective row merge on the class environment. These remain instructor-led
  procedures requiring preparation and rehearsal, not a claim of a passed live lab.
- Cloud provisioning, SutaBot integration, student outcomes or Git publication.

The test harness is instructor-only; it intentionally automates a rehearsal.
Students should follow the separate one-action-at-a-time handouts. Run it only
where matching PostgreSQL tools are already installed and local test-server
creation is permitted. It retains evidence and stops only its own new cluster.
