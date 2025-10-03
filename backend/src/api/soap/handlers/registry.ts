import type { FastifyInstance } from 'fastify';

export interface SoapOperationContext {
  fastify: FastifyInstance;
  extractText: (xml: string, tagName: string) => string;
  extractCDATA: (xml: string, tagName: string) => string;
  escapeXml: (str: string) => string;
}

export type SoapOperationHandler = (
  request: string,
  context: SoapOperationContext
) => Promise<string>;

class SoapHandlerRegistry {
  private handlers = new Map<string, SoapOperationHandler>();

  register(operation: string, handler: SoapOperationHandler): void {
    this.handlers.set(operation, handler);
  }

  get(operation: string): SoapOperationHandler | undefined {
    return this.handlers.get(operation);
  }

  has(operation: string): boolean {
    return this.handlers.has(operation);
  }

  getOperations(): string[] {
    return Array.from(this.handlers.keys());
  }
}

export const soapHandlerRegistry = new SoapHandlerRegistry();
