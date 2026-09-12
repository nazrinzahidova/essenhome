const express = require('express');
const fs = require('fs');
const path = require('path');
const { IMAGE_SELECT, serializeProduct } = require('../lib/productImages');

const ORIGIN = 'https://essenhome.az';
const PAGE_SIZE = 45000;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const productUrl = id => `${ORIGIN}/product.html?id=${id}`;
const xml = (root, body) => `<?xml version="1.0" encoding="UTF-8"?><${root} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</${root}>`;

function renderProduct(template, product) {
  const item = serializeProduct(product);
  const url = productUrl(item.id);
  const title = item.seoTitle?.trim() || `${item.name} | Essen Home`;
  const specs = item.specs && typeof item.specs === 'object' ? item.specs : {};
  const modelKey = Object.keys(specs).find(key => ['model', 'modeli', 'model adı', 'model adi'].includes(key.trim().toLocaleLowerCase('az')));
  const model = item.model || (modelKey ? specs[modelKey] : '');
  const description = item.seoDescription?.trim() || `${item.name} — Essen Home. Qiymət: ${item.price} AZN. ${item.description || 'Məhsulun xüsusiyyətləri və mövcudluğu.'}`.replace(/\s+/g, ' ').trim();
  let image;
  try {
    const parsed = new URL(item.image, ORIGIN);
    if (item.image && ['http:', 'https:'].includes(parsed.protocol)) image = parsed.href;
  } catch (_) { /* A product without a valid image is still indexable. */ }
  const data = {
    '@context': 'https://schema.org', '@type': 'Product', name: item.name,
    description: item.description || description, sku: String(item.id), url,
    ...(model ? { model: String(model) } : {}),
    ...(image ? { image: [image] } : {}),
    ...(item.brand ? { brand: { '@type': 'Brand', name: item.brand } } : {}),
    offers: { '@type': 'Offer', url, priceCurrency: 'AZN', price: item.price,
      availability: `https://schema.org/${Number(item.stock) > 0 ? 'InStock' : 'OutOfStock'}`,
      seller: { '@type': 'Organization', name: 'Essen Home', url: ORIGIN } }
  };
  const metadata = `<meta name="description" content="${escape(item.seoDescription?.trim() ? description : description.slice(0, 170))}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(item.seoDescription?.trim() ? description : description.slice(0, 170))}">
${image ? `<meta name="twitter:image" content="${escape(image)}">` : ''}
<link rel="canonical" href="${escape(url)}">
<meta property="og:type" content="product"><meta property="og:site_name" content="Essen Home">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(item.seoDescription?.trim() ? description : description.slice(0, 170))}">
<meta property="og:url" content="${escape(url)}">${image ? `<meta property="og:image" content="${escape(image)}">` : ''}
<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  const content = `<article class="card" style="padding:24px"><h1>${escape(item.name)}</h1>
${image ? `<img src="${escape(image)}" alt="${escape(item.name)}" style="max-width:100%;max-height:320px;object-fit:contain">` : ''}
<p>${escape(item.price)} AZN</p><p>${Number(item.stock) > 0 ? 'Stokda var' : 'Stokda yoxdur'}</p>
${item.brand ? `<p>Brend: ${escape(item.brand)}</p>` : ''}
${item.description ? `<h2>Əsas göstəricilər</h2><p style="white-space:pre-line">${escape(item.description)}</p>` : ''}
<a href="/catalog.html">Digər məhsullar</a></article>`;
  return template.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escape(title)}</title>`)
    .replace('</head>', () => `${metadata}</head>`)
    .replace(/(<section id="view">)[\s\S]*?(<\/section>)/, () => `<section id="view">${content}</section>`);
}

