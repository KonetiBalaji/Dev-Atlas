// DevAtlas Enterprise Component Tests
// Created by Balaji Koneti

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Enterprise } from '../components/Enterprise';

// Mock the API client
jest.mock('../../lib/api', () => ({
  api: {
    enterprise: {
      getApiKeys: jest.fn(),
      createApiKey: jest.fn(),
      deleteApiKey: jest.fn(),
      getWeightProfiles: jest.fn(),
      createWeightProfile: jest.fn(),
      updateWeightProfile: jest.fn(),
      deleteWeightProfile: jest.fn(),
      getDataRetentionPolicies: jest.fn(),
      createDataRetentionPolicy: jest.fn(),
      getAuditLogs: jest.fn(),
      getSSOConfig: jest.fn(),
      testSSOConnection: jest.fn(),
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

describe('Enterprise', () => {
  const mockApiKeys = [
    {
      id: 'key_123',
      name: 'Test API Key',
      permissions: ['read', 'write'],
      createdAt: new Date('2023-01-01'),
      lastUsedAt: new Date('2023-01-02'),
    },
  ];

  const mockWeightProfiles = [
    {
      id: 'profile_123',
      name: 'Custom Profile',
      weights: {
        craft: 0.3,
        reliability: 0.25,
        documentation: 0.2,
        security: 0.15,
        impact: 0.1,
      },
    },
  ];

  const mockDataRetentionPolicies = [
    {
      id: 'policy_123',
      name: 'Standard Policy',
      retentionDays: 365,
      dataTypes: ['analyses', 'repos'],
    },
  ];

  const mockAuditLogs = [
    {
      id: 'log_123',
      action: 'api_key.created',
      userId: 'user_123',
      metadata: { keyId: 'key_123' },
      createdAt: new Date('2023-01-01'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render enterprise features', async () => {
    const { api } = require('../../lib/api');
    api.enterprise.getApiKeys.mockResolvedValue(mockApiKeys);
    api.enterprise.getWeightProfiles.mockResolvedValue(mockWeightProfiles);
    api.enterprise.getDataRetentionPolicies.mockResolvedValue(mockDataRetentionPolicies);
    api.enterprise.getAuditLogs.mockResolvedValue(mockAuditLogs);

    renderWithQueryClient(<Enterprise />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Features')).toBeInTheDocument();
      expect(screen.getByText('API Keys')).toBeInTheDocument();
      expect(screen.getByText('Weight Profiles')).toBeInTheDocument();
      expect(screen.getByText('Data Retention')).toBeInTheDocument();
      expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    });
  });

  it('should display API keys', async () => {
    const { api } = require('../../lib/api');
    api.enterprise.getApiKeys.mockResolvedValue(mockApiKeys);
    api.enterprise.getWeightProfiles.mockResolvedValue([]);
    api.enterprise.getDataRetentionPolicies.mockResolvedValue([]);
    api.enterprise.getAuditLogs.mockResolvedValue([]);

    renderWithQueryClient(<Enterprise />);

    await waitFor(() => {
      expect(screen.getByText('Test API Key')).toBeInTheDocument();
      expect(screen.getByText('read, write')).toBeInTheDocument();
    });
  });

  it('should display weight profiles', async () => {
    const { api } = require('../../lib/api');
    api.enterprise.getApiKeys.mockResolvedValue([]);
    api.enterprise.getWeightProfiles.mockResolvedValue(mockWeightProfiles);
    api.enterprise.getDataRetentionPolicies.mockResolvedValue([]);
    api.enterprise.getAuditLogs.mockResolvedValue([]);

    renderWithQueryClient(<Enterprise />);

    await waitFor(() => {
      expect(screen.getByText('Custom Profile')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument(); // craft weight
      expect(screen.getByText('25%')).toBeInTheDocument(); // reliability weight
    });
  });

  it('should display data retention policies', async () => {
    const { api } = require('../../lib/api');
    api.enterprise.getApiKeys.mockResolvedValue([]);
    api.enterprise.getWeightProfiles.mockResolvedValue([]);
    api.enterprise.getDataRetentionPolicies.mockResolvedValue(mockDataRetentionPolicies);
    api.enterprise.getAuditLogs.mockResolvedValue([]);

    renderWithQueryClient(<Enterprise />);

    await waitFor(() => {
      expect(screen.getByText('Standard Policy')).toBeInTheDocument();
      expect(screen.getByText('365 days')).toBeInTheDocument();
      expect(screen.getByText('analyses, repos')).toBeInTheDocument();
    });
  });

  it('should display audit logs', async () => {
    const { api } = require('../../lib/api');
    api.enterprise.getApiKeys.mockResolvedValue([]);
    api.enterprise.getWeightProfiles.mockResolvedValue([]);
    api.enterprise.getDataRetentionPolicies.mockResolvedValue([]);
    api.enterprise.getAuditLogs.mockResolvedValue(mockAuditLogs);

    renderWithQueryClient(<Enterprise />);

    await waitFor(() => {
      expect(screen.getByText('api_key.created')).toBeInTheDocument();
      expect(screen.getByText('user_123')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    const { api } = require('../../lib/api');
    api.enterprise.getApiKeys.mockImplementation(() => new Promise(() => {}));
    api.enterprise.getWeightProfiles.mockImplementation(() => new Promise(() => {}));
    api.enterprise.getDataRetentionPolicies.mockImplementation(() => new Promise(() => {}));
    api.enterprise.getAuditLogs.mockImplementation(() => new Promise(() => {}));

    renderWithQueryClient(<Enterprise />);

    expect(screen.getByText('Loading enterprise features...')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    const { api } = require('../../lib/api');
    api.enterprise.getApiKeys.mockRejectedValue(new Error('Failed to fetch'));
    api.enterprise.getWeightProfiles.mockRejectedValue(new Error('Failed to fetch'));
    api.enterprise.getDataRetentionPolicies.mockRejectedValue(new Error('Failed to fetch'));
    api.enterprise.getAuditLogs.mockRejectedValue(new Error('Failed to fetch'));

    renderWithQueryClient(<Enterprise />);

    await waitFor(() => {
      expect(screen.getByText('Error loading enterprise features')).toBeInTheDocument();
    });
  });

  it('should create new API key', async () => {
    const { api } = require('../../lib/api');
    api.enterprise.getApiKeys.mockResolvedValue([]);
    api.enterprise.getWeightProfiles.mockResolvedValue([]);
    api.enterprise.getDataRetentionPolicies.mockResolvedValue([]);
    api.enterprise.getAuditLogs.mockResolvedValue([]);
    api.enterprise.createApiKey.mockResolvedValue({
      id: 'key_456',
      name: 'New API Key',
      key: 'sk_test_456',
    });

    renderWithQueryClient(<Enterprise />);

    await waitFor(() => {
      const createButton = screen.getByText('Create API Key');
      fireEvent.click(createButton);
    });

    const nameInput = screen.getByPlaceholderText('API Key Name');
    fireEvent.change(nameInput, { target: { value: 'New API Key' } });

    const createConfirmButton = screen.getByText('Create');
    fireEvent.click(createConfirmButton);

    expect(api.enterprise.createApiKey).toHaveBeenCalledWith({
      name: 'New API Key',
      permissions: ['read'],
    });
  });

  it('should create new weight profile', async () => {
    const { api } = require('../../lib/api');
    api.enterprise.getApiKeys.mockResolvedValue([]);
    api.enterprise.getWeightProfiles.mockResolvedValue([]);
    api.enterprise.getDataRetentionPolicies.mockResolvedValue([]);
    api.enterprise.getAuditLogs.mockResolvedValue([]);
    api.enterprise.createWeightProfile.mockResolvedValue({
      id: 'profile_456',
      name: 'New Profile',
      weights: {
        craft: 0.4,
        reliability: 0.3,
        documentation: 0.2,
        security: 0.1,
        impact: 0.0,
      },
    });

    renderWithQueryClient(<Enterprise />);

    await waitFor(() => {
      const createButton = screen.getByText('Create Weight Profile');
      fireEvent.click(createButton);
    });

    const nameInput = screen.getByPlaceholderText('Profile Name');
    fireEvent.change(nameInput, { target: { value: 'New Profile' } });

    const createConfirmButton = screen.getByText('Create');
    fireEvent.click(createConfirmButton);

    expect(api.enterprise.createWeightProfile).toHaveBeenCalledWith({
      name: 'New Profile',
      weights: {
        craft: 0.4,
        reliability: 0.3,
        documentation: 0.2,
        security: 0.1,
        impact: 0.0,
      },
    });
  });
});