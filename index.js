try {
  require('./backend/server.js');
} catch (error) {
  const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get('/health', (_req, res) => {
    res.status(500).json({ error: error.message });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.error('Backend startup failed:', error.message);
  });
}
require('./backend/server.js');
