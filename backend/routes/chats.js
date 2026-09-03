const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const adminCheck = require('../middleware/adminCheck');

router.post('/session', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.phone) return res.status(400).json({ message: 'Profilinizdə telefon nömrəsi yoxdur' });
    let session = await prisma.chatSession.findFirst({ where: { userId: user.id, status: 'open' } });
    if (!session) session = await prisma.chatSession.create({ data: { chatKey: crypto.randomUUID(), userId: user.id, name: user.name, phone: String(user.phone).replace(/\D/g, '') } });
    res.json({ id: session.id, name: session.name, phone: session.phone });
  } catch (err) { console.error('Chat session error:', err); res.status(500).json({ message: 'Çat açıla bilmədi' }); }
});

router.get('/:id/messages', auth, async (req, res) => {
  try {
    const session = await prisma.chatSession.findFirst({ where: { id: Number(req.params.id), userId: req.user.id } });
    if (!session) return res.status(404).json({ message: 'Çat tapılmadı' });
    res.json(await prisma.chatMessage.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: 'asc' } }));
  } catch { res.status(500).json({ message: 'Mesajlar yüklənmədi' }); }
});

router.post('/:id/messages', auth, async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim().slice(0, 2000);
    if (!text) return res.status(400).json({ message: 'Mesaj boş ola bilməz' });
    const session = await prisma.chatSession.findFirst({ where: { id: Number(req.params.id), userId: req.user.id, status: 'open' } });
    if (!session) return res.status(404).json({ message: 'Çat tapılmadı' });
    const message = await prisma.chatMessage.create({ data: { sessionId: session.id, sender: 'user', text } });
    await prisma.chatSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } });
    res.status(201).json(message);
  } catch { res.status(500).json({ message: 'Mesaj göndərilmədi' }); }
});

router.get('/admin/sessions/list', auth, adminCheck, async (_req, res) => {
  try { res.json(await prisma.chatSession.findMany({ orderBy: { updatedAt: 'desc' }, include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } } })); }
  catch { res.status(500).json({ message: 'Çatlar yüklənmədi' }); }
});

router.get('/admin/sessions/:id', auth, adminCheck, async (req, res) => {
  try {
    const session = await prisma.chatSession.findUnique({ where: { id: Number(req.params.id) }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
    if (!session) return res.status(404).json({ message: 'Çat tapılmadı' });
    res.json(session);
  } catch { res.status(500).json({ message: 'Çat yüklənmədi' }); }
});

router.post('/admin/sessions/:id/messages', auth, adminCheck, async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim().slice(0, 2000);
    if (!text) return res.status(400).json({ message: 'Mesaj boş ola bilməz' });
    const sessionId = Number(req.params.id);
    const message = await prisma.chatMessage.create({ data: { sessionId, sender: 'admin', text } });
    await prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
    res.status(201).json(message);
  } catch { res.status(500).json({ message: 'Cavab göndərilmədi' }); }
});

module.exports = router;
