// DevAtlas Reports Component Tests
// Created by Balaji Koneti

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Reports } from '../components/Reports';

// Mock the API client
jest.mock('../../lib/api', () => ({
  api: {
    projects: {
      getProjectReports: jest.fn(),
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

describe('Reports', () => {
  const mockReports = [
    {
      id: 'report_123',
      name: 'Monthly Analysis Report',
      type: 'analysis',
      status: 'completed',
      createdAt: new Date('2023-01-01'),
      completedAt: new Date('2023-01-01'),
      summary: {
        totalRepos: 10,
        totalIssues: 25,
        averageScore: 85,
        trends: {
          score: 'up',
          issues: 'down',
          security: 'stable',
        },
      },
    },
    {
      id: 'report_456',
      name: 'Security Audit Report',
      type: 'security',
      status: 'completed',
      createdAt: new Date('2023-01-02'),
      completedAt: new Date('2023-01-02'),
      summary: {
        totalRepos: 10,
        totalIssues: 5,
        averageScore: 92,
        trends: {
          score: 'stable',
          issues: 'down',
          security: 'up',
        },
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render reports', async () => {
    const { api } = require('../../lib/api');
    api.projects.getProjectReports.mockResolvedValue(mockReports);

    renderWithQueryClient(<Reports projectId="proj_123" />);

    await waitFor(() => {
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText('Monthly Analysis Report')).toBeInTheDocument();
      expect(screen.getByText('Security Audit Report')).toBeInTheDocument();
    });
  });

  it('should display report information', async () => {
    const { api } = require('../../lib/api');
    api.projects.getProjectReports.mockResolvedValue(mockReports);

    renderWithQueryClient(<Reports projectId="proj_123" />);

    await waitFor(() => {
      expect(screen.getByText('Analysis')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    const { api } = require('../../lib/api');
    api.projects.getProjectReports.mockImplementation(() => new Promise(() => {}));

    renderWithQueryClient(<Reports projectId="proj_123" />);

    expect(screen.getByText('Loading reports...')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    const { api } = require('../../lib/api');
    api.projects.getProjectReports.mockRejectedValue(new Error('Failed to fetch'));

    renderWithQueryClient(<Reports projectId="proj_123" />);

    await waitFor(() => {
      expect(screen.getByText('Error loading reports')).toBeInTheDocument();
    });
  });

  it('should display empty state', async () => {
    const { api } = require('../../lib/api');
    api.projects.getProjectReports.mockResolvedValue([]);

    renderWithQueryClient(<Reports projectId="proj_123" />);

    await waitFor(() => {
      expect(screen.getByText('No reports found')).toBeInTheDocument();
    });
  });

  it('should handle report click', async () => {
    const { api } = require('../../lib/api');
    api.projects.getProjectReports.mockResolvedValue(mockReports);

    renderWithQueryClient(<Reports projectId="proj_123" />);

    await waitFor(() => {
      const reportRow = screen.getByText('Monthly Analysis Report');
      reportRow.click();
    });

    // Verify report details are shown
    expect(screen.getByText('Monthly Analysis Report')).toBeInTheDocument();
  });

  it('should filter reports by type', async () => {
    const { api } = require('../../lib/api');
    api.projects.getProjectReports.mockResolvedValue(mockReports);

    renderWithQueryClient(<Reports projectId="proj_123" />);

    await waitFor(() => {
      const analysisFilter = screen.getByText('Analysis');
      analysisFilter.click();
    });

    // Verify only analysis reports are shown
    expect(screen.getByText('Monthly Analysis Report')).toBeInTheDocument();
    expect(screen.queryByText('Security Audit Report')).not.toBeInTheDocument();
  });

  it('should display report summary', async () => {
    const { api } = require('../../lib/api');
    api.projects.getProjectReports.mockResolvedValue(mockReports);

    renderWithQueryClient(<Reports projectId="proj_123" />);

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // totalRepos
      expect(screen.getByText('25')).toBeInTheDocument(); // totalIssues
      expect(screen.getByText('85')).toBeInTheDocument(); // averageScore
    });
  });
});
