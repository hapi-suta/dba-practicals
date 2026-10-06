# Qualification — honest scope

## Scenario-led labs and troubleshooting rehearsal — 2026-10-06

Labs 3, 5, 7, 9, 10 and 11 now start with a concrete scenario, what must stay
safe, the expected result and where the exercise ends. Smaller introductions
clarify Labs 0–2, 4 and 6. Lab 8's existing incident timeline is preserved.

**Passed: 26 integration checks and eight guide/report tests.** A fresh isolated
Linux container ran PostgreSQL 16.13 and pgBackRest 2.59.3 using the existing
test image. No external network, published ports, cloud credentials or student
data were available. The test clusters and container are stopped; their files
are retained in `dba-practicals-scenarios-20261006-v1`.

- The physical copy contained every source database, not only the shop.
- Lab 3 retained its newer test order; differential-backup checks verified both
  earlier status changes, not only an unchanged row count.
- Lab 8 recovered IDs 1001–1004; the live source still had IDs 1002–1005.
- Lab 9 restored only missing data, leaving five orders worth 250.00 and retaining
  newer order 1005. Lab 10's separate older snapshot did not change that source.
- Lab 11's commands were read from the guide. A nonexistent destination produced
  the expected error; the corrected new destination held IDs 1001–1003, worth
  195.00. The original dump's SHA-256 and repaired source data were unchanged.
- The local `suta-lab-builder` skill, template and verification guidance now
  require this scenario-to-evidence approach. Skill structure validation passed;
  this is not a claim that every future authored lab is automatically correct.
- Evidence and exact tested input hashes:
  [scenario qualification record](evidence/lab-scenarios-20261006.json).
- After testing, five bare numeric expectation bullets were clarified to avoid
  accidental nested lists. No executable block changed. A regression test checks
  for this formatting error. Node syntax and Git diff checks also passed.

**Limits:** student Ubuntu 24.04 / PostgreSQL 16.15 / pgBackRest 2.50 hosts were
untouched. This is not a version-identical host rehearsal. Fast checkpoints and
programmatic configuration were used; interactive nano and SSH were not replayed.
The corrupted-backup, missing-WAL and disk-full Lab 11 extensions still require
separate instructor preparation and testing. Named-target PITR was tested, not
timestamp-target recovery. Historical results below apply to their own snapshots.

**Official references checked:** [PostgreSQL 16 pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html),
[pg_basebackup](https://www.postgresql.org/docs/16/app-pgbasebackup.html), and the
[pgBackRest 2.50 guide](https://pgbackrest.org/prior/2.50/user-guide.html).
The measured row states and failure/correction results above come from the server
rehearsal, not invented example output.

## Lab 8 scenario rehearsal — 2026-10-06

The scenario is now explained before commands: completed backup → order 1004 →
named safe point → committed deletion of order 1001 and its item → order 1005.
Lab 8 creates the paused recovery copy; Lab 9 returns only the missing data.
The source/copy comparison warns that equal row counts can hide different rows.

**New live local server test passed:** 23 integration checks, plus seven guide
and report tests. PostgreSQL 16.13 / pgBackRest 2.59.3 in a fresh isolated Docker
container, with no network, published ports, cloud credentials or student data.
The existing image was reused; no host packages or infrastructure were changed.
All test clusters and the container were stopped; files remain preserved.

| Verified state | Order IDs | Count | Total |
|---|---|---|---|
| SOURCE after differential backup | 1001, 1002, 1003 | 3 | 195.00 |
| SOURCE after deletion and newer order | 1002, 1003, 1004, 1005 | 4 | 130.00 |
| COPY paused at `suta_before_delete` | 1001, 1002, 1003, 1004 | 4 | 235.00 |
| SOURCE after Lab 9 selective merge | 1001, 1002, 1003, 1004, 1005 | 5 | 250.00 |

- Lab 8A's SQL was read directly from the handout and executed in one session,
  preserving its explicit transaction. Lab 9's SQL/psql was also read from the guide.
- Checks confirmed the named target, recovery pause, recovery log, copy isolation,
  unchanged SOURCE during recovery, preserved order 1005 and three final items.
- Student command/configuration blocks are unchanged from release `7953431`.
- GitHub preview review found a bare `1005.` bullet rendered as a nested numbered
  list. The follow-up wording is `Order ID 1005`; executable blocks are unchanged.
  The evidence hashes retain the exact pre-formatting files used for the server test.
- Evidence and input hashes: [PITR scenario record](evidence/pitr-scenario-20261006.json).
- Retained local server: `dba-practicals-pitr-scenario-20261006-v1`.

**Limits:** this is a local Linux server rehearsal, not a new test on the student
Ubuntu 24.04 / PostgreSQL 16.15 / pgBackRest 2.50 hosts. Those hosts were untouched.
Fast checkpoints and programmatic configuration replace interactive nano; SSH
and classroom interaction were not replayed. Lab 11 failure extensions remain
untested. This is named-target recovery, not a tested timestamp-target exercise.

**Documentation checked on 2026-10-06:**

- [PostgreSQL 16 recovery targets](https://www.postgresql.org/docs/16/runtime-config-wal.html#RUNTIME-CONFIG-WAL-RECOVERY-TARGET):
  `recovery_target_name` uses a previously created restore point; `pause` permits
  checking recovered data before finishing recovery.
- [pgBackRest 2.50 guide](https://pgbackrest.org/prior/2.50/user-guide.html#pitr):
  PITR and explicit backup selection for named targets. Its Concepts section
  explains the full-backup dependency of a differential backup.
- The order IDs, totals and preservation claims above come from the new server
  rehearsal, not from documentation or invented sample output.

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
