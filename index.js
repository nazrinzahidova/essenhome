require('dotenv').config({ path: require('path').join(__dirname, 'backend', '.env'), quiet: true });


const express = require('express');
const cors = require('cors');
const path = require('path');


const app = express();
const PORT = process.env.PORT || 3000;
let startupError = null;


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Serve static assets from both deployment layouts.
app.use('/img', express.static(path.join(__dirname, 'frontend', 'img')), express.static(path.join(__dirname, 'img')));
app.use('/src', express.static(path.join(__dirname, 'frontend', 'src')), express.static(path.join(__dirname, 'src')));
app.use('/uploads', express.static(path.join(__dirname, 'backend', 'uploads')));


try {
  app.use('/api/auth', require('./backend/routes/auth'));
  app.use('/api/products', require('./backend/routes/products'));
  app.use('/api/orders', require('./backend/routes/orders'));
  app.use('/api/admin', require('./backend/routes/admin'));
  app.use('/api/cart', require('./backend/routes/cart'));
  app.use('/api/favourites', require('./backend/routes/favourites'));
  app.use('/api/compare', require('./backend/routes/compare'));
} catch (error) {
  startupError = error.message;
}


app.post('/api/auth/test', (_req, res) => {
  res.json({ success: true, message: 'Backend işləyir' });
});


app.get('/health', (_req, res) => {
  res.status(startupError ? 500 : 200).json({
    status: startupError ? 'error' : 'ok',
    error: startupError
  });
