const { PrismaClient } = require('../generated/client-v3');

// Bütün route-lar eyni Prisma bağlantı hovuzundan istifadə edir.
// Bu, production bazasında bağlantı limitinin dolmasının qarşısını alır.
const prisma = global.__essenPrisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__essenPrisma = prisma;
}

module.exports = prisma;
