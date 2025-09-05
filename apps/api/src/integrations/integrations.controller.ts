// DevAtlas Integrations Controller
// Created by Balaji Koneti

import { Controller, Post, Body, Headers, Get, Param, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GitHubWebhookService } from './github-webhook.service';
import { Request, Response } from 'express';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly webhookService: GitHubWebhookService) {}

  @Post('github/webhook')
  @ApiOperation({ summary: 'GitHub webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async githubWebhook(
    @Body() payload: any,
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-event') event: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      // Verify webhook signature
      const secret = process.env['GITHUB_WEBHOOK_SECRET'];
      if (secret && !this.webhookService.verifySignature(
        JSON.stringify(payload),
        signature,
        secret
      )) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      console.log('GitHub webhook received:', {
        event,
        delivery: req.headers['x-github-delivery'],
        repository: payload.repository?.full_name,
      });

      // Process webhook
      await this.webhookService.processWebhook(payload);

      return res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error('Webhook processing failed:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  @Get('github/webhook/stats/:orgId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get webhook statistics for organization' })
  @ApiResponse({ status: 200, description: 'Webhook statistics retrieved successfully' })
  async getWebhookStats(@Param('orgId') orgId: string) {
    return this.webhookService.getWebhookStats(orgId);
  }
}
