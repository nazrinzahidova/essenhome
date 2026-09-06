const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token yoxdur' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!Number.isInteger(decoded.id) || decoded.type || !decoded.role) {
      return res.status(401).json({ error: 'Token etibarsızdır' });
    }
    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (_error) {
    return res.status(401).json({ error: 'Token etibarsızdır' });
  }
};
