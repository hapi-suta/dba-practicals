# Internal course tools — not student assignments

Students: [open the labs](../postgresql/backup-recovery/README.md).
Instructors: [open class preparation](../instructor/README.md).

This area preserves the checker implementation, teacher-report code, tests,
rehearsal tools, Dockerfile, research and historical verification evidence.
Moving these files does not make them private; do not commit credentials or dumps.

## Check the repository layout and documentation

From the repository root, with Node.js installed:

```bash
node --test internal/postgresql/backup-recovery/guide.test.mjs internal/postgresql/backup-recovery/report.test.mjs
```

## Database qualification — isolated local environment only

Read [validation and limits](postgresql/backup-recovery/VALIDATION.md) first.
The destructive test harness is **not** the read-only student checker and must
never run on student servers. It requires a fresh authorized local Docker
container, no external network, and the repository mounted read-only at `/course`.

- Dockerfile: `internal/postgresql/backup-recovery/qa.Dockerfile`.
- Harness: `/course/internal/postgresql/backup-recovery/qualify.mjs`.
- Required environment flag: `SUTA_DISPOSABLE_QA=yes`.
- Run as the container's `postgres` OS user, not root.
- Reuse an existing suitable image where available; building the Dockerfile
  installs packages in the image and is a separate preparation step.
- Preserve evidence and test data; stop only the test container after completion.

Tools locate student handouts relative to this checkout, not the current shell
folder. Student SQL and lab data paths are unchanged. After pulling this layout
revision, use the updated checker commands from [CHECKS](../postgresql/backup-recovery/CHECKS.md).
