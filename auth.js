const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');

// Qeydiyyat
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const cleanName = String(name || '').trim();
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (cleanName.length < 3 || cleanPhone.length < 9 || !email || !password) {
      return res.status(400).json({ message: 'Ad, soyad, telefon, email və şifrəni düzgün daxil edin' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu email artıq istifadə olunur' });
    }
    const existingPhone = await prisma.user.findFirst({ where: { phone: cleanPhone } });
    if (existingPhone) return res.status(400).json({ message: 'Bu telefon nömrəsi artıq istifadə olunur' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name: cleanName, email, phone: cleanPhone, password: hashedPassword }
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

    if (!email || !password) {
      return res.status(400).json({ message: 'Email və şifrə daxil edin' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('Login configuration error: JWT_SECRET is missing');
      return res.status(500).json({ message: 'Server konfiqurasiyası tamamlanmayıb' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
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
