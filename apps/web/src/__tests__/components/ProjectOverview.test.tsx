// DevAtlas Project Overview Component Tests
// Created by Balaji Koneti

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectOverview } from '../components/ProjectOverview';

// Mock the API client
jest.mock('../../lib/api', () => ({
  api: {
    projects: {
      getProject: jest.fn(),
      getProjectAnalyses: jest.fn(),
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

describe('ProjectOverview', () => {
  const mockProject = {
    id: 'proj_123',
    name: 'Test Project',
    description: 'A test project',
    orgId: 'org_123',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
  };

  const mockAnalyses = [
    {
      id: 'analysis_123',
      projectId: 'proj_123',
      status: 'completed',
      createdAt: new Date('2023-01-01'),
      completedAt: new Date('2023-01-01'),
      summary: {
        totalRepos: 5,
        totalIssues: 10,
        totalSecurityIssues: 2,
        averageScore: 85,
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render project overview', async () => {
    const { api } = require('../../lib/api');
    api.projects.getProject.mockResolvedValue(mockProject);
    api.projects.getProjectAnalyses.mockResolvedValue(mockAnalyses);

    renderWithQueryClient(<ProjectOverview projectId="proj_123" />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('A test project')).toBeInTheDocument();
    });
  });

  it('should display analysis summary', async () => {
    const { api } = require('../../lib/api');
    api.projects.getProject.mockResolvedValue(mockProject);
    api.projects.getProjectAnalyses.mockResolvedValue(mockAnalyses);

    renderWithQueryClient(<ProjectOverview projectId="proj_123" />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // totalRepos
      expect(screen.getByText('10')).toBeInTheDocument(); // totalIssues
      expect(screen.getByText('2')).toBeInTheDocument(); // totalSecurityIssues
      expect(screen.getByText('85')).toBeInTheDocument(); // averageScore
    });
  });

  it('should show loading state', () => {
    const { api } = require('../../lib/api');
    api.projects.getProject.mockImplementation(() => new Promise(() => {}));
    api.projects.getProjectAnalyses.mockImplementation(() => new Promise(() => {}));

    renderWithQueryClient(<ProjectOverview projectId="proj_123" />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    const { api } = require('../../lib/api');
    api.projects.getProject.mockRejectedValue(new Error('Failed to fetch'));
    api.projects.getProjectAnalyses.mockRejectedValue(new Error('Failed to fetch'));

    renderWithQueryClient(<ProjectOverview projectId="proj_123" />);

    await waitFor(() => {
      expect(screen.getByText('Error loading project')).toBeInTheDocument();
    });
  });

  it('should display recent analyses', async () => {
    const { api } = require('../../lib/api');
    api.projects.getProject.mockResolvedValue(mockProject);
    api.projects.getProjectAnalyses.mockResolvedValue(mockAnalyses);

    renderWithQueryClient(<ProjectOverview projectId="proj_123" />);

    await waitFor(() => {
      expect(screen.getByText('Recent Analyses')).toBeInTheDocument();
      expect(screen.getByText('analysis_123')).toBeInTheDocument();
    });
  });
});
