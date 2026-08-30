const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { IMAGE_SELECT, serializeProduct } = require('../lib/productImages');

const productInclude = {
  placements: true,
  images: { select: IMAGE_SELECT, orderBy: [{ position: 'asc' }, { id: 'asc' }] }
};

function sortByPlacementDate(products, category, subcategory) {
  const matchingDate = product => {
    const placement = product.placements.find(item =>
      (!category || item.category === category) &&
      (!subcategory || item.subcategory === subcategory)
    );
    return placement ? new Date(placement.createdAt).getTime() : 0;
  };
  return products.sort((a, b) =>
    matchingDate(b) - matchingDate(a) ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/* ============================================================
   MÜQAYİSƏ ÜÇÜN KÖMƏKÇİ — hər məhsulun "specs" obyektini
   mövcud sahələrdən qurur (ayrıca DB sahəsi tələb olunmur).
   Əgər gələcəkdə Product modelinə xüsusi spesifikasiya sahəsi
   (məs. JSON `specs`) əlavə etsən, elə bunun içində istifadə et.
   ============================================================ */
function buildSpecs(p) {
  const specs = (p.specs && typeof p.specs === 'object' && !Array.isArray(p.specs))
    ? { ...p.specs }
    : {};
  if (p.brand) specs['Brend'] = p.brand;
  if (p.subcategory) specs['Alt-kateqoriya'] = p.subcategory;
  specs['Stok'] = p.stock > 0 ? `${p.stock} ədəd` : 'Bitib';
  if (p.discount) specs['Endirim'] = p.discount;
  if (p.installment) specs['Taksit'] = p.installment;
  if (p.colors) specs['Rənglər'] = p.colors;
  return specs;
}

/* ============== MÜQAYİSƏ ÜÇÜN AXTARIŞ ==============
   GET /api/products/search?q=iphone&category=Apple&subcategory=iPhone%2017%20Pro
   category/subcategory ötürülməsə, bütün məhsullar arasında axtarır. */
router.get('/search', async (req, res) => {
  try {
    const { q = '', category, subcategory, brand } = req.query;

    const where = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
      ],
    };
    if (category) where.placements = { some: { category } };
    if (subcategory) {
      where.placements = {
        some: {
          ...(category ? { category } : {}),
          subcategory
        }
      };
    }
    if (brand) where.brand = { equals: brand, mode: 'insensitive' };

    const products = await prisma.product.findMany({
      where,
      take: 15,
      include: productInclude,
    });

    res.json(products.map(raw => {
      const p = serializeProduct(raw);
      return ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image,
      images: p.images,
      category: p.category,
      subcategory: p.subcategory,
      brand: p.brand,
      });
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xətası' });
  }
});

/* ============== MÜQAYİSƏ ==============
   GET /api/products/compare?ids=3,7,12 */
router.get('/compare', async (req, res) => {
  try {
    const ids = (req.query.ids || '')
      .split(',')
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id));

    if (ids.length === 0) return res.json([]);

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      include: productInclude,
    });

    // sıralamanı seçim sırasına uyğun saxla (findMany sırasız qaytara bilər)
    const byId = new Map(products.map(p => [p.id, p]));
    const ordered = ids.map(id => byId.get(id)).filter(Boolean);

    res.json(ordered.map(raw => {
      const p = serializeProduct(raw);
      return ({
      id: p.id,
      name: p.name,
      image: p.image,
      images: p.images,
      price: p.price,
      oldPrice: p.oldPrice || null,
      category: p.category,
      subcategory: p.subcategory,
      brand: p.brand,
      specs: buildSpecs(p),
      });
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xətası' });
  }
});

/* ============== Bütün məhsullar ============== */
router.get('/', async (req, res) => {
  try {
    const { category, subcategory, brand, search } = req.query;
    const filters = [];

    if (category || subcategory) {
      filters.push({
        placements: {
          some: {
            ...(category ? { category } : {}),
            ...(subcategory ? { subcategory } : {})
          }
        }
      });
    }
    if (brand) filters.push({ brand });
    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { nameRu: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { subcategory: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    const products = await prisma.product.findMany({
      where: filters.length ? { AND: filters } : undefined,
      orderBy: { createdAt: 'desc' },
      include: productInclude
    });
    const ordered =
      category || subcategory
        ? sortByPlacementDate(products, category, subcategory)
        : products;
    res.json(ordered.map(serializeProduct));
  } catch (err) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

/* ============== Kateqoriyaya görə ============== */
router.get('/category/:category', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { placements: { some: { category: req.params.category } } },
      include: productInclude
    });
    res.json(sortByPlacementDate(products, req.params.category).map(serializeProduct));
  } catch (err) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

/* ============== Tək məhsul (HƏMİŞƏ ən sonda olmalıdır,
   çünki /:id istənilən sətri, o cümlədən "search"/"compare"
   sözlərini də id kimi tutmağa çalışar) ============== */
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: productInclude
    });
    if (!product) {
      return res.status(404).json({ message: 'Məhsul tapılmadı' });
    }
    res.json(serializeProduct(product));
  } catch (err) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

module.exports = router;
