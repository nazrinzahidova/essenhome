const express = require('express');
const auth = require('../middleware/auth');
const admin = require('../middleware/adminCheck');
const { IMAGE_SELECT, serializeProduct } = require('../lib/productImages');

function createHomeSectionsRouter(db) {
  const router = express.Router();
  const id = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
  const run = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (error) {
      if (error.code === 'P2025' || error.code === 'P2003') return res.status(404).json({ message: 'Bölmə və ya məhsul tapılmadı.' });
      console.error('Home sections:', error.code || error.message);
      res.status(500).json({ message: 'Dəyişiklik saxlanmadı. Yenidən cəhd edin.' });
    }
  };
  router.get('/', run(async (_req, res) => {
    const sections = await db.homeSection.findMany({
      where: { active: true, products: { some: {} } }, orderBy: [{ position: 'asc' }, { id: 'asc' }],
      include: { products: { orderBy: { productId: 'asc' }, include: { product: { include: {
        images: { select: IMAGE_SELECT, orderBy: [{ position: 'asc' }, { id: 'asc' }] }
      } } } } }
    });
    res.set('Cache-Control', 'no-store').json(sections.map(section => ({
      id: section.id, name: section.name, products: section.products.map(link => serializeProduct(link.product))
    })));
  }));
  router.use(auth, admin);
  router.get('/admin', run(async (_req, res) => {
    res.set('Cache-Control', 'no-store').json(await db.homeSection.findMany({
      orderBy: [{ position: 'asc' }, { id: 'asc' }], include: { _count: { select: { products: true } } }
    }));
  }));
  router.post('/', run(async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 120) return res.status(400).json({ message: 'Bölmə adı 1–120 simvol olmalıdır.' });
    const last = await db.homeSection.aggregate({ _max: { position: true } });
    res.status(201).json(await db.homeSection.create({ data: { name, position: (last._max.position ?? -1) + 1 } }));
  }));
  router.put('/order', run(async (req, res) => {
    const ids = req.body.ids;
    if (!Array.isArray(ids) || ids.some(v => !Number.isSafeInteger(v) || v < 1) || new Set(ids).size !== ids.length)
      return res.status(400).json({ message: 'Sıra düzgün deyil.' });
    const current = await db.homeSection.findMany({ select: { id: true } });
    if (ids.length !== current.length || current.some(s => !ids.includes(s.id)))
      return res.status(409).json({ message: 'Bölmələr dəyişib. Siyahını yeniləyin.' });
    await db.$transaction(ids.map((sectionId, position) => db.homeSection.update({ where: { id: sectionId }, data: { position } })));
    res.json({ success: true });
  }));
  router.get('/products/:id', run(async (req, res) => {
    const productId = id(req.params.id);
    if (!productId || !await db.product.findUnique({ where: { id: productId }, select: { id: true } })) return res.sendStatus(404);
    const links = await db.homeSectionProduct.findMany({ where: { productId } });
    res.set('Cache-Control', 'no-store').json(links.map(link => link.sectionId));
  }));
  // Change one membership at a time; other sections are never overwritten.
  router.put('/products/:id/:sectionId', run(async (req, res) => {
    const productId = id(req.params.id), sectionId = id(req.params.sectionId);
    if (!productId || !sectionId || typeof req.body.selected !== 'boolean') return res.sendStatus(400);
    if (req.body.selected) await db.homeSectionProduct.upsert({
      where: { sectionId_productId: { sectionId, productId } }, create: { sectionId, productId }, update: {}
    });
    else await db.homeSectionProduct.deleteMany({ where: { sectionId, productId } });
    res.json({ success: true });
  }));
  router.patch('/:id', run(async (req, res) => {
    const sectionId = id(req.params.id), data = {};
    if (!sectionId) return res.sendStatus(400);
    if ('name' in req.body) {
      if (typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.trim().length > 120) return res.sendStatus(400);
      data.name = req.body.name.trim();
    }
    if ('active' in req.body) {
      if (typeof req.body.active !== 'boolean') return res.sendStatus(400);
      data.active = req.body.active;
    }
    res.json(await db.homeSection.update({ where: { id: sectionId }, data }));
  }));
  router.delete('/:id', run(async (req, res) => {
    const sectionId = id(req.params.id);
    if (!sectionId) return res.sendStatus(400);
    await db.homeSection.delete({ where: { id: sectionId } });
    res.json({ success: true });
  }));
  return router;
}
module.exports = { createHomeSectionsRouter };
