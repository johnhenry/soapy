#!/usr/bin/env node

/**
 * soapy-health - Health check CLI tool
 * 
 * Demonstrates Constitutional Principle II: Every library has a CLI tool
 * This tool checks the health of the Soapy system components.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface HealthStatus {
  component: string;
  status: 'ok' | 'error';
  message: string;
}

async function checkWsdl(): Promise<HealthStatus> {
  try {
    const wsdlPath = join(__dirname, '../api/soap/soapy.wsdl');
    const wsdl = readFileSync(wsdlPath, 'utf-8');
    return {
      component: 'WSDL',
      status: wsdl.includes('SoapyService') ? 'ok' : 'error',
      message: wsdl.includes('SoapyService')
        ? 'WSDL file is valid'
        : 'WSDL file is malformed',
    };
  } catch (error) {
    return {
      component: 'WSDL',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkModels(): Promise<HealthStatus> {
  try {
    // Check if model files exist
    const models = [
      'conversation',
      'message',
      'branch',
      'tool-call',
      'tool-result',
    ];

    for (const model of models) {
      const modelPath = join(__dirname, `../models/${model}.ts`);
      readFileSync(modelPath, 'utf-8');
    }

    return {
      component: 'Models',
      status: 'ok',
      message: `All ${models.length} data models are available`,
    };
  } catch (error) {
    return {
      component: 'Models',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkPackageJson(): Promise<HealthStatus> {
  try {
    const pkgPath = join(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const hasEsModules = pkg.type === 'module';
    const hasRequiredDeps = ['fastify', 'strong-soap', 'openai'].every(
      (dep) => dep in (pkg.dependencies || {})
    );

    return {
      component: 'Package',
      status: hasEsModules && hasRequiredDeps ? 'ok' : 'error',
      message: hasEsModules && hasRequiredDeps
        ? 'Package configuration is valid'
        : 'Package configuration has issues',
    };
  } catch (error) {
    return {
      component: 'Package',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function runHealthCheck() {
  console.log('🧼 Soapy Health Check\n');

  const checks = [
    await checkWsdl(),
    await checkModels(),
    await checkPackageJson(),
  ];

  const hasJson = process.argv.includes('--json');

  if (hasJson) {
    console.log(JSON.stringify(checks, null, 2));
  } else {
    for (const check of checks) {
      const icon = check.status === 'ok' ? '✅' : '❌';
      console.log(`${icon} ${check.component}: ${check.message}`);
    }

    const allOk = checks.every((c) => c.status === 'ok');
    console.log(`\nOverall Status: ${allOk ? '✅ Healthy' : '❌ Issues Found'}`);
  }

  const hasErrors = checks.some((c) => c.status === 'error');
  process.exit(hasErrors ? 1 : 0);
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: soapy-health [options]

Options:
  --json    Output results in JSON format
  --help    Show this help message

Examples:
  soapy-health
  soapy-health --json
  `);
  process.exit(0);
}

runHealthCheck().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
