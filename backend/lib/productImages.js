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
    images,
    image: primary?.url || product.image || null
  };
}

module.exports = { IMAGE_SELECT, imageUrl, serializeProduct };
