// Ignore a legacy Hostinger override left from the binary-engine deployment.
// This release is generated for the JS driver adapter and must not spawn an engine.
delete process.env.PRISMA_CLIENT_ENGINE_TYPE;

const { PrismaClient } = require('../generated/client-v3');
const { PrismaPg } = require('@prisma/adapter-pg');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

function adapterConnectionString(value) {
  const url = new URL(value);
  // The existing URL targets Supabase's transaction pooler and contains
  // parameters understood by Prisma's binary engine only. The pg adapter is
  // a long-lived Node client, so use the session pooler instead.
  if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543') {
    url.port = '5432';
  }
  url.searchParams.delete('connection_limit');
  url.searchParams.delete('pgbouncer');
  url.searchParams.delete('pool_timeout');
  return url.toString();
}

// The JS driver adapter does not spawn Prisma's Rust query-engine process.
// That avoids Hostinger's EAGAIN process limit and the engine timer panic.
const adapter = new PrismaPg({
  connectionString: adapterConnectionString(process.env.DATABASE_URL),
  max: Number(process.env.DB_POOL_SIZE || 3),
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  allowExitOnIdle: true
});
const prisma = global.__essenPrisma || new PrismaClient({ adapter });

global.__essenPrisma = prisma;

module.exports = prisma;
