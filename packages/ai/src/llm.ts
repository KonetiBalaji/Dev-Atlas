// DevAtlas LLM Integration
// Created by Balaji Koneti

import OpenAI from 'openai';
import axios from 'axios';
import { LLMProvider, ModelConfig, LLMRequest, LLMResponse } from './types';

export class LLMService {
  private openai?: OpenAI;
  private ollamaBaseUrl: string;
  private defaultModel: string;
  private maxTokensPerRepo: number;

  constructor(config: {
    openaiApiKey?: string;
    ollamaBaseUrl?: string;
    defaultModel?: string;
    maxTokensPerRepo?: number;
  }) {
    // Initialize OpenAI client if API key is provided
    if (config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.openaiApiKey,
      });
    }

    // Set Ollama configuration
    this.ollamaBaseUrl = config.ollamaBaseUrl || 'http://localhost:11434';
    this.defaultModel = config.defaultModel || 'gpt-3.5-turbo';
    this.maxTokensPerRepo = config.maxTokensPerRepo || 40000;
  }

  /**
   * Generate text completion using configured LLM provider
   */
  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.defaultModel;
    
    // Try OpenAI first, fallback to Ollama
    if (this.openai && model.startsWith('gpt-')) {
      return this.generateOpenAICompletion(request);
    } else {
      return this.generateOllamaCompletion(request);
    }
  }

  /**
   * Generate completion using OpenAI API
   */
  private async generateOpenAICompletion(request: LLMRequest): Promise<LLMResponse> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: request.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        max_tokens: request.maxTokens || 200,
        temperature: request.temperature || 0.1,
      });

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No content in OpenAI response');
      }

      return {
        content: choice.message.content,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        model: response.model,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error}`);
    }
  }

  /**
   * Generate completion using Ollama API
   */
  private async generateOllamaCompletion(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || 'llama3:instruct';
    
    try {
      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model,
        prompt: request.prompt,
        stream: false,
        options: {
          temperature: request.temperature || 0.1,
          num_predict: request.maxTokens || 200,
        },
      });

      return {
        content: response.data.response,
        usage: {
          promptTokens: response.data.prompt_eval_count || 0,
          completionTokens: response.data.eval_count || 0,
          totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0),
        },
        model: response.data.model,
      };
    } catch (error) {
      console.error('Ollama API error:', error);
      throw new Error(`Ollama API error: ${error}`);
    }
  }

  /**
   * Check if we're within token budget for repository analysis
   */
  isWithinTokenBudget(currentTokens: number): boolean {
    return currentTokens < this.maxTokensPerRepo;
  }

  /**
   * Get available models for the configured provider
   */
  async getAvailableModels(): Promise<string[]> {
    if (this.openai) {
      try {
        const models = await this.openai.models.list();
        return models.data.map(model => model.id);
      } catch (error) {
        console.error('Error fetching OpenAI models:', error);
      }
    }

    // Fallback to Ollama models
    try {
      const response = await axios.get(`${this.ollamaBaseUrl}/api/tags`);
      return response.data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      return [];
    }
  }

  /**
   * Estimate token count for a given text (rough approximation)
   */
  estimateTokenCount(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }
}
