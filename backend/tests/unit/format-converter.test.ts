import { describe, it, expect } from 'vitest';
import { toOpenAI, toAnthropic } from '../../src/lib/format-converter/index.js';
import type { Message } from '../../src/models/message.js';
import type { ToolCall } from '../../src/models/tool-call.js';
import type { ToolResult } from '../../src/models/tool-result.js';

describe('Format Converter - Vision Support', () => {
  describe('OpenAI Format', () => {
    it('should convert text-only message to string content', () => {
      const messages: Message[] = [
        {
          sequenceNumber: 1,
          role: 'user',
          content: 'Hello, world!',
          timestamp: new Date(),
          commitHash: 'abc123',
        },
      ];

      const result = toOpenAI(messages);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('Hello, world!');
      expect(typeof result.messages[0].content).toBe('string');
    });

    it('should convert message with image to content array', () => {
      const messages: Message[] = [
        {
          sequenceNumber: 1,
          role: 'user',
          content: 'What is in this image?',
          timestamp: new Date(),
          commitHash: 'abc123',
          attachments: [
            {
              filename: 'test.jpg',
              contentType: 'image/jpeg',
              size: 1024,
              data: 'base64encodeddata',
            },
          ],
        },
      ];

      const result = toOpenAI(messages);

      expect(result.messages).toHaveLength(1);
      expect(Array.isArray(result.messages[0].content)).toBe(true);
      
      const content = result.messages[0].content as Array<any>;
      expect(content).toHaveLength(2);
      expect(content[0]).toEqual({ type: 'text', text: 'What is in this image?' });
      expect(content[1]).toEqual({
        type: 'image_url',
        image_url: { url: 'data:image/jpeg;base64,base64encodeddata' },
      });
    });

    it('should handle multiple images in one message', () => {
      const messages: Message[] = [
        {
          sequenceNumber: 1,
          role: 'user',
          content: 'Compare these images',
          timestamp: new Date(),
          commitHash: 'abc123',
          attachments: [
            {
              filename: 'img1.jpg',
              contentType: 'image/jpeg',
              size: 1024,
              data: 'image1data',
            },
            {
              filename: 'img2.png',
              contentType: 'image/png',
              size: 2048,
              data: 'image2data',
            },
          ],
        },
      ];

      const result = toOpenAI(messages);

      const content = result.messages[0].content as Array<any>;
      expect(content).toHaveLength(3);
      expect(content[0].type).toBe('text');
      expect(content[1].type).toBe('image_url');
      expect(content[2].type).toBe('image_url');
      expect(content[1].image_url.url).toContain('image/jpeg');
      expect(content[2].image_url.url).toContain('image/png');
    });

    it('should skip non-image attachments', () => {
      const messages: Message[] = [
        {
          sequenceNumber: 1,
          role: 'user',
          content: 'Here is a document',
          timestamp: new Date(),
          commitHash: 'abc123',
          attachments: [
            {
              filename: 'doc.pdf',
              contentType: 'application/pdf',
              size: 1024,
              data: 'pdfdata',
            },
          ],
        },
      ];

      const result = toOpenAI(messages);

      // Should use string content since no images
      expect(typeof result.messages[0].content).toBe('string');
      expect(result.messages[0].content).toBe('Here is a document');
    });

    it('should handle messages with tool calls and images', () => {
      const messages: Message[] = [
        {
          sequenceNumber: 1,
          role: 'user',
          content: 'Analyze this image',
          timestamp: new Date(),
          commitHash: 'abc123',
          attachments: [
            {
              filename: 'test.jpg',
              contentType: 'image/jpeg',
              size: 1024,
              data: 'imagedata',
            },
          ],
        },
      ];

      const toolCalls: ToolCall[] = [
        {
          sequenceNumber: 1,
          toolName: 'analyze_image',
          parameters: { format: 'detailed' },
          timestamp: new Date(),
          commitHash: 'def456',
        },
      ];

      const result = toOpenAI(messages, toolCalls);

      expect(result.messages[0].tool_calls).toBeDefined();
      expect(result.messages[0].tool_calls).toHaveLength(1);
      expect(Array.isArray(result.messages[0].content)).toBe(true);
    });
  });

  describe('Anthropic Format', () => {
    it('should convert message with image to content blocks', () => {
      const messages: Message[] = [
        {
          sequenceNumber: 1,
          role: 'user',
          content: 'What is in this image?',
          timestamp: new Date(),
          commitHash: 'abc123',
          attachments: [
            {
              filename: 'test.jpg',
              contentType: 'image/jpeg',
              size: 1024,
              data: 'base64encodeddata',
            },
          ],
        },
      ];

      const result = toAnthropic(messages);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toHaveLength(2);
      
      const content = result.messages[0].content;
      expect(content[0]).toEqual({ type: 'text', text: 'What is in this image?' });
      expect(content[1]).toEqual({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: 'base64encodeddata',
        },
      });
    });

    it('should handle multiple images in Anthropic format', () => {
      const messages: Message[] = [
        {
          sequenceNumber: 1,
          role: 'user',
          content: 'Compare these',
          timestamp: new Date(),
          commitHash: 'abc123',
          attachments: [
            {
              filename: 'img1.jpg',
              contentType: 'image/jpeg',
              size: 1024,
              data: 'image1data',
            },
            {
              filename: 'img2.png',
              contentType: 'image/png',
              size: 2048,
              data: 'image2data',
            },
          ],
        },
      ];

      const result = toAnthropic(messages);

      const content = result.messages[0].content;
      expect(content).toHaveLength(3);
      expect(content[0].type).toBe('text');
      expect(content[1].type).toBe('image');
      expect(content[2].type).toBe('image');
    });

    it('should skip images without base64 data', () => {
      const messages: Message[] = [
        {
          sequenceNumber: 1,
          role: 'user',
          content: 'Image reference',
          timestamp: new Date(),
          commitHash: 'abc123',
          attachments: [
            {
              filename: 'img.jpg',
              contentType: 'image/jpeg',
              size: 1024,
              path: 'files/img.jpg', // Only path, no data
            },
          ],
        },
      ];

      const result = toAnthropic(messages);

      // Should only have text content block
      expect(result.messages[0].content).toHaveLength(1);
      expect(result.messages[0].content[0].type).toBe('text');
    });

    it('should handle text-only messages', () => {
      const messages: Message[] = [
        {
          sequenceNumber: 1,
          role: 'user',
          content: 'Just text',
          timestamp: new Date(),
          commitHash: 'abc123',
        },
      ];

      const result = toAnthropic(messages);

      expect(result.messages[0].content).toHaveLength(1);
      expect(result.messages[0].content[0]).toEqual({
        type: 'text',
        text: 'Just text',
      });
    });
  });

  describe('Round-trip Conversion', () => {
    it('should preserve image information through conversion', () => {
      const messages: Message[] = [
        {
          sequenceNumber: 1,
          role: 'user',
          content: 'Analyze',
          timestamp: new Date(),
          commitHash: 'abc123',
          attachments: [
            {
              filename: 'test.jpg',
              contentType: 'image/jpeg',
              size: 1024,
              data: 'testdata',
            },
          ],
        },
      ];

      const openaiResult = toOpenAI(messages);
      const anthropicResult = toAnthropic(messages);

      // Both should have vision content
      expect(Array.isArray(openaiResult.messages[0].content)).toBe(true);
      expect(anthropicResult.messages[0].content.length).toBeGreaterThan(1);
      
      // OpenAI should have image_url
      const openaiContent = openaiResult.messages[0].content as Array<any>;
      expect(openaiContent.some(c => c.type === 'image_url')).toBe(true);
      
      // Anthropic should have image
      expect(anthropicResult.messages[0].content.some(c => c.type === 'image')).toBe(true);
    });
  });

  describe('Tool Calls with Vision', () => {
    it('should handle tool calls alongside images in OpenAI format', () => {
      const messages: Message[] = [
        {
          sequenceNumber: 1,
          role: 'user',
          content: 'Analyze',
          timestamp: new Date(),
          commitHash: 'abc123',
          attachments: [
            {
              filename: 'img.jpg',
              contentType: 'image/jpeg',
              size: 1024,
              data: 'imagedata',
            },
          ],
        },
        {
          sequenceNumber: 2,
          role: 'assistant',
          content: 'Analysis complete',
          timestamp: new Date(),
          commitHash: 'def456',
        },
      ];

      const toolCalls: ToolCall[] = [
        {
          sequenceNumber: 2,
          toolName: 'get_details',
          parameters: { id: 123 },
          timestamp: new Date(),
          commitHash: 'ghi789',
        },
      ];

      const result = toOpenAI(messages, toolCalls);

      expect(result.messages).toHaveLength(2);
      expect(Array.isArray(result.messages[0].content)).toBe(true);
      expect(result.messages[1].tool_calls).toBeDefined();
    });

    it('should handle tool results alongside images in Anthropic format', () => {
      const messages: Message[] = [
        {
          sequenceNumber: 1,
          role: 'user',
          content: 'Check this',
          timestamp: new Date(),
          commitHash: 'abc123',
          attachments: [
            {
              filename: 'img.jpg',
              contentType: 'image/jpeg',
              size: 1024,
              data: 'imagedata',
            },
          ],
        },
      ];

      const toolCalls: ToolCall[] = [
        {
          sequenceNumber: 1,
          toolName: 'check_image',
          parameters: {},
          timestamp: new Date(),
          commitHash: 'def456',
        },
      ];

      const toolResults: ToolResult[] = [
        {
          sequenceNumber: 1,
          toolCallRef: 1,
          result: { status: 'ok' },
          timestamp: new Date(),
          commitHash: 'ghi789',
        },
      ];

      const result = toAnthropic(messages, toolCalls, toolResults);

      const content = result.messages[0].content;
      expect(content.some(c => c.type === 'text')).toBe(true);
      expect(content.some(c => c.type === 'image')).toBe(true);
      expect(content.some(c => c.type === 'tool_use')).toBe(true);
      expect(content.some(c => c.type === 'tool_result')).toBe(true);
    });
  });
});
