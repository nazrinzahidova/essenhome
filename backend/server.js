require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const favouritesRouter = require('./routes/favourites');


const app = express();

app.use(cors());
app.use(express.json());

// Frontend fayllarını servis et
app.use(express.static(path.join(__dirname, '../frontend')));

// Keep static assets available when the hosting bundle places a copy at the
// project root instead of inside frontend.
app.use('/img',
  express.static(path.join(__dirname, '../frontend/img')),
  express.static(path.join(__dirname, '../img'))
);
app.use('/src',
  express.static(path.join(__dirname, '../frontend/src')),
  express.static(path.join(__dirname, '../src'))
);

// Upload olunan şəkillər
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API route-ları
app.post('/api/auth/test', (req, res) => {
  res.json({ success: true, message: 'Backend işləyir' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/product-images', require('./routes/productImages'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/favourites', require('./routes/favourites'))
app.use('/api/compare', require('./routes/compare'));
app.use('/api/chats', require('./routes/chats'));


// Ana səhifə
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Digər HTML səhifələri (cart.html, haqqimizda.html və s.)
app.get('/:page', (req, res, next) => {
  const filePath = path.join(__dirname, '../frontend', req.params.page);

  if (path.extname(filePath) === '.html') {
    return res.sendFile(filePath);
  }

  next();
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server http://localhost:${PORT} ünvanında işləyir`);
});

