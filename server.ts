import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { app as apiApp } from './backend/src/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // Resolve port:
  // - In AI Studio preview/dev environment, DEFAULT_APP_PORT (3000) or 3000 must be used because NGINX_PORT=8080 is reserved by the container's proxy.
  // - In standalone Cloud Run production, process.env.PORT is provided by the platform (e.g. 8080).
  let PORT = 3000;
  if (process.env.DEFAULT_APP_PORT) {
    PORT = parseInt(process.env.DEFAULT_APP_PORT, 10);
  } else if (process.env.NGINX_PORT && process.env.PORT === process.env.NGINX_PORT) {
    PORT = 3000;
  } else if (process.env.PORT) {
    PORT = parseInt(process.env.PORT, 10);
  }

  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath);

  // In production (standalone Cloud Run, NODE_ENV=production, or when dist build exists and not in dev)
  const isDev = process.env.NODE_ENV === 'development';
  const isProduction =
    !isDev &&
    (process.env.NODE_ENV === 'production' ||
      hasDist ||
      (Boolean(process.env.K_SERVICE) && !process.env.DEFAULT_APP_PORT));

  // Mount API router and middleware first
  app.use(apiApp);

  if (isProduction && hasDist) {
    // Production mode: serve built assets from dist
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Development mode: dynamically mount Vite dev server middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `EduPulse Analytics server running on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`
    );
  });

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
    process.exit(1);
  });

  // Graceful shutdown on Cloud Run container termination signals
  const shutdown = () => {
    console.log('Shutdown signal received: closing HTTP server...');
    server.close(() => {
      console.log('HTTP server closed gracefully.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
