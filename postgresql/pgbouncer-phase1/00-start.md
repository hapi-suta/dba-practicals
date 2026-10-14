# Exercise 0: Connect to your servers

## What you will achieve

Log in to your three servers, check their names, and open your Mattermost website.
You are ready to continue when the website opens, the app health check says `OK`,
and the starting route is `direct`.

**You need:** your private login sheet with three IP addresses, username `ubuntu`,
and your server password. You also need your Mattermost website username and
password. Ask the teacher if either set of login details is missing.

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

**What this means:**

- `hostname` prints the name of the server you are logged into. Use it to check the tab before continuing.


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

**What this means:**

- `whoami` prints your current Linux username. It tells you whether you are using `ubuntu` or `postgres`.


**Expected:** `ubuntu`.

## Step 3: Check that Mattermost is running

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`:**

```bash
cd /opt/suta/pgbouncer-lab
```

**What this means:**

- `cd` means change directory (folder).
- `/opt/suta/pgbouncer-lab` is the folder containing the lab scripts. This command only moves you into that folder.


This is the folder containing the prepared lab scripts. Successful `cd` prints nothing.

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`:**

```bash
curl -fsS http://127.0.0.1:8065/api/v4/system/ping
```

**What this means:**

- `curl` makes a web request from the terminal.
- `-f` reports an error if the web server returns an HTTP failure.
- `-s` hides the download progress display.
- `-S` still shows error messages when `-s` is used. These three options are grouped as `-fsS`.
- `127.0.0.1` means **this server**, so run this on APP, not POOLER or DB.
- `8065` is Mattermost’s web port. `/api/v4/system/ping` asks whether Mattermost is responding.


**Expected:** a response containing `"status":"OK"` (spacing may differ).
If you get an error, stop and show it to the teacher.

## Step 4: Check the starting route

**On APP (`suta-pgb-app`) — Linux terminal, as `ubuntu`, in `/opt/suta/pgbouncer-lab`:**

```bash
cat .runtime/state.json
```

**What this means:**

- `cat` displays a file’s contents without changing it.
- `.runtime/state.json` is the report or state file to read. The path is relative to your current lab folder.


**Expected:** `"route": "direct"`.
This means the helper last selected **Mattermost → PostgreSQL**, without PgBouncer.
The next exercise checks the actual connection too.

If the route is already `pooled`, you may be returning to a partially completed lab.
Ask where to resume. Do not reset it.

## Step 5: Open your Mattermost website

**Where:** on your own computer, in a web browser such as Chrome or Edge.
This step is not a command to run in a server terminal.

1. Find **APP (`suta-pgb-app`)** on your private login sheet.
2. Copy its **Mattermost URL** into the browser address bar. If your sheet only
   shows the APP public IP, type `http://`, then that IP, then `:8065`.
   The format is `http://YOUR_APP_PUBLIC_IP:8065` — replace
   `YOUR_APP_PUBLIC_IP` with your own APP IP; do not type those words literally.
3. Press **Enter**. You should see the Mattermost sign-in page.
4. Sign in with the **Mattermost username and password** from your private sheet.
   Do not use the Linux username `ubuntu` or your SSH password.
5. Open the **SUTA Pooling Lab** team, then the **Traffic Lab** channel.
   Leave this browser tab open. Exercise 1 sends messages to this channel.

**What the address means:** `http://` opens the lab website, the public IP selects
APP, and `:8065` selects the port where Mattermost listens.
Use APP's public IP, not the POOLER or DB IP. `127.0.0.1` in your laptop browser
would mean your laptop, not APP.

**Expected:** you can see the Traffic Lab channel. Earlier practice messages may
already be there; keep them.

**If it does not open:** check the APP IP and `:8065`, and make sure the address
starts with `http://`. Repeat the health check in Step 3 on APP. If that says `OK`
but the website still will not open, show the teacher the browser error and APP
IP. If login fails or the team is missing, ask the teacher to check your assigned
Mattermost account. Do not create a new account or change server settings.

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

**What this means:**

- `mkdir` creates a folder.
- `-p` also creates missing parent folders and accepts an existing folder.
- `~` means your current Linux user’s home folder. `pgbouncer-evidence` is the folder name.


**On that same server — Linux terminal, as `ubuntu`:**

```bash
script -q -a ~/pgbouncer-evidence/terminal.txt
```

**What this means:**

- `script` starts recording terminal output into a file.
- `-q` hides its start and finish announcements.
- `-a` adds to an existing file instead of replacing it.
- `~/pgbouncer-evidence/terminal.txt` is the recording file. Keep passwords out of recordings.


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
- [ ] I can open Mattermost in my browser and see the Traffic Lab channel.
- [ ] The starting route is `direct`.

**Tell the teacher:** which server runs the app? Which server stores its messages?

**Next:** [Exercise 1 — send test messages](01-baseline.md).
