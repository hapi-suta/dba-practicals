# Teacher dashboard — same evidence, read-only

**What it does:** takes one on-demand SSH snapshot using the instructor-only
`check-lab.mjs` observer. It creates a private HTML report with counts,
permissions, mismatches and unknown results. It does not repair data, start
servers, grade students, install files remotely or monitor continuously.

**Scope:** Labs 0–4 baseline. Lab 7 onward intentionally changes source rows.
For later stages, review the student's native physical/PITR checks. The internal
observer is optional instructor tooling, not a student prerequisite. Compare
results with the student's evidence sheet and explanation before marking a lab.

## Prepare privately

Where: instructor laptop, Node.js 18+ and SSH available. Use a private directory
outside this repository. Create an inventory JSON using this shape:

```json
[
  {
    "name": "Student A",
    "host": "assigned-host.example.invalid",
    "identityFile": "/absolute/private/path/to/instructor-key",
    "knownHostsFile": "/absolute/private/path/to/verified-known-hosts"
  }
]
```

Replace the example values privately. This is an instructor key for `ubuntu`,
not a student password. Verify each SSH host fingerprint through the trusted
provisioning record before adding it to known_hosts. Never disable host-key
checking. Inventory validation rejects passwords and other unrecognized fields.
Keep inventory/key access restricted to the instructor.

## Take one snapshot

Where: instructor terminal at the repository root. Use absolute private paths:

```bash
node internal/postgresql/backup-recovery/class-report.mjs /absolute/private/class-inventory.json /absolute/private/class-progress-01.html
```

Why: collect at most three simultaneous read-only probes. The remote command
uses `ubuntu` → `sudo -n -iu postgres` and sends the observer over stdin without
installing it on each host. No cloud lifecycle API is used.

Expect: a new HTML file, created with mode 0600. Existing reports are never
overwritten. Open that local file in your browser; do not publish it to GitHub.
It contains learner progress even though host addresses and keys are not shown.

If SSH, sudo, PostgreSQL or parsing fails, the student is **UNKNOWN**, not passed.
A stopped server remains stopped. Check access with the owner at the next class;
do not start servers or relax security just to get a green dashboard.

## Evidence labels

- **PASS:** that specific observation matches the early-lab baseline.
- **MISMATCH:** inspect with the student; never auto-reset their work.
- **PRESENT:** file exists, not a proven recoverable backup.
- **NOT_STARTED:** expected object/file absent; ask whether the student reached it.
- **UNKNOWN:** unable to inspect; do not infer completion or failure of learning.

The dashboard is a snapshot, not a live connection. Take a new report with a new
filename when needed. This release tests rendering and validation synthetically;
live SSH collection is deliberately not rerun against stopped student servers.
