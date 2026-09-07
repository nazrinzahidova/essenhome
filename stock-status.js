function isAppleOutOfStock(product) {
 return product && Number(product.stock) <= 0 && ([product.category, ...(product.placements || []).map(p => p.category)].some(c => String(c || '').trim().toLowerCase() === 'apple'));
}
function appleStockBadge(product) {
 return isAppleOutOfStock(product) ? '<span style="display:inline-block;background:#fef08a;color:#854d0e;border:1px solid #facc15;border-radius:6px;padding:4px 8px;font-size:12px;font-weight:600;margin:6px 0;">Stokda yoxdur</span>' : '';
}
