// DevAtlas Prisma Service
// Created by Balaji Koneti

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService as BasePrismaService } from '@devatlas/db';

@Injectable()
export class PrismaService extends BasePrismaService implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Connect to database
    await this.connect();
  }

  async onModuleDestroy() {
    // Disconnect from database
    await this.disconnect();
  }

  /**
   * Clean disconnect for graceful shutdown
   */
  override async enableShutdownHooks(app: any) {
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }
}
