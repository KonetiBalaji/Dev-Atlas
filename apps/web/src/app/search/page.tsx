'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/header';

interface SearchResult {
  id: string;
  name: string;
  url: string;
  summary: string;
  project: string;
  score: number;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
}

async function searchRepos(query: string): Promise<SearchResponse> {
  const response = await fetch('http://localhost:8080/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  return response.json();
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [query, setQuery] = useState('');

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => searchRepos(query),
    enabled: !!query,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setQuery(searchQuery.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Semantic Search</h1>
          <p className="text-gray-600">Search across analyzed repositories using natural language</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-grow">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask a question about the codebase (e.g., 'Where is authentication implemented?')"
                className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>
            <button 
              type="submit" 
              disabled={!searchQuery.trim() || isLoading}
              className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {query && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Search Results for "{query}"
              </h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Searching...</span>
                </div>
              ) : searchResults?.results?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No results found. Try a different search query.
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults?.results?.map((result) => (
                    <div key={result.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {result.name}
                          </h3>
                          <p className="text-gray-600 mb-2">{result.summary}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Project: {result.project}</span>
                            <span>Score: {result.score}/100</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View on GitHub →
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
