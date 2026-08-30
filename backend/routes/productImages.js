const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

router.get('/:id', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(404).end();

  try {
    const image = await prisma.productImage.findUnique({ where: { id } });
    if (!image) return res.status(404).end();

    res.set({
      'Content-Type': image.mimeType,
      'Content-Length': image.data.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    });
    res.send(image.data);
  } catch (error) {
    console.error('Product image read failed:', error);
    res.status(500).end();
  }
});

module.exports = router;
