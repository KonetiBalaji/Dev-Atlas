import { ScoringModule } from '../scoring/scoring.module';
import { DocsModule } from '../docs/docs.module';
import { SecurityModule } from '../security/security.module';
import { StaticAnalysisModule } from '../static-analysis/static-analysis.module';
import { InventoryModule } from '../inventory/inventory.module';
import { GitModule } from '../git/git.module';
import { Module } from '@nestjs/common';
import { AnalysisProcessor } from './analysis.processor';
import { AiApiModule } from '../ai/ai.api.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'analysis' }),
    AiApiModule,
    PrismaModule,
    GitModule,
    InventoryModule,
    StaticAnalysisModule,
    SecurityModule,
    DocsModule,
    ScoringModule,
  ],
  providers: [AnalysisProcessor],
})
export class AnalysisModule {}
