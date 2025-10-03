#!/usr/bin/env node

/**
 * Secret Access Check - WRITE Operations
 * 
 * This script checks if Copilot has the ability to write/set a secret
 * during a session. It attempts to:
 * 1. Check if SAMPLE_KEY exists
 * 2. Attempt to set SAMPLE_KEY in process.env
 * 3. Verify the write operation
 * 4. Demonstrate if environment variable modification is possible
 */

console.log('='.repeat(80));
console.log('SECRET ACCESS CHECK - WRITE Operations');
console.log('='.repeat(80));
console.log();

const testSecretName = 'SAMPLE_KEY';
const testSecretValue = 'test-value-' + Date.now();

console.log(`Test Secret: ${testSecretName}`);
console.log();

// Step 1: Check initial state
console.log('Step 1: Checking initial state...');
const initialValue = process.env[testSecretName];
if (initialValue === undefined) {
  console.log(`  ❌ ${testSecretName} is NOT defined in environment`);
} else if (initialValue === '' || initialValue === null) {
  console.log(`  ⚠️  ${testSecretName} is defined but empty`);
} else {
  console.log(`  ✅ ${testSecretName} already exists with value: ${initialValue.substring(0, 10)}...`);
}
console.log();

// Step 2: Attempt to write/set the secret
console.log('Step 2: Attempting to set secret in process.env...');
try {
  process.env[testSecretName] = testSecretValue;
  console.log(`  ✅ Successfully assigned value to process.env.${testSecretName}`);
} catch (error) {
  console.log(`  ❌ Failed to assign value: ${error.message}`);
}
console.log();

// Step 3: Verify the write
console.log('Step 3: Verifying write operation...');
const verifyValue = process.env[testSecretName];
const writeSuccessful = verifyValue === testSecretValue;

if (writeSuccessful) {
  console.log(`  ✅ WRITE SUCCESSFUL - Value matches what we set`);
  console.log(`     Expected: ${testSecretValue}`);
  console.log(`     Actual:   ${verifyValue}`);
} else if (verifyValue === initialValue) {
  console.log(`  ⚠️  WRITE IGNORED - Value unchanged from initial state`);
  console.log(`     Initial:  ${initialValue}`);
  console.log(`     Attempted: ${testSecretValue}`);
  console.log(`     Current:  ${verifyValue}`);
} else {
  console.log(`  ❌ UNEXPECTED STATE - Value changed but not to expected value`);
  console.log(`     Initial:  ${initialValue}`);
  console.log(`     Expected: ${testSecretValue}`);
  console.log(`     Actual:   ${verifyValue}`);
}
console.log();

// Step 4: Attempt to write to repository secrets (this will fail as expected)
console.log('Step 4: Checking if we can write to actual repository secrets...');
console.log('  Note: Writing to repository secrets requires GitHub API access');
console.log('  This test only verifies if Copilot can modify process.env');
console.log('  Repository secrets are read-only from within the runtime environment');
console.log();

console.log('='.repeat(80));
console.log('SUMMARY - WRITE Operations');
console.log('='.repeat(80));
console.log();

const results = {
  testSecret: testSecretName,
  initialState: {
    existed: initialValue !== undefined,
    hadValue: initialValue !== undefined && initialValue !== '' && initialValue !== null,
    value: initialValue
  },
  writeAttempt: {
    attemptedValue: testSecretValue,
    successful: writeSuccessful
  },
  verification: {
    currentValue: verifyValue,
    matches: writeSuccessful
  },
  capabilities: {
    canModifyProcessEnv: writeSuccessful,
    canWriteRepositorySecrets: false, // Always false - requires GitHub API
    note: 'process.env modifications are ephemeral and only affect current process'
  }
};

if (writeSuccessful) {
  console.log('✅ Copilot CAN modify process.env variables');
  console.log('   - This means we can SET environment variables in the current process');
  console.log('   - However, these changes are ephemeral (lost when process ends)');
  console.log('   - Repository secrets remain read-only and require GitHub API to modify');
} else {
  console.log('❌ Copilot CANNOT modify process.env variables');
  console.log('   - Environment is read-only in this context');
}
console.log();

console.log('📌 IMPORTANT NOTES:');
console.log('   1. Repository secrets are ALWAYS read-only from code/scripts');
console.log('   2. Writing repository secrets requires GitHub API credentials');
console.log('   3. process.env modifications only affect the current process');
console.log('   4. Secrets should never be committed to the repository');
console.log();

// Export JSON results
const fs = require('fs');
const path = require('path');
const resultsPath = path.join(__dirname, 'write-secrets-results.json');
fs.writeFileSync(resultsPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  results: results
}, null, 2));

console.log(`📄 Results saved to: ${resultsPath}`);
console.log();

process.exit(0);
