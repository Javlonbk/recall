import { defineConfig } from 'astro/config';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import cloudflare from '@astrojs/cloudflare';

// Dev-only "Save to file" endpoint, implemented as a Vite dev-server middleware
// so it exists ONLY while running `astro dev` — the production build ships none
// of it. The in-page editor POSTs storage-shape JSON here to write
// src/content/tech/<id>.json directly. No backend in production.
function contentSaveApi() {
  const dir = join(process.cwd(), 'src/content/tech');
  return {
    name: 'recall-content-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__recall/save', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('POST only'); }
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const { id, data } = JSON.parse(body);
            if (!/^[a-z0-9-]+$/.test(id || '')) throw new Error('bad id');
            writeFileSync(join(dir, `${id}.json`), JSON.stringify(data, null, 2) + '\n');
            res.statusCode = 200;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  site: 'https://recalldev.pages.dev',

  // Emit page.html files so the design's links (qa.html, book.html…) resolve.
  build: { format: 'file' },

  // Astro's built-in dev overlay is noise for this project; hide it.
  devToolbar: { enabled: false },

  vite: { plugins: [contentSaveApi()] },
  adapter: cloudflare()
});