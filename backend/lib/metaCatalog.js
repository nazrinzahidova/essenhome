const { serializeProduct, productPath } = require('./productImages');
const ORIGIN = 'https://essenhome.az';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[c]));

function renderMetaCatalog(products) {
  const items = products.map(serializeProduct).flatMap(item => {
    let image;
    try { image = new URL(item.image || '', ORIGIN); } catch (_) { return []; }
    if (!item.image || !['http:', 'https:'].includes(image.protocol) || !item.name?.trim() || !Number.isFinite(Number(item.price)) || Number(item.price) <= 0) return [];
    const fields = {
      id: String(item.id), title: item.name.slice(0, 200),
      description: (item.seoDescription?.trim() || `${item.name} — nağd və kreditlə əldə edin`).slice(0, 5000),
      availability: Number(item.stock) > 0 ? 'in stock' : 'out of stock',
      condition: 'new', price: `${Number(item.price).toFixed(2)} AZN`,
      link: ORIGIN + productPath(item), image_link: image.href,
      ...(item.brand?.trim() ? { brand: item.brand.trim() } : {}),
      product_type: [item.category, item.subcategory].filter(Boolean).join(' > ')
    };
    return '<item>' + Object.entries(fields).map(([key,value]) => `<g:${key}>${escape(value)}</g:${key}>`).join('') + '</item>';
  });
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Essen Home</title><link>${ORIGIN}</link><description>Essen Home məhsul kataloqu</description>${items.join('')}</channel></rss>`;
}

module.exports = { renderMetaCatalog };
