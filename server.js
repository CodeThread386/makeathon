import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import subscribe from './api/subscribe.js';

const ROOT = import.meta.dirname;
const PORT = process.env.PORT || 8000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp4': 'video/mp4', '.pdf': 'application/pdf'
};
// never serve the server-side code or secrets as static files
const PRIVATE = /^\/(\.env|\.git|node_modules|api|scripts|server\.js|package(-lock)?\.json)(\/|$)/;

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/api/subscribe') return subscribe(req, res);

  const file = normalize(path === '/' ? '/P-Breadboard.dc.html' : path);
  if (file.includes('..') || PRIVATE.test(file)) { res.statusCode = 404; return res.end('Not found'); }
  try {
    const data = await readFile(join(ROOT, file));
    res.setHeader('Content-Type', TYPES[extname(file).toLowerCase()] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
