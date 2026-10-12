# Captured HA001 results

Real outputs from 2026-10-12. All users and messages are synthetic. Numbers are
observations from a small closed-loop lab, not production capacity estimates.
Different durations and warm-up state prevent a simple faster/slower conclusion.

| Run | Seconds | Requests | Failures | Verified posts | p95 ms | Max ms |
|---|---:|---:|---:|---:|---:|---:|
| [direct-baseline](evidence/ha001/direct-baseline.json) | 12.124 | 649 | 0 | 436 | 202.97 | 772.52 |
| [pooled-session](evidence/ha001/pooled-session.json) | 12.115 | 673 | 0 | 451 | 97.13 | 163.43 |
| [direct-corrected](evidence/ha001-corrected/direct-corrected.json) | 12.141 | 801 | 0 | 536 | 53.94 | 117.49 |
| [long-transaction](evidence/ha001-corrected/long-transaction.json) | 12.242 | 611 | 0 | 410 | 151.77 | 252.07 |
| [session-corrected](evidence/ha001-corrected/session-corrected.json) | 12.123 | 710 | 0 | 476 | 88.1 | 153.97 |
| [small-pool](evidence/ha001-corrected/small-pool.json) | 12.121 | 571 | 0 | 383 | 152.56 | 236.76 |
| [transaction-corrected](evidence/ha001-corrected/transaction-corrected.json) | 12.056 | 673 | 0 | 451 | 98.05 | 214.11 |
| [app-pool-eight-final](evidence/ha001-final/app-pool-eight-final.json) | 12.077 | 715 | 0 | 480 | 81.95 | 117.12 |
| [app-pool-two-final](evidence/ha001-final/app-pool-two-final.json) | 12.115 | 744 | 0 | 498 | 65.51 | 128.08 |
| [burst-profile-final](evidence/ha001-final/burst-profile-final.json) | 12.471 | 494 | 0 | 332 | 140.14 | 205.05 |
| [direct-rollback-final](evidence/ha001-final/direct-rollback-final.json) | 6.133 | 409 | 0 | 275 | 60.31 | 89.88 |
| [final-recovery-complete](evidence/ha001-final/final-recovery-complete.json) | 6.08 | 364 | 0 | 245 | 93.92 | 123.88 |
| [long-transaction-overlap](evidence/ha001-final/long-transaction-overlap.json) | 20.162 | 710 | 0 | 477 | 126.44 | 6050.07 |
| [tuned-pool-final](evidence/ha001-final/tuned-pool-final.json) | 12.142 | 649 | 0 | 435 | 100.47 | 257.37 |
| [interrupted-final](evidence/resume-checks/checks.json) | 4.031 | 47 | 0 | 32 | 82.24 | 87.09 |

Across these native runs: 8,820 requests, 0 request failures, 5,917 acknowledged messages verified.

The final cross-run verifier independently read 5,917 messages by ID and matched
author, channel and text, with no failures. The deliberately mistimed first
`long-transaction` run passed application checks but **failed the delay assertion**;
it is retained, not counted as evidence of contention.

The corrected `long-transaction-overlap` run reached eight waiting clients while
remaining at one backend. Maximum request latency was 6,050.07 ms. Its p95 stayed
126.44 ms because only a small fraction of requests overlapped the hold.

The original PID demonstration captured backend 5678 reused after session A
disconnected, and backend 5679 reused after transaction A committed while still
connected. A rollback released the backend too. See
[the checks with actual snapshots](evidence/ha001/checks.json).

The numbered text files include machine role, exact command, exit status and
stdout/stderr. Per-request JSONL and post-ID/content records are additionally
preserved in the separate `phase1-traffic-evidence.tar.gz` handoff archive and on
APP under `/opt/suta/pgbouncer-lab/.runtime/runs`.

## Publication rerun

The [final 20-second release run](evidence/release-check/release-20261012.json)
verified 798 additional messages with zero request failures, empty verification
error lists and successful search. The updated total is **6,715 messages**,
all rechecked by ID, author, channel and text. The earlier tables remain the
original rehearsal observations.
