import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { addErrorHandler, createMedlinkServer } from './server/app.ts';

// Local/standalone entry point. On Netlify the same app runs from netlify/server/index.ts.
const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const { app, server } = createMedlinkServer();

  // Mount Vite in dev, or serve static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  addErrorHandler(app);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`MedLink Telehealth server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
