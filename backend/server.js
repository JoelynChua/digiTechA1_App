require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

// CORS (keep your allowed origins)
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://digi-tech-a1-app-frontend.vercel.app',
      'https://digi-tech-a1-app.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  })
);

// fast preflight
app.options('*', cors());

// avoid favicon crashes if request reaches backend
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use(express.json());

// mount your API
app.use('/api', routes);

// health check
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

/**
 * ✅ Export app for Vercel serverless
 * (Vercel's @vercel/node will wrap this Express app)
 */
module.exports = app;

/**
 * ✅ Local dev only
 * Run: `node backend/server.js`
 */
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Local server on http://localhost:${PORT}/api`);
  });
}
