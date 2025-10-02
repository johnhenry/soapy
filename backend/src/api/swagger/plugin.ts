import type { FastifyPluginAsync } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import type { OpenAPIV3 } from 'openapi-types';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  // Load the OpenAPI spec from the YAML file
  // When running with tsx, __dirname points to src/api/swagger
  // When running compiled code, it points to dist/api/swagger
  // The spec is at: backend/../specs/002-create-a-comprehensive/contracts/openapi.yaml
  const openApiSpecPath = path.resolve(
    __dirname,
    '../../../..',
    'specs/002-create-a-comprehensive/contracts/openapi.yaml'
  );

  let openApiSpec: OpenAPIV3.Document;

  try {
    const yamlContent = fs.readFileSync(openApiSpecPath, 'utf8');
    openApiSpec = yaml.load(yamlContent) as OpenAPIV3.Document;
  } catch (error) {
    fastify.log.error({ error }, 'Failed to load OpenAPI spec');
    // Fallback to minimal spec
    openApiSpec = {
      openapi: '3.0.3',
      info: {
        title: 'Soapy REST API',
        description: 'Hybrid SOAP/REST AI API system',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000/v1',
          description: 'Local development server',
        },
      ],
      paths: {},
    };
  }

  // Register @fastify/swagger
  await fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      document: openApiSpec,
    },
  });

  // Register @fastify/swagger-ui
  await fastify.register(fastifySwaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });
};

export default swaggerPlugin;
