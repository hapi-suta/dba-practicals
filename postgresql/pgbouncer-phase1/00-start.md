# Exercise 0: Connect to your servers

**Goal:** log in and check that you are on the correct server.
You will use these same three servers throughout the lab.

**You need:** your private login sheet with three IP addresses, username `ubuntu`,
and your server password. Ask the teacher if you do not have it.

## Step 1: Open three terminal tabs

**On your own computer:** open Terminal, PowerShell, or your usual SSH program.
Open one tab for each server and label them **APP**, **POOLER**, and **DB**.

Use the SSH command in your private connection sheet. If typing it yourself, use
`ssh ubuntu@` followed immediately by that server's IP address.

Enter your server password when asked. **Nothing appears while you type the password.**
This is normal. Press Enter when finished.

If login fails, check the IP and server password with the teacher. Your Mattermost
website password and database passwords are different from your SSH password.

## Step 2: Check each server name

**On APP, POOLER, and DB — Linux terminal, as `ubuntu`:**

```bash
hostname
```

**Expected:** the name for that tab in this table.

| Tab | Expected name | Job |
|---|---|---|
| APP | `suta-pgb-app` | Runs Mattermost |
| POOLER | `suta-pgb-pooler` | Shares database connections |
| DB | `suta-pgb-db` | Stores messages |

If a name is wrong, stop. Reconnect using the correct IP from your login sheet.

**On each of those same servers — Linux terminal:**

```bash
whoami
```

**Expected:** `ubuntu`.

## Step 3: Check that Mattermost is running

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`:**

```bash
cd /opt/suta/pgbouncer-lab
```

This is the folder containing the prepared lab scripts. Successful `cd` prints nothing.

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`:**

```bash
curl -fsS http://127.0.0.1:8065/api/v4/system/ping
```

**Expected:** a response containing `"status":"OK"` (spacing may differ).
If you get an error, stop and show it to the teacher.

## Step 4: Check the starting route

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
cat .runtime/state.json
```

**Expected:** `"route": "direct"`.
This means the helper last selected **Mattermost → PostgreSQL**, without PgBouncer.
The next exercise checks the actual connection too.

If the route is already `pooled`, you may be returning to a partially completed lab.
Ask where to resume. Do not reset it.

## Know which prompt you are using

| What you see (example) | Where you are | What to type here |
|---|---|---|
| `ubuntu@suta-pgb-app:~$` | Linux, as ubuntu | Linux commands such as `cd` |
| `postgres@suta-pgb-pooler:~$` | Linux, as postgres | The `psql` login command |
| `mattermost=#` | PostgreSQL through psql | SQL commands |
| `pgbouncer=#` | PgBouncer admin console | Commands such as `SHOW POOLS;` |

Prompt text can vary. Do not copy the prompt itself.

- `\q` leaves psql and returns to Linux.
- `exit` leaves the current Linux account. After `sudo -iu postgres`, one `exit` returns to `ubuntu`.
- **Ctrl+C** stops a repeating `\watch` display. It does not leave psql.
- If a results page shows `(END)`, press **q** to close that page.

## Keep your results

Traffic reports are saved automatically on APP. Keep screenshots of the checks the
teacher asks to see. Do not include passwords in screenshots.

<details>
<summary>Optional: record your terminal session</summary>

Start recording after SSH login, before switching Linux users.

**On the server you want to record — Linux terminal, as `ubuntu`:**

```bash
mkdir -p ~/pgbouncer-evidence
```

**On that same server — Linux terminal, as `ubuntu`:**

```bash
script -q -a ~/pgbouncer-evidence/terminal.txt
```

This adds output to a file. Do not display passwords or private configuration files
while recording. To finish, leave psql with `\q`, return to `ubuntu` if needed,
then type `exit` once to end the recording.

</details>

## Returning after a disconnect

Reconnect using your private sheet. Check `hostname` and `whoami` again.
Start at the step you were doing, not at the beginning of the course.
On APP, return to `/opt/suta/pgbouncer-lab` before running scripts.
Use a new traffic run name each time; keep earlier reports.

## Checkpoint

- [ ] My three tabs show the correct server names and `ubuntu`.
- [ ] Mattermost reports `OK`.
- [ ] The starting route is `direct`.

**Tell the teacher:** which server runs the app? Which server stores its messages?

**Next:** [Exercise 1 — send test messages](01-baseline.md).
