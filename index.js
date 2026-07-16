require('dotenv').config();
const app = require('./src/app');
const connectDatabase = require('./src/config/database');

const PORT = process.env.PORT || 3000;

// For local development
if (process.env.NODE_ENV !== 'production') {
  connectDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}

// Export for Vercel serverless
module.exports = app;
