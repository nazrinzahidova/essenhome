const fs = require('fs');
const path = require('path');
const tls = require('tls');

function integer(name, fallback, max) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`Invalid ${name}`);
  return value;
}
module.exports = function dbConfig() {
  const url = new URL(process.env.DATABASE_URL);
  const supabase = url.hostname.endsWith('.pooler.supabase.com') || url.hostname.endsWith('.supabase.co');
  if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543') url.port = '5432';
  // URL SSL options in pg replace the supplied TLS object. Own the entire TLS
  // configuration here so a legacy sslmode cannot disable certificate checks.
  for (const key of ['connection_limit', 'pgbouncer', 'pool_timeout', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'sslaccept']) url.searchParams.delete(key);
  const ca = [...tls.rootCertificates];
  if (supabase) ca.push(fs.readFileSync(path.join(__dirname, 'certs/supabase-prod-ca-2021.crt'), 'utf8'));
  if (process.env.DB_CA_FILE) ca.push(fs.readFileSync(process.env.DB_CA_FILE, 'utf8'));
  return {
    connectionString: url.toString(),
    ssl: { ca, rejectUnauthorized: true, servername: url.hostname },
    max: integer('DB_POOL_SIZE', 3, 20),
    connectionTimeoutMillis: integer('DB_CONNECT_TIMEOUT_MS', 10000, 60000),
    idleTimeoutMillis: integer('DB_IDLE_TIMEOUT_MS', 30000, 300000),
    allowExitOnIdle: true
  };
};
