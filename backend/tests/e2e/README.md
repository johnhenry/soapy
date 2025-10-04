# End-to-End API Tests

This directory contains E2E tests that make **real API calls** to configured AI providers.

## Requirements

These tests require valid API keys configured in your `.env` file:

```bash
# At least one of these is required:
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://localhost:11434/v1
```

## Running E2E Tests

```bash
# Run only E2E tests (requires API keys)
npm run test:api

# Run all tests (unit, contract, integration, and E2E)
npm run test:all

# Run standard tests only (no API keys required)
npm test
```

## Test Files

### `provider-soap.test.ts`
Tests SOAP API with real AI providers:
- SOAP CommitMessage with AI response
- WSDL contract retrieval
- Commit hash verification

### `provider-rest.test.ts`
Tests REST API with real AI providers:
- Direct REST message submission
- OpenAI format retrieval
- Streaming responses
- Multiple provider support (OpenAI, Anthropic, Ollama)

### `provider-multi-protocol.test.ts`
Tests all 9 protocol configurations from TESTING_RESULTS.md:
- Config 1 (S): SOAP Direct
- Config 2 (R): REST Direct non-streaming
- Config 3 (R⚡): REST Direct streaming
- Config 7 (R→R): REST→REST Hybrid
- Config 9 (R→R⚡): REST→REST Streaming Hybrid
- Git storage verification

## Cost Considerations

⚠️ **These tests make real API calls and will incur costs:**

- OpenAI API: ~$0.0001-0.0003 per test (using gpt-4o-mini)
- Anthropic API: ~$0.0001-0.0003 per test (using claude-3-haiku)
- Ollama: Free (local)

Total cost for full test run: **~$0.01-0.03**

## Test Design

All tests:
- Use simple math questions (e.g., "What is 2+2?") for predictable responses
- Create unique conversation IDs per test to avoid conflicts
- Verify both response structure and content
- Clean up after themselves (conversation data persists in Git)

## Continuous Integration

For CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run standard tests
  run: npm test  # No API keys required

- name: Run E2E tests (only on main branch)
  if: github.ref == 'refs/heads/main'
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  run: npm run test:api
```

## Adding New E2E Tests

When adding new E2E tests:

1. Use `config()` and `initializeProviders()` in beforeAll
2. Use unique conversation IDs with timestamps
3. Use simple, predictable prompts for assertions
4. Test error cases gracefully (check if provider is available)
5. Document any new API costs

Example:

```typescript
import { config } from 'dotenv';
import { initializeProviders } from '../../src/lib/ai-providers/index.js';

config();

describe('My E2E Test', () => {
  beforeAll(async () => {
    initializeProviders();
    // ... setup
  });

  it('should test something', async () => {
    const convId = `test-my-feature-${Date.now()}`;
    // ... test code
  });
});
```

## Debugging

All test scripts run with `LOG_LEVEL=silent` by default to reduce noise from server logs. To see detailed logs:

```bash
# Debug logs for E2E tests
LOG_LEVEL=debug npm run test:api

# Debug logs for standard tests
LOG_LEVEL=debug npm test

# Debug logs for all tests
LOG_LEVEL=debug npm run test:all

# Info-level logs
LOG_LEVEL=info npm run test:api
```

To test a single file:

```bash
npx vitest run tests/e2e/provider-rest.test.ts
```

To test a single file with debug logs:

```bash
LOG_LEVEL=debug npx vitest run tests/e2e/provider-rest.test.ts
```
