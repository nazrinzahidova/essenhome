const express = require('express');
const fs = require('fs');
const path = require('path');
const { IMAGE_SELECT, serializeProduct, productPath } = require('../lib/productImages');
const { organization, offerPolicies } = require('../lib/merchantPolicies');

const ORIGIN = 'https://essenhome.az';
const PAGE_SIZE = 45000;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const productUrl = item => ORIGIN + productPath(item);
const xml = (root, body) => `<?xml version="1.0" encoding="UTF-8"?><${root} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</${root}>`;

function renderProduct(template, product) {
  const item = serializeProduct(product);
  const url = productUrl(item);
  const title = item.seoTitle?.trim() || `${item.name} — qiyməti və kreditlə satış | Essen Home`;
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
      seller: organization(), ...offerPolicies(item.price) }
  };
  const crumbs = [{ name: 'Ana səhifə', item: ORIGIN + '/' }];
  const params = new URLSearchParams();
  if (item.category) {
    params.set('category', item.category);
    crumbs.push({ name: item.category, item: ORIGIN + '/catalog.html?' + params.toString() });
  }
  if (item.subcategory && item.subcategory !== item.category) {
    params.set('subcategory', item.subcategory);
    crumbs.push({ name: item.subcategory, item: ORIGIN + '/catalog.html?' + params.toString() });
  }
  crumbs.push({ name: item.name, item: url });
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, ...crumb })) };
  const breadcrumbHtml = crumbs.map((crumb, i) => i === crumbs.length - 1 ? '<span aria-current="page">' + escape(crumb.name) + '</span>' : '<a href="' + escape(crumb.item) + '">' + escape(crumb.name) + '</a>').join('<span aria-hidden="true">›</span>');
  const metadata = `<meta name="description" content="${escape(item.seoDescription?.trim() ? description : description.slice(0, 170))}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="product-id" content="${item.id}">
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(item.seoDescription?.trim() ? description : description.slice(0, 170))}">
${image ? `<meta name="twitter:image" content="${escape(image)}">` : ''}
<link rel="canonical" href="${escape(url)}">
<meta property="og:type" content="product"><meta property="og:site_name" content="Essen Home">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(item.seoDescription?.trim() ? description : description.slice(0, 170))}">
<meta property="og:url" content="${escape(url)}">${image ? `<meta property="og:image" content="${escape(image)}">` : ''}
<script type="application/ld+json">${JSON.stringify([data, breadcrumb]).replace(/</g, '\\u003c')}</script>`;
  const content = `<article class="card" style="padding:24px"><h1>${escape(item.name)}</h1>
${image ? `<img src="${escape(image)}" alt="${escape(item.name)}" style="max-width:100%;max-height:320px;object-fit:contain">` : ''}
<p>${escape(item.price)} AZN</p><p>${Number(item.stock) > 0 ? 'Stokda var' : 'Stokda yoxdur'}</p>
${item.brand ? `<p>Brend: ${escape(item.brand)}</p>` : ''}
${Object.entries(specs).filter(([key, value]) => key.trim().toLowerCase() !== 'sku' && value !== null && value !== undefined && value !== '').length ? '<h2>Xüsusiyyətlər</h2><dl>' + Object.entries(specs).filter(([key, value]) => key.trim().toLowerCase() !== 'sku' && value !== null && value !== undefined && value !== '').map(([key,value]) => '<dt>' + escape(key) + '</dt><dd>' + escape(Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? Object.values(value).join(', ') : value) + '</dd>').join('') + '</dl>' : ''}
${item.description ? `<h2>Əlavə qeydlər</h2><p style="white-space:pre-line">${escape(item.description)}</p>` : ''}
<a href="/catalog.html">Digər məhsullar</a></article>`;
  return template.replace('<head>', '<head><base href="/">').replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escape(title)}</title>`)
    .replace(/(<nav[^>]*id="crumbs"[^>]*>)[\s\S]*?<\/nav>/, () => '<nav class="crumbs" id="crumbs" aria-label="Səhifə yolu">' + breadcrumbHtml + '</nav>')
    .replace('</head>', () => `${metadata}</head>`)
    .replace(/(<section id="view">)[\s\S]*?(<\/section>)/, () => `<section id="view">${content}</section>`);
}

function createSeoRouter(prisma) {
  const router = express.Router();
  router.get('/api/delivery-options', (_req, res) => res.set('Cache-Control', 'no-store').json({
    minDate: require('../../frontend/order-policy').earliestDate(), serverNow: new Date().toISOString()
  }));
  router.get('/delivery-returns.html', (_req, res) => {
    const policyTemplate = fs.readFileSync(path.join(__dirname, '../../frontend/delivery-returns.html'), 'utf8');
    const schema = JSON.stringify({ '@context': 'https://schema.org', ...organization() }).replace(/</g, '\\u003c');
    res.type('html').send(policyTemplate.replace('</head>', `<script type="application/ld+json">${schema}</script></head>`));
  });
  const readProductTemplate = () => fs.readFileSync(path.join(__dirname, '../../frontend/product.html'), 'utf8');
  async function catalogProducts() {
    const [products, sections] = await Promise.all([
      prisma.product.findMany({ include: { placements: true, images: { select: IMAGE_SELECT, orderBy: [{ position: 'asc' }, { id: 'asc' }] } }, orderBy: [{ sortPosition: 'asc' }, { id: 'asc' }] }),
      prisma.homeSection.findMany({ where: { active: true }, include: { products: { select: { productId: true } } } })
    ]);
    const featured = new Set(sections.flatMap(section => section.products.map(link => link.productId)));
    return products.filter(item => featured.has(item.id) || ![item.subcategory, ...(item.placements || []).map(place => place.subcategory)].some(value => /smartfon|notbuk|noutbuk/i.test(value || '')));
  }
  const belongsTo = (item, category, subcategory) => [{ category: item.category, subcategory: item.subcategory }, ...(item.placements || [])].some(place => (!category || place.category === category) && (!subcategory || place.subcategory === subcategory));
  const unavailable = res => res.status(503).set('Retry-After', '60').type('text').send('Müvəqqəti xəta. Bir az sonra yenidən yoxlayın.');
  router.get('/catalog.html', async (req, res) => {
    try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const subcategory = typeof req.query.subcategory === 'string' ? req.query.subcategory.trim() : '';
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (subcategory) params.set('subcategory', subcategory);
    const url = `${ORIGIN}/catalog.html${params.size ? '?' + params.toString() : ''}`;
    const label = subcategory || category || 'Məişət texnikası və elektronika';
    const title = `${subcategory || category || 'Məhsul kataloqu'} — qiymətlər və kreditlə satış | Essen Home`;
    const description = `${label}: modelləri, qiymətləri və xüsusiyyətləri müqayisə edin. Essen Home-da nağd və kreditlə əldə edin.`;
    const items = (await catalogProducts()).filter(item => belongsTo(item, category, subcategory)).map(serializeProduct);
    const filtered = Object.keys(req.query).some(key => !['category', 'subcategory', 'gclid', 'fbclid'].includes(key) && !key.startsWith('utm_'));
    const tags = `<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<meta name="robots" content="${filtered || !items.length ? 'noindex,follow' : 'index,follow,max-image-preview:large'}">
