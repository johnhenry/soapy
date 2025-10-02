# Soapy - Hybrid SOAP/REST AI API System

Soapy is a hybrid SOAP/REST API system providing enterprise-grade conversation management with Git-backed storage. The system enables SOAP submission for legacy enterprise integration while offering modern REST retrieval with OpenAI/Anthropic-compatible formats.

## Features

- ✅ **Hybrid SOAP/REST**: SOAP for enterprise clients, REST for modern clients
- ✅ **Git-Backed Storage**: Every conversation is a Git repository with cryptographic audit trails
- ✅ **Multi-Format Support**: OpenAI, Anthropic, and SOAP XML formats
- ✅ **Streaming**: SSE and WebSocket support for real-time responses
- ✅ **Conversation Branching**: Git branches enable alternative conversation paths
- ✅ **Multi-Provider AI**: OpenAI, Anthropic, Ollama, LM Studio, and any OpenAI-compatible provider
- ✅ **Per-Conversation Branding**: Customizable UI branding stored in Git
- ✅ **CLI Tools**: Git-style sub-command interface (soapy git, soapy convert, soapy ai)
- ✅ **Optional Authentication**: API key-based authentication with organization access control

## Tech Stack

- **Backend**: Node.js 20+ with TypeScript 5.x (strict mode)
- **Module System**: ES modules throughout
- **REST**: Fastify v5.x
- **SOAP**: strong-soap v5.x
- **Git**: isomorphic-git v1.x
- **AI**: openai v4.x, @anthropic-ai/sdk v0.x
- **Testing**: Vitest v1.x
- **Frontend**: Vite + React + TypeScript

## Project Structure

```
.
├── backend/              # Backend API server
│   ├── src/
│   │   ├── lib/         # Core libraries (git-storage, format-converter, etc.)
│   │   ├── api/         # SOAP + REST endpoints
│   │   ├── cli/         # CLI tools
│   │   └── models/      # Data models
│   └── tests/           # Contract, integration, and unit tests
├── frontend/            # Vite test client
│   └── src/
│       ├── components/  # UI components
│       └── services/    # API clients
└── specs/               # Feature specifications and contracts
```

## Quick Start

### Prerequisites

- Node.js 20+ (check: `node --version`)
- Git CLI (check: `git --version`)

### Installation

```bash
# Clone repository
git clone https://github.com/johnhenry/soapy.git
cd soapy

# Install backend dependencies
cd backend
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env to add your API keys and provider configurations
# Supports: OpenAI, Anthropic, Ollama, LM Studio, and custom OpenAI-compatible providers

# Build backend
npm run build

# Install frontend dependencies
cd ../frontend
npm install
```

### Running

```bash
# Terminal 1: Start backend server
cd backend
npm run dev
# Server will start on http://localhost:3000
# WSDL available at: http://localhost:3000/soap?wsdl
# API Documentation at: http://localhost:3000/docs

# Terminal 2: Start frontend test client
cd frontend
npm run dev
# Opens on http://localhost:5173
```

### AI Provider Configuration

Soapy supports multiple AI providers. Configure them in `backend/.env`:

#### OpenAI
```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional: custom endpoint
```

#### Anthropic
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

#### Ollama (Local LLM Server)
```bash
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama2  # or llama3, mistral, codellama, etc.
```

Run Ollama: `ollama serve` then `ollama pull llama2`

#### LM Studio (Local LLM Server)
```bash
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=local-model  # Set to your loaded model name
```

Start LM Studio server from the UI, load a model, and use the local server option.

#### Custom OpenAI-Compatible Provider
```bash
OPENAI_COMPATIBLE_BASE_URL=https://your-provider.com/v1
OPENAI_COMPATIBLE_MODEL=your-model-name
OPENAI_COMPATIBLE_API_KEY=your-api-key  # If required
```

Any provider supporting OpenAI's chat completion API format will work (e.g., Together AI, Groq, LocalAI, etc.).

📖 **[Full AI Provider Integration Guide](docs/AI_PROVIDERS.md)** - Detailed setup instructions, examples, and troubleshooting for all providers.

### Testing

```bash
# Run all tests
cd backend
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### CLI Tools

Soapy provides a unified CLI with git-style sub-commands:

```bash
# Main help
npm run soapy -- --help

