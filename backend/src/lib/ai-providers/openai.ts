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
