// DevAtlas Dashboard Component
// Created by Balaji Koneti

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectsGrid } from '@/components/projects-grid';
import { AnalysesList } from '@/components/analyses-list';
import { SearchInterface } from '@/components/search-interface';
import { Plus, Search, BarChart3, Users, Code, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export function Dashboard() {
  const [newProject, setNewProject] = useState({ handle: '', type: 'user' });
  const [isCreating, setIsCreating] = useState(false);

  // Fetch projects
  const { data: projects = [], refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.getAll,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: api.projects.getStats,
  });

  const handleCreateProject = async () => {
    if (!newProject.handle.trim()) {
      toast.error('Please enter a GitHub handle');
      return;
    }

    setIsCreating(true);
    try {
      await api.projects.create(newProject);
      setNewProject({ handle: '', type: 'user' });
      toast.success('Project created successfully!');
      refetchProjects();
    } catch (error) {
      toast.error('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">DevAtlas</h1>
          <p className="text-muted-foreground">Understand any developer and codebase in minutes</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Analyses</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeProjects || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAnalyses || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
          </CardContent>
        </Card>
      </div>

      {/* Create New Project */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Project</CardTitle>
          <CardDescription>
            Analyze a GitHub user or organization's repositories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <Label htmlFor="handle">GitHub Handle</Label>
              <Input
                id="handle"
                placeholder="octocat or microsoft"
                value={newProject.handle}
                onChange={(e) => setNewProject({ ...newProject, handle: e.target.value })}
              />
            </div>
            <div className="w-32">
              <Label htmlFor="type">Type</Label>
              <Select
                value={newProject.type}
                onValueChange={(value) => setNewProject({ ...newProject, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="org">Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateProject} disabled={isCreating}>
              <Plus className="h-4 w-4 mr-2" />
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="analyses">Analyses</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>
        
        <TabsContent value="projects" className="space-y-4">
          <ProjectsGrid projects={projects} onRefresh={refetchProjects} />
        </TabsContent>
        
        <TabsContent value="analyses" className="space-y-4">
          <AnalysesList />
        </TabsContent>
        
        <TabsContent value="search" className="space-y-4">
          <SearchInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
}
