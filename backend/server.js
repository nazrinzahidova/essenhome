require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });

const express = require('express');
const cors = require('cors');
const path = require('path');
const favouritesRouter = require('./routes/favourites');


const app = express();

app.use(cors());
app.use(express.json());

// Frontend fayllarını servis et
app.use(express.static(path.join(__dirname, '../frontend')));

// Upload olunan şəkillər
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API route-ları
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/favourites', require('./routes/favourites'))
app.use('/api/compare', require('./routes/compare'));


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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server http://localhost:${PORT} ünvanında işləyir`);
});
