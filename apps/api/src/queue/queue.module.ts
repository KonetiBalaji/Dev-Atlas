import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'redis', // The service name in docker-compose
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'analysis',
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
