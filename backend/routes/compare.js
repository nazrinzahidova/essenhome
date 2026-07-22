// backend/routes/compare.js
const express = require('express');
const router  = express.Router();
const prisma = require('../lib/prisma');
const auth   = require('../middleware/auth'); // mövcud middleware

// Müqayisə cədvəlində göstəriləcək məhsul sahələri
const PRODUCT_SELECT = {
  id:       true,
  name:     true,
  price:    true,
  oldPrice: true,
  discount: true,
  image:    true,
  category: true,
  subcategory: true,
  brand:    true,
  specs:    true,
  stock:    true,
};

// Frontend-dəki (compare.html) "Hava emalı" qrupu ilə eyni məntiq:
// bu 4 alt-kateqoriya birlikdə TEK bir qrup kimi say limitinə tabedir.
const AIR_TREATMENT_SUBCATEGORIES = [
  'hava nəmləndirici',
  'hava təmizləyici',
  'hava təravətləndirici'
];
function isAirTreatmentSubcategory(subcategory) {
  const s = (subcategory || '').trim().toLowerCase();
  return AIR_TREATMENT_SUBCATEGORIES.includes(s) || s.startsWith('iqlim kompleksi');
}
function isLaptopSubcategory(subcategory) {
  const s = (subcategory || '').trim().toLowerCase();
  return s === 'notbuklar' || s === 'oyun notbukları';
}
function isSmartphoneSubcategory(subcategory) {
  const s = (subcategory || '').trim().toLowerCase();
  return s === 'smartfonlar' || s === 'apple smartfonları';
}

// ── GET /api/compare ──────────────────────────────────────────
// Bütün müqayisə siyahısını qaytarır (bütün kateqoriyalar daxil,
// frontend kateqoriyaya görə qruplaşdırır)
router.get('/', auth, async (req, res) => {
  try {
    const compares = await prisma.compare.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
      include: { product: { select: PRODUCT_SELECT } },
    });
    res.json(compares);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xətası' });
  }
});

// ── POST /api/compare ─────────────────────────────────────────
// Body: { productId: number }
router.post('/', auth, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId tələb olunur' });

  try {
    const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
    if (!product) return res.status(404).json({ error: 'Məhsul tapılmadı' });
    if (!product.subcategory?.trim()) {
      return res.status(400).json({
        error: 'Bu məhsulun alt kateqoriyası seçilməyib. Əvvəlcə admin paneldə alt kateqoriya təyin edin.',
      });
    }

    // Hava emalı məhsulları (nəmləndirici/təmizləyici/təravətləndirici/iqlim kompleksi)
    // birgə qrup kimi 4 limitinə tabedir; digər alt-kateqoriyalar əvvəlki kimi öz-özünə say olunur.
    let sameGroupCount;
    if (isAirTreatmentSubcategory(product.subcategory)) {
      sameGroupCount = await prisma.compare.count({
        where: {
          userId: req.userId,
          product: {
            OR: [
              { subcategory: { in: ['Hava nəmləndirici', 'Hava təmizləyici', 'Hava təravətləndirici'], mode: 'insensitive' } },
              { subcategory: { startsWith: 'İqlim kompleksi', mode: 'insensitive' } },
            ],
          },
        },
      });
    } else if (isLaptopSubcategory(product.subcategory)) {
      sameGroupCount = await prisma.compare.count({
        where: {
          userId: req.userId,
          product: {
            subcategory: { in: ['Notbuklar', 'Oyun notbukları'], mode: 'insensitive' },
          },
        },
      });
    } else if (isSmartphoneSubcategory(product.subcategory)) {
      sameGroupCount = await prisma.compare.count({
        where: {
          userId: req.userId,
          product: {
            subcategory: { in: ['Smartfonlar', 'Apple smartfonları'], mode: 'insensitive' },
          },
        },
      });
    } else {
      sameGroupCount = await prisma.compare.count({
        where: { userId: req.userId, product: { subcategory: product.subcategory } },
      });
    }
    if (sameGroupCount >= 4) {
      return res.status(400).json({ error: 'Bu alt kateqoriyada maksimum 4 məhsulu müqayisə edə bilərsiniz' });
    }

    const compare = await prisma.compare.upsert({
      where: { userId_productId: { userId: req.userId, productId: Number(productId) } },
      update: {},
      create: { userId: req.userId, productId: Number(productId) },
      include: { product: { select: PRODUCT_SELECT } },
    });

    res.status(201).json(compare);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xətası' });
  }
});

// ── DELETE /api/compare/:productId ──────────────────────────────
router.delete('/:productId', auth, async (req, res) => {
  const productId = Number(req.params.productId);
  try {
    await prisma.compare.deleteMany({ where: { userId: req.userId, productId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xətası' });
  }
});

// ── DELETE /api/compare ─────────────────────────────────────────
// Bütün müqayisəni təmizlə (opsional: ?subcategory=iPhone)
router.delete('/', auth, async (req, res) => {
  const { subcategory } = req.query;
  try {
    if (subcategory) {
      await prisma.compare.deleteMany({
        where: { userId: req.userId, product: { subcategory } },
      });
    } else {
      await prisma.compare.deleteMany({ where: { userId: req.userId } });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xətası' });
  }
});

// ── GET /api/compare/check/:productId ───────────────────────────
router.get('/check/:productId', auth, async (req, res) => {
  const productId = Number(req.params.productId);
  try {
    const item = await prisma.compare.findUnique({
      where: { userId_productId: { userId: req.userId, productId } },
    });
    res.json({ isCompared: !!item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xətası' });
  }
});

// ── GET /api/compare/count ───────────────────────────────────────
// Nav badge üçün ümumi say
router.get('/count', auth, async (req, res) => {
  try {
    const count = await prisma.compare.count({ where: { userId: req.userId } });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xətası' });
  }
});

module.exports = router;

// ── server.js / app.js-də qeydiyyat ──────────────────────────────
// const compareRoutes = require('./routes/compare');
// app.use('/api/compare', compareRoutes);
