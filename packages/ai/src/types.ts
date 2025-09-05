// DevAtlas AI Types
// Created by Balaji Koneti

import { z } from 'zod';

// LLM Provider types
export type LLMProvider = 'openai' | 'ollama';

// Model configuration
export interface ModelConfig {
  provider: LLMProvider;
  model: string;
  maxTokens: number;
  temperature: number;
}

// LLM request/response types
export interface LLMRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

// Embedding types
export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

// Repository summary types
export interface RepoSummary {
  purpose: string;
  mainModules: string[];
  runInstructions: string;
  testInstructions: string;
  missingDocs: string[];
  confidence: number;
}

// Directory summary types
export interface DirectorySummary {
  path: string;
  purpose: string;
  keyFiles: string[];
  complexity: 'low' | 'medium' | 'high';
}

// Prompt template types
export interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
  maxTokens: number;
}

// Validation schemas
export const RepoSummarySchema = z.object({
  purpose: z.string(),
  mainModules: z.array(z.string()),
  runInstructions: z.string(),
  testInstructions: z.string(),
  missingDocs: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const DirectorySummarySchema = z.object({
  path: z.string(),
  purpose: z.string(),
  keyFiles: z.array(z.string()),
  complexity: z.enum(['low', 'medium', 'high']),
});

export type RepoSummaryType = z.infer<typeof RepoSummarySchema>;
export type DirectorySummaryType = z.infer<typeof DirectorySummarySchema>;
