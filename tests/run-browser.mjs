// Serves app/ on a local port and runs every browser test against it.
// Usage: node tests/run-browser.mjs [--update-screenshots] [test-name ...]   (CHROMIUM_PATH optional)
// Screenshots go to a temporary folder unless --update-screenshots is given (then docs/screenshots/).
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(root, 'app');
const types = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(appDir, urlPath.endsWith('/') ? urlPath + 'index.html' : urlPath);
  if (!file.startsWith(appDir)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;

const dir = path.join(root, 'tests', 'browser');
const args = process.argv.slice(2);
const updateScreenshots = args.includes('--update-screenshots');
const only = args.filter((a) => !a.startsWith('--'));
const screenshotDir = updateScreenshots
  ? path.join(root, 'docs', 'screenshots')
  : mkdtempSync(path.join(tmpdir(), 'wp-screens-'));
const tests = (await readdir(dir))
  .filter((f) => f.endsWith('.cjs') && (!only.length || only.some((o) => f.includes(o))))
  .sort();
let failed = 0;
for (const test of tests) {
  const started = Date.now();
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(dir, test)], {
      cwd: root,
      env: { ...process.env, TEST_URL: url, SCREENSHOT_DIR: screenshotDir },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    child.on('close', (c) => {
      if (c) console.log(output.trim().split('\n').slice(-15).join('\n'));
      resolve(c);
    });
  });
  console.log(`${code ? 'FAIL' : 'PASS'} ${test} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  if (code) failed++;
}
server.close();
console.log(`\n${tests.length - failed}/${tests.length} browser tests passed`);
process.exit(failed ? 1 : 0);
