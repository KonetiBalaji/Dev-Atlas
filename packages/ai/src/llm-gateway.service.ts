import OpenAI from 'openai';
import { ModelRouterService } from './model-router.service';

export class LlmGatewayService {
  private openai: OpenAI;

  constructor(private readonly modelRouter: ModelRouterService) {
    const activeModel = this.modelRouter.getActiveModel();
    const baseURL = activeModel === 'ollama' ? process.env.OLLAMA_BASE_URL : 'https://api.openai.com/v1';
    const apiKey = activeModel === 'ollama' ? 'ollama' : process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('No LLM API key found. AI features will be disabled.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });
  }

  getActiveModel(): string {
    return this.modelRouter.getActiveModel();
  }

  async getCompletion(prompt: string): Promise<string> {
    if (!this.openai.apiKey) {
      return 'AI features disabled. No API key provided.';
    }

    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-3.5-turbo', // This could also be made dynamic
      });
      return chatCompletion.choices[0].message.content || 'No response generated';
    } catch (error) {
      console.error('LLM completion failed:', error);
      return 'Error generating summary.';
    }
  }
}
