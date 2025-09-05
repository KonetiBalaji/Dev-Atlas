// DevAtlas Database Prisma Service
// Created by Balaji Koneti

import { PrismaClient } from '@prisma/client';

export class PrismaService extends PrismaClient {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async connect() {
    // Connect to database
    await this.$connect();
    console.log('✅ Connected to database');
  }

  async disconnect() {
    // Disconnect from database
    await this.$disconnect();
    console.log('🔌 Disconnected from database');
  }

  /**
   * Clean disconnect for graceful shutdown
   */
  async enableShutdownHooks(app: any) {
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }
}
