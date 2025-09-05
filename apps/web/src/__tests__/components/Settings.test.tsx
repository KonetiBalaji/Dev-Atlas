// DevAtlas Settings Component Tests
// Created by Balaji Koneti

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Settings } from '../components/Settings';

// Mock the API client
jest.mock('../../lib/api', () => ({
  api: {
    user: {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
    },
    org: {
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
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

describe('Settings', () => {
  const mockUserProfile = {
    id: 'user_123',
    name: 'Test User',
    email: 'test@example.com',
    avatar: 'https://example.com/avatar.jpg',
    preferences: {
      theme: 'light',
      notifications: true,
      language: 'en',
    },
  };

  const mockOrgSettings = {
    id: 'org_123',
    name: 'Test Organization',
    settings: {
      defaultWeightProfile: 'default',
      dataRetentionDays: 365,
      notifications: {
        email: true,
        slack: false,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render settings', async () => {
    const { api } = require('../../lib/api');
    api.user.getProfile.mockResolvedValue(mockUserProfile);
    api.org.getSettings.mockResolvedValue(mockOrgSettings);

    renderWithQueryClient(<Settings />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Organization')).toBeInTheDocument();
    });
  });

  it('should display user profile information', async () => {
    const { api } = require('../../lib/api');
    api.user.getProfile.mockResolvedValue(mockUserProfile);
    api.org.getSettings.mockResolvedValue(mockOrgSettings);

    renderWithQueryClient(<Settings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });
  });

  it('should display organization settings', async () => {
    const { api } = require('../../lib/api');
    api.user.getProfile.mockResolvedValue(mockUserProfile);
    api.org.getSettings.mockResolvedValue(mockOrgSettings);

    renderWithQueryClient(<Settings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Organization')).toBeInTheDocument();
      expect(screen.getByDisplayValue('365')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    const { api } = require('../../lib/api');
    api.user.getProfile.mockImplementation(() => new Promise(() => {}));
    api.org.getSettings.mockImplementation(() => new Promise(() => {}));

    renderWithQueryClient(<Settings />);

    expect(screen.getByText('Loading settings...')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    const { api } = require('../../lib/api');
    api.user.getProfile.mockRejectedValue(new Error('Failed to fetch'));
    api.org.getSettings.mockRejectedValue(new Error('Failed to fetch'));

    renderWithQueryClient(<Settings />);

    await waitFor(() => {
      expect(screen.getByText('Error loading settings')).toBeInTheDocument();
    });
  });

  it('should update user profile', async () => {
    const { api } = require('../../lib/api');
    api.user.getProfile.mockResolvedValue(mockUserProfile);
    api.org.getSettings.mockResolvedValue(mockOrgSettings);
    api.user.updateProfile.mockResolvedValue({ ...mockUserProfile, name: 'Updated User' });

    renderWithQueryClient(<Settings />);

    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('Test User');
      fireEvent.change(nameInput, { target: { value: 'Updated User' } });
    });

    const saveButton = screen.getByText('Save Profile');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.user.updateProfile).toHaveBeenCalledWith({
        name: 'Updated User',
        email: 'test@example.com',
        preferences: mockUserProfile.preferences,
      });
    });
  });

  it('should update organization settings', async () => {
    const { api } = require('../../lib/api');
    api.user.getProfile.mockResolvedValue(mockUserProfile);
    api.org.getSettings.mockResolvedValue(mockOrgSettings);
    api.org.updateSettings.mockResolvedValue({
      ...mockOrgSettings,
      settings: { ...mockOrgSettings.settings, dataRetentionDays: 730 },
    });

    renderWithQueryClient(<Settings />);

    await waitFor(() => {
      const retentionInput = screen.getByDisplayValue('365');
      fireEvent.change(retentionInput, { target: { value: '730' } });
    });

    const saveButton = screen.getByText('Save Organization Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.org.updateSettings).toHaveBeenCalledWith({
        ...mockOrgSettings.settings,
        dataRetentionDays: 730,
      });
    });
  });

  it('should toggle notification preferences', async () => {
    const { api } = require('../../lib/api');
    api.user.getProfile.mockResolvedValue(mockUserProfile);
    api.org.getSettings.mockResolvedValue(mockOrgSettings);

    renderWithQueryClient(<Settings />);

    await waitFor(() => {
      const emailToggle = screen.getByLabelText('Email Notifications');
      fireEvent.click(emailToggle);
    });

    expect(screen.getByLabelText('Email Notifications')).toBeChecked();
  });
});
