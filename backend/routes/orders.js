const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');


// Sifariş yarat
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items } = req.body;

    let total = 0;
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });
      total += product.price * item.quantity;
    }

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        total,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      include: { items: true }
    });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

// İstifadəçinin sifarişləri
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: { include: { product: true } } }
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

module.exports = router;
