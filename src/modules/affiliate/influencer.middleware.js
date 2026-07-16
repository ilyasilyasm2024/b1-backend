const jwt = require('jsonwebtoken');

// Authenticates an influencer via JWT. Requires role === 'influencer'.
module.exports = function authenticateInfluencer(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'influencer') {
      return res.status(403).json({ error: 'Not an influencer account' });
    }
    req.influencer = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
