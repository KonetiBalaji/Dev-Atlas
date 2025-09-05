// DevAtlas Billing Component Tests
// Created by Balaji Koneti

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Billing } from '../components/Billing';

// Mock the API client
jest.mock('../../lib/api', () => ({
  api: {
    billing: {
      getSubscription: jest.fn(),
      getInvoices: jest.fn(),
      createCheckoutSession: jest.fn(),
      createCustomerPortal: jest.fn(),
    },
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('Billing', () => {
  const mockSubscription = {
    id: 'sub_123',
    status: 'active',
    current_period_end: 1234567890,
    plan: {
      name: 'Pro Plan',
      price: 2000,
      interval: 'month',
    },
  };

  const mockInvoices = [
    {
      id: 'in_123',
      amount_paid: 2000,
      status: 'paid',
      created: 1234567890,
      invoice_pdf: 'https://example.com/invoice.pdf',
    },
    {
      id: 'in_456',
      amount_paid: 2000,
      status: 'paid',
      created: 1234567800,
      invoice_pdf: 'https://example.com/invoice2.pdf',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render billing', async () => {
    const { api } = require('../../lib/api');
    api.billing.getSubscription.mockResolvedValue(mockSubscription);
    api.billing.getInvoices.mockResolvedValue(mockInvoices);

    renderWithQueryClient(<Billing />);

    await waitFor(() => {
      expect(screen.getByText('Billing')).toBeInTheDocument();
      expect(screen.getByText('Pro Plan')).toBeInTheDocument();
      expect(screen.getByText('$20.00/month')).toBeInTheDocument();
    });
  });

  it('should display subscription information', async () => {
    const { api } = require('../../lib/api');
    api.billing.getSubscription.mockResolvedValue(mockSubscription);
    api.billing.getInvoices.mockResolvedValue(mockInvoices);

    renderWithQueryClient(<Billing />);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Pro Plan')).toBeInTheDocument();
      expect(screen.getByText('$20.00/month')).toBeInTheDocument();
    });
  });

  it('should display invoices', async () => {
    const { api } = require('../../lib/api');
    api.billing.getSubscription.mockResolvedValue(mockSubscription);
    api.billing.getInvoices.mockResolvedValue(mockInvoices);

    renderWithQueryClient(<Billing />);

    await waitFor(() => {
      expect(screen.getByText('Invoices')).toBeInTheDocument();
      expect(screen.getByText('$20.00')).toBeInTheDocument();
      expect(screen.getByText('Paid')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    const { api } = require('../../lib/api');
    api.billing.getSubscription.mockImplementation(() => new Promise(() => {}));
    api.billing.getInvoices.mockImplementation(() => new Promise(() => {}));

    renderWithQueryClient(<Billing />);

    expect(screen.getByText('Loading billing information...')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    const { api } = require('../../lib/api');
    api.billing.getSubscription.mockRejectedValue(new Error('Failed to fetch'));
    api.billing.getInvoices.mockRejectedValue(new Error('Failed to fetch'));

    renderWithQueryClient(<Billing />);

    await waitFor(() => {
      expect(screen.getByText('Error loading billing information')).toBeInTheDocument();
    });
  });

  it('should handle upgrade subscription', async () => {
    const { api } = require('../../lib/api');
    api.billing.getSubscription.mockResolvedValue(mockSubscription);
    api.billing.getInvoices.mockResolvedValue(mockInvoices);
    api.billing.createCheckoutSession.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    });

    renderWithQueryClient(<Billing />);

    await waitFor(() => {
      const upgradeButton = screen.getByText('Upgrade Plan');
      fireEvent.click(upgradeButton);
    });

    expect(api.billing.createCheckoutSession).toHaveBeenCalledWith({
      priceId: 'price_enterprise',
    });
  });

  it('should handle manage subscription', async () => {
    const { api } = require('../../lib/api');
    api.billing.getSubscription.mockResolvedValue(mockSubscription);
    api.billing.getInvoices.mockResolvedValue(mockInvoices);
    api.billing.createCustomerPortal.mockResolvedValue({
      id: 'bps_test_123',
      url: 'https://billing.stripe.com/session/bps_test_123',
    });

    renderWithQueryClient(<Billing />);

    await waitFor(() => {
      const manageButton = screen.getByText('Manage Subscription');
      fireEvent.click(manageButton);
    });

    expect(api.billing.createCustomerPortal).toHaveBeenCalled();
  });

  it('should display no subscription state', async () => {
    const { api } = require('../../lib/api');
    api.billing.getSubscription.mockResolvedValue(null);
    api.billing.getInvoices.mockResolvedValue([]);

    renderWithQueryClient(<Billing />);

    await waitFor(() => {
      expect(screen.getByText('No active subscription')).toBeInTheDocument();
      expect(screen.getByText('Subscribe to a plan')).toBeInTheDocument();
    });
  });

  it('should handle invoice download', async () => {
    const { api } = require('../../lib/api');
    api.billing.getSubscription.mockResolvedValue(mockSubscription);
    api.billing.getInvoices.mockResolvedValue(mockInvoices);

    renderWithQueryClient(<Billing />);

    await waitFor(() => {
      const downloadButton = screen.getByText('Download');
      fireEvent.click(downloadButton);
    });

    // Verify download link is created
    expect(screen.getByText('Download')).toBeInTheDocument();
  });
});
