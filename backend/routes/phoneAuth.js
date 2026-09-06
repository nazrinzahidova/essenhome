const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { sendOtpSms } = require('../lib/pg365');
const otp = require('../lib/otp');

router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const phoneWhere = phone => ({ phone: { in: otp.phoneVariants(phone) } });
const latest = (db, phone) => db.otpChallenge.findFirst({ where: phoneWhere(phone), orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
const findUser = (db, phone) => db.user.findFirst({ where: phoneWhere(phone) });
const failure = (status, message, extra = {}) => ({ status, body: { message, ...extra } });
const expired = () => failure(400, 'Kodun istifadə müddəti bitib. Yeni kod göndərin.');
function session(user) {
  return { registrationRequired: false, token: jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' }),
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } };
}
async function lock(db, key) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}
async function withPhone(phone, fn) {
  return prisma.$transaction(async db => {
    await db.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'");
    await lock(db, 'otp:' + phone);
    const [{ now }] = await db.$queryRaw`SELECT clock_timestamp() AS now`;
    return fn(db, now);
  }, { maxWait: 6000, timeout: 10000 });
}
function unexpected(res, operation, error) {
  const incident = crypto.randomUUID();
  // Do not log query arguments, provider responses, tokens, or OTP values.
  console.error('Phone auth failed', { incident, operation, name: error.name, code: error.code });
  return res.status(503).json({ message: 'Xidmət müvəqqəti əlçatan deyil. Yenidən cəhd edin.', incident });
}

router.get('/otp/status', async (req, res) => {
  const phone = otp.normalizeAzPhone(req.query.phone);
  if (!phone) return res.status(400).json({ message: 'Telefon nömrəsini düzgün daxil edin.' });
  try {
    const result = await withPhone(phone, async (db, now) => {
      const challenge = await latest(db, phone);
      const times = otp.timing(challenge, now);
      const recent = await db.otpChallenge.findMany({ where: { ...phoneWhere(phone), createdAt: { gt: new Date(now.getTime() - 3600000) } }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } });
      if (recent.length >= otp.maxPerHour) times.retryAfter = times.resendAfterSeconds = Math.max(times.retryAfter, Math.ceil((recent[0].createdAt.getTime() + 3600000 - now.getTime()) / 1000));
      return { ...times, codeSent: Boolean(challenge && challenge.status === 'sent' && !challenge.consumedAt), hasPendingCode: Boolean(challenge && challenge.status === 'sent' && !challenge.consumedAt && challenge.expiresAt > now) };
    });
    res.json(result);
  } catch (error) { unexpected(res, 'status', error); }
});

router.post('/otp/request', async (req, res) => {
  const phone = otp.normalizeAzPhone(req.body?.phone);
  if (!phone) return res.status(400).json({ message: 'Telefon nömrəsini düzgün daxil edin.' });
  let reserved;
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT secret is required');
    let code = String(crypto.randomInt(100000, 1000000));
    reserved = await withPhone(phone, async (db, now) => {
      const previous = await latest(db, phone);
      while (previous && otp.matchesCode(previous, code)) code = String(crypto.randomInt(100000, 1000000));
      const remaining = otp.timing(previous, now);
      if (remaining.retryAfter) return failure(429, 'Kodu yenidən göndərmək üçün gözləyin.', remaining);
      const hourAgo = new Date(now.getTime() - 3600000);
      const recent = await db.otpChallenge.findMany({ where: { ...phoneWhere(phone), createdAt: { gt: hourAgo } }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } });
      if (recent.length >= otp.maxPerHour) {
        const retryAfter = Math.ceil((recent[0].createdAt.getTime() + 3600000 - now.getTime()) / 1000);
        return failure(429, 'SMS limiti dolub. Daha sonra yenidən cəhd edin.', { retryAfter, resendAfterSeconds: retryAfter });
      }
      await db.otpChallenge.updateMany({ where: { ...phoneWhere(phone), consumedAt: null }, data: { consumedAt: now } });
      const challenge = await db.otpChallenge.create({ data: { phone, codeHash: otp.otpHash(phone, code), status: 'pending', createdAt: now, expiresAt: new Date(now.getTime() + otp.ttlSeconds * 1000) } });
      return { challenge };
    });
    if (reserved.status) {
      if (reserved.body.retryAfter) res.set('Retry-After', String(reserved.body.retryAfter));
      return res.status(reserved.status).json(reserved.body);
    }
    // Commit the reservation before contacting SMS. Never hold a DB connection
    // during network I/O, and never retry an ambiguously accepted SMS.
    const sent = await sendOtpSms(phone.slice(1), code);
    const result = await withPhone(phone, async (db, now) => {
      const changed = await db.otpChallenge.updateMany({ where: { id: reserved.challenge.id, status: 'pending', consumedAt: null }, data: { status: 'sent', providerId: sent.providerId, expiresAt: new Date(now.getTime() + otp.ttlSeconds * 1000) } });
      if (!changed.count) throw new Error('SMS reservation superseded');
      const challenge = await db.otpChallenge.findUnique({ where: { id: reserved.challenge.id } });
      return { message: 'Kod SMS ilə göndərildi.', ...otp.timing(challenge, now) };
    });
    res.json(result);
  } catch (error) {
    if (reserved?.challenge) await prisma.otpChallenge.updateMany({ where: { id: reserved.challenge.id, status: 'pending' }, data: { status: 'failed' } }).catch(() => {});
    unexpected(res, 'request', error);
  }
});
// GET must never send an SMS (prefetches, crawlers, and cross-site images).
router.get('/request-code/:phone', (_req, res) => res.status(405).set('Allow', 'POST').json({ message: 'Səhifəni yeniləyib yenidən cəhd edin.' }));

