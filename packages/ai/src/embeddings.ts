// DevAtlas Embeddings Service
// Created by Balaji Koneti

import OpenAI from 'openai';
import axios from 'axios';
import { EmbeddingRequest, EmbeddingResponse } from './types';

export class EmbeddingService {
  private openai?: OpenAI;
  private ollamaBaseUrl: string;
  private defaultModel: string;

  constructor(config: {
    openaiApiKey?: string;
    ollamaBaseUrl?: string;
    defaultModel?: string;
  }) {
    // Initialize OpenAI client if API key is provided
    if (config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.openaiApiKey,
      });
    }

    // Set Ollama configuration
    this.ollamaBaseUrl = config.ollamaBaseUrl || 'http://localhost:11434';
    this.defaultModel = config.defaultModel || 'text-embedding-3-small';
  }

  /**
   * Generate embeddings for the given text
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = request.model || this.defaultModel;
    
    // Try OpenAI first, fallback to Ollama
    if (this.openai && model.startsWith('text-embedding-')) {
      return this.generateOpenAIEmbedding(request);
    } else {
      return this.generateOllamaEmbedding(request);
    }
  }

  /**
   * Generate embeddings using OpenAI API
   */
  private async generateOpenAIEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: request.model || 'text-embedding-3-small',
        input: request.text,
      });

      const embedding = response.data[0];
      if (!embedding?.embedding) {
        throw new Error('No embedding in OpenAI response');
      }

      return {
        embedding: embedding.embedding,
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw new Error(`OpenAI embedding error: ${error}`);
    }
  }

  /**
   * Generate embeddings using Ollama API
   */
  private async generateOllamaEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = request.model || 'nomic-embed-text';
    
    try {
      const response = await axios.post(`${this.ollamaBaseUrl}/api/embeddings`, {
        model,
        prompt: request.text,
      });

      return {
        embedding: response.data.embedding,
        model: response.data.model,
        usage: {
          promptTokens: 0, // Ollama doesn't provide token usage
          totalTokens: 0,
        },
      };
    } catch (error) {
      console.error('Ollama embedding error:', error);
      throw new Error(`Ollama embedding error: ${error}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(requests: EmbeddingRequest[]): Promise<EmbeddingResponse[]> {
    const results: EmbeddingResponse[] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.generateEmbedding(request));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Find most similar embeddings using cosine similarity
   */
  findMostSimilar(
    queryEmbedding: number[],
    candidateEmbeddings: Array<{ id: string; embedding: number[] }>,
    topK: number = 5
  ): Array<{ id: string; similarity: number }> {
    const similarities = candidateEmbeddings.map(candidate => ({
      id: candidate.id,
      similarity: this.calculateSimilarity(queryEmbedding, candidate.embedding),
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}
