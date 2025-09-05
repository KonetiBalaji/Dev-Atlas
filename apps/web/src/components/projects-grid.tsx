// DevAtlas Projects Grid Component
// Created by Balaji Koneti

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Eye, MoreHorizontal } from 'lucide-react';

interface Project {
  id: string;
  handle: string;
  type: string;
  status: string;
  createdAt: string;
  analyses?: any[];
}

interface ProjectsGridProps {
  projects: Project[];
  onRefresh: () => void;
}

export function ProjectsGrid({ projects, onRefresh: _onRefresh }: ProjectsGridProps) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold">No projects yet</h3>
            <p className="text-muted-foreground">Create your first project to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <Card key={project.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{project.handle}</CardTitle>
                <CardDescription className="capitalize">{project.type}</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize">{project.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Analyses</span>
                <span>{project.analyses?.length || 0}</span>
              </div>
              <div className="flex space-x-2 pt-2">
                <Button size="sm" className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Analyze
                </Button>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
