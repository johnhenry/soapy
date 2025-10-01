import Fastify from 'fastify';
import { config } from 'dotenv';

config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

async function start() {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Soapy server listening on http://${HOST}:${PORT}`);
    console.log(`SOAP endpoint: http://${HOST}:${PORT}/soap`);
    console.log(`REST endpoint: http://${HOST}:${PORT}/v1`);
    console.log(`WSDL available at: http://${HOST}:${PORT}/soap?wsdl`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
