# Soapy - Hybrid SOAP/REST AI API System

Soapy is a hybrid SOAP/REST API system providing enterprise-grade conversation management with Git-backed storage. The system enables SOAP submission for legacy enterprise integration while offering modern REST retrieval with OpenAI/Anthropic-compatible formats.

## Features

- ✅ **Hybrid SOAP/REST**: SOAP for enterprise clients, REST for modern clients
- ✅ **Git-Backed Storage**: Every conversation is a Git repository with cryptographic audit trails
- ✅ **Multi-Format Support**: OpenAI, Anthropic, and SOAP XML formats
- ✅ **Streaming**: SSE and WebSocket support for real-time responses
- ✅ **Conversation Branching**: Git branches enable alternative conversation paths
- ✅ **Multi-Provider AI**: OpenAI and Anthropic integration (extensible)
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
# Edit .env to add your API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY)

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

# Terminal 2: Start frontend test client
cd frontend
npm run dev
# Opens on http://localhost:5173
```

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

# AI operations (requires API keys in .env)
npm run soapy -- ai generate --provider openai --prompt "Hello"
npm run soapy -- ai stream --provider anthropic --prompt "Tell me a story"

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

## Development Status

### Completed ✅

- [x] Backend project setup with TypeScript + ES modules
- [x] Data models (6 entities: Conversation, Message, Branch, ToolCall, ToolResult, Branding)
- [x] SOAP API with WSDL serving
- [x] REST API with 8 endpoints
- [x] Contract tests (25 tests, all passing)
- [x] Frontend test client (Vite + React)

### In Progress 🚧

- [ ] Core libraries implementation (git-storage, format-converter, ai-providers, auth, streaming)
- [ ] Integration tests (7 scenarios)
- [ ] CLI tools (4 tools per Constitutional Principle II)

### Planned 📋

- [ ] File attachment support (upload/download via REST and SOAP)
- [ ] Full AI provider integration
- [ ] Authentication and authorization
- [ ] Production deployment configuration

## Testing

Current test results:
- ✅ Contract tests: 33/33 tests passing (branding validation, SOAP WSDL, REST API)
- ✅ Integration tests: 21/21 tests passing (1 test skipped)
- **Total: 54 tests passing, 1 skipped (55 total)**

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
