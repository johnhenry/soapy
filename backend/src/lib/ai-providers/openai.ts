import OpenAI from 'openai';
import type {
  AIProvider,
  AIProviderConfig,
  GenerationOptions,
  GenerationResult,
  StreamChunk,
} from './base.js';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL, // Optional custom base URL
    });
    this.defaultModel = config.model || 'gpt-4o-mini';
  }

  async listModels(): Promise<string[]> {
    // Return hardcoded list for OpenAI (their API doesn't expose all models reliably)
    return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  }

  async chat(messages: any[], options?: GenerationOptions): Promise<GenerationResult> {
    const model = options?.model || this.defaultModel;

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
        tools: options?.tools?.map((tool) => ({
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
      });

      const choice = completion.choices[0];
      const toolCalls = choice.message.tool_calls?.map((tc: any) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      }));

      return {
        content: choice.message.content || '',
        model: completion.model,
        finishReason: toolCalls ? 'tool_calls' : (choice.finish_reason as GenerationResult['finishReason']),
        toolCalls,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('OpenAI chat completion failed:', error);
      return {
        content: '',
        model,
        finishReason: 'error',
      };
    }
  }

  async *chatStream(
    messages: any[],
    options?: GenerationOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const model = options?.model || this.defaultModel;

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        const done = chunk.choices[0]?.finish_reason !== null;

        yield {
          delta,
          done,
          finishReason: chunk.choices[0]?.finish_reason as StreamChunk['finishReason'],
        };
      }
    } catch (error) {
      console.error('OpenAI chat stream failed:', error);
      yield { delta: '', done: true, finishReason: 'error' };
    }
  }

  async generate(prompt: string, options?: GenerationOptions): Promise<GenerationResult> {
    const model = options?.model || this.defaultModel;

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
        tools: options?.tools?.map((tool) => ({
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
        tool_choice: options?.tools && options.tools.length > 0 ? 'auto' : undefined,
      });

      const choice = completion.choices[0];

      const toolCalls = choice.message.tool_calls?.map((tc: any) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      }));

      return {
        content: choice.message.content || '',
        model: completion.model,
        finishReason: toolCalls ? 'tool_calls' : (choice.finish_reason as GenerationResult['finishReason']),
        toolCalls,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      return {
        content: '',
        model,
        finishReason: 'error',
      };
    }
  }

  async *stream(
    prompt: string,
    options?: GenerationOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const model = options?.model || this.defaultModel;

    const stream = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens || 1000,
      temperature: options?.temperature || 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      const done = chunk.choices[0]?.finish_reason !== null;

      yield {
        delta,
        done,
        finishReason: chunk.choices[0]?.finish_reason as StreamChunk['finishReason'],
      };
    }
  }

  async toolCall(
    prompt: string,
    toolName: string,
    parameters: Record<string, unknown>,
    options?: GenerationOptions
  ): Promise<GenerationResult> {
    return this.generate(prompt, {
      ...options,
      tools: [
        {
          name: toolName,
          description: `Execute ${toolName}`,
          parameters,
        },
      ],
    });
  }
}
