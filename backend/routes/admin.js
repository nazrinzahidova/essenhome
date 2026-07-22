const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Multer konfiqurasiyası
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

function parseSpecs(value) {
  if (!value) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, item]) => [String(key).trim(), String(item ?? '').trim()])
        .filter(([key, item]) => key && item)
    );
  } catch {
    return null;
  }
}

function parsePlacements(value, category, subcategory) {
  let parsed = [];
  try {
    parsed = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {}
  if (!Array.isArray(parsed)) parsed = [];

  const normalized = parsed
    .map(item => ({
      category: String(item?.category || '').trim(),
      subcategory: String(item?.subcategory || '').trim() || null
    }))
    .filter(item => item.category);

  const primary = {
    category: String(category || '').trim(),
    subcategory: String(subcategory || '').trim() || null
  };
  if (primary.category) normalized.unshift(primary);

  return [...new Map(
    normalized.map(item => [`${item.category}\u0000${item.subcategory || ''}`, item])
  ).values()];
}

// Admin yoxlama middleware
const adminCheck = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin deyilsiniz' });
  }
  next();
};

// Məhsul əlavə et
router.post('/products', authMiddleware, adminCheck, upload.single('image'), async (req, res) => {
  try {
    const { name, nameRu, description, descRu, price, oldPrice, discount, installment, colors, category, subcategory, brand, stock, specs, existingImage, placements } = req.body;
    const placementRows = parsePlacements(placements, category, subcategory);

    const product = await prisma.product.create({
      data: {
        name,
        nameRu,
        description,
        descRu,
        price: parseFloat(price),
        oldPrice: oldPrice ? parseFloat(oldPrice) : null,
        discount: discount || null,
        installment: installment || null,
        colors: colors || null,
        category,
        subcategory: subcategory?.trim() || null,
        brand: brand?.trim() || null,
        specs: parseSpecs(specs),
        stock: parseInt(stock),
        image: req.file ? `/uploads/${req.file.filename}` : (existingImage || null),
        placements: { create: placementRows }
      },
      include: { placements: true }
    });

    res.json(product);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Məhsul sil
router.delete('/products/:id', authMiddleware, adminCheck, async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Məhsul silindi' });
  } catch (err) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Məhsul yenilə
router.put('/products/:id', authMiddleware, adminCheck, upload.single('image'), async (req, res) => {
  try {
    const { name, nameRu, description, descRu, price, oldPrice, discount, installment, colors, category, subcategory, brand, stock, specs, placements } = req.body;
    const placementRows = parsePlacements(placements, category, subcategory);

    const productId = parseInt(req.params.id);
    const existingPlacements = await prisma.productPlacement.findMany({
      where: { productId }
    });
    const placementKey = item => `${item.category}\u0000${item.subcategory || ''}`;
    const desiredKeys = new Set(placementRows.map(placementKey));
    const existingKeys = new Set(existingPlacements.map(placementKey));
    const deleteIds = existingPlacements
      .filter(item => !desiredKeys.has(placementKey(item)))
      .map(item => item.id);
    const createRows = placementRows.filter(item => !existingKeys.has(placementKey(item)));

    const product = await prisma.$transaction(async tx => {
      await tx.product.update({
        where: { id: productId },
        data: {
          name,
          nameRu,
          description,
          descRu,
          price: parseFloat(price),
          oldPrice: oldPrice ? parseFloat(oldPrice) : null,
          discount: discount || null,
          installment: installment || null,
          colors: colors || null,
          category,
          subcategory: subcategory?.trim() || null,
          brand: brand?.trim() || null,
          specs: parseSpecs(specs),
          stock: parseInt(stock),
          image: req.file ? `/uploads/${req.file.filename}` : undefined
        }
      });
      if (deleteIds.length) {
        await tx.productPlacement.deleteMany({ where: { id: { in: deleteIds } } });
      }
      if (createRows.length) {
        await tx.productPlacement.createMany({
          data: createRows.map(item => ({ ...item, productId }))
        });
      }
      return tx.product.findUnique({
        where: { id: productId },
        include: { placements: true }
      });
    });

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Bütün sifarişlər
router.get('/orders', authMiddleware, adminCheck, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { product: true } }
      }
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Sifariş statusunu yenilə
router.put('/orders/:id', authMiddleware, adminCheck, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: { status }
    });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

module.exports = router;
