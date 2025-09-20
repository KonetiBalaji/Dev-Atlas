// A placeholder for routing requests to the correct model (e.g., based on cost, capability).
export class ModelRouterService {
  getActiveModel(): string {
    // Logic to determine the best model to use.
    // Could be based on env vars, config, or dynamic factors.
    return process.env.OPENAI_API_KEY ? 'openai' : 'ollama';
  }
}
