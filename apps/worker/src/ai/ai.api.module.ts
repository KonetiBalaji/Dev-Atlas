import { Module } from '@nestjs/common';
import { AiService, LlmGatewayService, ModelRouterService } from 'ai';

@Module({
  providers: [ModelRouterService, LlmGatewayService, AiService],
  exports: [AiService],
})
export class AiApiModule {}
