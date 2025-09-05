// DevAtlas Security Issues Component Tests
// Created by Balaji Koneti

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SecurityIssues } from '../components/SecurityIssues';

// Mock the API client
jest.mock('../../lib/api', () => ({
  api: {
    repos: {
      getSecurityIssues: jest.fn(),
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

describe('SecurityIssues', () => {
  const mockSecurityIssues = [
    {
      id: 'issue_123',
      rule: 'no-eval',
      severity: 'high',
      message: 'Use of eval() is dangerous',
      file: 'src/index.ts',
      line: 10,
      column: 5,
      tool: 'ESLint',
      fix: 'Use JSON.parse() instead',
    },
    {
      id: 'issue_456',
      rule: 'no-console',
      severity: 'medium',
      message: 'Console statement detected',
      file: 'src/utils.ts',
      line: 5,
      column: 1,
      tool: 'ESLint',
      fix: 'Remove console statement',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render security issues', async () => {
    const { api } = require('../../lib/api');
    api.repos.getSecurityIssues.mockResolvedValue(mockSecurityIssues);

    renderWithQueryClient(<SecurityIssues repoId="repo_123" />);

    await waitFor(() => {
      expect(screen.getByText('Security Issues')).toBeInTheDocument();
      expect(screen.getByText('no-eval')).toBeInTheDocument();
      expect(screen.getByText('no-console')).toBeInTheDocument();
    });
  });

  it('should display issue information', async () => {
    const { api } = require('../../lib/api');
    api.repos.getSecurityIssues.mockResolvedValue(mockSecurityIssues);

    renderWithQueryClient(<SecurityIssues repoId="repo_123" />);

    await waitFor(() => {
      expect(screen.getByText('Use of eval() is dangerous')).toBeInTheDocument();
      expect(screen.getByText('Console statement detected')).toBeInTheDocument();
      expect(screen.getByText('src/index.ts')).toBeInTheDocument();
      expect(screen.getByText('src/utils.ts')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    const { api } = require('../../lib/api');
    api.repos.getSecurityIssues.mockImplementation(() => new Promise(() => {}));

    renderWithQueryClient(<SecurityIssues repoId="repo_123" />);

    expect(screen.getByText('Loading security issues...')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    const { api } = require('../../lib/api');
    api.repos.getSecurityIssues.mockRejectedValue(new Error('Failed to fetch'));

    renderWithQueryClient(<SecurityIssues repoId="repo_123" />);

    await waitFor(() => {
      expect(screen.getByText('Error loading security issues')).toBeInTheDocument();
    });
  });

  it('should display empty state', async () => {
    const { api } = require('../../lib/api');
    api.repos.getSecurityIssues.mockResolvedValue([]);

    renderWithQueryClient(<SecurityIssues repoId="repo_123" />);

    await waitFor(() => {
      expect(screen.getByText('No security issues found')).toBeInTheDocument();
    });
  });

  it('should filter issues by severity', async () => {
    const { api } = require('../../lib/api');
    api.repos.getSecurityIssues.mockResolvedValue(mockSecurityIssues);

    renderWithQueryClient(<SecurityIssues repoId="repo_123" />);

    await waitFor(() => {
      const highSeverityFilter = screen.getByText('High');
      highSeverityFilter.click();
    });

    // Verify only high severity issues are shown
    expect(screen.getByText('no-eval')).toBeInTheDocument();
    expect(screen.queryByText('no-console')).not.toBeInTheDocument();
  });

  it('should show issue details on click', async () => {
    const { api } = require('../../lib/api');
    api.repos.getSecurityIssues.mockResolvedValue(mockSecurityIssues);

    renderWithQueryClient(<SecurityIssues repoId="repo_123" />);

    await waitFor(() => {
      const issueRow = screen.getByText('no-eval');
      issueRow.click();
    });

    // Verify issue details are shown
    expect(screen.getByText('Use of eval() is dangerous')).toBeInTheDocument();
    expect(screen.getByText('Use JSON.parse() instead')).toBeInTheDocument();
  });
});
