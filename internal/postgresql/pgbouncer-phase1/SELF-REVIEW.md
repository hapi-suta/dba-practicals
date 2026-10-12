# Student-perspective self-review — 2026-10-12

This is the author's separate handout walkthrough, not independent review or
student feedback. The backup/recovery guides supplied the teaching pattern.

| Finding | Student consequence | Repair and verification |
|---|---|---|
| Admin terminal C was opened after B began its 15-second wait | Too little time to observe the queue | Exercise 4 now prepares C first; live PID/queue demonstration passed |
| Long-transaction test started the hold before user sign-in | Delayed sign-in did not appear in timed request latency | Exercise 5 starts traffic first; corrected overlap run showed 6,050.07 ms maximum and waiting clients |
| Several Exercise 5 traffic/recovery instructions referred loosely to earlier commands | Beginner had to reconstruct command and current folder | Added explicit APP workload commands and POOLER edit/reload steps |
| Cross-run verification was only an instructor/harness action | Student could not prove earlier messages survived | Installed read-only verify-messages.py and added the student command in Exercise 6 |
| Transaction-mode Mattermost startup failed with the original DSN | Student could not reach the transaction exercise | Corrected helper includes binary_parameters=yes; startup and all selected API workflows rerun |
| Completed rehearsal machines could be mistaken for a fresh class baseline | Empty-file step might encourage erasing completed work | Start/Exercise 2 stop on nonempty file; instructor handoff labels final checkpoint and forbids installer replay |

Checked in order: SSH identity, OS-user transitions, psql entry/exit, configuration
ownership, credentials kept private, unique traffic run names, BEGIN/COMMIT/ROLLBACK,
restoring pool settings, route rollback, report interpretation and reconnect path.
The student file matches the configuration used in the empty-file rehearsal.

Server rehearsal used programmatic file writes instead of human vi keystrokes,
noninteractive psql for most observations, and persistent clients for the PID demo.
Most traffic runs were 12 seconds, rollback/final checks 6 seconds, and the contention
run 20 seconds; the student workload defaults to 20 seconds. These are documented
harness substitutions, not a claim of a human following every keystroke.

Layout review is Markdown-source-only. No rendered browser review, independent
review or actual learner comprehension test was performed. No browser login/UI,
future upgrades, plugins, WebSocket simulation, production benchmark or Phase 2 HA
was qualified.

## Publication follow-up

Reviewed the GitHub-rendered combined student handout in a local browser, including
its accessibility structure and index screenshot. This supplements the earlier
source-only review; it is not a browser walkthrough of Mattermost. Found and fixed
a reporting gap: final verification-login/search failure could prevent summary
creation. Three failure/success regression tests and a fresh native 20-second run
passed. Public evidence was sanitized before staging.

## Explicit execution locations — 2026-10-12 follow-up

At the user's request, every student command/configuration block now has its own
“Where to run” line. All 49 blocks name the server and terminal/editor; SQL blocks
name the database, login and port. Relative file commands name the working folder.
Inline server changes, reconnect instructions and the troubleshooting table also
state the location. Compared all fenced blocks with release d6d3be5: commands and
configuration are byte-for-byte unchanged. This is a documentation-only update;
no database rehearsal was repeated. Existing live evidence still applies.

Hostname follow-up: every command/configuration location now includes the actual
`suta-pgb-app`, `suta-pgb-pooler` or `suta-pgb-db` hostname alongside its role.
Troubleshooting locations also use hostnames. All 49 blocks checked; executable
content unchanged. Documentation-only review; no new server rehearsal.
