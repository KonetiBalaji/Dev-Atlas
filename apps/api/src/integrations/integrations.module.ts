// DevAtlas Integrations Module
// Created by Balaji Koneti

import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { GitHubWebhookService } from './github-webhook.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, GitHubWebhookService],
  exports: [GitHubWebhookService],
})
export class IntegrationsModule {}
