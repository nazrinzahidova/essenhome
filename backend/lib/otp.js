const crypto = require('crypto');

function positiveInt(value, fallback, max = 3600) {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n < 1 || n > max) throw new Error('Invalid OTP configuration');
  return n;
}
const resendSeconds = positiveInt(process.env.OTP_RESEND_SECONDS, 60);
const ttlSeconds = 300;
const maxAttempts = 5;
const maxPerHour = 5;

function normalizeAzPhone(value) {
  if (typeof value !== 'string' || !/^[+\d\s()-]+$/.test(value)) return null;
  let digits = value.replace(/\D/g, '');
  if (/^0\d{9}$/.test(digits)) digits = '994' + digits.slice(1);
  if (/^\d{9}$/.test(digits)) digits = '994' + digits;
  return /^994\d{9}$/.test(digits) ? '+' + digits : null;
}
function phoneVariants(phone) {
  const canonical = normalizeAzPhone(phone);
  return canonical ? [canonical, canonical.slice(1), '0' + canonical.slice(4)] : [];
}
function otpHash(phone, code) {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('OTP secret is required');
  return crypto.createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
}
function matchesCode(challenge, code) {
  const expected = Buffer.from(otpHash(challenge.phone, code), 'hex');
  const actual = Buffer.from(challenge.codeHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function parseBirthDate(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || ''));
  if (!m) return null;
  const [, day, month, year] = m.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || date > new Date() || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}
function timing(challenge, now) {
  const retryAfter = challenge ? Math.max(0, Math.ceil((challenge.createdAt.getTime() + resendSeconds * 1000 - now.getTime()) / 1000)) : 0;
  return { serverTime: now.toISOString(), resendAfterSeconds: retryAfter, retryAfter, expiresIn: challenge ? Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000)) : 0 };
}
module.exports = { normalizeAzPhone, phoneVariants, otpHash, matchesCode, parseBirthDate, timing, resendSeconds, ttlSeconds, maxAttempts, maxPerHour };
