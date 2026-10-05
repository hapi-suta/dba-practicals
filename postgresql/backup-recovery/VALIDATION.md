# Qualification — honest scope

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

## Not verified here

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
