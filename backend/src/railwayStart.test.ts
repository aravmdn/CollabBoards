import { EventEmitter } from 'events';
import type { SpawnOptions } from 'child_process';
import {
  getNpxCommand,
  runRailwayStart,
} from './railwayStart';

class MockChildProcess extends EventEmitter {
  kill = jest.fn();
}

describe('railwayStart', () => {
  it('runs prisma migrate deploy before starting the backend', async () => {
    const migrationProcess = new MockChildProcess();
    const serverProcess = new MockChildProcess();
    const spawnProcess = jest
      .fn()
      .mockReturnValueOnce(migrationProcess)
      .mockReturnValueOnce(serverProcess);
    const onSignal = jest.fn();
    const offSignal = jest.fn();
    const logError = jest.fn();

    const resultPromise = runRailwayStart({
      spawnProcess,
      nodeExecutable: 'node',
      platform: 'linux',
      env: { DATABASE_URL: 'postgresql://example' },
      onSignal,
      offSignal,
      logError,
    });

    migrationProcess.emit('close', 0, null);
    await Promise.resolve();
    serverProcess.emit('close', 0, null);

    await expect(resultPromise).resolves.toBe(0);
    expect(spawnProcess).toHaveBeenNthCalledWith(
      1,
      'npx',
      [
        'prisma',
        'migrate',
        'deploy',
        '--schema',
        expect.stringMatching(/backend[\\/]prisma[\\/]schema\.prisma$/),
      ],
      expect.objectContaining<SpawnOptions>({
        cwd: expect.stringMatching(/backend$/),
        env: { DATABASE_URL: 'postgresql://example' },
        stdio: 'inherit',
      }),
    );
    expect(spawnProcess).toHaveBeenNthCalledWith(
      2,
      'node',
      [expect.stringMatching(/backend[\\/]dist[\\/]index\.js$/)],
      expect.objectContaining<SpawnOptions>({
        cwd: expect.stringMatching(/backend$/),
        env: { DATABASE_URL: 'postgresql://example' },
        stdio: 'inherit',
      }),
    );
    expect(logError).not.toHaveBeenCalled();
    expect(onSignal).toHaveBeenCalledTimes(2);
    expect(offSignal).toHaveBeenCalledTimes(2);
  });

  it('fails fast when prisma migrate deploy fails', async () => {
    const migrationProcess = new MockChildProcess();
    const spawnProcess = jest.fn().mockReturnValueOnce(migrationProcess);
    const onSignal = jest.fn();
    const offSignal = jest.fn();
    const logError = jest.fn();

    const resultPromise = runRailwayStart({
      spawnProcess,
      nodeExecutable: 'node',
      platform: 'linux',
      env: {},
      onSignal,
      offSignal,
      logError,
    });

    migrationProcess.emit('close', 1, null);

    await expect(resultPromise).resolves.toBe(1);
    expect(spawnProcess).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(
      'Railway startup aborted because prisma migrate deploy exited with code 1.',
    );
    expect(onSignal).not.toHaveBeenCalled();
    expect(offSignal).not.toHaveBeenCalled();
  });

  it('forwards process signals to the backend server', async () => {
    const migrationProcess = new MockChildProcess();
    const serverProcess = new MockChildProcess();
    const spawnProcess = jest
      .fn()
      .mockReturnValueOnce(migrationProcess)
      .mockReturnValueOnce(serverProcess);
    const signalHandlers = new Map<NodeJS.Signals, () => void>();

    const resultPromise = runRailwayStart({
      spawnProcess,
      nodeExecutable: 'node',
      platform: 'linux',
      env: {},
      onSignal: (signal, handler) => {
        signalHandlers.set(signal, handler);
      },
      offSignal: (signal) => {
        signalHandlers.delete(signal);
      },
      logError: jest.fn(),
    });

    migrationProcess.emit('close', 0, null);
    await Promise.resolve();

    signalHandlers.get('SIGTERM')?.();
    expect(serverProcess.kill).toHaveBeenCalledWith('SIGTERM');

    serverProcess.emit('close', 0, null);

    await expect(resultPromise).resolves.toBe(0);
    expect(signalHandlers.size).toBe(0);
  });

  it('uses the Windows npx command when needed', () => {
    expect(getNpxCommand('win32')).toBe('npx.cmd');
    expect(getNpxCommand('linux')).toBe('npx');
  });
});
