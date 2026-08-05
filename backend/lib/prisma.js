const { PrismaClient } = require('../generated/client-v3');
const { PrismaPg } = require('@prisma/adapter-pg');

// Bütün route-lar eyni Prisma bağlantı hovuzundan istifadə edir.
// Bu, production bazasında bağlantı limitinin dolmasının qarşısını alır.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = global.__essenPrisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  global.__essenPrisma = prisma;
}

module.exports = prisma;
