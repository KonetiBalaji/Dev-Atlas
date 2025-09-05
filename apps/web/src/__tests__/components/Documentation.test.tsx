// DevAtlas Documentation Component Tests
// Created by Balaji Koneti

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Documentation } from '../components/Documentation';

// Mock the API client
jest.mock('../../lib/api', () => ({
  api: {
    repos: {
      getDocumentation: jest.fn(),
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

describe('Documentation', () => {
  const mockDocumentation = {
    repoId: 'repo_123',
    files: [
      {
        path: 'README.md',
        type: 'readme',
        size: 1024,
        lastModified: new Date('2023-01-01'),
        content: '# Test Project\n\nThis is a test project.',
      },
      {
        path: 'docs/API.md',
        type: 'api',
        size: 2048,
        lastModified: new Date('2023-01-02'),
        content: '# API Documentation\n\nAPI endpoints and usage.',
      },
    ],
    summary: {
      totalFiles: 2,
      totalSize: 3072,
      coverage: 0.8,
      quality: 'good',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render documentation', async () => {
    const { api } = require('../../lib/api');
    api.repos.getDocumentation.mockResolvedValue(mockDocumentation);

    renderWithQueryClient(<Documentation repoId="repo_123" />);

    await waitFor(() => {
      expect(screen.getByText('Documentation')).toBeInTheDocument();
      expect(screen.getByText('README.md')).toBeInTheDocument();
      expect(screen.getByText('docs/API.md')).toBeInTheDocument();
    });
  });

  it('should display documentation information', async () => {
    const { api } = require('../../lib/api');
    api.repos.getDocumentation.mockResolvedValue(mockDocumentation);

    renderWithQueryClient(<Documentation repoId="repo_123" />);

    await waitFor(() => {
      expect(screen.getByText('1.0 KB')).toBeInTheDocument(); // README.md size
      expect(screen.getByText('2.0 KB')).toBeInTheDocument(); // API.md size
    });
  });

  it('should show loading state', () => {
    const { api } = require('../../lib/api');
    api.repos.getDocumentation.mockImplementation(() => new Promise(() => {}));

    renderWithQueryClient(<Documentation repoId="repo_123" />);

    expect(screen.getByText('Loading documentation...')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    const { api } = require('../../lib/api');
    api.repos.getDocumentation.mockRejectedValue(new Error('Failed to fetch'));

    renderWithQueryClient(<Documentation repoId="repo_123" />);

    await waitFor(() => {
      expect(screen.getByText('Error loading documentation')).toBeInTheDocument();
    });
  });

  it('should display documentation summary', async () => {
    const { api } = require('../../lib/api');
    api.repos.getDocumentation.mockResolvedValue(mockDocumentation);

    renderWithQueryClient(<Documentation repoId="repo_123" />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // totalFiles
      expect(screen.getByText('3.0 KB')).toBeInTheDocument(); // totalSize
      expect(screen.getByText('80%')).toBeInTheDocument(); // coverage
    });
  });

  it('should handle file selection', async () => {
    const { api } = require('../../lib/api');
    api.repos.getDocumentation.mockResolvedValue(mockDocumentation);

    renderWithQueryClient(<Documentation repoId="repo_123" />);

    await waitFor(() => {
      const fileRow = screen.getByText('README.md');
      fileRow.click();
    });

    // Verify file content is shown
    expect(screen.getByText('# Test Project')).toBeInTheDocument();
  });

  it('should filter files by type', async () => {
    const { api } = require('../../lib/api');
    api.repos.getDocumentation.mockResolvedValue(mockDocumentation);

    renderWithQueryClient(<Documentation repoId="repo_123" />);

    await waitFor(() => {
      const readmeFilter = screen.getByText('README');
      readmeFilter.click();
    });

    // Verify only README files are shown
    expect(screen.getByText('README.md')).toBeInTheDocument();
    expect(screen.queryByText('docs/API.md')).not.toBeInTheDocument();
  });
});
