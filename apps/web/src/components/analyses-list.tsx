// DevAtlas Analyses List Component
// Created by Balaji Koneti

'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

export function AnalysesList() {
  const { data: _analyses = [], isLoading } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => api.analyses.getStats(),
  });

  if (isLoading) {
    return <div>Loading analyses...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Recent Analyses</CardTitle>
          <CardDescription>Latest analysis results across all projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No analyses found</p>
            <p className="text-sm text-muted-foreground">Start by analyzing a project</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
