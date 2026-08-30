const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const { IMAGE_SELECT, imageUrl, serializeProduct } = require('../lib/productImages');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 10, fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif|avif)$/i.test(file.mimetype))
});

const productInclude = {
  placements: true,
  images: { select: IMAGE_SELECT, orderBy: [{ position: 'asc' }, { id: 'asc' }] }
};

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function imageRows(files, keys, startPosition = 0) {
  return files.map((file, index) => ({
    key: String(keys[index] || `new:${index}`),
    filename: String(file.originalname || `image-${index + 1}`).slice(0, 240),
    mimeType: file.mimetype,
    data: file.buffer,
    position: startPosition + index,
    isPrimary: false
  }));
}

async function finalizePrimaryImage(tx, productId, requestedKey, keyToId) {
  const images = await tx.productImage.findMany({
    where: { productId },
    orderBy: [{ position: 'asc' }, { id: 'asc' }]
  });
  if (!images.length) {
    await tx.product.update({ where: { id: productId }, data: { image: null } });
    return;
  }
  const requestedId = keyToId.get(String(requestedKey || ''));
  const primaryId = images.some(item => item.id === requestedId) ? requestedId : images[0].id;
  await tx.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
  await tx.productImage.update({ where: { id: primaryId }, data: { isPrimary: true } });
  await tx.product.update({ where: { id: productId }, data: { image: imageUrl(primaryId) } });
}

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
router.post('/products', authMiddleware, adminCheck, upload.array('images', 10), async (req, res) => {
  try {
    const { name, nameRu, description, descRu, price, oldPrice, discount, installment, colors, category, subcategory, brand, stock, specs, placements, primaryImageKey } = req.body;
    const placementRows = parsePlacements(placements, category, subcategory);
    const files = req.files || [];
    const newRows = imageRows(files, parseJsonArray(req.body.newImageKeys));
    if (newRows.length > 10) return res.status(400).json({ message: 'Maksimum 10 şəkil əlavə etmək olar' });

    const product = await prisma.$transaction(async tx => {
      const created = await tx.product.create({
        data: {
          name, nameRu, description, descRu,
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
          image: null,
          placements: { create: placementRows }
        }
      });
      const keyToId = new Map();
      for (const row of newRows) {
        const { key, ...data } = row;
        const image = await tx.productImage.create({ data: { ...data, productId: created.id } });
        keyToId.set(key, image.id);
      }
      await finalizePrimaryImage(tx, created.id, primaryImageKey, keyToId);
      return tx.product.findUnique({ where: { id: created.id }, include: productInclude });
    });
    res.json(serializeProduct(product));
  } catch (err) {
    console.error('Product create failed:', err);
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
router.put('/products/:id', authMiddleware, adminCheck, upload.array('images', 10), async (req, res) => {
  try {
    const { name, nameRu, description, descRu, price, oldPrice, discount, installment, colors, category, subcategory, brand, stock, specs, placements, primaryImageKey } = req.body;
    const placementRows = parsePlacements(placements, category, subcategory);

    const productId = parseInt(req.params.id);
    const currentImages = await prisma.productImage.findMany({ where: { productId }, orderBy: { position: 'asc' } });
    const requestedExistingIds = req.body.existingImageIds === undefined
      ? currentImages.map(item => item.id)
      : parseJsonArray(req.body.existingImageIds).map(Number).filter(Number.isInteger);
    const keepIds = requestedExistingIds.filter(id => currentImages.some(item => item.id === id));
    const files = req.files || [];
    if (keepIds.length + files.length > 10) {
      return res.status(400).json({ message: 'Maksimum 10 şəkil saxlamaq olar' });
    }
    const newRows = imageRows(files, parseJsonArray(req.body.newImageKeys), keepIds.length);
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
          stock: parseInt(stock)
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
      await tx.productImage.deleteMany({
        where: { productId, ...(keepIds.length ? { id: { notIn: keepIds } } : {}) }
      });
      const keyToId = new Map(keepIds.map(id => [`existing:${id}`, id]));
      for (let position = 0; position < keepIds.length; position += 1) {
        await tx.productImage.update({ where: { id: keepIds[position] }, data: { position } });
      }
      for (const row of newRows) {
        const { key, ...data } = row;
        const image = await tx.productImage.create({ data: { ...data, productId } });
        keyToId.set(key, image.id);
      }
      await finalizePrimaryImage(tx, productId, primaryImageKey, keyToId);
      return tx.product.findUnique({
        where: { id: productId },
        include: productInclude
      });
    });

    res.json(serializeProduct(product));
  } catch (err) {
    console.error('Product update failed:', err);
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
