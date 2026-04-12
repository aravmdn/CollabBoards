import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';
import {
  runPrismaMigrateDeploy,
  startPostgresTestEnvironment,
} from './postgresTestEnvironment';

const ACCESS_SECRET = 'integration-access-secret';
const REFRESH_SECRET = 'integration-refresh-secret';
const socketIOMock = {
  to: () => ({
    emit: () => undefined,
  }),
};

export interface IntegrationHarness {
  app: Express;
  prisma: PrismaClient;
  reset: () => Promise<void>;
  stop: () => Promise<void>;
}

export async function createIntegrationHarness(): Promise<IntegrationHarness> {
  const database = await startPostgresTestEnvironment();
  const previousEnv = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_TOKEN_SECRET,
    JWT_REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_TOKEN_SECRET,
  };

  process.env.DATABASE_URL = database.databaseUrl;
  process.env.JWT_ACCESS_TOKEN_SECRET = ACCESS_SECRET;
  process.env.JWT_REFRESH_TOKEN_SECRET = REFRESH_SECRET;

  try {
    await runPrismaMigrateDeploy(process.env);
    const { setSocketIO } = await import('../lib/socketEvents');
    setSocketIO(socketIOMock as never);
    const [{ default: app }, { prisma }] = await Promise.all([
      import('../app'),
      import('../lib/prisma'),
    ]);

    return {
      app,
      prisma,
      reset: () => database.reset(prisma),
      async stop() {
        await prisma.$disconnect();
        await database.stop();

        process.env.DATABASE_URL = previousEnv.DATABASE_URL;
        process.env.JWT_ACCESS_TOKEN_SECRET = previousEnv.JWT_ACCESS_TOKEN_SECRET;
        process.env.JWT_REFRESH_TOKEN_SECRET = previousEnv.JWT_REFRESH_TOKEN_SECRET;
      },
    };
  } catch (error) {
    await database.stop();
    process.env.DATABASE_URL = previousEnv.DATABASE_URL;
    process.env.JWT_ACCESS_TOKEN_SECRET = previousEnv.JWT_ACCESS_TOKEN_SECRET;
    process.env.JWT_REFRESH_TOKEN_SECRET = previousEnv.JWT_REFRESH_TOKEN_SECRET;
    throw error;
  }
}
