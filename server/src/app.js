import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { securityHeaders, sanitizeInputs } from './middlewares/security.middleware.js';
import { ApiError } from './utils/apiError.js';
import { ENV } from './config/env.js';

const app = express();

// Security: HTTP security headers
app.use(securityHeaders);

// Performance: gzip / deflate compression
app.use(compression());

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl)
      if (!origin) return callback(null, true);

      const allowedOrigins = (ENV.CLIENT_URL || '')
        .split(',')
        .map((url) => url.trim().replace(/\/$/, ''))
        .filter(Boolean);

      const normalizedOrigin = origin.replace(/\/$/, '');

      if (ENV.NODE_ENV === 'production') {
        // In production, check against configured client URLs
        if (allowedOrigins.length === 0 || allowedOrigins.includes(normalizedOrigin)) {
          callback(null, true);
        } else {
          callback(new Error(`Not allowed by CORS: ${origin}`));
        }
      } else {
        // In development, allow localhost and any configured client URLs
        if (origin.startsWith('http://localhost') || allowedOrigins.includes(normalizedOrigin)) {
          callback(null, true);
        } else {
          callback(null, true); // Dev-friendly fallback
        }
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization against NoSQL injection
app.use(sanitizeInputs);

if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api', apiRouter);

// 404 handler for undefined routes
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// Global Error Handler
app.use(errorHandler);

export default app;
