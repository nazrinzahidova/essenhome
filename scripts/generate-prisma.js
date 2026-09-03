// Hostinger still has a legacy binary-engine override in its environment.
// Generate the driver-adapter client in-process so no query-engine child
// process is needed during installation.
const path = require('path');
const { execFileSync } = require('child_process');

const env = { ...process.env };
delete env.PRISMA_CLIENT_ENGINE_TYPE;
execFileSync(process.execPath, [
  path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js'),
  'generate',
  '--schema=backend/prisma/schema.prisma'
], { cwd: path.join(__dirname, '..'), env, stdio: 'inherit' });
