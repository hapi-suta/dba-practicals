# Local instructor qualification only. No cloud credentials, published ports or
# student volumes. Use an existing postgres:16 image; do not alter host packages.
FROM postgres:16
RUN apt-get update && apt-get install -y --no-install-recommends nodejs pgbackrest && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /var/lib/postgresql/16/lab /var/run/postgresql /etc/pgbackrest && chown -R postgres:postgres /var/lib/postgresql /var/run/postgresql /etc/pgbackrest
ENTRYPOINT ["sleep", "infinity"]
