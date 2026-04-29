/**
 * Windows-compatible smoke runner.
 * Uses the locally installed PostgreSQL instead of embedded-postgres.
 *
 * Prerequisites:
 *   - PostgreSQL 17 running on localhost:5432 (default Windows install)
 *   - pg bin dir on PATH (e.g. C:\Program Files\PostgreSQL\17\bin)
 *   - Set PGUSER / PGPASSWORD env vars if your superuser is not "postgres"
 *     with no password (or has a password you haven't stored in .pgpass)
 *
 * Usage:
 *   npm run smoke:local:win
 *
 * Optional env overrides:
 *   PGUSER          postgres superuser name   (default: postgres)
 *   PGPASSWORD      password for that user    (default: empty)
 *   PGHOST          postgres host             (default: 127.0.0.1)
 *   PGPORT          postgres port             (default: 5432)
 *   SMOKE_BACKEND_PORT   (default: 4001)
 *   SMOKE_FRONTEND_PORT  (default: 4174)
 *   SMOKE_TIMEOUT_MS     (default: 20000)
 */

import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const backendPort  = Number.parseInt(process.env.SMOKE_BACKEND_PORT  ?? '4001',  10);
const frontendPort = Number.parseInt(process.env.SMOKE_FRONTEND_PORT ?? '4174',  10);
const timeoutMs    = Number.parseInt(process.env.SMOKE_TIMEOUT_MS    ?? '20000', 10);

const pgHost     = process.env.PGHOST     ?? '127.0.0.1';
const pgPort     = process.env.PGPORT     ?? '5432';
const pgUser     = process.env.PGUSER     ?? 'postgres';
const pgPassword = process.env.PGPASSWORD ?? '';

const dbName = `collabboards_smoke_${process.pid}`;
const databaseUrl = `postgresql://${pgUser}:${encodeURIComponent(pgPassword)}@${pgHost}:${pgPort}/${dbName}`;

const npmCmd = 'npm.cmd';
const pgBin  = process.env.PG_BIN ?? 'C:\\Program Files\\PostgreSQL\\17\\bin';

const pgEnv = () => ({
  ...process.env,
  PGHOST:     pgHost,
  PGPORT:     pgPort,
  PGUSER:     pgUser,
  PGPASSWORD: pgPassword,
});

const children = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── helpers ────────────────────────────────────────────────────────────────

const runCommand = (command, args, env, label, { shell = false } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env,
      stdio: 'inherit',
      shell,
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${label} exited with code ${code ?? 'unknown'}`));
    });
  });

const waitForPort = async (port, label) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const open = await new Promise((resolve) => {
      const s = new net.Socket();
      s.once('connect', () => { s.destroy(); resolve(true); })
       .once('error',   () => { s.destroy(); resolve(false); })
       .connect(port, '127.0.0.1');
    });
    if (open) return;
    await sleep(250);
  }
  throw new Error(`${label} did not open port ${port} within ${timeoutMs}ms`);
};

const startProcess = async (label, command, args, env, port, { shell = false } = {}) => {
  const child = spawn(command, args, {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
    shell,
  });
  children.push(child);

  const exitPromise = new Promise((_, reject) =>
    child.once('exit', (code) =>
      reject(new Error(`${label} exited before ready with code ${code ?? 'unknown'}`)),
    ),
  );

  await Promise.race([waitForPort(port, label), exitPromise]);
  return child;
};

const stopAll = async () => {
  while (children.length > 0) {
    const child = children.pop();
    if (!child?.pid) continue;
    try { process.kill(child.pid, 'SIGTERM'); } catch { /* already gone */ }
    // Also kill the whole process tree via taskkill in case npm spawned children
    await new Promise((resolve) => {
      const t = spawn('taskkill', ['/pid', `${child.pid}`, '/t', '/f'], { shell: true, stdio: 'ignore' });
      t.once('exit', resolve);
      t.once('error', resolve);
    });
  }
  await sleep(1000);
};

// pg tools have spaces in the path on Windows — spawn without shell and pass
// the full path directly so the OS resolves it without cmd.exe quoting issues.
const pgTool = (tool) => path.join(pgBin, `${tool}.exe`);

const createDb = () =>
  runCommand(pgTool('createdb'), [dbName], pgEnv(), `createdb ${dbName}`);

const dropDb = () =>
  runCommand(pgTool('dropdb'), ['--if-exists', '--force', dbName], pgEnv(), `dropdb ${dbName}`);

// ── main ───────────────────────────────────────────────────────────────────

console.log(`[smoke-win] database   ${databaseUrl.replace(/:([^@:]+)@/, ':***@')}`);
console.log(`[smoke-win] backend    http://127.0.0.1:${backendPort}`);
console.log(`[smoke-win] frontend   http://127.0.0.1:${frontendPort}`);

if (!pgPassword) {
  console.error(
    '\n[smoke-win] ERROR: PGPASSWORD is not set.\n' +
    '  Set it before running:\n' +
    '    $env:PGPASSWORD="your-postgres-password"  (PowerShell)\n' +
    '    set PGPASSWORD=your-postgres-password       (cmd)\n' +
    '    export PGPASSWORD=your-postgres-password    (bash/Git Bash)\n',
  );
  process.exit(1);
}

try {
  await createDb();
  console.log(`[smoke-win] created database ${dbName}`);

  const baseEnv = {
    ...process.env,
    DATABASE_URL:              databaseUrl,
    JWT_ACCESS_TOKEN_SECRET:   'smoke-access-secret',
    JWT_REFRESH_TOKEN_SECRET:  'smoke-refresh-secret',
    FRONTEND_URL:              `http://127.0.0.1:${frontendPort}`,
    PORT:                      `${backendPort}`,
    BACKEND_URL:               `http://127.0.0.1:${backendPort}`,
  };

  await runCommand(
    npmCmd,
    ['exec', '--', 'prisma', 'migrate', 'deploy', '--schema', 'backend/prisma/schema.prisma'],
    baseEnv,
    'prisma migrate deploy',
    { shell: true },
  );
  console.log('[smoke-win] migrations applied');

  await startProcess(
    'backend',
    npmCmd,
    ['run', 'start', '--workspace', 'backend'],
    baseEnv,
    backendPort,
    { shell: true },
  );
  console.log(`[smoke-win] backend ready on :${backendPort}`);

  await startProcess(
    'frontend preview',
    npmCmd,
    ['run', 'preview', '--workspace', 'frontend', '--', '--host', '127.0.0.1', '--port', `${frontendPort}`],
    { ...process.env },
    frontendPort,
    { shell: true },
  );
  console.log(`[smoke-win] frontend ready on :${frontendPort}`);

  await runCommand(
    process.execPath,
    [
      path.join(repoRoot, 'scripts', 'production-smoke.mjs'),
      '--backend-url',  `http://127.0.0.1:${backendPort}`,
      '--frontend-url', `http://127.0.0.1:${frontendPort}`,
      '--timeout-ms',   `${timeoutMs}`,
    ],
    baseEnv,
    'production smoke',
  );
} finally {
  await stopAll();
  await dropDb();
  console.log(`[smoke-win] cleaned up database ${dbName}`);
}
