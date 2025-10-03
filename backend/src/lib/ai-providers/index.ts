import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';
import type { AIProvider, AIProviderConfig } from './base.js';

export { OpenAIProvider } from './openai.js';
export { AnthropicProvider } from './anthropic.js';
export { OpenAICompatibleProvider } from './openai-compatible.js';
export type { AIProvider, AIProviderConfig, GenerationOptions, GenerationResult } from './base.js';

export type ProviderType = 'openai' | 'anthropic' | 'ollama' | 'lmstudio' | 'openai-compatible';

export class AIProviderOrchestrator {
  private providers: Map<ProviderType, AIProvider> = new Map();

  registerProvider(type: ProviderType, config: AIProviderConfig): void {
    let provider: AIProvider;

    switch (type) {
      case 'openai':
        provider = new OpenAIProvider(config);
        break;
      case 'anthropic':
        provider = new AnthropicProvider(config);
        break;
      case 'ollama':
        provider = new OpenAICompatibleProvider(config, 'ollama');
        break;
      case 'lmstudio':
        provider = new OpenAICompatibleProvider(config, 'lmstudio');
        break;
      case 'openai-compatible':
        provider = new OpenAICompatibleProvider(config, 'openai-compatible');
        break;
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }

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

    return await provider.generate(prompt, options);
  }

  getAvailableProviders(): ProviderType[] {
    return Array.from(this.providers.keys());
  }
}

// Singleton instance
export const aiOrchestrator = new AIProviderOrchestrator();

// Initialize providers from environment variables
if (process.env.OPENAI_API_KEY) {
  aiOrchestrator.registerProvider('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });
}

if (process.env.ANTHROPIC_API_KEY) {
  aiOrchestrator.registerProvider('anthropic', {
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

// Ollama - typically runs locally without API key
if (process.env.OLLAMA_BASE_URL) {
  aiOrchestrator.registerProvider('ollama', {
    apiKey: process.env.OLLAMA_API_KEY || 'not-needed',
    baseURL: process.env.OLLAMA_BASE_URL,
  });
}

// LM Studio - typically runs locally without API key
if (process.env.LMSTUDIO_BASE_URL) {
  aiOrchestrator.registerProvider('lmstudio', {
    apiKey: process.env.LMSTUDIO_API_KEY || 'not-needed',
    baseURL: process.env.LMSTUDIO_BASE_URL,
  });
}

// Generic OpenAI-compatible provider
if (process.env.OPENAI_COMPATIBLE_BASE_URL) {
  aiOrchestrator.registerProvider('openai-compatible', {
    apiKey: process.env.OPENAI_COMPATIBLE_API_KEY || 'not-needed',
    baseURL: process.env.OPENAI_COMPATIBLE_BASE_URL,
  });
}
