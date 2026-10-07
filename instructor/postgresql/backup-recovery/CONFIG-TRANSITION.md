# Preserve existing work before changing the pgBackRest configuration

The fresh edition uses one configuration at `/etc/pgbackrest/pgbackrest.conf`.
It is not an instruction to reset existing student servers. No live migration
has been performed by this documentation change.

## New students

- Prepare SSH access, PostgreSQL 16, pgBackRest, vi and the standalone SOURCE cluster.
- Prepare directories, permissions and an empty editable file; agree the Lab 6B source restart.
- Leave archiving off with an empty archive command, no active pgBackRest
  configuration, no stanza and no backups. Inspect package-provided configuration,
  include directories and legacy config; do not leave hidden active settings.
- Do not run stanza-create, archive checks or backup commands for them.
- Rehearse the course in a separate disposable environment, never their server.

### Sysadmin preparation — fresh assigned server only

This section is for the instructor/sysadmin, not the student handout. Confirm the
host identity and existing-work inventory below before making changes. Install
the approved PostgreSQL 16 and pgBackRest packages using your normal provisioning
procedure. For an Ubuntu host whose PostgreSQL repository is already configured:

```bash
sudo apt-get update
sudo apt-get install pgbackrest
pgbackrest version
```

Record the actual version; do not upgrade an existing class during a recovery
exercise. This example does not configure package repositories or initialize
PostgreSQL. Prepare the standalone SOURCE described in INSTRUCTOR.md separately.

Inspect `/etc/pgbackrest/pgbackrest.conf`, `/etc/pgbackrest.conf`,
`/etc/pgbackrest/conf.d`, `/var/lib/pgbackrest` and previous lab paths first.
If active settings or backup contents exist, stop: this is not a fresh setup.
Do not truncate a package file or student config automatically.

On a confirmed fresh host, prepare directories:

```bash
sudo install -d -o root -g postgres -m 750 /etc/pgbackrest
sudo install -d -o postgres -g postgres -m 700 /var/lib/pgbackrest
sudo install -d -o postgres -g postgres -m 750 /var/log/pgbackrest
```

`install -d` creates directories; `-o`, `-g`, `-m` set owner, group and permissions.
Only if the configuration file is absent, create it empty:

```bash
sudo touch /etc/pgbackrest/pgbackrest.conf
sudo chown postgres:postgres /etc/pgbackrest/pgbackrest.conf
sudo chmod 640 /etc/pgbackrest/pgbackrest.conf
sudo ls -l /etc/pgbackrest/pgbackrest.conf
```

Expect a zero-byte file, owner/group `postgres postgres`, permissions `-rw-r-----`.
Students use `vi` as `postgres` to populate it. `640` permits the owner to edit,
the group to read and nobody else access. Confirm an empty repository and an
empty `archive_library`; no custom config environment overrides or active
include files should be injected into the student session or server.

Do not fill in the stanza or run stanza-create/check/backup on their behalf.
Students must demonstrate those steps themselves. Root-owned configuration under
change control is another valid production policy; this dedicated lab deliberately
allows the database OS owner to practise editing its own pgBackRest settings.

## Existing students — inventory before deciding

Use authorized read-only access. Save the following privately, not in GitHub:

- The active SOURCE identity and effective `archive_mode`, `archive_command` and
  `archive_library`. Record any service/environment config overrides.
- All active pgBackRest configs, include files, repository paths and stanza names.
- Backup inventory using each **explicit, verified** configuration. Keep backup
  labels, system IDs, archive ranges, current WAL failures and current lab stage.
- Each recovery copy's state and generated `restore_command`. A running copy may
  still depend on the old config path or inherited environment.
- Versioned copies and SHA-256 hashes of the config files and PostgreSQL settings
  before any separately authorized change. Restrict their permissions; they may
  contain secrets. Do not duplicate or delete large repositories without a plan.

## Decide with the owner

1. If they are midway through recovery, finish using the verified old edition.
   Changing configuration is not a prerequisite for completing that exercise.
2. If they need a clean-start exercise, assign a separate fresh environment with
   explicit resource approval. Keep the old server's work intact.
3. If migrating an existing setup, first rehearse against a disposable copy.
   Moving the config does not require moving the repository or changing its
   stanza, cluster identity, retention, encryption or history.

Do not overwrite a prepared default config until its consumers are identified
and its original bytes preserved. A config-only migration should retain the
actual repository path, not switch it to the fresh-edition empty repository.
Bind SOURCE's archive command and every affected recovery consumer to the correct
config. Keep the old path while any existing consumer still requires it.

After the authorized change, verify effective settings, successful WAL archiving,
the same backup inventory and a separate restore test. Keep a documented rollback
to the original config/command. A reload can change archive_command; changing
archive_mode requires a restart. Neither operation grants permission to restart
unrelated clusters. Do not delete WAL, expire backups or reset source data.

The course's fresh-start rehearsal does **not** qualify a live migration of
these students' earlier repositories. That is a separate, scoped operation.
