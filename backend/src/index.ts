import { config } from 'dotenv';
import { buildApp } from './app.js';

config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

async function start() {
  const fastify = await buildApp();
  
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
