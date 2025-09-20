import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080', // Our NestJS API
});

// --- Type Definitions ---
interface Score {
  id: string;
  overall: number;
  craft: number;
  reliability: number;
  documentation: number;
  security: number;
  impact: number;
  collaboration: number;
}

interface Ownership {
  id: string;
  author: string;
  share: number;
}

interface Repo {
  id: string;
  name: string;
  language: string;
  loc: number;
  lintIssues: number;
  vulnCount: number;
  readmeScore: number;
  ownership: Ownership[];
}

interface Analysis {
  id: string;
  summary: string;
  score: Score;
  repos: Repo[];
}

export interface FullProject {
  id: string;
  handle: string;
  type: 'user' | 'org';
  status: string;
  createdAt: string;
  analyses: Analysis[];
}

// --- API Functions ---

export const getProjects = async (): Promise<FullProject[]> => {
  const response = await apiClient.get('/projects');
  return response.data;
};

export const createProject = async (data: { handle: string; type: 'user' | 'org', orgId: string }): Promise<FullProject> => {
    const response = await apiClient.post('/projects', data);
    return response.data;
};

export const analyzeProject = async (id: string): Promise<{ message: string; jobId: string }> => {
    const response = await apiClient.post(`/projects/${id}/analyze`);
    return response.data;
};
