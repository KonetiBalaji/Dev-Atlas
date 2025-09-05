// DevAtlas Stripe Service
// Created by Balaji Koneti

import Stripe from 'stripe';
import { Plan, Subscription, Invoice, CreateSubscriptionRequest, UpdateSubscriptionRequest } from './types';

export class StripeService {
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create a customer
   */
  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      name,
      metadata,
    });
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return this.stripe.customers.retrieve(customerId) as Promise<Stripe.Customer>;
  }

  /**
   * Update customer
   */
  async updateCustomer(customerId: string, updates: Stripe.CustomerUpdateParams): Promise<Stripe.Customer> {
    return this.stripe.customers.update(customerId, updates);
  }

  /**
   * Create a subscription
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<Stripe.Subscription> {
    const { orgId, planId, customerEmail, customerName, paymentMethodId } = request;

    // Create or get customer
    let customer: Stripe.Customer;
    const existingCustomers = await this.stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await this.createCustomer(customerEmail, customerName, { orgId });
    }

    // Create subscription
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: [{ price: planId }],
      metadata: { orgId },
      expand: ['latest_invoice.payment_intent'],
    };

    if (paymentMethodId) {
      subscriptionParams.default_payment_method = paymentMethodId;
    }

    return this.stripe.subscriptions.create(subscriptionParams);
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Update subscription
   */
  async updateSubscription(request: UpdateSubscriptionRequest): Promise<Stripe.Subscription> {
    const { subscriptionId, planId, cancelAtPeriodEnd } = request;

    const updateParams: Stripe.SubscriptionUpdateParams = {};

    if (planId) {
      const subscription = await this.getSubscription(subscriptionId);
      updateParams.items = [{
        id: subscription.items.data[0].id,
        price: planId,
      }];
    }

    if (cancelAtPeriodEnd !== undefined) {
      updateParams.cancel_at_period_end = cancelAtPeriodEnd;
    }

    return this.stripe.subscriptions.update(subscriptionId, updateParams);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, immediately = false): Promise<Stripe.Subscription> {
    if (immediately) {
      return this.stripe.subscriptions.cancel(subscriptionId);
    } else {
      return this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  /**
   * Get customer's subscriptions
   */
  async getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
    });
    return subscriptions.data;
  }

  /**
   * Create a price
   */
  async createPrice(plan: Plan): Promise<Stripe.Price> {
    return this.stripe.prices.create({
      unit_amount: plan.price * 100, // Convert to cents
      currency: plan.currency,
      recurring: {
        interval: plan.interval,
      },
      product_data: {
        name: plan.name,
        description: plan.description,
        metadata: {
          features: JSON.stringify(plan.features),
          limits: JSON.stringify(plan.limits),
        },
      },
    });
  }

  /**
   * Get price by ID
   */
  async getPrice(priceId: string): Promise<Stripe.Price> {
    return this.stripe.prices.retrieve(priceId);
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    customerId: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency,
      customer: customerId,
      metadata,
    });
  }

  /**
   * Get invoices for a customer
   */
  async getCustomerInvoices(customerId: string): Promise<Stripe.Invoice[]> {
    const invoices = await this.stripe.invoices.list({
      customer: customerId,
    });
    return invoices.data;
  }

  /**
   * Get upcoming invoice
   */
  async getUpcomingInvoice(customerId: string): Promise<Stripe.Invoice> {
    return this.stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });
  }

  /**
   * Create a webhook endpoint
   */
  async createWebhookEndpoint(url: string, events: string[]): Promise<Stripe.WebhookEndpoint> {
    return this.stripe.webhookEndpoints.create({
      url,
      enabled_events: events as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
    });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  /**
   * Create a setup intent for saving payment methods
   */
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    return this.stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
    });
  }

  /**
   * Get payment methods for a customer
   */
  async getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods.data;
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return this.stripe.paymentMethods.detach(paymentMethodId);
  }

  /**
   * Create a usage record for metered billing
   */
  async createUsageRecord(
    subscriptionItemId: string,
    quantity: number,
    timestamp?: number
  ): Promise<Stripe.UsageRecord> {
    return this.stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
    });
  }
}

