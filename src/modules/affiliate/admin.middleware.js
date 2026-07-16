// Simple admin guard using a shared secret in the x-admin-secret header.
// Set ADMIN_SECRET in your .env. Used for creating influencers and payouts.
module.exports = function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (!process.env.ADMIN_SECRET) {
    return res.status(500).json({ error: 'ADMIN_SECRET is not configured on the server' });
  }
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Admin access denied' });
  }
  next();
};