# Git operations
npm run soapy -- git list-conversations
npm run soapy -- git create-conversation --id conv-123 --org org-456
npm run soapy -- git get-messages --id conv-123 --json

# Format conversion
echo '{"messages":[...]}' | npm run soapy -- convert to-openai
npm run soapy -- convert openai-to-anthropic < input.json > output.json

# AI operations (configure providers in .env)
npm run soapy -- ai generate --provider openai --prompt "Hello"
npm run soapy -- ai stream --provider anthropic --prompt "Tell me a story"
npm run soapy -- ai generate --provider ollama --prompt "What is AI?"
npm run soapy -- ai generate --provider lmstudio --prompt "Explain quantum computing"

# Health check
npm run health
```

### Optional Authentication

Authentication is disabled by default. To enable:

```bash
# In .env file:
AUTH_ENABLED=true
AUTH_REQUIRE_ORG=true
API_KEYS=key1:org-abc:user-1,key2:org-xyz:user-2
```

Then use API keys in requests:

```bash
# Using X-API-Key header
curl -H "X-API-Key: key1" http://localhost:3000/v1/chat/conv-123

# Using Authorization Bearer token
curl -H "Authorization: Bearer key1" http://localhost:3000/v1/chat/conv-123
```

## API Endpoints

### Documentation

- `GET /docs` - Interactive Swagger UI documentation
- `GET /docs/json` - OpenAPI 3.0 specification (JSON)

### SOAP Endpoints

- `GET /soap?wsdl` - Retrieve WSDL contract
- `POST /soap` - SOAP operations:
  - CommitMessage
  - BranchConversation
  - GetConversation
  - GetBranding
  - CommitToolCall
  - CommitToolResult
  - CommitFile
  - GetFile

### REST Endpoints

- `POST /v1/chat/:id/messages` - Submit message
- `GET /v1/chat/:id?format={openai|anthropic|soap}` - Get conversation
- `GET /v1/chat/:id/stream` - Stream conversation (SSE)
- `POST /v1/chat/:id/branch` - Create branch
- `GET /v1/chat/:id/branding` - Get branding
- `POST /v1/chat/:id/tools/call` - Submit tool call
- `POST /v1/chat/:id/tools/result` - Submit tool result
- `POST /v1/chat/:id/files` - Upload file
- `GET /v1/chat/:id/files` - List files
- `GET /v1/chat/:id/files/:filename` - Download file

## Development Status

### Completed ✅

- [x] Backend project setup with TypeScript + ES modules
- [x] Data models (6 entities: Conversation, Message, Branch, ToolCall, ToolResult, Branding)
- [x] SOAP API with WSDL serving (all 8 operations implemented)
- [x] REST API with 10 endpoints (including file operations)
- [x] Core libraries (git-storage, format-converter, ai-providers, auth)
- [x] Integration tests (7 scenarios, all 55 tests passing - 100%)
- [x] CLI tools (4 tools: soapy-health, soapy-git, soapy-convert, soapy-ai)
- [x] Frontend test client (Vite + React)
- [x] Streaming support (SSE)
- [x] Authentication/authorization (optional, configurable via AUTH_ENABLED)
- [x] File attachment support (CommitFile, GetFile SOAP + REST endpoints)

### Future Enhancements 🚀

- [ ] Production deployment configuration
- [x] Additional AI provider integrations (Ollama, LM Studio, OpenAI-compatible providers)
- [ ] Enhanced file storage with actual Git persistence
- [ ] Performance optimization for large conversations

## Testing

Current test results:
- ✅ Contract tests: 33/33 tests passing (branding validation, SOAP WSDL, REST API)
- ✅ Integration tests: 22/22 tests passing (all scenarios complete)
- **Total: 55/55 tests passing (100%)**

## Constitutional Principles

This project follows 7 constitutional principles:

1. **Library-First**: All logic in standalone libraries
2. **CLI Interface**: Every library has a CLI tool
3. **TDD**: Tests written first, must fail initially
4. **Integration Tests**: 7 acceptance scenarios
5. **Observability**: JSON logging, Git audit trails
6. **Versioning**: WSDL/OpenAPI versioned independently
7. **Simplicity**: Use standard libraries, defer optimization

## Contributing

This project was built following the [GitHub SpecKit](https://github.com/github/spec-kit) specification workflow.

## License

MIT