<link rel="canonical" href="${escape(url)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Essen Home">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(url)}"><meta property="og:image" content="${ORIGIN}/img/logo.png">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${ORIGIN}/img/logo.png">`;
    const links = items.map(item => `<article class="bg-white rounded-xl shadow-sm border border-gray-200 p-4"><a href="${escape(productUrl(item))}">${item.image ? `<img src="${escape(new URL(item.image, ORIGIN).href)}" alt="${escape(item.name)}" loading="lazy" width="240" height="240" style="max-width:100%;height:180px;object-fit:contain">` : ''}<h2>${escape(item.name)}</h2></a><p>${escape(item.price)} ₼</p></article>`).join('');
    const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: label, url, description, mainEntity: { '@type': 'ItemList', numberOfItems: items.length, itemListElement: items.map((item,index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, url: productUrl(item) })) } };
    let html = fs.readFileSync(path.join(__dirname, '../../frontend/catalog.html'), 'utf8').replace(/<title>[\s\S]*?<\/title>/, () => tags);
    html = html.replace(/(<h1[^>]*id="catalogTitle"[^>]*>)[\s\S]*?<\/h1>/, (_,open) => open + escape(subcategory || category || 'Bütün məhsullar') + '</h1>');
    html = html.replace(/(<div id="productGrid" class=")hidden ([^"]*">)[\s\S]*?<\/div>/, (_,open,rest) => open + rest + links + '</div>');
    html = html.replace('</head>', () => '<script type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script></head>');
    res.set('Cache-Control', 'no-store').type('html').send(html);
    } catch (error) { console.error('Catalog SEO failed:', error.message); unavailable(res); }
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
  router.get('/sitemap-pages.xml', async (_req, res) => {
    try {
      const urls = new Set(['/', '/catalog.html', '/delivery-returns.html', '/haqqimizda']);
      for (const item of await catalogProducts()) {
        for (const place of [{ category: item.category, subcategory: item.subcategory }, ...(item.placements || [])]) {
          if (!place.category) continue;
          const params = new URLSearchParams({ category: place.category });
          urls.add('/catalog.html?' + params.toString());
          if (place.subcategory) { params.set('subcategory', place.subcategory); urls.add('/catalog.html?' + params.toString()); }
        }
      }
      res.set('Cache-Control', 'no-store').type('application/xml').send(xml('urlset', [...urls].map(page => `<url><loc>${escape(ORIGIN + page)}</loc></url>`).join('')));
    } catch (error) { console.error('Category sitemap failed:', error.message); unavailable(res); }
  });
  router.get(/^\/sitemap-products-([1-9]\d*)\.xml$/, async (req, res) => {
    try {
      const page = Number(req.params[0]);
      const count = await prisma.product.count();
      if (!Number.isSafeInteger(page) || page > Math.max(1, Math.ceil(count / PAGE_SIZE))) return res.sendStatus(404);
      const products = await prisma.product.findMany({ select: { id: true, name: true, category: true, subcategory: true, updatedAt: true }, orderBy: { id: 'asc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });
      res.type('application/xml').send(xml('urlset', products.map(item => `<url><loc>${escape(productUrl(item))}</loc><lastmod>${new Date(item.updatedAt).toISOString()}</lastmod></url>`).join('')));
    } catch (error) { console.error('Product sitemap failed:', error.message); unavailable(res); }
  });
  const productPage = async (req, res) => {
    const value = req.path === '/product.html' ? req.query.id : req.params[0];
    const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : 0;
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) return res.status(404).set('X-Robots-Tag', 'noindex').type('html').send('Məhsul tapılmadı. <a href="/catalog.html">Kataloqa qayıt</a>');
    try {
      const item = await prisma.product.findUnique({ where: { id }, include: { images: { select: IMAGE_SELECT, orderBy: [{ position: 'asc' }, { id: 'asc' }] } } });
      if (!item) return res.status(404).set('X-Robots-Tag', 'noindex').type('html').send('Məhsul tapılmadı. <a href="/catalog.html">Kataloqa qayıt</a>');
      const canonicalPath = productPath(item);
      if (req.path !== canonicalPath) {
        const query = new URLSearchParams(req.originalUrl.split('?')[1] || '');
        query.delete('id');
        return res.redirect(301, canonicalPath + (query.size ? '?' + query.toString() : ''));
      }
      res.set('Cache-Control', 'no-store').type('html').send(renderProduct(readProductTemplate(), item));
    } catch (error) { console.error('Product page failed:', error.message); unavailable(res); }
  };
  router.get('/product.html', productPage);
  router.get(/^\/[a-z0-9-]+\/[a-z0-9-]+-([1-9]\d*)\/?$/, productPage);
  router.use((req, res, next) => {
    if (/^\/(cart|orders|profile|favourites|compare|admin|login|register)(\.html|\/|$)/i.test(req.path)) res.set('X-Robots-Tag', 'noindex, follow');
    next();
  });
  return router;
}

module.exports = { createSeoRouter, renderProduct };
