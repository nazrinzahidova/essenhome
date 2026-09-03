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
  return otpSchemaReady;
}

function normalizeAzPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) digits = `994${digits.slice(1)}`;
  if (!digits.startsWith('994') || digits.length !== 12) return null;
  return digits;
}

function otpHash(phone, code) {
  return crypto.createHmac('sha256', process.env.OTP_HASH_SECRET || process.env.JWT_SECRET).update(`${phone}:${code}`).digest('hex');
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}

router.get('/request-code/:phone', async (req, res) => {
  try {
    await ensureOtpSchema();
    const phone = normalizeAzPhone(req.params.phone);
    if (!phone) return res.status(400).json({ message: 'Telefon nömrəsini düzgün daxil edin' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'Server konfiqurasiyası tamamlanmayıb' });

    const now = new Date();
    const latest = await prisma.otpChallenge.findFirst({ where: { phone }, orderBy: { createdAt: 'desc' } });
    if (latest && now - latest.createdAt < OTP_RESEND_MS) {
      return res.status(429).json({ message: 'Kodu yenidən göndərmək üçün gözləyin', retryAfter: Math.ceil((OTP_RESEND_MS - (now - latest.createdAt)) / 1000) });
    }
    const hourlyCount = await prisma.otpChallenge.count({ where: { phone, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } } });
    if (hourlyCount >= OTP_MAX_PER_HOUR) return res.status(429).json({ message: 'SMS limiti dolub. Bir saat sonra yenidən cəhd edin' });

    const code = String(crypto.randomInt(100000, 1000000));
    const user = await prisma.user.findFirst({ where: { phone } });
    const sent = await sendOtpSms(phone, code);
    await prisma.otpChallenge.create({ data: { phone, codeHash: otpHash(phone, code), providerId: sent.providerId, expiresAt: new Date(now.getTime() + OTP_TTL_MS), userId: user?.id } });
    res.json({ message: 'Kod SMS ilə göndərildi', expiresIn: 300, resendIn: 59, ...(sent.mocked && process.env.NODE_ENV !== 'production' ? { testCode: code } : {}) });
  } catch (err) {
    console.error('OTP request failed:', err.message);
    res.status(err.code === 'PG365_NOT_CONFIGURED' ? 503 : 502).json({ message: err.message || 'SMS göndərilə bilmədi' });
  }
});

router.post('/otp/verify', async (req, res) => {
  try {
    await ensureOtpSchema();
    const phone = normalizeAzPhone(req.body?.phone);
    const code = String(req.body?.code || '').replace(/\D/g, '');
    if (!phone || !/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Telefon və 6 rəqəmli kodu düzgün daxil edin' });
    const challenge = await prisma.otpChallenge.findFirst({ where: { phone, consumedAt: null }, orderBy: { createdAt: 'desc' } });
    if (!challenge || challenge.expiresAt < new Date()) return res.status(400).json({ message: 'Kodun vaxtı bitib. Yeni kod alın' });
    if (challenge.attempts >= 5) return res.status(429).json({ message: 'Cəhd limiti dolub. Yeni kod alın' });
    if (!crypto.timingSafeEqual(Buffer.from(challenge.codeHash), Buffer.from(otpHash(phone, code)))) {
      await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      return res.status(400).json({ message: 'Təsdiq kodu yanlışdır' });
    }
    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
    const user = await prisma.user.findFirst({ where: { phone } });
    if (user) {
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ registrationRequired: false, token, user: publicUser(user) });
    }
    const registrationToken = jwt.sign({ phone, type: 'otp-registration' }, process.env.JWT_SECRET, { expiresIn: '10m' });
    res.json({ registrationRequired: true, registrationToken });
  } catch (err) {
    console.error('OTP verification failed:', err);
    res.status(500).json({ message: 'Kod təsdiqlənə bilmədi' });
  }
});

router.post('/otp/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'E-mail ünvanını düzgün daxil edin' });
    let verification;
    try { verification = jwt.verify(req.body?.registrationToken, process.env.JWT_SECRET); } catch { return res.status(401).json({ message: 'Təsdiq sessiyasının vaxtı bitib' }); }
    if (verification.type !== 'otp-registration') return res.status(401).json({ message: 'Təsdiq sessiyası etibarsızdır' });
    if (await prisma.user.findFirst({ where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { phone: verification.phone }] } })) return res.status(409).json({ message: 'Bu e-mail və ya telefon artıq istifadə olunur' });
    const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const user = await prisma.user.create({ data: { name: `İstifadəçi ${verification.phone.slice(-4)}`, email, phone: verification.phone, password: placeholderPassword } });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('OTP registration failed:', err);
    res.status(500).json({ message: 'Hesab yaradıla bilmədi' });
  }
});

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function findUserByEmail(email) {
  return prisma.user.findFirst({
    where: { email: { equals: normalizeEmail(email), mode: 'insensitive' } }
  });
}

// Qeydiyyat
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const cleanName = String(name || '').trim();
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    const cleanEmail = normalizeEmail(email);
    if (cleanName.length < 3 || cleanPhone.length < 9 || !cleanEmail || !password) {
      return res.status(400).json({ message: 'Ad, soyad, telefon, email və şifrəni düzgün daxil edin' });
    }

    const existingUser = await findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ message: 'Bu email artıq istifadə olunur' });
    }
    const existingPhone = await prisma.user.findFirst({ where: { phone: cleanPhone } });
    if (existingPhone) return res.status(400).json({ message: 'Bu telefon nömrəsi artıq istifadə olunur' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name: cleanName, email: cleanEmail, phone: cleanPhone, password: hashedPassword }
    });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !password) {
      return res.status(400).json({ message: 'Email və şifrə daxil edin' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('Login configuration error: JWT_SECRET is missing');
      return res.status(500).json({ message: 'Server konfiqurasiyası tamamlanmayıb' });
    }

    const user = await findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(400).json({ message: 'Email və ya şifrə yanlışdır' });
    }

    if (!user.password || !/^\$2[aby]\$/.test(user.password)) {
      console.error(`Login data error: invalid password hash for user id ${user.id}`);
      return res.status(500).json({ message: 'Admin hesabının şifrəsi yenilənməlidir' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email və ya şifrə yanlışdır' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Daxil olmuş istifadəçinin öz şifrəsini təhlükəsiz şəkildə dəyişməsi
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'Köhnə və yeni şifrəni daxil edin' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Yeni şifrə ən azı 8 simvol olmalıdır' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'Yeni şifrə köhnə şifrədən fərqli olmalıdır' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.password) {
      return res.status(404).json({ message: 'İstifadəçi tapılmadı' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Köhnə şifrə yanlışdır' });
    }

    const password = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password } });
    res.json({ message: 'Şifrə dəyişdirildi. Yenidən daxil olun.' });
  } catch (err) {
    console.error('Password change failed:', err);
    res.status(500).json({ message: 'Şifrə dəyişdirilə bilmədi' });
  }
});

module.exports = router;
