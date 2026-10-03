'use strict';

// Section identity is stable when its display name or ordering changes.
const HALF_PRICE_SECTION_ID = 2;
function halfPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) throw new Error('Invalid product price');
  return Math.floor(Math.round(price * 100) / 2) / 100;
}
async function priceProducts(db, products, userId) {
  if (!products.length) return [];
  const eligible = Number.isSafeInteger(userId) && userId > 0 && (await db.$queryRaw`SELECT EXISTS (SELECT 1 FROM "CampaignEntry" e JOIN "Campaign" c ON c."id"=e."campaignId" WHERE e."userId"=${userId} AND e."status"='active' AND c."active"=true) AS eligible`)[0]?.eligible === true;
  const links = eligible ? await db.homeSectionProduct.findMany({
    where: { sectionId: HALF_PRICE_SECTION_ID, section: { active: true }, productId: { in: products.map(p => p.id) } },
    select: { productId: true }
  }) : [];
  const discounted = new Set(links.map(p => p.productId));
  return products.map(p => ({ ...p, basePrice: Number(p.price),
    price: discounted.has(p.id) ? halfPrice(p.price) : Number(p.price),
    cartDiscountPercent: discounted.has(p.id) ? 50 : 0 }));
}
async function priceCart(db, rows, userId) {
  const products = await priceProducts(db, rows.map(row => row.product), userId);
  return rows.map((row, index) => ({ ...row, product: products[index] }));
}
module.exports = { halfPrice, priceProducts, priceCart };
