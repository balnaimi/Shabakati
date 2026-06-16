import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import authRouter from './routes/auth.js';
import extensionsRouter from './routes/extensions.js';
import hostsRouter from './routes/hosts.js';
import tagsRouter from './routes/tags.js';
import networksRouter from './routes/networks.js';
import favoritesRouter from './routes/favorites.js';
import groupsRouter from './routes/groups.js';
import dataRouter from './routes/data.js';
import { errorHandler, notFoundHandler, jsonError } from './errorHandler.js';
import { Err } from './apiMessages.js';
import logger from './logger.js';
import pkg from './package.json' with { type: 'json' };

export const APP_VERSION = pkg.version;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Built SPA output: Docker (/app/dist), legacy repo root dist/, or web/dist/. */
export function resolveFrontendDistPath() {
  const candidates = [
    join(__dirname, 'dist'),
    join(__dirname, '..', 'dist'),
    join(__dirname, '..', 'web', 'dist'),
  ];
  for (const distPath of candidates) {
    if (existsSync(join(distPath, 'index.html'))) {
      return distPath;
    }
  }
  return candidates[0];
}

export default function createApp() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  if (process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://localhost:3000', `http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`];

  app.use((req, res, next) => {
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (isDevelopment) return callback(null, true);
        if (allowedOrigins.includes('*')) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);

        const host = req.headers.host;
        if (host) {
          const xfProto = req.headers['x-forwarded-proto'];
          const forwarded = typeof xfProto === 'string' ? xfProto.split(',')[0].trim() : null;
          const protos = forwarded ? [forwarded] : [req.secure ? 'https' : 'http', 'https', 'http'];
          for (const proto of protos) {
            if (origin === `${proto}://${host}`) return callback(null, true);
          }
        }

        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true
    })(req, res, next);
  });

  app.use(compression());
  app.use(express.json({ limit: '10mb' }));

  app.get('/', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      const distPath = resolveFrontendDistPath();
      return res.sendFile(join(distPath, 'index.html'));
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;

    res.status(200).json({
      message: `This is the API server. Please access the frontend at http://localhost:5173`,
      api: `${baseUrl}/api`,
      frontend: 'http://localhost:5173'
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api', extensionsRouter);
  app.use('/api/hosts', hostsRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api/networks', networksRouter);
  app.use('/api/favorites', favoritesRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api', dataRouter);

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, version: APP_VERSION, timestamp: new Date().toISOString() });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = resolveFrontendDistPath();
    app.use(express.static(distPath));

    app.get('*', (req, res, next) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(join(distPath, 'index.html'));
      } else {
        next();
      }
    });
  }

  app.get('/.well-known/*', (req, res) => {
    res.status(404).json(jsonError(Err.notFound));
  });

  app.get('/favicon.ico', (req, res) => {
    const possiblePaths = [
      join(__dirname, '..', 'web', 'public', 'favicon.svg'),
      join(__dirname, '..', 'web', 'dist', 'favicon.svg'),
      join(__dirname, '..', 'public', 'favicon.svg'),
      join(__dirname, '..', 'dist', 'favicon.svg'),
      join(__dirname, 'dist', 'favicon.svg'),
      join(__dirname, '..', 'web', 'public', 'favicon.ico'),
      join(__dirname, '..', 'web', 'dist', 'favicon.ico'),
      join(__dirname, '..', 'public', 'favicon.ico'),
      join(__dirname, '..', 'dist', 'favicon.ico'),
      join(__dirname, 'dist', 'favicon.ico'),
    ];

    for (const faviconPath of possiblePaths) {
      if (existsSync(faviconPath)) {
        return res.sendFile(faviconPath);
      }
    }

    res.status(204).end();
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
