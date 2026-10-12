# Startup findings

Initial localhost readiness failed: an internal-only Docker network did not publish the application port in this OrbStack environment. Added a separate frontend network for the application only; database and pooler remain on the internal network. API readiness and eight-user traffic passed afterward. No credentials in this record. PgBouncer exercise has not run yet.

Native HA001 rehearsal initially omitted binary_parameters=yes. Mattermost 11.7.12 failed startup in PgBouncer 1.22.0 transaction mode with unnamed prepared statement parameter-count errors. Added the option shown in Mattermost official PgBouncer guidance and reran affected workflows. Original failure retained in ha001/failure.txt; sanitized log excerpt will accompany final validation.
