// DevAtlas Ownership Map Component Tests
// Created by Balaji Koneti

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OwnershipMap } from '../components/OwnershipMap';

// Mock the API client
jest.mock('../../lib/api', () => ({
  api: {
    repos: {
      getOwnership: jest.fn(),
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

describe('OwnershipMap', () => {
  const mockOwnership = {
    repoId: 'repo_123',
    files: [
      {
        path: 'src/index.ts',
        author: 'user1',
        commits: 10,
        lastCommit: new Date('2023-01-01'),
        lines: 100,
        ownership: 0.8,
      },
      {
        path: 'src/utils.ts',
        author: 'user2',
        commits: 5,
        lastCommit: new Date('2023-01-02'),
        lines: 50,
        ownership: 0.6,
      },
    ],
    summary: {
      totalFiles: 2,
      totalLines: 150,
      authors: [
        {
          name: 'user1',
          files: 1,
          lines: 100,
          ownership: 0.8,
        },
        {
          name: 'user2',
          files: 1,
          lines: 50,
          ownership: 0.6,
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render ownership map', async () => {
    const { api } = require('../../lib/api');
    api.repos.getOwnership.mockResolvedValue(mockOwnership);

    renderWithQueryClient(<OwnershipMap repoId="repo_123" />);

    await waitFor(() => {
      expect(screen.getByText('Code Ownership')).toBeInTheDocument();
      expect(screen.getByText('src/index.ts')).toBeInTheDocument();
      expect(screen.getByText('src/utils.ts')).toBeInTheDocument();
    });
  });

  it('should display file ownership information', async () => {
    const { api } = require('../../lib/api');
    api.repos.getOwnership.mockResolvedValue(mockOwnership);

    renderWithQueryClient(<OwnershipMap repoId="repo_123" />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument(); // lines
      expect(screen.getByText('50')).toBeInTheDocument(); // lines
    });
  });

  it('should show loading state', () => {
    const { api } = require('../../lib/api');
    api.repos.getOwnership.mockImplementation(() => new Promise(() => {}));

    renderWithQueryClient(<OwnershipMap repoId="repo_123" />);

    expect(screen.getByText('Loading ownership data...')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    const { api } = require('../../lib/api');
    api.repos.getOwnership.mockRejectedValue(new Error('Failed to fetch'));

    renderWithQueryClient(<OwnershipMap repoId="repo_123" />);

    await waitFor(() => {
      expect(screen.getByText('Error loading ownership data')).toBeInTheDocument();
    });
  });

  it('should display ownership summary', async () => {
    const { api } = require('../../lib/api');
    api.repos.getOwnership.mockResolvedValue(mockOwnership);

    renderWithQueryClient(<OwnershipMap repoId="repo_123" />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // totalFiles
      expect(screen.getByText('150')).toBeInTheDocument(); // totalLines
    });
  });

  it('should handle file selection', async () => {
    const { api } = require('../../lib/api');
    api.repos.getOwnership.mockResolvedValue(mockOwnership);

    renderWithQueryClient(<OwnershipMap repoId="repo_123" />);

    await waitFor(() => {
      const fileRow = screen.getByText('src/index.ts');
      fileRow.click();
    });

    // Verify file details are shown
    expect(screen.getByText('src/index.ts')).toBeInTheDocument();
  });
});
