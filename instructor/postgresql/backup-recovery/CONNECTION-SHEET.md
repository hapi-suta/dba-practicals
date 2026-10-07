# Individual connection sheet — fill in and share privately

This is a blank template. Never commit a completed copy or passwords to Git.
Send each student only their own connection details. Share the initial password
through your agreed private channel, separately from the public guide.

| Field | Instructor fills in |
|---|---|
| Student | |
| Class date | |
| Assigned server hostname/IP (check after start) | |
| SSH username | `student` on the prepared class servers |
| Private password delivery method | |
| Allowed account switch | `sudo -iu postgres` |
| SOURCE | `/var/lib/postgresql/16/lab`, socket `/var/run/postgresql`, port `5432` |
| Working folder | `/var/lib/postgresql/suta-backup-lab` |
| COPY socket / port | `/var/lib/postgresql/suta-backup-lab/recovery-socket`, `55433` |
| Today's labs and last completed checkpoint | |
| Agreed shutdown date/time **and time zone** | |
| Instructor/contact if a check differs | |

Only SSH uses the server IP. The database commands in this course use local Unix
sockets after login. Do not expose PostgreSQL to the Internet for these labs.

Start with [the overview](../../../postgresql/backup-recovery/LAB-OVERVIEW.md). Check your work with [PostgreSQL commands](../../../postgresql/backup-recovery/CHECKS.md),
not by rerunning all inserts. Keep completed work until the instructor reviews it.
