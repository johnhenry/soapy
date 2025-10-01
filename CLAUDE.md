# Claude Code Context for Soapy

**Last Updated**: 2025-10-01
**Feature**: 002-create-a-comprehensive
**Project Type**: Web (Backend API + Frontend Test Client)

## Tech Stack

**Language**: Node.js 24 with TypeScript 5.x
- **Module System**: ES modules (`import`/`export`) - `package.json` has `"type": "module"`
- **TypeScript**: Strict mode enabled, all source files use `.ts` extension
- **Modern JavaScript**: Top-level await, optional chaining, nullish coalescing, native fetch, private fields

**Backend Framework**: Fastify v4.x
- Fast HTTP server (2-3x faster than Express)
- Native JSON Schema validation
- Plugins: `@fastify/sse` (Server-Sent Events), `@fastify/websocket`
- Full TypeScript support

**SOAP**: `strong-soap` v1.x
- WSDL 1.1/2.0 support
- WS-Security plugin available

**Git Operations**: `isomorphic-git` v1.x
- Pure JavaScript (no native bindings)
- Programmatic Git operations
- Supports shallow clone

**AI Providers**:
- `openai` v4.x (OpenAI official SDK)
- `@anthropic-ai/sdk` v0.x (Anthropic official SDK)

**Testing**: Vitest v1.x
- Vite-native test framework with TypeScript support
- Jest-compatible API (`expect()`, `describe()`, `it()`)
- Fast HMR for test iteration
- Tests written in `.test.ts` files
- ESM-first (no CommonJS)

**Storage**: Git repositories (file system)
- One repository per conversation
- Path: `conversations/{conversationId}/`
- Format: Markdown files + JSON + YAML

## Project Structure

```
backend/
├── src/
│   ├── lib/              # Library-first architecture (Constitution I)
│   │   ├── git-storage/  # Git operations
│   │   ├── format-converter/  # OpenAI ↔ Anthropic ↔ SOAP
│   │   ├── ai-providers/ # OpenAI, Anthropic connectors
│   │   ├── auth/         # API key authentication
│   │   └── streaming/    # SSE/WebSocket
│   ├── api/
│   │   ├── soap/         # SOAP endpoint
│   │   └── rest/         # REST endpoints
│   ├── cli/              # CLI tools (Constitution II)
│   └── models/           # Data models
└── tests/
    ├── contract/         # WSDL/OpenAPI validation
    ├── integration/      # Acceptance scenarios
    └── unit/             # Per-library tests

frontend/
├── src/
│   ├── components/       # Vite test client (FR-102)
│   └── services/         # SOAP/REST clients
└── tests/
```

## Core Concepts

**Hybrid SOAP/REST**: System provides SOAP for enterprise clients and REST for modern clients, both accessing same Git-backed storage

**Git-Backed Storage**: Every conversation is a Git repository with:
- Numbered message files (`0001-user.md`, `0002-assistant.md`)
- Tool calls/results as JSON (`0003-tool_call.json`)
- File attachments in `files/` subdirectory with SHA-256 hashing
- Branding as YAML (`branding.yml`)
- Cryptographic audit via commit hashes

**Multi-Format Conversion**: Converts between:
- OpenAI chat completion format
- Anthropic messages format
- SOAP XML format
- Internal Git storage format

**Branching**: Git branches enable alternative conversation paths for deterministic replay and A/B testing

## Recent Changes

1. **Added**: Node.js 24, Fastify, isomorphic-git, strong-soap, OpenAI/Anthropic SDKs
2. **Created**: WSDL contract with 8 operations (added file upload/download), OpenAPI spec with 12 endpoints (added 3 file operations)
3. **Designed**: 9 entities (Conversation, Message, Branch, ToolCall, ToolResult, Branding, FileAttachment, SOAPOperation, StreamSession)
4. **File Attachments**: Complete file upload/download support via REST (multipart/form-data) and SOAP (Base64-encoded), stored in Git with SHA-256 hashing

## Key Design Decisions (from research.md)

- **CORS**: Configurable allow-list via `ALLOWED_ORIGINS` env var
- **Streaming Timeout**: 300s default (configurable)
- **Branding Validation**: JSON Schema with HTTPS URLs and hex colors
- **Data Retention**: Configurable via `RETENTION_DAYS` (default: infinite)
- **Performance Targets**: SOAP p95 <1500ms, REST p95 <800ms
- **Concurrent Streams**: 10 per conversation (configurable)
- **Git Optimization**: LRU cache (1000 entries), shallow clone
- **Sharding**: Deferred to Phase 3 (MVP handles 1K-10K conversations)

## Constitutional Principles

**Library-First** (I): All logic in standalone libraries (`git-storage`, `format-converter`, etc.)

**CLI Interface** (II): Every library has CLI tool (`soapy-git`, `soapy-convert`, `soapy-ai`, `soapy-auth`)

**TDD** (III): Tests written first, all integration/contract tests must fail initially

**Integration Tests** (IV): 7 acceptance scenarios mapped to integration test files

**Observability** (V): JSON logging to stderr, Git commits as audit trail

**Versioning** (VI): WSDL/OpenAPI versioned independently, MAJOR bump for breaking changes

**Simplicity** (VII): Use standard libraries, defer optimization, no custom abstractions

## Next Steps

- Phase 1 complete: Data model, contracts, quickstart created ✅
- Phase 2 complete: tasks.md generated (85 tasks, T001-T085 with 5 file handling tasks) ✅
- Phase 3: Implement following TDD workflow (start with T001: backend setup)
- Phase 4: Run automated tests and validate
- Phase 5: Validate via quickstart.md

**Keep Under 150 Lines** ✅ (Current: ~120 lines)
