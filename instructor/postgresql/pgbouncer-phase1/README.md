# Instructor — PgBouncer Phase 1

Use [the student sequence](../../../postgresql/pgbouncer-phase1/README.md) and
[the validation record](../../../internal/postgresql/pgbouncer-phase1/VALIDATION.md).

## Three machines, one application

| Role | Size used in rehearsal | Software and purpose |
|---|---|---|
| APP | 2 vCPU, 4 GiB RAM | Mattermost, eight synthetic users, traffic script |
| POOLER | 2 vCPU, 2 GiB RAM | PgBouncer and SQL observation sessions |
| DB | 2 vCPU, 4 GiB RAM | PostgreSQL, application data and one identity row |

All use Ubuntu 24.04 and a 30 GiB encrypted disk. These are teaching sizes, not
production recommendations. Public addresses and credentials belong in the private
connection sheet, never in this repository.

## Current rehearsal checkpoint

The three HA001 servers have completed the exercises. The working final state is
APP → PgBouncer → DB, transaction mode, server pool 4, application pool 8 open/2 idle.
The original empty-file starting state was captured before configuration.
**These completed servers are not an empty class baseline.** Preserve their messages
and evidence. Do not run the installation script or truncate the configuration to
make the first exercise appear fresh. A new classroom allocation needs a separately
authorized fresh preparation, or learners can resume this completed checkpoint.

## Staff preparation for a fresh allocation

Provision only the assigned isolated machines. Install the exact tested versions
or qualify a changed version first. Private provisioning records and scripts from
this rehearsal are retained separately on the teacher's computer.

Before handing over:

1. Set hostnames `suta-pgb-app`, `suta-pgb-pooler`, `suta-pgb-db`. Resolve `pg-app`,
   `pg-pooler`, `pg-db` to their private addresses on all three machines.
2. Install PostgreSQL 16, PgBouncer and the PostgreSQL client, Python 3, curl and vi.
   Install Mattermost Team Edition 11.7.12 from its checksum-verified archive.
3. Create database `mattermost`, owned by login `mmuser`. Create `pool_lab`, owned
   by `labuser`; create `lab_identity(name text PRIMARY KEY)` as postgres, with the
   single value `suta-pgbouncer-phase1`, and grant labuser SELECT on that table.
4. Prepare SCRAM authentication and the private PgBouncer user list for mmuser,
   labuser and pooladmin. Pooladmin administers PgBouncer; it needs no PostgreSQL
   login. Use unique generated credentials and postgres-owned `.pgpass` mode 600.
5. Allow PostgreSQL connections only from the required private APP/POOLER sources.
   Require TLS on the PostgreSQL side. Restrict SSH and application access to the
   teacher's current address. Restrict database/pooler ports to the lab group.
6. Leave PgBouncer stopped and `/etc/pgbouncer/pgbouncer.ini` empty, owned by
   postgres with mode 640. Students write that file in Exercise 2.
7. Start Mattermost directly against `pg-db:5432`. Disable email, push, outgoing
   webhooks, plugins and telemetry for this synthetic environment. Use application
   pool 8 open/2 idle; the tested DSN includes `binary_parameters=yes`.
8. Install `traffic.py`, `verify-messages.py`, and `native-context.py` renamed to
   `lab.py` in `/opt/suta/pgbouncer-lab`. Install `app-route.py` root-owned mode 755.
   Its root-only `/etc/suta/phase1.json` supplies private addresses and passwords;
   `/etc/suta/lab-id` must contain `suta-pgbouncer-phase1`. Never distribute that JSON.
9. Create private `.runtime/state.json` with project `suta-pgbouncer-phase1`,
   base_url `http://127.0.0.1:8065`, route `direct`, max_open 8 and max_idle 2.
   As ubuntu in that folder, run `python3 traffic.py setup --users 8`. Keep
   `.runtime/accounts.json` private; students do not rerun account setup.
10. Confirm all three hostnames, app health, direct connections, the known identity,
    empty PgBouncer config and a passing API baseline. Supply the private SSH sheet.

The checked-in Docker files are an earlier development prototype. The native
three-server rehearsal is the qualification for these student handouts.

## Teaching the exercises

- Ask the learner to predict the connection count, then observe it. Eight people
  in the app do not imply eight database connections.
- Prepare three POOLER terminals before the two-client demonstration. B has a
  15-second query wait limit, so C should already be in the admin console.
- For the six-second hold, start API traffic first and wait about five seconds.
  Otherwise the hold may delay sign-in instead of the measured workload. Keep C
  ready to capture the queue; the instructor can watch DB activity in parallel.
- A pool of one can handle short transactions without errors. The intended lesson
  is measured contention, not a guarantee that a small pool always fails.
- p95 can remain low even when a few requests wait six seconds. Compare maximum
  latency and the waiting snapshot too. Small runs do not establish capacity.
- A reload alone may leave old backends open after reducing the pool. Exercise 5
  restarts application clients and uses `RECONNECT mattermost` before measuring.

## Evidence and resuming

Keep each student's terminal transcript and uniquely named traffic reports. A
passing run has no failed requests, all acknowledged posts read back by ID/author/
channel/text, and search finding the run marker. Run `verify-messages.py` after
route changes to check prior messages too.

After a disconnect, use the student's resume instructions. Do not rerun installers,
account creation, or the empty-file step over completed work. A wrong-password
exercise uses a one-command environment override and changes no account password.

Keep captured failures with their corrections. The initial transaction-mode startup
failure and the initial mistimed latency test are both documented in validation.

## Handoff and shutdown

The HA001 allocation remains running for Happy. No automatic shutdown was agreed
or scheduled. Confirm the exact instance IDs and preserve reports before any later
stop/termination. Never target machines only by a loose name match.

Phase 2 has not been deployed or tested. It adds a second pooler, primary/standby/DR
and HA routing. AWS needs an appropriate VIP/route failover design; ordinary LAN
Keepalived address takeover must not be assumed to work on EC2. HAProxy routes
connections to configured read/write endpoints; it does not automatically inspect
and split every SQL statement sent by an application.

## Beginner delivery — 2026-10-14

Use Exercises 0–3 as the first lesson, then pause for students to demonstrate the
working route. Teach Exercise 4 separately: the teacher watches POOLER C while the
student uses A and B. In Exercise 5, prepare both refreshing monitors first; the
teacher runs the brief hold while the student observes waiting. Do not ask beginners
to read new instructions while switching among three screens within 15 seconds.
The INI and runtime scripts are unchanged. Resume each student's actual checkpoint;
never clear their configuration just to match the opening page.

The original HA001 rehearsal instances were terminated at the teacher's request on
2026-10-13. Do not direct students to those old addresses. Use their individual
private connection sheets. See the validation record for historical test evidence.
