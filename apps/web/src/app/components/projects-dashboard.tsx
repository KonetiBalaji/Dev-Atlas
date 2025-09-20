'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getProjects, createProject, analyzeProject, FullProject } from '@/lib/api';
import AnalysisDetails from './analysis-details';

export default function ProjectsDashboard() {
  const queryClient = useQueryClient();
  const [newProjectHandle, setNewProjectHandle] = useState('');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setNewProjectHandle('');
    },
  });

  const analyzeProjectMutation = useMutation({
    mutationFn: analyzeProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    createProjectMutation.mutate({ handle: newProjectHandle, type: 'org', orgId: 'clx...' });
  };

  const toggleExpand = (projectId: string) => {
    setExpandedProjectId(expandedProjectId === projectId ? null : projectId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">DevAtlas Dashboard</h1>
        <p className="text-gray-600">Analyze GitHub repositories and understand developer profiles</p>
      </div>

      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Project</h2>
        <form onSubmit={handleCreateProject} className="flex gap-4">
          <div className="flex-grow">
            <input
              type="text"
              value={newProjectHandle}
              onChange={(e) => setNewProjectHandle(e.target.value)}
              placeholder="Enter GitHub handle (e.g., 'nestjs', 'facebook/react')"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button 
            type="submit" 
            disabled={createProjectMutation.isPending || !newProjectHandle.trim()} 
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Handle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Analysis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center p-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Loading projects...</span>
                    </div>
                  </td>
                </tr>
              ) : projects?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-gray-500">
                    No projects found. Create your first project above.
                  </td>
                </tr>
              ) : (
                projects?.map((project) => (
                  <>
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-gray-600">
                              {project.handle.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{project.handle}</div>
                            <div className="text-sm text-gray-500">{project.type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          project.status === 'complete' 
                            ? 'bg-green-100 text-green-800' 
                            : project.status === 'running' || project.status === 'queued'
                            ? 'bg-yellow-100 text-yellow-800'
                            : project.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {project.analyses[0]?.score?.overall ? (
                          <div className="flex items-center">
                            <div className="text-2xl font-bold text-gray-900">
                              {project.analyses[0].score.overall}
                            </div>
                            <div className="ml-2 text-sm text-gray-500">/100</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {project.analyses[0]?.startedAt 
                          ? new Date(project.analyses[0].startedAt).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap space-x-2">
                        <button
                          onClick={() => analyzeProjectMutation.mutate(project.id)}
                          disabled={analyzeProjectMutation.isPending || project.status === 'running' || project.status === 'queued'}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {analyzeProjectMutation.isPending ? 'Analyzing...' : 'Analyze'}
                        </button>
                        <button 
                          onClick={() => toggleExpand(project.id)}
                          className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm hover:bg-gray-300"
                        >
                          {expandedProjectId === project.id ? 'Collapse' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {expandedProjectId === project.id && (
                      <tr>
                        <td colSpan={5} className="px-0">
                          <AnalysisDetails project={project} />
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
