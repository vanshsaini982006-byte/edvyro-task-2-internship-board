'use strict';

const path = require('path');

// Load optional settings from a .env file (built into Node 22 - no extra package).
// Values already set in the environment win over the file.
try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch (err) {
  // No .env file is fine: the defaults below are used.
}

const express = require('express');
const { closeDatabase } = require('./db');
const internshipRoutes = require('./routes/internships');
const applicationRoutes = require('./routes/applications');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { sendSuccess } = require('./utils/response');

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Minimal request log: method, path (no query string, no body) and status code.
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const requestPath = req.originalUrl.split('?')[0]; // captured now, before routers change req.url
    res.on('finish', () => console.log(`${req.method} ${requestPath} ${res.statusCode}`));
    next();
  });
}

app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => {
  sendSuccess(res, { message: 'Internship API is running' });
});
app.use('/api/internships', internshipRoutes);
app.use('/api/applications', applicationRoutes);

// The small front end in /public (search, filters, details dialog, apply form).
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(notFoundHandler);
app.use(errorHandler);

// Only start listening when this file is run directly (npm start), not when tests import it.
if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, () => {
    console.log(`Internship Board running at http://localhost:${port}`);
    console.log(`API base URL: http://localhost:${port}/api`);
  });

  const shutdown = () => {
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
    server.closeAllConnections();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
