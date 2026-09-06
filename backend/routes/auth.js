const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
router.use(require('./phoneAuth'));

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function findUserByEmail(email) {
  return prisma.user.findFirst({
    where: { email: { equals: normalizeEmail(email), mode: 'insensitive' } }
  });
}

// Customer registration requires a verified, single-use OTP session.
router.post('/register', (_req, res) => res.status(410).json({ message: 'Qeydiyyat üçün telefon nömrəsini SMS kodu ilə təsdiqləyin.' }));

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
    if (user.role !== 'admin') return res.status(403).json({ message: 'Daxil olmaq üçün telefon nömrənizə SMS kodu göndərin.' });
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
