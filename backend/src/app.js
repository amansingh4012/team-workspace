const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ── Middleware ──
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin(origin, cb) {
      // Allow requests with no origin (mobile apps, curl, same-origin)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(null, true); // In production single-service mode, same origin
    },
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static files (uploads) ──
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── API Routes ──
app.use('/api', routes);

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve frontend in production ──
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  // SPA fallback — serve index.html for any non-API route
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ── Error handler ──
app.use(errorHandler);

module.exports = app;
