// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

// ---- CORS ----
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://digi-tech-a1-app-frontend.vercel.app',
      'https://digi-tech-a1-app.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  })
);
app.options('*', cors());

// Avoid favicon noise if request hits backend
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use(express.json());

// Health check (service-level)
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Mount API routes
app.use('/api', routes);

// Global hardening
process.on('unhandledRejection', (e) => {
  console.error('UNHANDLED_REJECTION:', e);
});
process.on('uncaughtException', (e) => {
  console.error('UNCAUGHT_EXCEPTION:', e);
});

// ✅ Export the app for Vercel serverless
module.exports = app;

// ✅ Local dev only: `node backend/server.js`
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Local server on http://localhost:${PORT}/api`);
  });
}