function createSeoRouter(prisma) {
  const router = express.Router();
  const template = fs.readFileSync(path.join(__dirname, '../../frontend/product.html'), 'utf8');
  const unavailable = res => res.status(503).set('Retry-After', '60').type('text').send('Müvəqqəti xəta. Bir az sonra yenidən yoxlayın.');
  router.get('/catalog.html', (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const subcategory = typeof req.query.subcategory === 'string' ? req.query.subcategory.trim() : '';
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (subcategory) params.set('subcategory', subcategory);
    const url = `${ORIGIN}/catalog.html${params.size ? '?' + params.toString() : ''}`;
    const title = `${subcategory || category || 'Məhsul kataloqu'} | Essen Home`;
    const description = `${subcategory || category || 'Məişət texnikası və elektronika'}. Essen Home məhsullarının qiymətlərini və xüsusiyyətlərini müqayisə edin.`;
    const filtered = Object.keys(req.query).some(key => !['category', 'subcategory', 'gclid', 'fbclid'].includes(key) && !key.startsWith('utm_'));
    const tags = `<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<meta name="robots" content="${filtered ? 'noindex,follow' : 'index,follow,max-image-preview:large'}">
<link rel="canonical" href="${escape(url)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Essen Home">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(url)}"><meta property="og:image" content="${ORIGIN}/img/logo.png">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${ORIGIN}/img/logo.png">`;
    res.type('html').send(fs.readFileSync(path.join(__dirname, '../../frontend/catalog.html'), 'utf8').replace(/<title>[\s\S]*?<\/title>/, () => tags));
  });
  router.get('/robots.txt', (_req, res) => res.type('text').send(`User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`));
  router.get('/sitemap.xml', async (_req, res) => {
    try {
      const count = await prisma.product.count();
      const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
      const entries = Array.from({ length: pages }, (_, i) => `<sitemap><loc>${ORIGIN}/sitemap-products-${i + 1}.xml</loc></sitemap>`).join('');
      res.type('application/xml').send(xml('sitemapindex', `<sitemap><loc>${ORIGIN}/sitemap-pages.xml</loc></sitemap>${entries}`));
    } catch (error) { console.error('Sitemap failed:', error.message); unavailable(res); }
  });
  router.get('/sitemap-pages.xml', (_req, res) => res.type('application/xml').send(xml('urlset',
    ['/', '/catalog.html'].map(page => `<url><loc>${ORIGIN}${page}</loc></url>`).join(''))));
  router.get(/^\/sitemap-products-([1-9]\d*)\.xml$/, async (req, res) => {
    try {
      const page = Number(req.params[0]);
      const count = await prisma.product.count();
      if (!Number.isSafeInteger(page) || page > Math.max(1, Math.ceil(count / PAGE_SIZE))) return res.sendStatus(404);
      const products = await prisma.product.findMany({ select: { id: true, updatedAt: true }, orderBy: { id: 'asc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });
      res.type('application/xml').send(xml('urlset', products.map(item => `<url><loc>${escape(productUrl(item.id))}</loc><lastmod>${new Date(item.updatedAt).toISOString()}</lastmod></url>`).join('')));
    } catch (error) { console.error('Product sitemap failed:', error.message); unavailable(res); }
  });
  router.get('/product.html', async (req, res) => {
    const id = typeof req.query.id === 'string' && /^\d+$/.test(req.query.id) ? Number(req.query.id) : 0;
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) return res.status(404).set('X-Robots-Tag', 'noindex').type('html').send('Məhsul tapılmadı. <a href="/catalog.html">Kataloqa qayıt</a>');
    try {
      const item = await prisma.product.findUnique({ where: { id }, include: { images: { select: IMAGE_SELECT, orderBy: [{ position: 'asc' }, { id: 'asc' }] } } });
      if (!item) return res.status(404).set('X-Robots-Tag', 'noindex').type('html').send('Məhsul tapılmadı. <a href="/catalog.html">Kataloqa qayıt</a>');
      res.set('Cache-Control', 'no-store').type('html').send(renderProduct(template, item));
    } catch (error) { console.error('Product page failed:', error.message); unavailable(res); }
  });
  router.use((req, res, next) => {
    if (/^\/(cart|favourites|compare|admin|login|register)(\.html|\/|$)/i.test(req.path)) res.set('X-Robots-Tag', 'noindex, follow');
    next();
  });
  return router;
}

module.exports = { createSeoRouter, renderProduct };
