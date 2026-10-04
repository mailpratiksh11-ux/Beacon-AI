import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

const app = express();

app.use(helmet());
const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(
  cors({
    origin(origin, cb) {
      // allow non-browser clients (curl/postman) with no origin
      if (!origin) return cb(null, true);
      // explicit allowlist, or any localhost port in development (ng serve picks a random port if 4200 is taken)
      if (env.corsOrigin.includes(origin)) return cb(null, true);
      if (!env.isProd && LOCALHOST_RE.test(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (!env.isProd) app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime(), env: env.nodeEnv });
});

// API routes
app.use('/api', apiRouter);

// 404 + error handling (must be last)
app.use(notFound);
app.use(errorHandler);

export default app;
