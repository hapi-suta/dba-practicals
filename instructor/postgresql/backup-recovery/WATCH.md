# Watch real backup/restore commands run

The dark live viewer shows real command output, not simulated results. It is an
instructor rehearsal, not an interactive SQL terminal or a hosted lab service.

## Requirements

- A local macOS/Linux machine and permission to create a disposable local database.
- Node.js 20 or newer (actual rehearsal used Node.js 25).
- Matching PostgreSQL tools already on PATH: initdb, postgres, pg_ctl, psql,
  createdb, pg_dump, pg_dumpall and pg_restore.
- Run as your normal OS user, not root. Sufficient free space in `/tmp`.

The initial qualification used PostgreSQL 14.20 on macOS. Other versions/platforms
are not yet qualified. No package install, cloud account, network database or
production credentials are needed. Do not run on a production host.

## Start the viewer

From the repository root, in a terminal:

```bash
cd internal/postgresql/backup-recovery
```

```bash
node live-rehearsal.mjs
```

Open the printed `http://127.0.0.1:PORT/` URL on the same computer. Click
**Run the isolated rehearsal** once. Commands appear before execution, followed
by their actual output. Uncheck **Follow output** to scroll back and inspect.

The runner creates a unique private directory beneath `/tmp`, starts PostgreSQL
with TCP disabled, and executes the core handout commands. It checks restored
counts/totals and the deliberate permission refusal, then stops its own cluster.
It never connects to the default service. The page runs once per server process.

Wait for PASSED or FAILED before closing the terminal. The final output names
the evidence directory; it retains the test data and logs. No automatic deletion
is performed. After completion, Ctrl+C stops the web viewer. Do not interrupt a
running test unless necessary; if interrupted, inspect its specific data directory
and process before stopping anything—never use a blanket killall command.

The loopback URL is not a student-accessible public URL. Share your screen or let
students read the GitHub handouts. Do not expose this local runner on the internet.

For a fast, nonvisual instructor rehearsal instead:

```bash
node rehearse.mjs
```

See [VALIDATION.md](../../../internal/postgresql/backup-recovery/VALIDATION.md) for what was tested and the advanced-lab limits.
