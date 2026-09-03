const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');
const { sendOtpSms } = require('../lib/pg365');


const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 59 * 1000;
const OTP_MAX_PER_HOUR = 5;
let otpSchemaReady;


function ensureOtpSchema() {
  if (!otpSchemaReady) {
    otpSchemaReady = (async () => {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "OtpChallenge" (
        "id" SERIAL PRIMARY KEY,
        "phone" TEXT NOT NULL,
        "codeHash" TEXT NOT NULL,
        "purpose" TEXT NOT NULL DEFAULT 'login',
        "providerId" TEXT,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "consumedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "userId" INTEGER REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`);
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "OtpChallenge_phone_createdAt_idx" ON "OtpChallenge"("phone", "createdAt")');
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt")');
    })().catch(error => {
      otpSchemaReady = null;
      throw error;
    });
  }
