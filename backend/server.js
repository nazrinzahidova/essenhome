require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const authRouter = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/img',
  express.static(path.join(__dirname, '../frontend/img')),
  express.static(path.join(__dirname, '../img'))
);
app.use('/src',
  express.static(path.join(__dirname, '../frontend/src')),
  express.static(path.join(__dirname, '../src'))
);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/api/auth/test', (req, res) => {
  res.json({ success: true, message: 'Backend işləyir' });
});

app.use('/api/auth', authRouter);
app.use('/login-code', authRouter);
app.use('/api/product-images', require('./routes/productImages'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/favourites', require('./routes/favourites'));
app.use('/api/compare', require('./routes/compare'));
app.use('/api/chats', require('./routes/chats'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/:page', (req, res, next) => {
  const filePath = path.join(__dirname, '../frontend', req.params.page);
  if (path.extname(filePath) === '.html') return res.sendFile(filePath);
  next();
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server http://localhost:${PORT} ünvanında işləyir`);
});
