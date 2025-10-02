# Copilot Instructions for Soapy

**Last Updated**: 2025-10-01
**Status**: ✅ MVP COMPLETE - 54 tests passing, 1 skipped (55 total)
**Project Type**: Hybrid SOAP/REST AI API System with Git-backed storage

## Tech Stack

**Language**: Node.js 20+ with TypeScript 5.x
- **Module System**: ES modules (`"type": "module"` in package.json)
- **TypeScript**: Strict mode enabled, all source files use `.ts` extension
- **Modern JavaScript**: Top-level await, optional chaining, nullish coalescing

**Backend**: Fastify v5.x
- Fast HTTP server with native JSON Schema validation
- Plugins: `@fastify/sse` (Server-Sent Events), `@fastify/websocket`
- Full TypeScript support

**SOAP**: strong-soap v5.x
- WSDL 1.1/2.0 support
- Integrated with Fastify via custom plugin

**Git Operations**: isomorphic-git v1.x
- Pure JavaScript (no native bindings)
- Programmatic Git operations for conversation storage

**AI Providers**:
- `openai` v4.x (OpenAI official SDK)
- `@anthropic-ai/sdk` v0.27.x (Anthropic official SDK)

**Testing**: Vitest v1.x
- Vite-native test framework with TypeScript support
- Jest-compatible API (`expect()`, `describe()`, `it()`)
- Tests in `.test.ts` files

**Frontend**: Vite + React + TypeScript
- Test client for API validation
- Real-time response display

**Storage**: Git repositories (file system)
- One repository per conversation
- Path: `conversations/{conversationId}/`
- Format: Markdown files + JSON + YAML

## Project Structure

```
.
├── backend/              # Backend API server
│   ├── src/
│   │   ├── lib/         # Core libraries
│   │   │   ├── git-storage/      # Git operations
│   │   │   ├── format-converter/ # OpenAI ↔ Anthropic ↔ SOAP
│   │   │   ├── ai-providers/     # OpenAI, Anthropic connectors
│   │   │   └── auth/             # API key authentication
│   │   ├── api/
│   │   │   ├── soap/    # SOAP endpoint + WSDL
│   │   │   └── rest/    # REST endpoints
│   │   ├── cli/         # CLI tools (soapy, soapy-health, etc.)
│   │   └── models/      # Data models (Conversation, Message, etc.)
│   └── tests/
│       ├── contract/    # WSDL/OpenAPI validation (25 tests)
│       └── integration/ # Acceptance scenarios (7 test files, 2 tests)
├── frontend/            # Vite test client
│   └── src/
│       ├── components/  # UI components
│       └── App.tsx      # Main test interface
└── specs/               # Feature specifications
```

## Commands

```bash
# Backend commands (run from backend/)
npm run build          # Compile TypeScript to dist/
npm run dev            # Development with hot reload
npm start              # Run production build
npm test               # Run all tests
npm run lint           # ESLint check
npm run format         # Prettier format
npm run health         # Run health check CLI
npm run soapy          # Run unified CLI

# Frontend commands (run from frontend/)
npm run dev            # Start dev server on port 5173
npm run build          # Build for production
npm run preview        # Preview production build

# Installation
cd backend && npm install
cd frontend && npm install
```

## Core Concepts

**Hybrid SOAP/REST**: SOAP for enterprise clients, REST for modern clients, both accessing same Git-backed storage

**Git-Backed Storage**: Every conversation is a Git repository with:
- Numbered message files (`0001-user.md`, `0002-assistant.md`)
- Tool calls/results as JSON (`0003-tool_call.json`, `0003-tool_result.json`)
- Branding as YAML (`branding.yml`) with HTTPS URL and hex color validation
- Cryptographic audit via commit hashes

**Multi-Format Conversion**: Converts between:
- OpenAI chat completion format
- Anthropic messages format
- SOAP XML format
- Internal Git storage format

**Branching**: Git branches enable alternative conversation paths for deterministic replay and A/B testing

**Plugin Architecture**: Modular `buildApp()` function with SOAP/REST plugins

## Code Style

- Use TypeScript strict mode (`strict: true` in tsconfig.json)
- Prefer `const` over `let`, avoid `var`
- Use async/await over promise chains
- Follow ESM import/export patterns (no `require()`)
- Use descriptive variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use Prettier for formatting (configured in `.prettierrc`)

## API Endpoints

**SOAP** (POST /soap):
- CommitMessage, BranchConversation, GetConversation, GetBranding, CommitToolCall, CommitToolResult, CommitFile, GetFile
- WSDL available at `/soap?wsdl`

**REST**:
- POST /conversations/:id/messages - Submit message
- GET /conversations/:id/messages - List messages
- POST /conversations/:id/branch - Create branch
- GET /conversations/:id/branding - Get branding
- POST /conversations/:id/tools - Submit tool call
- GET /conversations/:id/stream - SSE streaming
- Format negotiation via `Accept` header (openai, anthropic, soap)

## Testing

**Contract Tests** (33 tests):
- Branding validation: HTTPS URLs, hex colors (18 tests)
- SOAP WSDL validation (7 tests)
- REST API validation (8 tests)

**Integration Tests** (21 tests passing, 1 skipped):
- Scenario 1: SOAP message submission (2 tests)
- Scenario 2: REST retrieval (4 tests)
- Scenario 3: Streaming (4 tests)
- Scenario 4: Branching (4 tests)
- Scenario 5: Tools (3 tests)
- Scenario 6: Branding (2 tests)
- Scenario 7: Error handling (2 tests)

**Total**: 54 tests passing, 1 skipped (55 total)

Run: `cd backend && npm test`

## Constitutional Principles

**Library-First** (I): All logic in standalone libraries (`git-storage`, `format-converter`, `ai-providers`)

**CLI Interface** (II): Every library has CLI tool (`soapy-git`, `soapy-convert`, `soapy-ai`, `soapy-health`)

**TDD** (III): Tests written first, all contract tests written before implementation

**Integration Tests** (IV): 7 acceptance scenarios in tests/integration/ directory

**Observability** (V): JSON logging support via CLI `--json` flags, Git commits as audit trail

**Versioning** (VI): WSDL/OpenAPI versioned independently, MAJOR bump for breaking changes

**Simplicity** (VII): Standard libraries, no custom abstractions, modular plugin design

## Implementation Status

✅ **Complete**:
- Backend setup (TypeScript, Fastify, strong-soap, Vitest)
- Data models (6 models with validation)
- SOAP/REST APIs (6 of 8 SOAP operations implemented, WSDL defines 8 operations)
- Core libraries (git-storage, format-converter, ai-providers, auth)
- Frontend test client (Vite + React)
- CLI tools (4 tools: soapy-health, soapy-git, soapy-convert, soapy-ai)
- Integration test framework (7 scenarios with 21 passing tests, 1 skipped)
- Streaming support (SSE)
- Documentation (README, CHANGELOG, DEPLOYMENT, IMPLEMENTATION_SUMMARY)

🚧 **In Progress** (awaiting future phases):
- File upload/download operations (CommitFile and GetFile defined in WSDL, not yet implemented)
- Authentication implementation (library exists, needs API integration)
- Production deployment configuration
- Authentication implementation

## Development Notes

- Server runs on port 3000 (configurable via `PORT` env var)
- Frontend dev server on port 5173, proxies to backend
- Environment variables in `backend/.env` (copy from `.env.example`)
- All builds use `npm run build` (no custom build scripts)
- WSDL file at `backend/src/api/soap/soapy.wsdl`
