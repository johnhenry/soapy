# AI Provider Integration Guide

Soapy supports multiple AI providers, giving you flexibility to choose between cloud APIs and local LLM servers.

## Supported Providers

| Provider | Type | API Key Required | Setup Difficulty |
|----------|------|------------------|------------------|
| OpenAI | Cloud | Yes | Easy |
| Anthropic | Cloud | Yes | Easy |
| Ollama | Local | No | Easy |
| LM Studio | Local | No | Medium |
| OpenAI-Compatible | Cloud/Local | Varies | Easy |

## Quick Start Examples

### OpenAI

1. Get your API key from https://platform.openai.com/api-keys
2. Add to `backend/.env`:
```bash
OPENAI_API_KEY=sk-your-key-here
```

3. Use via CLI:
```bash
npm run soapy -- ai generate --provider openai --prompt "Hello, world!"
```

### Anthropic (Claude)

1. Get your API key from https://console.anthropic.com/
2. Add to `backend/.env`:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

3. Use via CLI:
```bash
npm run soapy -- ai generate --provider anthropic --prompt "Explain quantum computing"
```

### Ollama (Local)

Ollama runs LLMs locally on your machine.

1. Install Ollama from https://ollama.ai/
2. Start the Ollama server:
```bash
ollama serve
```

3. Pull a model (in a new terminal):
```bash
ollama pull llama2
# or try other models:
# ollama pull llama3
# ollama pull mistral
# ollama pull codellama
```

4. Configure in `backend/.env`:
```bash
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama2
```

5. Use via CLI:
```bash
npm run soapy -- ai generate --provider ollama --prompt "What is machine learning?"
```

**Available Ollama Models**: Check https://ollama.ai/library for the full list.

### LM Studio (Local)

LM Studio provides a desktop app for running LLMs locally with a user-friendly interface.

1. Download LM Studio from https://lmstudio.ai/
2. Open LM Studio and download a model from the "Discover" tab
3. Go to "Local Server" tab and click "Start Server"
4. Note the server URL (usually `http://localhost:1234`)

5. Configure in `backend/.env`:
```bash
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=local-model  # Use the model name shown in LM Studio
```

6. Use via CLI:
```bash
npm run soapy -- ai generate --provider lmstudio --prompt "Explain neural networks"
```

### OpenAI-Compatible Providers

Many providers offer OpenAI-compatible APIs. Examples include:
- **Together AI** (https://together.ai/)
- **Groq** (https://groq.com/)
- **LocalAI** (https://localai.io/)
- **OpenRouter** (https://openrouter.ai/)
- **Azure OpenAI Service**

Example configuration for Together AI:
```bash
OPENAI_COMPATIBLE_BASE_URL=https://api.together.xyz/v1
OPENAI_COMPATIBLE_API_KEY=your-together-api-key
OPENAI_COMPATIBLE_MODEL=mistralai/Mixtral-8x7B-Instruct-v0.1
```

Use via CLI:
```bash
npm run soapy -- ai generate --provider openai-compatible --prompt "Hello from Together AI!"
```

## Using Providers in Code

```typescript
import { aiOrchestrator } from './lib/ai-providers/index.js';

// Generate text
const result = await aiOrchestrator.generate('openai', 'Hello, world!', {
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 100
});

console.log(result.content);
```

## Streaming Responses

All providers support streaming:

```bash
# CLI streaming
npm run soapy -- ai stream --provider ollama --prompt "Tell me a story"
```

```typescript
// Code streaming
const provider = aiOrchestrator.getProvider('ollama');
for await (const chunk of provider.stream('Tell me a story')) {
  process.stdout.write(chunk.delta);
}
```

## Choosing the Right Provider

### Use OpenAI or Anthropic when:
- You need the highest quality responses
- You want access to the latest models
- You're okay with API costs
- You need reliable uptime

### Use Ollama when:
- You want to run models locally
- Privacy is a concern
- You want to experiment with different models
- You need offline access
- You want to minimize API costs

### Use LM Studio when:
- You want a GUI for managing local models
- You're new to local LLMs
- You want easy model switching
- You need a user-friendly interface

### Use OpenAI-Compatible when:
- You want to use a specific provider's models
- You need specialized capabilities (e.g., code generation with Groq)
- You want competitive pricing
- You're migrating from OpenAI

## Troubleshooting

### Provider not configured error
```
Error: Provider 'ollama' not registered
```
**Solution**: Make sure the required environment variable (e.g., `OLLAMA_BASE_URL`) is set in `backend/.env`

### Connection refused
```
Error: connect ECONNREFUSED 127.0.0.1:11434
```
**Solution**: Start the Ollama/LM Studio server before making requests

### Invalid API key
```
Error: Incorrect API key provided
```
**Solution**: Verify your API key is correct and has the necessary permissions

### Model not found
```
Error: Model 'llama2' not found
```
**Solution**: For Ollama, run `ollama pull llama2` first. For LM Studio, make sure the model is loaded.

## Performance Comparison

| Provider | Speed | Quality | Cost | Privacy |
|----------|-------|---------|------|---------|
| OpenAI GPT-4 | Medium | Excellent | High | Low |
| Anthropic Claude | Medium | Excellent | High | Low |
| Ollama (llama2) | Fast* | Good | Free | High |
| LM Studio | Fast* | Good | Free | High |
| Groq | Very Fast | Good | Medium | Low |

*Speed depends on your hardware (GPU recommended for local providers)

## Best Practices

1. **Start with cloud providers** (OpenAI/Anthropic) for development
2. **Use local providers** (Ollama/LM Studio) for testing and privacy-sensitive applications
3. **Set reasonable token limits** to control costs with cloud providers
4. **Use streaming** for better user experience with long responses
5. **Cache responses** when appropriate to reduce API calls
6. **Monitor usage** to track costs and performance

## Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com)
- [Ollama Documentation](https://github.com/ollama/ollama)
- [LM Studio Documentation](https://lmstudio.ai/docs)
- [OpenAI API Compatibility](https://platform.openai.com/docs/api-reference)
