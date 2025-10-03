import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';
import type { AIProvider, AIProviderConfig, ChatMessage, GenerationOptions, GenerationResult, StreamChunk } from './base.js';

export { OpenAIProvider } from './openai.js';
export { AnthropicProvider } from './anthropic.js';
export { OpenAICompatibleProvider } from './openai-compatible.js';
export type { AIProvider, AIProviderConfig, ChatMessage, GenerationOptions, GenerationResult, StreamChunk } from './base.js';

export type ProviderType = 'openai' | 'anthropic' | 'ollama' | 'lmstudio' | 'openai-compatible';

export class AIProviderOrchestrator {
  private providers: Map<ProviderType, AIProvider> = new Map();

  registerProvider(type: ProviderType, provider: AIProvider): void {
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

  async listModels(type: ProviderType): Promise<string[]> {
    const provider = this.getProvider(type);
    if (!provider) {
      throw new Error(`Provider ${type} not registered`);
    }
    return await provider.listModels();
  }

  async chat(
    type: ProviderType,
    messages: ChatMessage[],
    options?: GenerationOptions
  ): Promise<GenerationResult> {
    const provider = this.getProvider(type);
    if (!provider) {
      throw new Error(`Provider ${type} not registered`);
    }
    return await provider.chat(messages, options);
  }

  async *chatStream(
    type: ProviderType,
    messages: ChatMessage[],
    options?: GenerationOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const provider = this.getProvider(type);
    if (!provider) {
      throw new Error(`Provider ${type} not registered`);
    }
    yield* provider.chatStream(messages, options);
  }

  getAvailableProviders(): ProviderType[] {
    return Array.from(this.providers.keys());
  }
}

// Singleton instance
export const aiOrchestrator = new AIProviderOrchestrator();

import { providerRegistry } from './registry.js';

/**
 * Initialize providers from environment variables using the declarative registry
 * This must be called after dotenv config is loaded
 *
 * To add a new provider:
 * 1. Create provider class implementing AIProvider interface
 * 2. Add entry to providerRegistry in registry.ts
 * That's it! All endpoints automatically work.
 */
export function initializeProviders() {
  for (const entry of providerRegistry) {
    const config = entry.configFactory(process.env);
    if (config) {
      const provider = entry.providerFactory(config);
      aiOrchestrator.registerProvider(entry.type, provider);
    }
  }
}
