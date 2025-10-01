import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import soapPlugin from './api/soap/plugin.js';
import restPlugin from './api/rest/plugin.js';
import { authPlugin } from './lib/auth/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Register optional authentication plugin
  await fastify.register(authPlugin);

  // Register API plugins
  await fastify.register(soapPlugin);
  await fastify.register(restPlugin);

  return fastify;
}
