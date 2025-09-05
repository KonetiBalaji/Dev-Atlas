// DevAtlas Billing Types
// Created by Balaji Koneti

import { z } from 'zod';

export const PlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  currency: z.string(),
  interval: z.enum(['month', 'year']),
  features: z.array(z.string()),
  limits: z.object({
    analyses: z.number(),
    repos: z.number(),
    users: z.number(),
    storage: z.number(), // in GB
  }),
  stripePriceId: z.string(),
});

export const SubscriptionSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  planId: z.string(),
  status: z.enum(['active', 'canceled', 'past_due', 'unpaid', 'trialing']),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAtPeriodEnd: z.boolean(),
  stripeSubscriptionId: z.string(),
  stripeCustomerId: z.string(),
});

export const UsageSchema = z.object({
  orgId: z.string(),
  period: z.string(), // YYYY-MM format
  analyses: z.number(),
  repos: z.number(),
  storage: z.number(), // in GB
  llmTokens: z.number(),
  apiRequests: z.number(),
});

export const InvoiceSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']),
  dueDate: z.date(),
  paidAt: z.date().optional(),
  stripeInvoiceId: z.string(),
});

export type Plan = z.infer<typeof PlanSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type Usage = z.infer<typeof UsageSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;

export interface BillingConfig {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  defaultCurrency: string;
  plans: Plan[];
}

export interface CreateSubscriptionRequest {
  orgId: string;
  planId: string;
  customerEmail: string;
  customerName?: string;
  paymentMethodId?: string;
}

export interface UpdateSubscriptionRequest {
  subscriptionId: string;
  planId?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface UsageReport {
  orgId: string;
  period: string;
  usage: Usage;
  overages: {
    analyses: number;
    repos: number;
    storage: number;
    llmTokens: number;
    apiRequests: number;
  };
  estimatedCost: number;
}

