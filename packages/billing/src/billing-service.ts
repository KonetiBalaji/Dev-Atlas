// DevAtlas Billing Service
// Created by Balaji Koneti

import { StripeService } from './stripe-service';
import { 
  BillingConfig, 
  Plan, 
  Subscription, 
  Usage, 
  Invoice, 
  CreateSubscriptionRequest, 
  UpdateSubscriptionRequest,
  UsageReport 
} from './types';

export class BillingService {
  private stripeService: StripeService;
  private config: BillingConfig;

  constructor(config: BillingConfig) {
    this.config = config;
    this.stripeService = new StripeService(config.stripeSecretKey);
  }

  /**
   * Get all available plans
   */
  getPlans(): Plan[] {
    return this.config.plans;
  }

  /**
   * Get plan by ID
   */
  getPlan(planId: string): Plan | undefined {
    return this.config.plans.find(plan => plan.id === planId);
  }

  /**
   * Create a new subscription
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    const plan = this.getPlan(request.planId);
    if (!plan) {
      throw new Error(`Plan ${request.planId} not found`);
    }

    const stripeSubscription = await this.stripeService.createSubscription({
      ...request,
      planId: plan.stripePriceId,
    });

    return this.mapStripeSubscriptionToSubscription(stripeSubscription, request.orgId, request.planId);
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Subscription> {
    const stripeSubscription = await this.stripeService.getSubscription(subscriptionId);
    const orgId = stripeSubscription.metadata.orgId;
    const planId = this.getPlanIdFromStripePrice(stripeSubscription.items.data[0].price.id);

    return this.mapStripeSubscriptionToSubscription(stripeSubscription, orgId, planId);
  }

  /**
   * Update subscription
   */
  async updateSubscription(request: UpdateSubscriptionRequest): Promise<Subscription> {
    const { subscriptionId, planId, cancelAtPeriodEnd } = request;

    const updateParams: any = {};
    if (planId) {
      const plan = this.getPlan(planId);
      if (!plan) {
        throw new Error(`Plan ${planId} not found`);
      }
      updateParams.planId = plan.stripePriceId;
    }
    if (cancelAtPeriodEnd !== undefined) {
      updateParams.cancelAtPeriodEnd = cancelAtPeriodEnd;
    }

    const stripeSubscription = await this.stripeService.updateSubscription({
      subscriptionId,
      ...updateParams,
    });

    const orgId = stripeSubscription.metadata.orgId;
    const finalPlanId = planId || this.getPlanIdFromStripePrice(stripeSubscription.items.data[0].price.id);

    return this.mapStripeSubscriptionToSubscription(stripeSubscription, orgId, finalPlanId);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, immediately = false): Promise<Subscription> {
    const stripeSubscription = await this.stripeService.cancelSubscription(subscriptionId, immediately);
    const orgId = stripeSubscription.metadata.orgId;
    const planId = this.getPlanIdFromStripePrice(stripeSubscription.items.data[0].price.id);

    return this.mapStripeSubscriptionToSubscription(stripeSubscription, orgId, planId);
  }

  /**
   * Get customer's subscriptions
   */
  async getCustomerSubscriptions(customerId: string): Promise<Subscription[]> {
    const stripeSubscriptions = await this.stripeService.getCustomerSubscriptions(customerId);
    
    return stripeSubscriptions.map(subscription => {
      const orgId = subscription.metadata.orgId;
      const planId = this.getPlanIdFromStripePrice(subscription.items.data[0].price.id);
      return this.mapStripeSubscriptionToSubscription(subscription, orgId, planId);
    });
  }

  /**
   * Record usage for metered billing
   */
  async recordUsage(orgId: string, usage: Partial<Usage>): Promise<void> {
    // This would typically involve:
    // 1. Storing usage data in your database
    // 2. Creating Stripe usage records for metered billing
    // 3. Calculating overages and additional charges
    
    console.log(`Recording usage for org ${orgId}:`, usage);
  }

