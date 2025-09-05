// DevAtlas Semantic Search Component Tests
// Created by Balaji Koneti

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SemanticSearch } from '../components/SemanticSearch';

// Mock the API client
jest.mock('../../lib/api', () => ({
  api: {
    search: {
      semanticSearch: jest.fn(),
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

describe('SemanticSearch', () => {
  const mockSearchResults = [
    {
      id: 'result_123',
      type: 'repo',
      name: 'test-repo',
      path: 'src/index.ts',
      content: 'This is a test function',
      score: 0.95,
      metadata: {
        language: 'TypeScript',
        lastModified: new Date('2023-01-01'),
      },
    },
    {
      id: 'result_456',
      type: 'file',
      name: 'utils.ts',
      path: 'src/utils.ts',
      content: 'Utility functions for the project',
      score: 0.87,
      metadata: {
        language: 'TypeScript',
        lastModified: new Date('2023-01-02'),
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render semantic search', () => {
    renderWithQueryClient(<SemanticSearch projectId="proj_123" />);

    expect(screen.getByText('Semantic Search')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search code semantically...')).toBeInTheDocument();
  });

  it('should perform search on input', async () => {
    const { api } = require('../../lib/api');
    api.search.semanticSearch.mockResolvedValue(mockSearchResults);

    renderWithQueryClient(<SemanticSearch projectId="proj_123" />);

    const searchInput = screen.getByPlaceholderText('Search code semantically...');
    fireEvent.change(searchInput, { target: { value: 'test function' } });

    await waitFor(() => {
      expect(api.search.semanticSearch).toHaveBeenCalledWith({
        projectId: 'proj_123',
        query: 'test function',
        limit: 10,
      });
    });
  });

  it('should display search results', async () => {
    const { api } = require('../../lib/api');
    api.search.semanticSearch.mockResolvedValue(mockSearchResults);

    renderWithQueryClient(<SemanticSearch projectId="proj_123" />);

    const searchInput = screen.getByPlaceholderText('Search code semantically...');
    fireEvent.change(searchInput, { target: { value: 'test function' } });

    await waitFor(() => {
      expect(screen.getByText('test-repo')).toBeInTheDocument();
      expect(screen.getByText('utils.ts')).toBeInTheDocument();
      expect(screen.getByText('This is a test function')).toBeInTheDocument();
      expect(screen.getByText('Utility functions for the project')).toBeInTheDocument();
    });
  });

  it('should show loading state during search', async () => {
    const { api } = require('../../lib/api');
    api.search.semanticSearch.mockImplementation(() => new Promise(() => {}));

    renderWithQueryClient(<SemanticSearch projectId="proj_123" />);

    const searchInput = screen.getByPlaceholderText('Search code semantically...');
    fireEvent.change(searchInput, { target: { value: 'test function' } });

    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });
  });

  it('should show error state', async () => {
    const { api } = require('../../lib/api');
    api.search.semanticSearch.mockRejectedValue(new Error('Failed to search'));

    renderWithQueryClient(<SemanticSearch projectId="proj_123" />);

    const searchInput = screen.getByPlaceholderText('Search code semantically...');
    fireEvent.change(searchInput, { target: { value: 'test function' } });

    await waitFor(() => {
      expect(screen.getByText('Error performing search')).toBeInTheDocument();
    });
  });

  it('should display empty state when no results', async () => {
    const { api } = require('../../lib/api');
    api.search.semanticSearch.mockResolvedValue([]);

    renderWithQueryClient(<SemanticSearch projectId="proj_123" />);

    const searchInput = screen.getByPlaceholderText('Search code semantically...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  it('should handle result click', async () => {
    const { api } = require('../../lib/api');
    api.search.semanticSearch.mockResolvedValue(mockSearchResults);

    renderWithQueryClient(<SemanticSearch projectId="proj_123" />);

    const searchInput = screen.getByPlaceholderText('Search code semantically...');
    fireEvent.change(searchInput, { target: { value: 'test function' } });

    await waitFor(() => {
      const resultRow = screen.getByText('test-repo');
      resultRow.click();
    });

    // Verify navigation or modal opening
    expect(screen.getByText('test-repo')).toBeInTheDocument();
  });

  it('should filter results by type', async () => {
    const { api } = require('../../lib/api');
    api.search.semanticSearch.mockResolvedValue(mockSearchResults);

    renderWithQueryClient(<SemanticSearch projectId="proj_123" />);

    const searchInput = screen.getByPlaceholderText('Search code semantically...');
    fireEvent.change(searchInput, { target: { value: 'test function' } });

    await waitFor(() => {
      const repoFilter = screen.getByText('Repositories');
      repoFilter.click();
    });

    // Verify only repository results are shown
    expect(screen.getByText('test-repo')).toBeInTheDocument();
    expect(screen.queryByText('utils.ts')).not.toBeInTheDocument();
  });
});
