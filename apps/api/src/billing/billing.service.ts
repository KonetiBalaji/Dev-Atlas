// DevAtlas Billing Service
// Created by Balaji Koneti

import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '@devatlas/billing';
import { CreateCheckoutSessionDto, CreateCustomerPortalDto } from './dto/billing.dto';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly stripeService: StripeService,
  ) {}

  async createCheckoutSession(orgId: string, dto: CreateCheckoutSessionDto) {
    try {
      // Get organization
      const org = await this.prisma.org.findUnique({
        where: { id: orgId },
      });

      if (!org) {
        throw new BadRequestException('Organization not found');
      }

      // Create or get Stripe customer
      let customerId = org.stripeId;
      if (!customerId) {
        const customer = await this.stripeService.createCustomer({
          email: org.email || 'admin@devatlas.com',
          name: org.name,
          metadata: { orgId },
        });
        customerId = customer.id;

        // Update organization with Stripe customer ID
        await this.prisma.org.update({
          where: { id: orgId },
          data: { stripeId: customerId },
        });
      }

      // Create checkout session
      const session = await this.stripeService.createCheckoutSession({
        customerId,
        priceId: dto.priceId,
        successUrl: dto.successUrl,
        cancelUrl: dto.cancelUrl,
        metadata: { orgId },
      });

      return { sessionId: session.id, url: session.url };
    } catch (error) {
      throw new BadRequestException(`Failed to create checkout session: ${error.message}`);
    }
  }

  async createCustomerPortal(orgId: string, dto: CreateCustomerPortalDto) {
    try {
      // Get organization
      const org = await this.prisma.org.findUnique({
        where: { id: orgId },
      });

      if (!org || !org.stripeId) {
        throw new BadRequestException('No billing account found');
      }

      // Create portal session
      const session = await this.stripeService.createPortalSession({
        customerId: org.stripeId,
        returnUrl: dto.returnUrl,
      });

      return { url: session.url };
    } catch (error) {
      throw new BadRequestException(`Failed to create portal session: ${error.message}`);
    }
  }

  async getSubscription(orgId: string) {
    try {
      // Get organization
      const org = await this.prisma.org.findUnique({
        where: { id: orgId },
      });

      if (!org || !org.stripeId) {
        return { subscription: null };
      }

      // Get subscription from Stripe
      const subscription = await this.stripeService.getSubscription(org.stripeId);

      return { subscription };
    } catch (error) {
      throw new BadRequestException(`Failed to get subscription: ${error.message}`);
    }
  }

  async getInvoices(orgId: string) {
    try {
      // Get organization
      const org = await this.prisma.org.findUnique({
        where: { id: orgId },
      });

      if (!org || !org.stripeId) {
        return { invoices: [] };
      }

      // Get invoices from Stripe
      const invoices = await this.stripeService.getInvoices(org.stripeId);

      return { invoices };
    } catch (error) {
      throw new BadRequestException(`Failed to get invoices: ${error.message}`);
    }
  }

  async handleWebhook(body: any, signature: string) {
    try {
      const event = await this.stripeService.verifyWebhook(body, signature);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
      }

      return { received: true };
    } catch (error) {
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  private async handleCheckoutCompleted(session: any) {
    const orgId = session.metadata.orgId;
    if (orgId) {
      // Update organization subscription status
      await this.prisma.org.update({
        where: { id: orgId },
        data: { 
          stripeId: session.customer,
          // Add subscription status fields as needed
        },
      });
    }
  }

  private async handleSubscriptionUpdated(subscription: any) {
    // Update subscription status in database
    // Implementation depends on your subscription model
  }

  private async handleSubscriptionDeleted(subscription: any) {
    // Handle subscription cancellation
    // Implementation depends on your subscription model
  }

  private async handlePaymentSucceeded(invoice: any) {
    // Handle successful payment
    // Implementation depends on your billing model
  }

  private async handlePaymentFailed(invoice: any) {
    // Handle failed payment
    // Implementation depends on your billing model
  }
}
