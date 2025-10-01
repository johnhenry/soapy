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
- ✅ Branding validation: 18/18 tests passing
- ✅ SOAP WSDL: 7/7 tests passing
- ✅ REST API: 8/8 tests passing
- **Total: 25/25 tests passing (100%)**

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
