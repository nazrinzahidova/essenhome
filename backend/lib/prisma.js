const { PrismaClient } = require('../generated/client-v3');

// Reuse one Prisma client per process. The generated client reads DATABASE_URL
// directly and manages its own connection pool.
const prisma = global.__essenPrisma || new PrismaClient();

global.__essenPrisma = prisma;

module.exports = prisma;
