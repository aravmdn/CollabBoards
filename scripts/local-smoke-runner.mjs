import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const backendPort = Number.parseInt(process.env.SMOKE_BACKEND_PORT ?? '4000', 10);
const frontendPort = Number.parseInt(process.env.SMOKE_FRONTEND_PORT ?? '4173', 10);
const postgresPort = Number.parseInt(process.env.SMOKE_POSTGRES_PORT ?? '54329', 10);
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS ?? '20000', 10);

const children = [];

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForPort = async (port, label) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const isOpen = await new Promise((resolve) => {
      const socket = new net.Socket();
      socket
        .once('connect', () => {
          socket.destroy();
          resolve(true);
        })
        .once('error', () => {
          socket.destroy();
          resolve(false);
        })
        .connect(port, '127.0.0.1');
    });

    if (isOpen) {
      return;
    }

    await sleep(250);
  }

  throw new Error(`${label} did not open port ${port} within ${timeoutMs}ms`);
};

const runCommand = (command, args, env, label, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env,
      stdio: 'inherit',
      shell: options.shell ?? false,
    });

    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} exited with code ${code ?? 'unknown'}`));
    });
  });

const startProcess = async (label, command, args, env, port, options = {}) => {
  const child = spawn(command, args, {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
    shell: options.shell ?? false,
  });

  children.push(child);

  const exitPromise = new Promise((_, reject) => {
    child.once('exit', (code) => {
      reject(new Error(`${label} exited before readiness with code ${code ?? 'unknown'}`));
    });
    child.once('error', reject);
  });

  await Promise.race([waitForPort(port, label), exitPromise]);
  return child;
};

const stopChild = async (child) => {
  if (!child.pid) {
    return;
  }

  if (process.platform === 'win32') {
    await runCommand('taskkill', ['/pid', `${child.pid}`, '/t', '/f'], process.env, 'taskkill').catch(
      () => {},
    );
    return;
  }

  child.kill('SIGTERM');
};

const databaseDir = path.join(os.tmpdir(), `collabboards-smoke-db-${process.pid}`);
const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'postgres',
  password: 'password',
  port: postgresPort,
  persistent: false,
  onLog: (message) => console.log(`[embedded-postgres] ${message}`),
  onError: (message) => console.error(`[embedded-postgres] ${message}`),
});

const databaseUrl = `postgresql://postgres:password@127.0.0.1:${postgresPort}/collabboards_smoke`;

try {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('collabboards_smoke');

  const baseEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_TOKEN_SECRET: 'smoke-access-secret',
    JWT_REFRESH_TOKEN_SECRET: 'smoke-refresh-secret',
    FRONTEND_URL: `http://127.0.0.1:${frontendPort}`,
    PORT: `${backendPort}`,
    BACKEND_URL: `http://127.0.0.1:${backendPort}`,
  };

  await runCommand(
    npmCommand,
    ['exec', '--', 'prisma', 'migrate', 'deploy', '--schema', 'backend/prisma/schema.prisma'],
    baseEnv,
    'prisma migrate deploy',
    { shell: process.platform === 'win32' },
  );

  await startProcess(
    'backend',
    npmCommand,
    ['run', 'start', '--workspace', 'backend'],
    baseEnv,
    backendPort,
    { shell: process.platform === 'win32' },
  );

  await startProcess(
    'frontend preview',
    npmCommand,
    ['run', 'preview', '--workspace', 'frontend', '--', '--host', '127.0.0.1', '--port', `${frontendPort}`],
    {
      ...process.env,
    },
    frontendPort,
    { shell: process.platform === 'win32' },
  );

  await runCommand(
    process.execPath,
    [
      path.join(repoRoot, 'scripts', 'production-smoke.mjs'),
      '--backend-url',
      `http://127.0.0.1:${backendPort}`,
      '--frontend-url',
      `http://127.0.0.1:${frontendPort}`,
      '--timeout-ms',
      process.env.SMOKE_TIMEOUT_MS ?? '20000',
    ],
    baseEnv,
    'production smoke',
  );
} finally {
  while (children.length > 0) {
    const child = children.pop();
    if (child) {
      await stopChild(child);
    }
  }

  await pg.stop().catch(() => {});
}
