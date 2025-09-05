// DevAtlas Search Interface Component
// Created by Balaji Koneti

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Code, FileText } from 'lucide-react';
import { api } from '@/lib/api';

export function SearchInterface() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => api.search.semantic(searchQuery),
    enabled: !!searchQuery,
  });

  const handleSearch = () => {
    if (query.trim()) {
      setSearchQuery(query.trim());
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Semantic Search</CardTitle>
          <CardDescription>Search across all analyzed repositories using natural language</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Where is authentication implemented?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Search Results</h3>
          {results.map((result: any, index: number) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {result.kind === 'repo' ? (
                      <Code className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{result.repo_name}</p>
                    <p className="text-sm text-muted-foreground">{result.path}</p>
                    <p className="text-sm mt-1">{result.text}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Similarity: {Math.round(result.similarity * 100)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