router.post(['/otp/verify', '/verify-code'], async (req, res) => {
  const phone = otp.normalizeAzPhone(req.body?.phone);
  const code = String(req.body?.code || '');
  if (!phone || !/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Telefon və 6 rəqəmli kodu düzgün daxil edin.' });
  try {
    const result = await withPhone(phone, async (db, now) => {
      const challenge = await latest(db, phone);
      if (!challenge || challenge.expiresAt <= now) return expired();
      if (challenge.consumedAt) return failure(400, 'Kod artıq istifadə edilib. Yeni kod göndərin.');
      if (challenge.status !== 'sent') return failure(400, 'SMS göndərişi təsdiqlənməyib. Yeni kod göndərin.');
      if (challenge.attempts >= otp.maxAttempts) return failure(429, 'Cəhd limiti dolub. Yeni kod göndərin.');
      if (!otp.matchesCode(challenge, code)) {
        await db.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
        return failure(400, 'Kod yanlışdır.');
      }
      await db.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: now } });
      const user = await findUser(db, phone);
      if (user) return { body: session(user) };
      const registrationToken = jwt.sign({ phone, challengeId: challenge.id, type: 'otp-registration' }, process.env.JWT_SECRET, { expiresIn: '10m' });
      return { body: { registrationRequired: true, registrationToken } };
    });
    res.status(result.status || 200).json(result.body);
  } catch (error) { unexpected(res, 'verify', error); }
});

router.post(['/otp/register', '/complete-registration'], async (req, res) => {
  let verification;
  try { verification = jwt.verify(req.body?.registrationToken, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return res.status(401).json({ message: 'Təsdiq sessiyasının vaxtı bitib. Yeni kod göndərin.' }); }
  const phone = otp.normalizeAzPhone(verification.phone);
  if (verification.type !== 'otp-registration' || !Number.isInteger(verification.challengeId) || !phone) return res.status(401).json({ message: 'Təsdiq sessiyası etibarsızdır.' });
  const firstName = String(req.body?.firstName || '').trim();
  const lastName = String(req.body?.lastName || '').trim();
  const birthDate = otp.parseBirthDate(req.body?.birthDate);
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!firstName || firstName.length > 100) return res.status(400).json({ message: 'Adınızı düzgün daxil edin.' });
  if (!lastName || lastName.length > 100) return res.status(400).json({ message: 'Soyadınızı düzgün daxil edin.' });
  if (!birthDate) return res.status(400).json({ message: 'Doğum tarixini GG/AA/İİİİ formatında düzgün daxil edin.' });
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'E-mail ünvanını düzgün daxil edin.' });
  try {
    const password = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const result = await withPhone(phone, async (db, now) => {
      const challenge = await latest(db, phone);
      if (!challenge || challenge.id !== verification.challengeId || challenge.status !== 'sent' || !challenge.consumedAt || challenge.registrationUsedAt || now - challenge.consumedAt > 600000) return failure(401, 'Təsdiq sessiyası etibarsızdır. Yeni kod göndərin.');
      await lock(db, 'registration-email:' + email);
      const existing = await findUser(db, phone);
      if (existing) return failure(409, 'Bu telefon artıq qeydiyyatdan keçib. Yeni kodla daxil olun.');
      if (await db.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })) return failure(409, 'Bu e-mail artıq istifadə olunur.');
      const user = await db.user.create({ data: { name: `${firstName} ${lastName}`, firstName, lastName, birthDate, email, phone, password } });
      await db.otpChallenge.update({ where: { id: challenge.id }, data: { registrationUsedAt: now, userId: user.id } });
      return { body: session(user) };
    });
    res.status(result.status || 200).json(result.body);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'Telefon və ya e-mail artıq istifadə olunur.' });
    unexpected(res, 'register', error);
  }
});
module.exports = router;
