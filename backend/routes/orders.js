const express = require('express');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const admin = require('../middleware/adminCheck');
const policy = require('../../frontend/order-policy');
const { reasonText, canReturn, publicOrder, changeStatus } = require('../lib/orderLifecycle');
function validateOrder(body) {
  if (!['cash', 'card'].includes(body.paymentMethod)) throw Error('Ödəniş üsulunu seçin.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestKey || '')) throw Error('Sifariş formasını yenidən açın.');
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  if (address.length < 5 || address.length > 500) throw Error('Çatdırılma ünvanını daxil edin (5–500 simvol).');
  if (!policy.validDate(body.deliveryDate)) throw Error('Çatdırılma tarixini seçin.');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) throw Error('Səbətdə 1–50 məhsul olmalıdır.');
  const items = body.items.map(i => {
    if (!Number.isInteger(i.productId) || i.productId < 1 || i.productId > 2147483647 || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 20) throw Error('Məhsul və miqdar düzgün deyil.');
    return { productId: i.productId, quantity: i.quantity, color: String(i.color || '').slice(0, 80) };
  });
  return { requestKey: body.requestKey, paymentMethod: body.paymentMethod, deliveryDate: body.deliveryDate, address, items };
}
function createOrdersRouter(db, now = () => new Date()) {
  const router = express.Router();
  router.use(auth, (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/reasons', (_req, res) => res.json(require('../lib/orderLifecycle').reasons));
  router.post('/', async (req, res) => {
    let input;
    try { input = validateOrder(req.body || {}); } catch (e) { return res.status(400).json({ message: e.message }); }
    const hash = crypto.createHash('sha256').update(JSON.stringify({ userId: req.user.id, ...input })).digest('hex');
    const previousResponse = row => row.userId === req.user.id && row.requestHash === hash
      ? res.json(publicOrder(row, now())) : res.status(409).json({ message: 'Sifariş məlumatları dəyişib. Yeni sifariş üçün formanı yenidən açın.' });
    try {
      const previous = await db.order.findUnique({ where: { requestKey: input.requestKey }, include: { items: true } });
      if (previous) return previousResponse(previous);
      try { policy.validateDate(input.deliveryDate, now()); } catch (e) { return res.status(400).json({ message: e.message }); }
      const row = await db.$transaction(async tx => {
        const quantities = new Map();
        input.items.forEach(i => quantities.set(i.productId, (quantities.get(i.productId) || 0) + i.quantity));
        const products = await tx.product.findMany({ where: { id: { in: [...quantities.keys()] } } });
        const byId = new Map(products.map(p => [p.id, p]));
        for (const [id, qty] of quantities) {
          const p = byId.get(id);
          if (!p || qty > 20 || p.stock < qty || !Number.isFinite(Number(p.price)) || Number(p.price) < 0) throw Object.assign(Error('Məhsul mövcud deyil və ya stok kifayət etmir. Səbəti yeniləyin.'), { status: 409 });
        }
        const items = input.items.map(i => ({ ...i, name: byId.get(i.productId).name, price: Number(byId.get(i.productId).price) }));
        const subtotal = items.reduce((sum, i) => sum + Math.round(i.price * 100) * i.quantity, 0) / 100;
        const shippingFee = policy.shippingCost(subtotal);
        return tx.order.create({ data: { userId: req.user.id, requestKey: input.requestKey, requestHash: hash,
          paymentMethod: input.paymentMethod, deliveryDate: input.deliveryDate, address: input.address,
          shippingFee, total: Math.round((subtotal + shippingFee) * 100) / 100, items: { create: items } }, include: { items: true } });
      });
      res.status(201).json(publicOrder(row, now()));
    } catch (e) {
      if (e.code === 'P2002') {
        const previous = await db.order.findUnique({ where: { requestKey: input.requestKey }, include: { items: true } }).catch(() => null);
        if (previous) return previousResponse(previous);
      }
      res.status(e.status || 503).json({ message: e.status ? e.message : 'Sifariş saxlanmadı. Yenidən cəhd edin.' });
    }
  });
  router.get('/my', async (req, res) => {
    try { res.json((await db.order.findMany({ where: { userId: req.user.id }, include: { items: { include: { product: { select: { name: true, image: true } } } } }, orderBy: { createdAt: 'desc' } })).map(row => publicOrder(row, now()))); }
    catch { res.status(503).json({ message: 'Sifarişlər yüklənmədi.' }); }
  });
  router.get('/admin', admin, async (_req, res) => {
    try { res.json((await db.order.findMany({ include: { user: { select: { name: true, phone: true } }, items: { include: { product: { select: { name: true, image: true } } } } }, orderBy: { createdAt: 'desc' } })).map(row => publicOrder(row, now()))); }
    catch { res.status(503).json({ message: 'Sifarişlər yüklənmədi.' }); }
  });
  router.patch('/admin/:id', admin, async (req, res) => {
    try { const ok = await changeStatus(db, Number(req.params.id), req.body.status, now()); res.status(ok ? 200 : 409).json(ok ? { ok: true } : { message: 'Bu status dəyişikliyi mümkün deyil. Siyahını yeniləyin.' }); }
    catch { res.status(503).json({ message: 'Status saxlanmadı.' }); }
  });
  for (const action of ['cancel', 'return']) router.post('/:id/' + action, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(404).json({ message: 'Sifariş tapılmadı.' });
    let reason;
    try { reason = reasonText(req.body || {}); } catch (e) { return res.status(400).json({ message: e.message }); }
    try {
      const result = await db.$transaction(async tx => {
        const row = await tx.order.findFirst({ where: { id, userId: req.user.id } });
        if (!row) return 404;
        const date = now();
        if (action === 'cancel' && !['pending', 'confirmed'].includes(row.status)) return 409;
        if (action === 'return' && !canReturn(row, date)) return 409;
        const where = { id, userId: req.user.id, status: row.status, ...(action === 'return' ? { returnRequestedAt: null, deliveredAt: row.deliveredAt } : {}) };
        const data = action === 'cancel' ? { status: 'cancelled', cancellationReason: reason, cancelledAt: date } : { returnReason: reason, returnRequestedAt: date };
        const changed = await tx.order.updateMany({ where, data });
        if (!changed.count) return 409;
        if (action === 'cancel') await tx.creditApplication.updateMany({ where: { orderId: id }, data: { status: 'cancelled' } });
        return 200;
      });
      res.status(result).json(result === 200 ? { ok: true } : { message: result === 404 ? 'Sifariş tapılmadı.' : 'Bu əməliyyat artıq mümkün deyil. Sifarişləri yeniləyin.' });
    } catch { res.status(503).json({ message: 'Müraciət saxlanmadı. Yenidən cəhd edin.' }); }
  });
  return router;
}
module.exports = { createOrdersRouter, validateOrder };
