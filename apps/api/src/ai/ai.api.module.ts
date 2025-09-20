import { Module } from '@nestjs/common';
import { AiService, LlmGatewayService, ModelRouterService } from 'ai';

// This module provides the AI services to the rest of the NestJS application.
@Module({
  providers: [ModelRouterService, LlmGatewayService, AiService],
  exports: [AiService],
})
export class AiApiModule {}
