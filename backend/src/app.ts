import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import soapPlugin from './api/soap/plugin.js';
import restPlugin from './api/rest/plugin.js';
import swaggerPlugin from './api/swagger/plugin.js';
import { authPlugin } from './lib/auth/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Register CORS for frontend
  await fastify.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  // Register optional authentication plugin
  await fastify.register(authPlugin);

  // Register Swagger/OpenAPI documentation
  await fastify.register(swaggerPlugin);

  // Register API plugins
  await fastify.register(soapPlugin);
  await fastify.register(restPlugin);

  return fastify;
}