  /**
   * Generate usage report
   */
  async generateUsageReport(orgId: string, period: string): Promise<UsageReport> {
    // This would typically involve:
    // 1. Querying usage data from your database
    // 2. Calculating overages based on plan limits
    // 3. Estimating additional costs
    
    const usage: Usage = {
      orgId,
      period,
      analyses: 0,
      repos: 0,
      storage: 0,
      llmTokens: 0,
      apiRequests: 0,
    };

    const overages = {
      analyses: 0,
      repos: 0,
      storage: 0,
      llmTokens: 0,
      apiRequests: 0,
    };

    return {
      orgId,
      period,
      usage,
      overages,
      estimatedCost: 0,
    };
  }

  /**
   * Get upcoming invoice
   */
  async getUpcomingInvoice(customerId: string): Promise<Invoice> {
    const stripeInvoice = await this.stripeService.getUpcomingInvoice(customerId);
    return this.mapStripeInvoiceToInvoice(stripeInvoice);
  }

  /**
   * Get customer invoices
   */
  async getCustomerInvoices(customerId: string): Promise<Invoice[]> {
    const stripeInvoices = await this.stripeService.getCustomerInvoices(customerId);
    return stripeInvoices.map(invoice => this.mapStripeInvoiceToInvoice(invoice));
  }

  /**
   * Create payment method setup intent
   */
  async createSetupIntent(customerId: string): Promise<string> {
    const setupIntent = await this.stripeService.createSetupIntent(customerId);
    return setupIntent.client_secret!;
  }

  /**
   * Get customer payment methods
   */
  async getCustomerPaymentMethods(customerId: string) {
    return this.stripeService.getCustomerPaymentMethods(customerId);
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    await this.stripeService.deletePaymentMethod(paymentMethodId);
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(payload: string, signature: string): Promise<void> {
    const event = this.stripeService.verifyWebhookSignature(
      payload,
      signature,
      this.config.stripeWebhookSecret
    );

    switch (event.type) {
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as any);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as any);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as any);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as any);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as any);
        break;
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  /**
   * Map Stripe subscription to our subscription model
   */
  private mapStripeSubscriptionToSubscription(
    stripeSubscription: any,
    orgId: string,
    planId: string
  ): Subscription {
    return {
      id: stripeSubscription.id,
      orgId,
      planId,
      status: stripeSubscription.status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer,
    };
  }

  /**
   * Map Stripe invoice to our invoice model
   */
  private mapStripeInvoiceToInvoice(stripeInvoice: any): Invoice {
    return {
      id: stripeInvoice.id,
      orgId: stripeInvoice.metadata.orgId || '',
      amount: stripeInvoice.amount_due / 100, // Convert from cents
      currency: stripeInvoice.currency,
      status: stripeInvoice.status,
      dueDate: new Date(stripeInvoice.due_date * 1000),
      paidAt: stripeInvoice.status_transitions.paid_at 
        ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
        : undefined,
      stripeInvoiceId: stripeInvoice.id,
    };
  }

  /**
   * Get plan ID from Stripe price ID
   */
  private getPlanIdFromStripePrice(stripePriceId: string): string {
    const plan = this.config.plans.find(p => p.stripePriceId === stripePriceId);
    return plan?.id || '';
  }

  /**
   * Handle subscription created webhook
   */
  private async handleSubscriptionCreated(subscription: any): Promise<void> {
    console.log('Subscription created:', subscription.id);
    // Update database with new subscription
  }

  /**
   * Handle subscription updated webhook
   */
  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    console.log('Subscription updated:', subscription.id);
    // Update database with subscription changes
  }

  /**
   * Handle subscription deleted webhook
   */
  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    console.log('Subscription deleted:', subscription.id);
    // Update database to mark subscription as canceled
  }

  /**
   * Handle payment succeeded webhook
   */
  private async handlePaymentSucceeded(invoice: any): Promise<void> {
    console.log('Payment succeeded for invoice:', invoice.id);
    // Update database with payment success
  }

  /**
   * Handle payment failed webhook
   */
  private async handlePaymentFailed(invoice: any): Promise<void> {
    console.log('Payment failed for invoice:', invoice.id);
    // Update database with payment failure and send notification
  }
}

