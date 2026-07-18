const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname);
const ENV_PATH = path.join(ROOT, '.env');

function parseEnv() {
  const env = {};
  if (!fs.existsSync(ENV_PATH)) return env;
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    env[key.trim()] = rest.join('=').trim();
  });
  return env;
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml; charset=utf-8'
  };
  return types[ext] || 'application/octet-stream';
}

const env = parseEnv();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/env.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    const key = env.GEMMA_API_KEY || '';
    res.end(`window.ENV = { GEMMA_API_KEY: ${JSON.stringify(key)} };`);
    return;
  }

  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(ROOT, pathname);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
  console.log('Make sure .env contains GEMMA_API_KEY=your_key');
});
