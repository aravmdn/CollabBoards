import { execFile } from 'child_process';
import fs from 'fs/promises';
import net from 'net';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import type { PrismaClient } from '@prisma/client';

type EmbeddedPostgresInstance = {
  initialise: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  createDatabase: (databaseName: string) => Promise<void>;
};

type EmbeddedPostgresConstructor = new (options: {
  databaseDir: string;
  user: string;
  password: string;
  port: number;
  persistent: boolean;
  onLog?: (message: string) => void;
  onError?: (messageOrError: unknown) => void;
}) => EmbeddedPostgresInstance;

const execFileAsync = promisify(execFile);
const prismaCliPath = require.resolve('prisma/build/index.js');
const importDynamic = new Function(
  'specifier',
  'return import(specifier);',
) as (specifier: string) => Promise<{ default: EmbeddedPostgresConstructor }>;

const quotedTables = [
  '"ActivityLog"',
  '"Attachment"',
  '"Comment"',
  '"Card"',
  '"List"',
  '"Board"',
  '"WorkspaceMember"',
  '"Workspace"',
  '"User"',
].join(', ');

export interface TestDatabaseEnvironment {
  databaseUrl: string;
  backendRoot: string;
  reset: (prisma: PrismaClient) => Promise<void>;
  stop: () => Promise<void>;
}

export function getBackendRoot() {
  return path.resolve(__dirname, '..', '..');
}

export async function getFreePort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Unable to resolve a free TCP port.'));
        return;
      }

      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(address.port);
      });
    });
    server.on('error', reject);
  });
}

export async function runPrismaMigrateDeploy(env: NodeJS.ProcessEnv) {
  const backendRoot = getBackendRoot();
  await execFileAsync(
    process.execPath,
    [
      prismaCliPath,
      'migrate',
      'deploy',
      '--schema',
      path.join('prisma', 'schema.prisma'),
    ],
    {
      cwd: backendRoot,
      env,
    },
  );
}

export async function startPostgresTestEnvironment(): Promise<TestDatabaseEnvironment> {
  const backendRoot = getBackendRoot();
  const tempRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'collabboards-postgres-'),
  );
  const dataDir = path.join(tempRoot, 'pgdata');
  const databaseName = 'collabboards';
  const user = 'postgres';
  const password = 'postgres';
  const port = await getFreePort();
  const { default: EmbeddedPostgres } = await importDynamic('embedded-postgres');
  const postgres = new EmbeddedPostgres({
    databaseDir: dataDir,
    user,
    password,
    port,
    persistent: false,
    onLog: () => undefined,
    onError: () => undefined,
  });

  await postgres.initialise();
  await postgres.start();
  await postgres.createDatabase(databaseName);

  const databaseUrl = `postgresql://${user}:${password}@127.0.0.1:${port}/${databaseName}?schema=public`;

  return {
    databaseUrl,
    backendRoot,
    async reset(prisma: PrismaClient) {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE;`,
      );
    },
    async stop() {
      await postgres.stop();
      await fs.rm(tempRoot, { recursive: true, force: true });
    },
  };
}
