# Research record — 2026-10-12, America/Los_Angeles

| Source | Claims used |
|---|---|
| [PgBouncer 1.22.0 configuration](https://raw.githubusercontent.com/pgbouncer/pgbouncer/pgbouncer_1_22_0/doc/config.md) | Exact native test version: pool modes, pool limits, SCRAM, wait timeout, backend TLS, prepared statements |
| [PgBouncer 1.22.0 admin console](https://raw.githubusercontent.com/pgbouncer/pgbouncer/pgbouncer_1_22_0/doc/usage.md) | SHOW commands, cl_waiting/sv_active meanings, RELOAD and RECONNECT |
| [PostgreSQL 16 monitoring](https://www.postgresql.org/docs/16/monitoring-stats.html) | pg_stat_activity, connection state and wait events |
| [PostgreSQL 16 client settings](https://www.postgresql.org/docs/16/runtime-config-client.html) | Transaction/session timeout distinctions |
| [Mattermost version archive](https://docs.mattermost.com/product-overview/version-archive) | Team Edition 11.7.12 artifact and SHA-256 7a247b1debfb369244e7c620a5648be9035cb9a3991b27eb457909e56c8b4145 |
| [Mattermost PgBouncer deployment](https://support.mattermost.com/hc/en-us/articles/51034431936660-Configure-Read-Write-Splitting-for-Mattermost-with-a-Patroni-Managed-PostgreSQL-Cluster) | Transaction pooling deployment and binary_parameters=yes in the connection string; Phase 2 remains separate |
| [Mattermost database settings](https://docs.mattermost.com/administration-guide/configure/environment-configuration-settings) | DataSource, MaxOpenConns, MaxIdleConns, per-data-source pools |
| [Mattermost API](https://docs.mattermost.com/api) | User login, team/channel membership, posting, reads and search |
| [Go pq driver](https://github.com/lib/pq/blob/main/conn.go) | Driver binary-parameter handling; explanation supporting the observed unnamed-statement failure, not a blanket compatibility claim |

## Scope and assumptions

Actual package versions and output are in evidence. Ubuntu packages may carry
backported fixes; upstream version alone is not the package revision. This lab
uses synthetic data and eight test users, not production load or a capacity promise.
Native HA001 results are authoritative for these handouts. The earlier local Docker
prototype used PostgreSQL 16 and PgBouncer 1.25.1 and is labelled separately.

Mattermost startup, API authentication, posts, replies, reads and search are tested.
A successful startup on an already initialized database does not prove a future
schema upgrade works through transaction pooling. Plugins and upgrades require
separate qualification. Backend TLS uses require without certificate identity
validation; client-to-pooler private traffic is not TLS-protected in Phase 1.
