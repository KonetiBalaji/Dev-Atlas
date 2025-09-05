// DevAtlas Prisma Service
// Created by Balaji Koneti

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@devatlas/db';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    // Connect to database
    await this.$connect();
    console.log('✅ Connected to database');
  }

  async onModuleDestroy() {
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
