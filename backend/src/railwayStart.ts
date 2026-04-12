import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import path from 'path';

type ManagedChildProcess = Pick<ChildProcess, 'kill' | 'on'>;

interface CloseResult {
  code: number | null;
  signal: NodeJS.Signals | null;
}

export interface RailwayRuntime {
  spawnProcess: (
    command: string,
    args: string[],
    options: SpawnOptions,
  ) => ManagedChildProcess;
  nodeExecutable: string;
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  onSignal: (signal: NodeJS.Signals, handler: () => void) => void;
  offSignal: (signal: NodeJS.Signals, handler: () => void) => void;
  logError: (message: string, error?: unknown) => void;
}

const backendRoot = path.resolve(__dirname, '..');
const schemaPath = path.join(backendRoot, 'prisma', 'schema.prisma');
const serverEntryPath = path.join(backendRoot, 'dist', 'index.js');
const managedSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

export function getNpxCommand(platform: NodeJS.Platform): string {
  return platform === 'win32' ? 'npx.cmd' : 'npx';
}

export function normalizeExitCode(
  code: number | null,
  signal: NodeJS.Signals | null,
): number {
  if (typeof code === 'number') {
    return code;
  }

  if (signal) {
    return 1;
  }

  return 1;
}

function waitForClose(child: ManagedChildProcess): Promise<CloseResult> {
  return new Promise((resolve) => {
    child.on('close', (code, signal) => {
      resolve({ code, signal });
    });
  });
}

export async function runRailwayStart(
  runtime: RailwayRuntime = {
    spawnProcess: spawn,
    nodeExecutable: process.execPath,
    platform: process.platform,
    env: process.env,
    onSignal: process.on.bind(process),
    offSignal: process.off.bind(process),
    logError: console.error,
  },
): Promise<number> {
  const migrationProcess = runtime.spawnProcess(
    getNpxCommand(runtime.platform),
    ['prisma', 'migrate', 'deploy', '--schema', schemaPath],
    {
      cwd: backendRoot,
      env: runtime.env,
      stdio: 'inherit',
    },
  );

  const migrationResult = await waitForClose(migrationProcess);
  const migrationExitCode = normalizeExitCode(
    migrationResult.code,
    migrationResult.signal,
  );

  if (migrationExitCode !== 0) {
    runtime.logError(
      `Railway startup aborted because prisma migrate deploy exited with code ${migrationExitCode}.`,
    );
    return migrationExitCode;
  }

  const serverProcess = runtime.spawnProcess(
    runtime.nodeExecutable,
    [serverEntryPath],
    {
      cwd: backendRoot,
      env: runtime.env,
      stdio: 'inherit',
    },
  );

  const signalHandlers = managedSignals.map((signal) => {
    const handler = () => {
      serverProcess.kill(signal);
    };

    runtime.onSignal(signal, handler);

    return { signal, handler };
  });

  const serverResult = await waitForClose(serverProcess);

  for (const { signal, handler } of signalHandlers) {
    runtime.offSignal(signal, handler);
  }

  return normalizeExitCode(serverResult.code, serverResult.signal);
}

if (require.main === module) {
  runRailwayStart()
    .then((exitCode) => {
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('Railway startup failed unexpectedly.', error);
      process.exit(1);
    });
}
