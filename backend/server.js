require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const authRouter = require('./routes/auth');

const app = express();
let server;

app.use(cors());
app.use(express.json());

app.use(require('./routes/seo').createSeoRouter(require('./lib/prisma')));

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
app.use('/api/home-sections', require('./routes/homeSections').createHomeSectionsRouter(require('./lib/prisma')));
app.use('/api/products', require('./routes/products'));
app.use('/api/credit-orders', require('./routes/creditOrders').createCreditOrdersRouter(require('./lib/prisma')));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/favourites', require('./routes/favourites'));
app.use('/api/compare', require('./routes/compare'));
app.use('/api/chats', require('./routes/chats'));

app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/readyz', async (_req, res) => {
  try {
    await Promise.race([
      require('./lib/prisma').$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('database timeout')), 5000))
    ]);
    res.json({ status: 'ready' });
  } catch (error) {
    console.error('Readiness check failed:', error.message);
    res.status(503).json({ status: 'not_ready' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/:page', (req, res, next) => {
  const filePath = path.join(__dirname, '../frontend', req.params.page);
  if (path.extname(filePath) === '.html') return res.sendFile(filePath);
  next();
});

const PORT = process.env.PORT || 3000;

require('../scripts/migrate-home-sections').migrateHomeSections().then(() => require('../scripts/migrate-product-seo').migrateProductSeo()).then(() => require('../scripts/migrate-credit-applications').migrateCreditApplications()).then(() => require('../scripts/migrate-otp-timing').migrateOtpTiming()).then(() => {
server = app.listen(PORT, () => {
  console.log(`🚀 Server http://localhost:${PORT} ünvanında işləyir`);
});

}).catch(error => {
  console.error('Home sections migration failed:', error.code || error.message);
  process.exitCode = 1;
});

async function shutdown(signal) {
  console.log(`${signal}: shutting down`);
  server.close(async () => {
    await require('./lib/prisma').$disconnect().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
