Public CA certificates only; no private keys.

- `supabase-prod-ca-2021.crt`: Supabase's public distribution at https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt. Downloaded 2026-09-06; used with full hostname verification, as described in https://supabase.com/docs/guides/platform/ssl-enforcement.
- `globalsign-root-r6.pem`: existing GlobalSign Root R6 trust anchor for PG365. Certificate and hostname verification remain enabled. System roots are retained for normal certificate rotation.
