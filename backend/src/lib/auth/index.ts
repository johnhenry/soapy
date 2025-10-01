/**
 * Optional Authentication/Authorization Library
 * 
 * Provides API key validation and organization-based access control.
 * Can be enabled/disabled via environment variables.
 */

export interface AuthConfig {
  enabled: boolean;
  apiKeys: string[];
  requireOrganization: boolean;
}

export interface AuthContext {
  authenticated: boolean;
  apiKey?: string;
  organizationId?: string;
  userId?: string;
}

export interface AuthResult {
  success: boolean;
  context?: AuthContext;
  error?: string;
}

export class AuthManager {
  private config: AuthConfig;
  private apiKeyMap: Map<string, { organizationId: string; userId: string }> = new Map();

  constructor(config: AuthConfig) {
    this.config = config;
    
    // Parse API keys in format: key:orgId:userId
    config.apiKeys.forEach((keyString) => {
      const parts = keyString.split(':');
      if (parts.length === 3) {
        const [key, orgId, userId] = parts;
        this.apiKeyMap.set(key, { organizationId: orgId, userId });
      }
    });
  }

  /**
   * Validate API key from request headers
   */
  validateApiKey(apiKey: string): AuthResult {
    if (!this.config.enabled) {
      return {
        success: true,
        context: {
          authenticated: false,
        },
      };
    }

    if (!apiKey) {
      return {
        success: false,
        error: 'API key required',
      };
    }

    const keyData = this.apiKeyMap.get(apiKey);
    if (!keyData) {
      return {
        success: false,
        error: 'Invalid API key',
      };
    }

    return {
      success: true,
      context: {
        authenticated: true,
        apiKey,
        organizationId: keyData.organizationId,
        userId: keyData.userId,
      },
    };
  }

  /**
   * Check if user has access to organization
   */
  checkOrganizationAccess(
    context: AuthContext,
    targetOrganizationId: string
  ): boolean {
    if (!this.config.enabled || !this.config.requireOrganization) {
      return true;
    }

    if (!context.authenticated) {
      return false;
    }

    return context.organizationId === targetOrganizationId;
  }

  /**
   * Check if user has access to conversation
   */
  checkConversationAccess(
    context: AuthContext,
    conversationOrganizationId: string
  ): boolean {
    return this.checkOrganizationAccess(context, conversationOrganizationId);
  }

  /**
   * Extract API key from headers
   */
  extractApiKey(headers: Record<string, string | string[] | undefined>): string | undefined {
    // Check X-API-Key header
    const xApiKey = headers['x-api-key'] || headers['X-API-Key'];
    if (xApiKey && typeof xApiKey === 'string') {
      return xApiKey;
    }

    // Check Authorization header (Bearer token)
    const auth = headers['authorization'] || headers['Authorization'];
    if (auth && typeof auth === 'string') {
      const match = auth.match(/^Bearer\s+(.+)$/i);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// Create default auth manager from environment
const authConfig: AuthConfig = {
  enabled: process.env.AUTH_ENABLED === 'true',
  apiKeys: process.env.API_KEYS ? process.env.API_KEYS.split(',') : [],
  requireOrganization: process.env.AUTH_REQUIRE_ORG === 'true',
};

export const authManager = new AuthManager(authConfig);

// Fastify plugin for authentication
export async function authPlugin(fastify: any) {
  if (!authManager.isEnabled()) {
    fastify.log.info('Authentication is disabled');
    return;
  }

  fastify.log.info('Authentication is enabled');

  // Add authentication hook
  fastify.addHook('onRequest', async (request: any, reply: any) => {
    // Skip auth for health check and WSDL endpoints
    if (request.url === '/health' || request.url === '/soap?wsdl') {
      return;
    }

    const apiKey = authManager.extractApiKey(request.headers);
    const result = authManager.validateApiKey(apiKey || '');

    if (!result.success) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: result.error || 'Authentication required',
      });
      return;
    }

    // Attach auth context to request
    request.authContext = result.context;
  });
}
