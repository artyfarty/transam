// Dev launcher (no extra deps): build the Electron main/preload once with tsc,
// start the Vite dev server, wait for its port, then launch Electron pointed at
// the dev server URL. Ctrl-C or quitting Electron tears everything down.
import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const bin = (name) => path.join(root, 'node_modules', '.bin', name);
const PORT = 5173;
const children = [];

function run(cmd, args, opts = {}) {
  const c = spawn(cmd, args, { stdio: 'inherit', cwd: root, ...opts });
  children.push(c);
  return c;
}

function waitForPort(port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const sock = net.connect(port, '127.0.0.1');
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => {
        sock.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error('vite did not start'));
        else setTimeout(tick, 200);
      });
    };
    tick();
  });
}

function cleanup() {
  for (const c of children) { try { c.kill(); } catch { /* ignore */ } }
}
process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('exit', cleanup);

// 1) compile electron main + preload
await new Promise((resolve, reject) => {
  const tsc = run(bin('tsc'), ['-p', 'tsconfig.electron.json']);
  tsc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('tsc failed'))));
});

// 2) start vite
run(bin('vite'), []);
await waitForPort(PORT);

// 3) launch electron
const electron = run(bin('electron'), ['.'], {
  env: { ...process.env, VITE_DEV_SERVER_URL: `http://localhost:${PORT}` },
});
electron.on('exit', () => { cleanup(); process.exit(0); });
