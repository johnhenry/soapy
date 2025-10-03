#!/usr/bin/env node

/**
 * Secret Access Check - READ Operations
 * 
 * This script checks if Copilot has access to read repository secrets
 * during a session. It attempts to read the following secrets:
 * - ANTHROPIC_API_KEY
 * - OPENAI_API_KEY
 */

console.log('='.repeat(80));
console.log('SECRET ACCESS CHECK - READ Operations');
console.log('='.repeat(80));
console.log();

const secrets = {
  'ANTHROPIC_API_KEY': process.env.ANTHROPIC_API_KEY,
  'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
};

const results = [];

for (const [secretName, secretValue] of Object.entries(secrets)) {
  console.log(`Checking: ${secretName}`);
  
  if (secretValue === undefined) {
    console.log(`  ❌ NOT ACCESSIBLE - Secret is undefined`);
    results.push({
      secret: secretName,
      accessible: false,
      reason: 'undefined',
      hasValue: false
    });
  } else if (secretValue === null || secretValue === '') {
    console.log(`  ⚠️  DEFINED BUT EMPTY - Secret exists but has no value`);
    results.push({
      secret: secretName,
      accessible: true,
      reason: 'empty',
      hasValue: false
    });
  } else {
    // Mask the secret value for security
    const maskedValue = secretValue.substring(0, 4) + '***' + secretValue.substring(secretValue.length - 4);
    console.log(`  ✅ ACCESSIBLE - Secret has value: ${maskedValue}`);
    console.log(`     Length: ${secretValue.length} characters`);
    results.push({
      secret: secretName,
      accessible: true,
      reason: 'has_value',
      hasValue: true,
      valueLength: secretValue.length,
      maskedValue: maskedValue
    });
  }
  console.log();
}

console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log();

const accessibleSecrets = results.filter(r => r.accessible && r.hasValue);
const inaccessibleSecrets = results.filter(r => !r.accessible);
const emptySecrets = results.filter(r => r.accessible && !r.hasValue);

console.log(`Total secrets checked: ${results.length}`);
console.log(`Accessible with values: ${accessibleSecrets.length}`);
console.log(`Defined but empty: ${emptySecrets.length}`);
console.log(`Not accessible: ${inaccessibleSecrets.length}`);
console.log();

if (accessibleSecrets.length > 0) {
  console.log('✅ Copilot CAN READ the following secrets:');
  accessibleSecrets.forEach(s => console.log(`   - ${s.secret}`));
  console.log();
}

if (emptySecrets.length > 0) {
  console.log('⚠️  Copilot can access these secrets but they are empty:');
  emptySecrets.forEach(s => console.log(`   - ${s.secret}`));
  console.log();
}

if (inaccessibleSecrets.length > 0) {
  console.log('❌ Copilot CANNOT READ the following secrets:');
  inaccessibleSecrets.forEach(s => console.log(`   - ${s.secret}`));
  console.log();
}

// Export JSON results
const fs = require('fs');
const path = require('path');
const resultsPath = path.join(__dirname, 'read-secrets-results.json');
fs.writeFileSync(resultsPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  results: results,
  summary: {
    total: results.length,
    accessible: accessibleSecrets.length,
    empty: emptySecrets.length,
    inaccessible: inaccessibleSecrets.length
  }
}, null, 2));

console.log(`📄 Results saved to: ${resultsPath}`);
console.log();

// Exit with appropriate code
process.exit(inaccessibleSecrets.length > 0 ? 1 : 0);
