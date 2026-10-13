'use strict';

function halfPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) throw new Error('Invalid product price');
  return Math.floor(Math.round(price * 100) / 2) / 100;
}
async function priceProducts(db, products, userId) {
  // Catalog prices already include the advertised discount. Home-section
  // membership and QR campaign participation must not discount them again.
  return products.map(p => ({ ...p, basePrice: Number(p.price),
    price: Number(p.price), cartDiscountPercent: 0 }));
}
async function priceCart(db, rows, userId) {
  const products = await priceProducts(db, rows.map(row => row.product), userId);
  return rows.map((row, index) => ({ ...row, product: products[index] }));
}
module.exports = { halfPrice, priceProducts, priceCart };
