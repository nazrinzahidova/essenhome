const IMAGE_SELECT = {
  id: true,
  filename: true,
  mimeType: true,
  position: true,
  isPrimary: true
};

function imageUrl(id) {
  return `/api/product-images/${id}`;
}

function slug(value) {
  const letters = { ə:'e', ı:'i', ö:'o', ü:'u', ş:'s', ç:'c', ğ:'g' };
  return String(value || '').toLocaleLowerCase('az').replace(/[əıöüçşğ]/g, c => letters[c])
    .normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 130).replace(/-$/, '');
}

function productPath(product) {
  return '/' + (slug(product.subcategory || product.category) || 'mehsullar') + '/' + (slug(product.name) || 'mehsul') + '-' + product.id;
}

function serializeProduct(product) {
  if (!product) return product;
  const images = Array.isArray(product.images)
    ? [...product.images]
      .sort((a, b) => a.position - b.position || a.id - b.id)
      .map(item => ({ ...item, url: imageUrl(item.id) }))
    : [];
  const primary = images.find(item => item.isPrimary) || images[0];
  return {
    ...product,
    url: productPath(product),
    images,
    image: primary?.url || product.image || null
  };
}

module.exports = { IMAGE_SELECT, imageUrl, serializeProduct, productPath };
