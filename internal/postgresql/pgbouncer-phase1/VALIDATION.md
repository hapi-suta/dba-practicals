# Phase 1 validation — 2026-10-12

**Result:** six exercise areas passed on three newly created HA001 lab servers.
The final environment uses transaction pooling, PgBouncer pool 4, Mattermost
8 open/2 idle, with all 6,715 acknowledged messages verified through the API after the release check.

## Environment and source

- HA001 resolved from prior records to the AWS account used by `sutadmin`, us-east-1.
  The exact private inventory is kept outside this repository.
- Ubuntu 24.04 x86_64; PostgreSQL `16.15-0ubuntu0.24.04.1`;
  PgBouncer `1.22.0-1build4`; Mattermost Team Edition `11.7.12`.
- Independent course checkout from `hapi-suta/dba-practicals`, base commit
  `e9fcf9a38092a1292bcb458ec370c205c5e2d686`. Release targets the public repository
  `hapi-suta/dba-practicals`, branch `main`; use this file's Git history for the release commit.
  Existing backup/recovery lessons were preserved.
- [Official sources and version constraints](SOURCES.md).

## Executed checks

| Student area | Evidence and result |
|---|---|
| Starting state and direct baseline | [Original checks](evidence/ha001/checks.json): three identities, empty PgBouncer config, passing direct API workload |
| Write/start PgBouncer | Original numbered outputs: exact student INI, service active, SCRAM admin login, known database identity |
| Route through the pooler | [Corrected runs](evidence/ha001-corrected/checks.json): session and transaction startup, logins, posting, reading, replies and search |
| Session/transaction reuse | Original checks: B queues; same backend PID reused after A disconnects/commits/rolls back |
| Waiting and recovery | [Final checks](evidence/ha001-final/checks.json): eight clients wait, one backend, measured six-second delay, recovery workload passes |
| Tune and roll back | Final checks: pool 1→4, app pool 2→8, burst, direct rollback and pooled recovery all pass |
| Wrong password | Original checks: deliberately wrong password fails; saved correct credentials still reach the known identity |
| Resume and preservation | [Resume checks](evidence/resume-checks/checks.json): existing user IDs kept, duplicate name refused, interrupted run saved, sleep visible, effective settings checked, 5,917 messages retained |

Read [measured results](OUTPUTS.md), the numbered raw command outputs and
[the student-perspective self-review](SELF-REVIEW.md). Route source-address outputs
are retained in `evidence/route-proof`.

## Failures found and corrected

1. Initial native Mattermost transaction startup failed with bind/parameter errors.
   The DSN lacked `binary_parameters=yes`. Added the option to the native helper
   and fresh setup, then reran direct/session/transaction application checks and
   remaining exercises. [Original failure excerpt](evidence/transaction-startup-failure.txt)
   and `evidence/ha001/failure.txt` remain.
2. The first long-transaction harness started its hold before traffic authentication.
   Application checks passed, but measured requests did not show the delay; that
   assertion correctly failed. Corrected the overlap and the student instructions.
   Original failure remains in `evidence/ha001-corrected/checks.json`.
3. Earlier local Docker preparation exposed an internal-network port issue; recorded
   in `evidence/startup-findings.md`. Its baseline passed after correction. The
   native-server evidence, not that prototype, qualifies the student pooling labs.

## Practical limits

Rehearsal started from the genuine empty standard config. The harness wrote the
same content programmatically rather than typing vi; persistent SQL clients proved
the reuse steps. Most runs were 12 seconds, route recovery 6 seconds and contention
20 seconds. Handouts use 20 seconds. All eight test users perform authenticated
HTTP API actions; no WebSocket/browser-client simulation is claimed.

The exercise commands and protected-data checks were run. Markdown received source review and a rendered GitHub-Markdown
preview check (document structure and index screenshot). No independent student trial or browser-UI walkthrough occurred.
Plugins, future migrations/upgrades, production capacity, full certificate identity
verification and Phase 2 HA remain untested. Client-to-pooler TLS is deliberately
outside this isolated Phase 1 setup; PostgreSQL connections use TLS require.

The three AWS machines remain running at the completed checkpoint. No automatic
shutdown was scheduled. The unused local Docker prototype was stopped with its
volumes retained. No existing backup lab or unrelated instance was changed.

## Final publication check

- Three reporting regression tests passed, covering verification-login failure,
  search failure and normal success. Acknowledged writes and the summary now survive
  a final verification outage; the command correctly reports failure.
- A fresh 20-second run on HA001 passed with the revised script: 798 new messages
  verified, zero request/verification errors, and successful search.
- Cross-run verification then matched all 6,715 messages. Mattermost, PgBouncer and
  PostgreSQL services were active. [Release evidence](evidence/release-check/checks.json).
- All 18 existing course documentation/report tests passed. Local Markdown links,
  Python syntax, student INI parity, diff whitespace and publication secret scan
  were checked. Root navigation now exposes the new lab.
- Public evidence substitutes role labels for private host addresses and paths;
  originals remain private. No credentials, private connection sheet or runtime
  account files are included in the release.

## Status update — 2026-10-14

The HA001 rehearsal servers described above were terminated on 2026-10-13 at the
teacher's request. Earlier results remain historical evidence, not current server
health. Student labs are separate environments. The beginner documentation rewrite
changed presentation and monitor sequencing without changing runtime code or INI.
See SELF-REVIEW.md for checks and the limit: no fresh server rehearsal or learner
trial of the revised sequence.
