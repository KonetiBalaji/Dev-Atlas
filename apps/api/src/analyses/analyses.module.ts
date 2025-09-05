// DevAtlas Analyses Module
// Created by Balaji Koneti

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AnalysesService } from './analyses.service';
import { AnalysesController } from './analyses.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'analysis',
    }),
  ],
  providers: [AnalysesService],
  controllers: [AnalysesController],
  exports: [AnalysesService],
})
export class AnalysesModule {}
