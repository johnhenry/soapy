import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import type { AIProvider, AIProviderConfig } from './base.js';

export { OpenAIProvider } from './openai.js';
export { AnthropicProvider } from './anthropic.js';
export type { AIProvider, AIProviderConfig, GenerationOptions, GenerationResult } from './base.js';

export type ProviderType = 'openai' | 'anthropic';

export class AIProviderOrchestrator {
  private providers: Map<ProviderType, AIProvider> = new Map();

  registerProvider(type: ProviderType, config: AIProviderConfig): void {
    const provider =
      type === 'openai'
        ? new OpenAIProvider(config)
        : new AnthropicProvider(config);

    this.providers.set(type, provider);
  }

  getProvider(type: ProviderType): AIProvider | undefined {
    return this.providers.get(type);
  }

  hasProvider(type: ProviderType): boolean {
    return this.providers.has(type);
  }

  async generate(
    type: ProviderType,
    prompt: string,
    options?: Parameters<AIProvider['generate']>[1]
  ): Promise<ReturnType<AIProvider['generate']>> {
    const provider = this.getProvider(type);
    if (!provider) {
      throw new Error(`Provider ${type} not registered`);
    }

    try {
      return await provider.generate(prompt, options);
    } catch (error) {
      console.error(`Error with provider ${type}:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const aiOrchestrator = new AIProviderOrchestrator();

// Initialize providers from environment variables
if (process.env.OPENAI_API_KEY) {
  aiOrchestrator.registerProvider('openai', {
    apiKey: process.env.OPENAI_API_KEY,
  });
}

if (process.env.ANTHROPIC_API_KEY) {
  aiOrchestrator.registerProvider('anthropic', {
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}
