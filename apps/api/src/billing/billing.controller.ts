// DevAtlas Billing Controller
// Created by Balaji Koneti

import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { CreateCheckoutSessionDto, CreateCustomerPortalDto } from './dto/billing.dto';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  @ApiResponse({ status: 201, description: 'Checkout session created successfully' })
  async createCheckoutSession(
    @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
    @Request() req: any,
  ) {
    return this.billingService.createCheckoutSession(
      req.user.orgId,
      createCheckoutSessionDto,
    );
  }

  @Post('portal')
  @ApiOperation({ summary: 'Create customer portal session' })
  @ApiResponse({ status: 201, description: 'Portal session created successfully' })
  async createCustomerPortal(
    @Body() createCustomerPortalDto: CreateCustomerPortalDto,
    @Request() req: any,
  ) {
    return this.billingService.createCustomerPortal(
      req.user.orgId,
      createCustomerPortalDto,
    );
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get organization subscription' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  async getSubscription(@Request() req: any) {
    return this.billingService.getSubscription(req.user.orgId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get organization invoices' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async getInvoices(@Request() req: any) {
    return this.billingService.getInvoices(req.user.orgId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Stripe webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Body() body: any, @Request() req: any) {
    return this.billingService.handleWebhook(body, req.headers['stripe-signature']);
  }
}
