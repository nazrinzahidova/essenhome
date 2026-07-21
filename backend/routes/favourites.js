// backend/routes/favourites.js
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('../generated/client-v3');
const prisma = new PrismaClient();
const auth   = require('../middleware/auth'); // mövcud middleware

// ── GET /api/favourites ──────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const favourites = await prisma.favourite.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            category: true,
            stock: true,
            discount: true,
            oldPrice: true,
          },
        },
      },
    });
    res.json(favourites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xətası' });
  }
});

// ── POST /api/favourites ─────────────────────────────────────
// Body: { productId: number }
router.post('/', auth, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId tələb olunur' });

  try {
    const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
    if (!product) return res.status(404).json({ error: 'Məhsul tapılmadı' });

    const favourite = await prisma.favourite.upsert({
      where: {
        userId_productId: { userId: req.userId, productId: Number(productId) },
      },
      update: {},
      create: { userId: req.userId, productId: Number(productId) },
      include: {
        product: { select: { id: true, name: true, price: true, image: true } },
      },
    });

    res.status(201).json(favourite);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xətası' });
  }
});

// ── DELETE /api/favourites/:productId ───────────────────────
router.delete('/:productId', auth, async (req, res) => {
  const productId = Number(req.params.productId);
  try {
    await prisma.favourite.deleteMany({
      where: { userId: req.userId, productId },
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xətası' });
  }
});

// ── GET /api/favourites/check/:productId ────────────────────
router.get('/check/:productId', auth, async (req, res) => {
  const productId = Number(req.params.productId);
  try {
    const fav = await prisma.favourite.findUnique({
      where: { userId_productId: { userId: req.userId, productId } },
    });
    res.json({ isFavourite: !!fav });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xətası' });
  }
});

module.exports = router;
