// DevAtlas Repos Grid Component Tests
// Created by Balaji Koneti

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReposGrid } from '../components/ReposGrid';

// Mock the API client
jest.mock('../../lib/api', () => ({
  api: {
    repos: {
      getRepos: jest.fn(),
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

describe('ReposGrid', () => {
  const mockRepos = [
    {
      id: 'repo_123',
      name: 'test-repo',
      url: 'https://github.com/user/test-repo',
      language: 'TypeScript',
      stars: 100,
      forks: 20,
      issues: 5,
      pullRequests: 3,
      lastCommit: new Date('2023-01-01'),
      score: 85,
      analysis: {
        id: 'analysis_123',
        status: 'completed',
        summary: {
          totalIssues: 5,
          securityIssues: 1,
          codeQuality: 'good',
        },
      },
    },
    {
      id: 'repo_456',
      name: 'another-repo',
      url: 'https://github.com/user/another-repo',
      language: 'Python',
      stars: 50,
      forks: 10,
      issues: 2,
      pullRequests: 1,
      lastCommit: new Date('2023-01-02'),
      score: 92,
      analysis: {
        id: 'analysis_456',
        status: 'completed',
        summary: {
          totalIssues: 2,
          securityIssues: 0,
          codeQuality: 'excellent',
        },
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render repos grid', async () => {
    const { api } = require('../../lib/api');
    api.repos.getRepos.mockResolvedValue(mockRepos);

    renderWithQueryClient(<ReposGrid projectId="proj_123" />);

    await waitFor(() => {
      expect(screen.getByText('test-repo')).toBeInTheDocument();
      expect(screen.getByText('another-repo')).toBeInTheDocument();
    });
  });

  it('should display repo information', async () => {
    const { api } = require('../../lib/api');
    api.repos.getRepos.mockResolvedValue(mockRepos);

    renderWithQueryClient(<ReposGrid projectId="proj_123" />);

    await waitFor(() => {
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument(); // stars
      expect(screen.getByText('50')).toBeInTheDocument(); // stars
    });
  });

  it('should show loading state', () => {
    const { api } = require('../../lib/api');
    api.repos.getRepos.mockImplementation(() => new Promise(() => {}));

    renderWithQueryClient(<ReposGrid projectId="proj_123" />);

    expect(screen.getByText('Loading repositories...')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    const { api } = require('../../lib/api');
    api.repos.getRepos.mockRejectedValue(new Error('Failed to fetch'));

    renderWithQueryClient(<ReposGrid projectId="proj_123" />);

    await waitFor(() => {
      expect(screen.getByText('Error loading repositories')).toBeInTheDocument();
    });
  });

  it('should display empty state', async () => {
    const { api } = require('../../lib/api');
    api.repos.getRepos.mockResolvedValue([]);

    renderWithQueryClient(<ReposGrid projectId="proj_123" />);

    await waitFor(() => {
      expect(screen.getByText('No repositories found')).toBeInTheDocument();
    });
  });

  it('should handle repo click', async () => {
    const { api } = require('../../lib/api');
    api.repos.getRepos.mockResolvedValue(mockRepos);

    renderWithQueryClient(<ReposGrid projectId="proj_123" />);

    await waitFor(() => {
      const repoCard = screen.getByText('test-repo');
      repoCard.click();
    });

    // Verify navigation or modal opening
    expect(screen.getByText('test-repo')).toBeInTheDocument();
  });
});
