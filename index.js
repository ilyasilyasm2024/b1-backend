require('dotenv').config();
const app = require('./src/app');
const connectDatabase = require('./src/config/database');

const PORT = process.env.PORT || 3000;

// Connect to DB before handling requests (works for both serverless & traditional)
app.use(async (req, res, next) => {
  await connectDatabase();
  next();
});

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
