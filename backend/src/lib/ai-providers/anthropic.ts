import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProvider,
  AIProviderConfig,
  GenerationOptions,
  GenerationResult,
  StreamChunk,
} from './base.js';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private client: Anthropic;
  private defaultModel: string;

  constructor(config: AIProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.defaultModel = config.model || 'claude-3-opus-20240229';
  }

  async generate(prompt: string, options?: GenerationOptions): Promise<GenerationResult> {
    const model = options?.model || this.defaultModel;

    try {
      const message = await this.client.messages.create({
        model,
        max_tokens: options?.maxTokens || 1000,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature || 0.7,
        tools: options?.tools?.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters as any,
        })),
      });

      const textContent = message.content.find((c: any) => c.type === 'text');
      const toolUse = message.content.find((c: any) => c.type === 'tool_use');

      const toolCalls = toolUse && toolUse.type === 'tool_use'
        ? [
            {
              name: toolUse.name,
              arguments: toolUse.input as Record<string, unknown>,
            },
          ]
        : undefined;

      return {
        content: textContent && textContent.type === 'text' ? textContent.text : '',
        model: message.model,
        finishReason: toolCalls ? 'tool_calls' : (message.stop_reason as GenerationResult['finishReason']),
        toolCalls,
        usage: {
          promptTokens: message.usage.input_tokens,
          completionTokens: message.usage.output_tokens,
          totalTokens: message.usage.input_tokens + message.usage.output_tokens,
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

    const stream = await this.client.messages.stream({
      model,
      max_tokens: options?.maxTokens || 1000,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature || 0.7,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield {
          delta: event.delta.text,
          done: false,
        };
      } else if (event.type === 'message_stop') {
        yield {
          delta: '',
          done: true,
          finishReason: 'stop',
        };
      }
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
