// The generated JS client owns one bounded pg pool per Node process.
delete process.env.PRISMA_CLIENT_ENGINE_TYPE;
const { PrismaClient } = require('../generated/client-v3');
const { PrismaPg } = require('@prisma/adapter-pg');
const dbConfig = require('./dbConfig');
const prisma = global.__essenPrisma || new PrismaClient({ errorFormat: 'minimal', adapter: new PrismaPg(dbConfig()) });
global.__essenPrisma = prisma;
module.exports = prisma;
