import type { ProviderType } from './index.js';
import type { AIProviderConfig } from './base.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';
import type { AIProvider } from './base.js';

export interface ProviderRegistryEntry {
  type: ProviderType;
  envKey: string; // Environment variable that must be set for provider to be available
  configFactory: (env: NodeJS.ProcessEnv) => AIProviderConfig | null;
  providerFactory: (config: AIProviderConfig) => AIProvider;
}

/**
 * Declarative provider registry
 * Adding a new provider only requires adding an entry here
 */
export const providerRegistry: ProviderRegistryEntry[] = [
  {
    type: 'openai',
    envKey: 'OPENAI_API_KEY',
    configFactory: (env) => {
      if (!env.OPENAI_API_KEY) return null;
      return {
        apiKey: env.OPENAI_API_KEY,
        baseURL: env.OPENAI_BASE_URL,
      };
    },
    providerFactory: (config) => new OpenAIProvider(config),
  },
  {
    type: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    configFactory: (env) => {
      if (!env.ANTHROPIC_API_KEY) return null;
      return {
        apiKey: env.ANTHROPIC_API_KEY,
      };
    },
    providerFactory: (config) => new AnthropicProvider(config),
  },
  {
    type: 'ollama',
    envKey: 'OLLAMA_BASE_URL',
    configFactory: (env) => {
      if (!env.OLLAMA_BASE_URL) return null;
      return {
        apiKey: env.OLLAMA_API_KEY || 'not-needed',
        baseURL: env.OLLAMA_BASE_URL,
      };
    },
    providerFactory: (config) => new OpenAICompatibleProvider(config, 'ollama'),
  },
  {
    type: 'lmstudio',
    envKey: 'LMSTUDIO_BASE_URL',
    configFactory: (env) => {
      if (!env.LMSTUDIO_BASE_URL) return null;
      return {
        apiKey: env.LMSTUDIO_API_KEY || 'not-needed',
        baseURL: env.LMSTUDIO_BASE_URL,
      };
    },
    providerFactory: (config) => new OpenAICompatibleProvider(config, 'lmstudio'),
  },
  {
    type: 'openai-compatible',
    envKey: 'OPENAI_COMPATIBLE_BASE_URL',
    configFactory: (env) => {
      if (!env.OPENAI_COMPATIBLE_BASE_URL) return null;
      return {
        apiKey: env.OPENAI_COMPATIBLE_API_KEY || 'not-needed',
        baseURL: env.OPENAI_COMPATIBLE_BASE_URL,
      };
    },
    providerFactory: (config) => new OpenAICompatibleProvider(config, 'openai-compatible'),
  },
];
