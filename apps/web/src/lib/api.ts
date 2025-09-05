// DevAtlas API Client
// Created by Balaji Koneti

import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  projects: {
    getAll: () => apiClient.get('/api/v1/projects').then(res => res.data),
    getStats: () => apiClient.get('/api/v1/projects/stats').then(res => res.data),
    create: (data: any) => apiClient.post('/api/v1/projects', data).then(res => res.data),
    getById: (id: string) => apiClient.get(`/api/v1/projects/${id}`).then(res => res.data),
    update: (id: string, data: any) => apiClient.patch(`/api/v1/projects/${id}`, data).then(res => res.data),
    delete: (id: string) => apiClient.delete(`/api/v1/projects/${id}`).then(res => res.data),
  },
  analyses: {
    start: (projectId: string) => apiClient.post(`/api/v1/analyses/projects/${projectId}/analyze`).then(res => res.data),
    getByProject: (projectId: string) => apiClient.get(`/api/v1/analyses/projects/${projectId}`).then(res => res.data),
    getLatest: (projectId: string) => apiClient.get(`/api/v1/analyses/projects/${projectId}/latest`).then(res => res.data),
    getById: (id: string) => apiClient.get(`/api/v1/analyses/${id}`).then(res => res.data),
    getStats: () => apiClient.get('/api/v1/analyses/stats/overview').then(res => res.data),
  },
  repos: {
    getByAnalysis: (analysisId: string) => apiClient.get(`/api/v1/repos/analyses/${analysisId}`).then(res => res.data),
    getById: (id: string) => apiClient.get(`/api/v1/repos/${id}`).then(res => res.data),
    getOwnership: (id: string) => apiClient.get(`/api/v1/repos/${id}/ownership`).then(res => res.data),
  },
  search: {
    semantic: (query: string, limit?: number) => apiClient.post('/api/v1/search', { query, limit }).then(res => res.data),
  },
  auth: {
    login: (credentials: { email: string; password: string }) => apiClient.post('/api/v1/auth/login', credentials).then(res => res.data),
    getProfile: () => apiClient.get('/api/v1/auth/profile').then(res => res.data),
  },
  billing: {
    createCheckoutSession: (data: any) => apiClient.post('/api/v1/billing/checkout', data).then(res => res.data),
    createCustomerPortal: (data: any) => apiClient.post('/api/v1/billing/portal', data).then(res => res.data),
    getSubscription: () => apiClient.get('/api/v1/billing/subscription').then(res => res.data),
    getInvoices: () => apiClient.get('/api/v1/billing/invoices').then(res => res.data),
  },
  enterprise: {
    getApiKeys: () => apiClient.get('/api/v1/enterprise/api-keys').then(res => res.data),
    createApiKey: (data: any) => apiClient.post('/api/v1/enterprise/api-keys', data).then(res => res.data),
    deleteApiKey: (id: string) => apiClient.delete(`/api/v1/enterprise/api-keys/${id}`).then(res => res.data),
    getWeightProfiles: () => apiClient.get('/api/v1/enterprise/weight-profiles').then(res => res.data),
    createWeightProfile: (data: any) => apiClient.post('/api/v1/enterprise/weight-profiles', data).then(res => res.data),
    updateWeightProfile: (id: string, data: any) => apiClient.put(`/api/v1/enterprise/weight-profiles/${id}`, data).then(res => res.data),
    deleteWeightProfile: (id: string) => apiClient.delete(`/api/v1/enterprise/weight-profiles/${id}`).then(res => res.data),
    getDataRetentionPolicies: () => apiClient.get('/api/v1/enterprise/data-retention').then(res => res.data),
    createDataRetentionPolicy: (data: any) => apiClient.post('/api/v1/enterprise/data-retention', data).then(res => res.data),
    getAuditLogs: (params?: any) => apiClient.get('/api/v1/enterprise/audit-logs', { params }).then(res => res.data),
    getSSOConfig: () => apiClient.get('/api/v1/enterprise/sso').then(res => res.data),
    testSSOConnection: (data: any) => apiClient.post('/api/v1/enterprise/sso/test', data).then(res => res.data),
  },
};
