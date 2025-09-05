// DevAtlas Billing Service Tests
// Created by Balaji Koneti

import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from '../billing.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

describe('BillingService', () => {
  let service: BillingService;
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(async () => {
    // Mock Stripe instance
    mockStripe = {
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      customers: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
      subscriptions: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn(),
      },
      invoices: {
        list: jest.fn(),
        retrieve: jest.fn(),
      },
      billingPortal: {
        sessions: {
          create: jest.fn(),
        },
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                STRIPE_SECRET_KEY: 'sk_test_123',
                STRIPE_WEBHOOK_SECRET: 'whsec_123',
                STRIPE_PRICE_ID: 'price_123',
              };
              return config[key];
            }),
          },
        },
        {
          provide: 'STRIPE_CLIENT',
          useValue: mockStripe,
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession as any);

      const result = await service.createCheckoutSession({
        orgId: 'org_123',
        userId: 'user_123',
        priceId: 'price_123',
      });

      expect(result).toEqual(mockSession);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        mode: 'subscription',
        line_items: [
          {
            price: 'price_123',
            quantity: 1,
          },
        ],
        success_url: expect.stringContaining('success'),
        cancel_url: expect.stringContaining('cancel'),
        metadata: {
          orgId: 'org_123',
          userId: 'user_123',
        },
      });
    });
  });

  describe('createCustomerPortalSession', () => {
    it('should create a customer portal session', async () => {
      const mockSession = {
        id: 'bps_test_123',
        url: 'https://billing.stripe.com/session/bps_test_123',
      };

      mockStripe.billingPortal.sessions.create.mockResolvedValue(mockSession as any);

      const result = await service.createCustomerPortalSession('customer_123');

      expect(result).toEqual(mockSession);
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'customer_123',
        return_url: expect.stringContaining('billing'),
      });
    });
  });

  describe('getSubscription', () => {
    it('should retrieve subscription', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
        current_period_end: 1234567890,
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue(mockSubscription as any);

      const result = await service.getSubscription('sub_123');

      expect(result).toEqual(mockSubscription);
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
    });
  });

  describe('getInvoices', () => {
    it('should retrieve invoices', async () => {
      const mockInvoices = {
        data: [
          {
            id: 'in_123',
            amount_paid: 2000,
            status: 'paid',
            created: 1234567890,
          },
        ],
      };

      mockStripe.invoices.list.mockResolvedValue(mockInvoices as any);

      const result = await service.getInvoices('customer_123');

      expect(result).toEqual(mockInvoices);
      expect(mockStripe.invoices.list).toHaveBeenCalledWith({
        customer: 'customer_123',
        limit: 10,
      });
    });
  });

  describe('handleWebhook', () => {
    it('should handle checkout.session.completed event', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: {
              orgId: 'org_123',
              userId: 'user_123',
            },
            subscription: 'sub_123',
          },
        },
      };

      const result = await service.handleWebhook(mockEvent as any);

      expect(result).toBe(true);
    });

    it('should handle invoice.payment_succeeded event', async () => {
      const mockEvent = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_123',
            subscription: 'sub_123',
            amount_paid: 2000,
          },
        },
      };

      const result = await service.handleWebhook(mockEvent as any);

      expect(result).toBe(true);
    });

    it('should handle subscription.updated event', async () => {
      const mockEvent = {
        type: 'subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'active',
            current_period_end: 1234567890,
          },
        },
      };

      const result = await service.handleWebhook(mockEvent as any);

      expect(result).toBe(true);
    });
  });
});
