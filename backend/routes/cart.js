const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/client-v3');
const authMiddleware = require('../middleware/auth');

const prisma = new PrismaClient();

// Səbəti gətir
router.get('/', authMiddleware, async (req, res) => {
  try {
    const cart = await prisma.cart.findMany({
      where: { userId: req.user.id },
      include: { product: true }
    });
    res.json(cart);
  } catch (err) {
    console.error('Cart GET xətası:', err);
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Səbətə əlavə et
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'productId tələb olunur' });
    }

    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) }
    });
    if (!product) {
      return res.status(404).json({ message: 'Məhsul tapılmadı' });
    }

    const existing = await prisma.cart.findFirst({
      where: { userId: req.user.id, productId: parseInt(productId) }
    });

    if (existing) {
      const updated = await prisma.cart.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (parseInt(quantity) || 1) },
        include: { product: true }
      });
      return res.json(updated);
    }

    const item = await prisma.cart.create({
      data: {
        userId: req.user.id,
        productId: parseInt(productId),
        quantity: parseInt(quantity) || 1
      },
      include: { product: true }
    });

    res.status(201).json(item);
  } catch (err) {
    console.error('Cart POST xətası:', err);
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Sayı yenilə
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const cartItemId = parseInt(req.params.id);
    const { quantity } = req.body;

    const item = await prisma.cart.findFirst({
      where: { id: cartItemId, userId: req.user.id }
    });
    if (!item) {
      return res.status(404).json({ message: 'Cart item tapılmadı' });
    }

    const qty = parseInt(quantity);

    if (qty < 1) {
      await prisma.cart.delete({ where: { id: cartItemId } });
      return res.json({ message: 'Silindi' });
    }

    const updated = await prisma.cart.update({
      where: { id: cartItemId },
      data: { quantity: qty },
      include: { product: true }
    });

    res.json(updated);
  } catch (err) {
    console.error('Cart PUT xətası:', err);
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Səbətdən sil
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const cartItemId = parseInt(req.params.id);

    const item = await prisma.cart.findFirst({
      where: { id: cartItemId, userId: req.user.id }
    });
    if (!item) {
      return res.status(404).json({ message: 'Cart item tapılmadı' });
    }

    await prisma.cart.delete({ where: { id: cartItemId } });
    res.json({ message: 'Silindi' });
  } catch (err) {
    console.error('Cart DELETE xətası:', err);
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Səbəti tamamilə təmizlə
router.delete('/', authMiddleware, async (req, res) => {
  try {
    await prisma.cart.deleteMany({ where: { userId: req.user.id } });
    res.json({ message: 'Səbət təmizləndi' });
  } catch (err) {
    console.error('Cart clear xətası:', err);
    res.status(500).json({ message: 'Server xətası' });
  }
});

module.exports = router;
