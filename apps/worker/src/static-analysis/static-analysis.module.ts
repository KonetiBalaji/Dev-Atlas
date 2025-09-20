import { Module } from '@nestjs/common';
import { StaticAnalysisService } from './static-analysis.service';

@Module({
  providers: [StaticAnalysisService],
  exports: [StaticAnalysisService],
})
export class StaticAnalysisModule {}
