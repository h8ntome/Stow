/**
 * server.js
 * Express application setup.
 * Mounts all API routes and serves the pre-built React client.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import open from 'open';

import rulesRouter from './routes/rules.js';
import filesRouter from './routes/files.js';
import organizeRouter from './routes/organize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '../../public');

/**
 * Creates and configures the Express app.
 * @returns {import('express').Application}
 */
function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API routes
  app.use('/api/rules', rulesRouter);
  app.use('/api', filesRouter);
  app.use('/api', organizeRouter);

  // Serve built React client
  app.use(express.static(PUBLIC_DIR));

  // Catch-all: return index.html for any non-API route (supports client-side routing)
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  return app;
}

/**
 * Starts the Express server and opens the browser.
 */
export async function start() {
  const port = parseInt(process.env.STOW_PORT || '3000', 10);
  const app = createApp();
  const server = createServer(app);

  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\n  [stow] Port ${port} is already in use.\n` +
        `  Set STOW_PORT=<number> to use a different port.\n`
      );
    } else {
      console.error(`\n  [stow] Server error: ${err.message}\n`);
    }
    process.exit(1);
  });

  server.listen(port, '127.0.0.1', async () => {
    const url = `http://localhost:${port}`;
    console.log(`\n  stow is running at ${url}\n`);
    try {
      await open(url);
    } catch {
      console.log(`  Could not open browser automatically. Visit ${url} manually.\n`);
    }
  });
}
