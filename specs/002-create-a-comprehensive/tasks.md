# Tasks: Soapy - Hybrid SOAP/REST AI API System

**Feature**: 002-create-a-comprehensive
**Input**: Design documents from `/Users/johnhenry/Projects/soapy/specs/002-create-a-comprehensive/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Tech Stack Summary
- **Language**: Node.js 24 (TypeScript, ES modules)
- **REST**: Fastify v4.x
- **SOAP**: strong-soap v1.x
- **Git**: isomorphic-git v1.x
- **AI**: openai v4.x, @anthropic-ai/sdk v0.x
- **Testing**: Vitest v1.x
- **Project Type**: Web (backend + frontend)

## Repository Structure
```
/Users/johnhenry/Projects/soapy/soapy/
├── backend/
│   ├── src/
│   │   ├── lib/         # 5 libraries (Constitutional Principle I)
│   │   ├── api/         # SOAP + REST
│   │   ├── cli/         # 4 CLI tools (Constitutional Principle II)
│   │   └── models/      # 8 entities
│   └── tests/
│       ├── contract/    # WSDL + OpenAPI tests
│       ├── integration/ # 7 scenarios
│       └── unit/        # Per-library tests
├── frontend/
│   ├── src/            # Vite test client (FR-102)
│   └── tests/
└── conversations/      # Git storage (runtime)
```

---

## Phase 3.1: Setup (3 tasks)

- [ ] **T001** Create backend project structure
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/`
  - Create directories: `src/lib/`, `src/api/soap/`, `src/api/rest/`, `src/cli/`, `src/models/`, `tests/contract/`, `tests/integration/`, `tests/unit/`
  - Create `package.json` with Node.js 24 engine requirement
  - Dependencies: None

- [ ] **T002** Initialize backend dependencies
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/package.json`
  - Install: `fastify`, `@fastify/sse`, `@fastify/websocket`, `strong-soap`, `isomorphic-git`, `openai`, `@anthropic-ai/sdk`, `pino` (logging), `ajv` (validation), `lru-cache`, `dotenv`
  - Install dev: `vitest`, `@vitest/ui`, `supertest`, `@types/node`, `typescript`
  - Configure `tsconfig.json` for Node.js 24 ES modules
  - Dependencies: T001

- [ ] **T003** [P] Configure linting and formatting
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/.eslintrc.json`, `.prettierrc`
  - Setup ESLint with TypeScript support
  - Configure Prettier
  - Add `npm run lint` and `npm run format` scripts
  - Dependencies: T002

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: These tests MUST be written and MUST FAIL before ANY implementation begins (Constitutional Principle III)

### Contract Tests (5 tasks, all parallel)

- [ ] **T004** [P] SOAP WSDL contract test
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/contract/soap.test.ts`
  - Validate WSDL availability at `/soap?wsdl`
  - Test 6 operations: CommitMessage, BranchConversation, GetConversation, GetBranding, CommitToolCall, CommitToolResult
  - Assert WSDL schema validity
  - **MUST FAIL** (no SOAP server yet)
  - Dependencies: T002

- [ ] **T005** [P] REST OpenAPI contract test
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/contract/rest.test.ts`
  - Validate 9 REST endpoints against OpenAPI schema
  - Test format negotiation (openai, anthropic, soap)
  - Test SSE streaming header acceptance
  - **MUST FAIL** (no REST server yet)
  - Dependencies: T002

- [ ] **T006** [P] OpenAI format conversion schema test
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/contract/format-openai.test.ts`
  - Validate conversion to OpenAI chat completion format
  - Test role mapping (user, assistant, system, tool)
  - Test tool_calls structure
  - **MUST FAIL** (no converter yet)
  - Dependencies: T002

- [ ] **T007** [P] Anthropic format conversion schema test
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/contract/format-anthropic.test.ts`
  - Validate conversion to Anthropic messages format
  - Test content blocks (text, tool_use, tool_result)
  - **MUST FAIL** (no converter yet)
  - Dependencies: T002

- [ ] **T008** [P] Branding validation schema test
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/contract/branding.test.ts`
  - Validate branding.yml schema (logoUrl HTTPS, hex colors, footerText <500 chars)
  - Test JSON Schema validation with ajv
  - **MUST FAIL** (no validation yet)
  - Dependencies: T002

### Integration Tests (7 scenarios, all parallel)

- [ ] **T009** [P] Integration test: Scenario 1 - SOAP Message Submission
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/integration/scenario-1-soap-submission.test.ts`
  - Test: SOAP CommitMessage operation stores message in Git
  - Test: WSDL contract retrieval
  - Assert: Git commit created, commit hash returned
  - **MUST FAIL** (no implementation)
  - Dependencies: T002

- [ ] **T010** [P] Integration test: Scenario 2 - REST Retrieval with Multiple Formats
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/integration/scenario-2-rest-retrieval.test.ts`
  - Test: GET /chat/{id}?format=openai
  - Test: GET /chat/{id}?format=anthropic
  - Test: GET /chat/{id}?type=xml&format=soap
  - Assert: Correct format conversion
  - **MUST FAIL** (no implementation)
  - Dependencies: T002

- [ ] **T011** [P] Integration test: Scenario 3 - Streaming Support
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/integration/scenario-3-streaming.test.ts`
  - Test: SSE streaming with Accept: text/event-stream
  - Test: WebSocket connection upgrade
  - Assert: Real-time token delivery
  - **MUST FAIL** (no implementation)
  - Dependencies: T002

- [ ] **T012** [P] Integration test: Scenario 4 - Git-Backed Conversation Branching
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/integration/scenario-4-branching.test.ts`
  - Test: Create branch from message point
  - Test: Independent message sequences on branches
  - Assert: Git branch created, no main branch modification
  - **MUST FAIL** (no implementation)
  - Dependencies: T002

- [ ] **T013** [P] Integration test: Scenario 5 - Agent and Tool Support
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/integration/scenario-5-tools.test.ts`
  - Test: CommitToolCall stores JSON in Git
  - Test: CommitToolResult links to tool call
  - Test: Deterministic replay reconstructs reasoning chain
  - **MUST FAIL** (no implementation)
  - Dependencies: T002

- [ ] **T014** [P] Integration test: Scenario 6 - Per-Conversation Branding
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/integration/scenario-6-branding.test.ts`
  - Test: Store branding.yml in Git
  - Test: Retrieve active branding
  - Test: Historical branding via Git commit
  - **MUST FAIL** (no implementation)
  - Dependencies: T002

- [ ] **T015** [P] Integration test: Scenario 7 - Multi-Format Error Handling
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/integration/scenario-7-errors.test.ts`
  - Test: SOAP Fault for invalid request
  - Test: OpenAI error format when format=openai
  - Test: SSE error event during streaming
  - **MUST FAIL** (no implementation)
  - Dependencies: T002

---

## Phase 3.3: Core Implementation (Libraries First - Constitutional Principle I)

### Data Models (8 entities, all parallel)

- [ ] **T016** [P] Conversation model
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/models/conversation.ts`
  - Fields: id (UUID), organizationId, ownerId, createdAt, mainBranch, branches[]
  - Validation: id unique, organizationId required
  - TypeScript interface + validation functions
  - Dependencies: T002

- [ ] **T017** [P] Message model
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/models/message.ts`
  - Fields: sequenceNumber, role (enum), content, timestamp, aiProvider?, model?, commitHash
  - Validation: Sequential numbering, role required
  - Dependencies: T002

- [ ] **T018** [P] Branch model
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/models/branch.ts`
  - Fields: name, sourceMessageNumber, createdAt, creatorId, messageCount
  - Validation: Name unique per conversation
  - Dependencies: T002

- [ ] **T019** [P] ToolCall model
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/models/tool-call.ts`
  - Fields: sequenceNumber, toolName, parameters (JSON), requestedAt, commitHash
  - Validation: Parameters valid JSON
  - Dependencies: T002

- [ ] **T020** [P] ToolResult model
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/models/tool-result.ts`
  - Fields: sequenceNumber, toolCallRef, result (JSON), executedAt, status (enum), retryCount, commitHash
  - Validation: toolCallRef exists, retryCount >= 0
  - Dependencies: T002

- [ ] **T021** [P] Branding model
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/models/branding.ts`
  - Fields: logoUrl (URI), primaryColor (hex), secondaryColor?, accentColor?, footerText?, versionTimestamp
  - Validation: Use ajv JSON Schema from research.md
  - Dependencies: T002

- [ ] **T022** [P] SOAPOperation model (transient)
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/models/soap-operation.ts`
  - Fields: operationName (enum), requestParams (XML), responseData (XML), sessionContext
  - Note: Not persisted, only for SOAP request/response lifecycle
  - Dependencies: T002

- [ ] **T023** [P] StreamSession model (transient)
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/models/stream-session.ts`
  - Fields: sessionId (UUID), conversationId, connectionState (enum), clientId, startedAt
  - Note: In-memory only, Map<sessionId, StreamSession>
  - Dependencies: T002

### Library 1: Git Storage (Constitutional Principle I)

- [ ] **T024** Git storage library core (conversation CRUD)
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/git-storage/index.ts`
  - Implement: createConversation(), getConversation(), deleteConversation()
  - Use isomorphic-git for Git operations
  - Atomic commits with proper commit messages
  - Dependencies: T016, T017

- [ ] **T025** Git storage: Message operations
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/git-storage/message.ts`
  - Implement: commitMessage(), getMessages(), sequential numbering
  - Store as NNNN-{role}.md with frontmatter
  - Queue-based write serialization per conversation (FR-091)
  - Dependencies: T024

- [ ] **T026** Git storage: Branching operations
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/git-storage/branch.ts`
  - Implement: createBranch(), getBranches(), reject merge operations (FR-095)
  - Git branch creation from specific message point
  - Preserve branch metadata in .soapy-branches.json
  - Dependencies: T024

- [ ] **T027** Git storage: Tool call/result operations
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/git-storage/tool.ts`
  - Implement: commitToolCall(), commitToolResult()
  - Store as NNNN-tool_call.json, NNNN-tool_result.json
  - Link tool result to tool call via toolCallRef
  - Dependencies: T024

- [ ] **T028** Git storage: Branding operations
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/git-storage/branding.ts`
  - Implement: setBranding(), getBranding(), getHistoricalBranding()
  - Store as branding.yml, version in Git commits
  - Fall back to system defaults if missing (FR-073)
  - Dependencies: T024, T021

- [ ] **T029** Git storage: Optimization (LRU cache, shallow clone)
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/git-storage/cache.ts`
  - Implement: LRU cache (lru-cache, 1000 entries) for commit metadata
  - Shallow clone (depth=1) for first-time reads
  - Cache key: `${conversationId}:${commitHash}`
  - Dependencies: T024

### Library 2: Format Converter (Constitutional Principle I)

- [ ] **T030** [P] Format converter: Internal to OpenAI
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/format-converter/openai.ts`
  - Convert Git messages to OpenAI chat completion format
  - Role mapping: user, assistant, system, tool
  - Tool calls structure: tool_calls array
  - Dependencies: T017, T019, T020

- [ ] **T031** [P] Format converter: Internal to Anthropic
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/format-converter/anthropic.ts`
  - Convert to Anthropic messages format
  - Content blocks: text, tool_use, tool_result
  - Role mapping: user, assistant only
  - Dependencies: T017, T019, T020

- [ ] **T032** [P] Format converter: Internal to SOAP XML
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/format-converter/soap.ts`
  - Convert to SOAP XML format with envelope wrapping
  - Map to WSDL Message type
  - Dependencies: T017

- [ ] **T033** Format converter: Best-effort conversion with warnings (FR-100)
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/format-converter/index.ts`
  - Implement: Convert incompatible features to closest equivalent
  - Log warnings for lossy conversions
  - Export: toOpenAI(), toAnthropic(), toSOAP()
  - Dependencies: T030, T031, T032

### Library 3: AI Providers (Constitutional Principle I)

- [ ] **T034** [P] AI provider base interface
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/ai-providers/base.ts`
  - Define: AIProvider interface (generate(), stream(), toolCall())
  - Common types: ProviderConfig, GenerationOptions
  - Dependencies: T002

- [ ] **T035** AI provider: OpenAI connector
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/ai-providers/openai.ts`
  - Implement: OpenAI SDK integration (openai v4.x)
  - Streaming support, function calling
  - Retry logic with exponential backoff (FR-096)
  - Dependencies: T034

- [ ] **T036** AI provider: Anthropic connector
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/ai-providers/anthropic.ts`
  - Implement: Anthropic SDK integration (@anthropic-ai/sdk v0.x)
  - Streaming support, tool use
  - Retry logic with exponential backoff (FR-096)
  - Dependencies: T034

- [ ] **T037** AI provider: Multi-provider orchestration
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/ai-providers/index.ts`
  - Implement: Provider selection via parameter (FR-104)
  - Error handling for provider failures (FR-105)
  - Store provider/model metadata in Git commits (FR-107)
  - Dependencies: T035, T036

### Library 4: Authentication (Constitutional Principle I)

- [ ] **T038** [P] Auth: API key validation
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/auth/api-key.ts`
  - Validate API keys from X-API-Key or Authorization: Bearer
  - Associate API key with organization (FR-093)
  - Dependencies: T002

- [ ] **T039** Auth: Organization-based access control
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/auth/index.ts`
  - Check organization membership (FR-075, FR-094)
  - Prevent cross-organization access (FR-076)
  - Audit access attempts (FR-077)
  - Dependencies: T038

### Library 5: Streaming (Constitutional Principle I)

- [ ] **T040** [P] Streaming: SSE session management
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/streaming/sse.ts`
  - Implement: SSE event stream (data, error, done events)
  - Timeout: 300s default (configurable via STREAM_TIMEOUT_MS per research.md)
  - Dependencies: T023

- [ ] **T041** [P] Streaming: WebSocket session management
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/streaming/websocket.ts`
  - Implement: WebSocket upgrade and message handling
  - Timeout: 300s default
  - Dependencies: T023

- [ ] **T042** Streaming: Client disconnection handling (FR-024)
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/lib/streaming/index.ts`
  - Continue AI generation to completion on disconnect
  - Store full response in Git after completion
  - Limit: 10 concurrent streams per conversation (research.md FR-086)
  - Dependencies: T040, T041

---

## Phase 3.4: API Layer (SOAP + REST)

### SOAP API (strong-soap)

- [ ] **T043** SOAP server setup and WSDL generation
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/soap/server.ts`
  - Setup strong-soap with WSDL from contracts/soapy.wsdl
  - Expose WSDL at /soap?wsdl
  - Dependencies: T002

- [ ] **T044** SOAP operations implementation
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/soap/operations.ts`
  - Implement 6 operations: CommitMessage, BranchConversation, GetConversation, GetBranding, CommitToolCall, CommitToolResult
  - Call git-storage library for each operation
  - SOAP Fault mapping for errors (FR-048)
  - Dependencies: T043, T024-T028

### REST API (Fastify)

- [ ] **T045** REST server setup (Fastify)
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/rest/server.ts`
  - Initialize Fastify with SSE and WebSocket plugins
  - Setup CORS (configurable via ALLOWED_ORIGINS per research.md)
  - JSON Schema validation middleware
  - Dependencies: T002

- [ ] **T046** REST endpoint: GET /chat/{chatId}
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/rest/routes.ts`
  - Implement format conversion (query param: format=openai/anthropic/soap)
  - Support type=json/xml/plain
  - SSE streaming if Accept: text/event-stream
  - Dependencies: T045, T024, T033

- [ ] **T047** REST endpoint: POST /chat/{chatId}/message
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/rest/routes.ts`
  - Submit message, trigger AI generation if aiProvider specified
  - Return commit hash and sequence number
  - Dependencies: T045, T025, T037

- [ ] **T048** REST endpoint: POST /chat/{chatId}/branch
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/rest/routes.ts`
  - Create conversation branch
  - Return branch ref and createdAt
  - Dependencies: T045, T026

- [ ] **T049** REST endpoint: GET /chat/{chatId}/branches
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/rest/routes.ts`
  - List all branches with metadata
  - Dependencies: T045, T026

- [ ] **T050** REST endpoint: GET /chat/{chatId}/branding
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/rest/routes.ts`
  - Retrieve current branding configuration
  - Dependencies: T045, T028

- [ ] **T051** REST endpoint: PUT /chat/{chatId}/branding
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/rest/routes.ts`
  - Update branding with JSON Schema validation
  - Dependencies: T045, T028, T021

- [ ] **T052** REST endpoint: POST /chat/{chatId}/tool-call
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/rest/routes.ts`
  - Submit tool call request
  - Dependencies: T045, T027

- [ ] **T053** REST endpoint: POST /chat/{chatId}/tool-result
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/rest/routes.ts`
  - Submit tool execution result
  - Dependencies: T045, T027

- [ ] **T054** REST endpoint: GET /conversation/{conversationId}
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/rest/routes.ts`
  - Full conversation metadata and messages
  - Dependencies: T045, T024

---

## Phase 3.5: CLI Tools (Constitutional Principle II)

**CRITICAL**: Each library MUST have a CLI tool with text I/O

- [ ] **T055** [P] CLI: soapy-git
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/cli/soapy-git.ts`
  - Commands: create-conversation, get-messages, create-branch, list-conversations
  - Support --json flag for structured output
  - Dependencies: T024-T028

- [ ] **T056** [P] CLI: soapy-convert
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/cli/soapy-convert.ts`
  - Commands: openai-to-anthropic, git-to-soap, anthropic-to-openai
  - Accept JSON via stdin, output to stdout
  - Dependencies: T033

- [ ] **T057** [P] CLI: soapy-ai
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/cli/soapy-ai.ts`
  - Commands: generate --provider --model --prompt, test-tool --tool-name --params
  - Support --stream flag for streaming output
  - Dependencies: T037

- [ ] **T058** [P] CLI: soapy-auth
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/cli/soapy-auth.ts`
  - Commands: validate-key, check-org --user-id --conversation-id
  - Output: success/failure with JSON details
  - Dependencies: T039

---

## Phase 3.6: Frontend Test Client (FR-102)

### Vite Project Setup

- [ ] **T059** Create frontend Vite project
  - Path: `/Users/johnhenry/Projects/soapy/soapy/frontend/`
  - Initialize Vite with React + TypeScript
  - Install dependencies: axios, @tanstack/react-query, vite
  - Configure vite.config.ts
  - Dependencies: None (separate from backend)

- [ ] **T060** Frontend: SOAP client service
  - Path: `/Users/johnhenry/Projects/soapy/soapy/frontend/src/services/soap-client.ts`
  - Implement SOAP request builder (XML generation)
  - Parse SOAP responses
  - Dependencies: T059

- [ ] **T061** Frontend: REST client service
  - Path: `/Users/johnhenry/Projects/soapy/soapy/frontend/src/services/rest-client.ts`
  - Axios wrapper for REST API
  - Support all 9 endpoints
  - Dependencies: T059

### Test Client Components (Constitutional Principle IV - Integration Testing Focus)

- [ ] **T062** [P] Component: SOAPTester
  - Path: `/Users/johnhenry/Projects/soapy/soapy/frontend/src/components/SOAPTester.tsx`
  - Form for submitting SOAP operations
  - Display WSDL
  - Test all 6 SOAP operations
  - Dependencies: T059, T060

- [ ] **T063** [P] Component: RESSTester
  - Path: `/Users/johnhenry/Projects/soapy/soapy/frontend/src/components/RESSTester.tsx`
  - Test REST endpoints with different formats (openai, anthropic, soap)
  - Format switcher
  - Dependencies: T059, T061

- [ ] **T064** [P] Component: StreamingTester
  - Path: `/Users/johnhenry/Projects/soapy/soapy/frontend/src/components/StreamingTester.tsx`
  - SSE event display (real-time token streaming)
  - WebSocket connection tester
  - Dependencies: T059, T061

- [ ] **T065** [P] Component: BranchingTester
  - Path: `/Users/johnhenry/Projects/soapy/soapy/frontend/src/components/BranchingTester.tsx`
  - Visual branch tree
  - Create branch from message point
  - Navigate between branches
  - Dependencies: T059, T061

- [ ] **T066** [P] Component: ToolTester
  - Path: `/Users/johnhenry/Projects/soapy/soapy/frontend/src/components/ToolTester.tsx`
  - Submit tool calls
  - Display tool results
  - Test retry logic visualization
  - Dependencies: T059, T061

- [ ] **T067** Test Dashboard page
  - Path: `/Users/johnhenry/Projects/soapy/soapy/frontend/src/pages/TestDashboard.tsx`
  - Aggregate all 5 test components
  - Tab navigation between testers
  - Dependencies: T062-T066

---

## Phase 3.7: Integration & Middleware

- [ ] **T068** Auth middleware integration (REST + SOAP)
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/middleware/auth.ts`
  - Apply auth library to all endpoints
  - Return 403 for unauthorized access
  - Dependencies: T039, T045, T043

- [ ] **T069** Request/response logging middleware
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/middleware/logging.ts`
  - JSON logging to stderr (pino library)
  - Log all SOAP and REST requests (FR-077)
  - Dependencies: T045, T043

- [ ] **T070** Error handling and mapping
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/middleware/error.ts`
  - SOAP Fault generation (FR-048)
  - OpenAI error format (FR-049)
  - Anthropic error format (FR-050)
  - SSE error events (FR-053)
  - Dependencies: T045, T043

- [ ] **T071** CORS and security headers
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/src/api/middleware/cors.ts`
  - Configurable CORS via ALLOWED_ORIGINS env var (research.md)
  - Security headers (HTTPS optional per FR-078)
  - Dependencies: T045

---

## Phase 3.8: Polish & Validation

### Unit Tests (5 libraries)

- [ ] **T072** [P] Unit tests: git-storage library
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/unit/git-storage.test.ts`
  - Test CRUD operations, branching, caching
  - Mock isomorphic-git
  - Dependencies: T024-T029

- [ ] **T073** [P] Unit tests: format-converter library
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/unit/format-converter.test.ts`
  - Test OpenAI, Anthropic, SOAP conversions
  - Test round-trip conversion
  - Dependencies: T030-T033

- [ ] **T074** [P] Unit tests: ai-providers library
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/unit/ai-providers.test.ts`
  - Test provider selection, retry logic
  - Mock OpenAI/Anthropic SDKs
  - Dependencies: T034-T037

- [ ] **T075** [P] Unit tests: auth library
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/unit/auth.test.ts`
  - Test API key validation, org access checks
  - Dependencies: T038-T039

- [ ] **T076** [P] Unit tests: streaming library
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/unit/streaming.test.ts`
  - Test SSE/WebSocket lifecycle, disconnection handling
  - Dependencies: T040-T042

### Performance & Documentation

- [ ] **T077** Performance benchmarking
  - Path: `/Users/johnhenry/Projects/soapy/soapy/backend/tests/performance/latency.test.ts`
  - Test SOAP p95 <1500ms, REST p95 <800ms (research.md targets)
  - Use artillery or autocannon for load testing
  - **Acceptance Criteria**: Test MUST PASS (p95 within targets) before release. If targets exceeded: (1) Profile bottlenecks, (2) Optimize critical path, (3) Re-run benchmark, (4) If still failing, escalate to stakeholders for target adjustment or release delay
  - **Failure Handling**: Performance test failures block Phase 3.8 completion and trigger optimization iteration
  - Dependencies: All API endpoints (T044-T054)

- [ ] **T078** [P] Update quickstart.md validation
  - Path: `/Users/johnhenry/Projects/soapy/specs/002-create-a-comprehensive/quickstart.md`
  - Verify all 12 steps work with implemented system
  - Update any changed endpoints or commands
  - Dependencies: T044-T067

- [ ] **T079** [P] Generate API documentation
  - Path: `/Users/johnhenry/Projects/soapy/soapy/docs/api-reference.md`
  - Document all 6 SOAP operations
  - Document all 9 REST endpoints
  - Include curl examples from quickstart.md
  - Dependencies: T044-T054

- [ ] **T080** Code cleanup and refactoring
  - Remove duplication across libraries
  - Ensure consistent error handling
  - Verify Constitutional Principle VII (Simplicity)
  - Dependencies: All implementation tasks

---

## Dependencies Graph

```
Setup: T001 → T002 → T003

Tests (parallel after T002):
  T004-T015 (all parallel, all must fail)

Models (parallel after T002):
  T016-T023 (all parallel)

Libraries:
  Git Storage: T024 → T025-T029
  Format Converter: T030-T032 → T033
  AI Providers: T034 → T035-T036 → T037
  Auth: T038 → T039
  Streaming: T040-T041 → T042

APIs:
  SOAP: T043 → T044 (depends on T024-T028)
  REST: T045 → T046-T054 (depends on T024-T028, T033, T037)

CLI Tools (parallel after libraries):
  T055-T058 (all parallel, depend on respective libraries)

Frontend (separate track):
  T059 → T060-T061 → T062-T066 → T067

Integration:
  T068-T071 (depend on T045, T043, T039)

Polish:
  T072-T076 (parallel, depend on libraries)
  T077 (depends on all APIs)
  T078-T080 (parallel, depend on completion)
```

---

## Parallel Execution Examples

### Example 1: Contract Tests (after T002)
```bash
# Launch T004-T008 in parallel (different files):
Task T004: "SOAP WSDL contract test in tests/contract/soap.test.ts"
Task T005: "REST OpenAPI contract test in tests/contract/rest.test.ts"
Task T006: "OpenAI format schema test in tests/contract/format-openai.test.ts"
Task T007: "Anthropic format schema test in tests/contract/format-anthropic.test.ts"
Task T008: "Branding validation schema test in tests/contract/branding.test.ts"
```

### Example 2: Integration Tests (after T002)
```bash
# Launch T009-T015 in parallel (different files):
Task T009: "Scenario 1 SOAP submission test"
Task T010: "Scenario 2 REST retrieval test"
Task T011: "Scenario 3 streaming test"
Task T012: "Scenario 4 branching test"
Task T013: "Scenario 5 tools test"
Task T014: "Scenario 6 branding test"
Task T015: "Scenario 7 errors test"
```

### Example 3: Data Models (after T002)
```bash
# Launch T016-T023 in parallel (different files):
Task T016: "Conversation model in src/models/conversation.ts"
Task T017: "Message model in src/models/message.ts"
Task T018: "Branch model in src/models/branch.ts"
Task T019: "ToolCall model in src/models/tool-call.ts"
Task T020: "ToolResult model in src/models/tool-result.ts"
Task T021: "Branding model in src/models/branding.ts"
Task T022: "SOAPOperation model in src/models/soap-operation.ts"
Task T023: "StreamSession model in src/models/stream-session.ts"
```

### Example 4: Format Converters (after T017, T019, T020)
```bash
# Launch T030-T032 in parallel (different files):
Task T030: "OpenAI format converter in src/lib/format-converter/openai.ts"
Task T031: "Anthropic format converter in src/lib/format-converter/anthropic.ts"
Task T032: "SOAP format converter in src/lib/format-converter/soap.ts"
```

### Example 5: CLI Tools (after libraries complete)
```bash
# Launch T055-T058 in parallel (different files):
Task T055: "soapy-git CLI in src/cli/soapy-git.ts"
Task T056: "soapy-convert CLI in src/cli/soapy-convert.ts"
Task T057: "soapy-ai CLI in src/cli/soapy-ai.ts"
Task T058: "soapy-auth CLI in src/cli/soapy-auth.ts"
```

---

## Task Summary

**Total Tasks**: 80

**Breakdown by Phase**:
- Setup: 3 tasks
- Tests (TDD): 12 tasks (5 contract + 7 integration)
- Models: 8 tasks
- Libraries: 19 tasks (5 libraries)
- APIs: 13 tasks (SOAP + REST)
- CLI Tools: 4 tasks
- Frontend: 9 tasks
- Integration/Middleware: 4 tasks
- Polish: 8 tasks

**Parallel Tasks**: 52 tasks marked [P] (can run concurrently)
**Sequential Tasks**: 28 tasks (dependencies or same-file edits)

**Estimated Completion Time**:
- Sequential path: ~25-30 tasks (critical path)
- With parallelization: Significant speedup on multi-core or multi-agent execution

---

## Validation Checklist

Before marking tasks.md as complete, verify:

- [x] All 5 contract files have corresponding test tasks (T004-T008)
- [x] All 8 entities have model creation tasks (T016-T023)
- [x] All 7 acceptance scenarios have integration tests (T009-T015)
- [x] All tests come before implementation (T004-T015 before T016+)
- [x] All [P] tasks are truly independent (different files, no dependencies)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] 5 libraries have corresponding CLI tools (Constitutional Principle II satisfied)
- [x] Frontend test client tasks created (FR-102 satisfied)
- [x] Constitutional Principle III enforced (tests first, must fail)

**Status**: ✅ Tasks validated and ready for execution

---

**Next Step**: Begin Phase 3.1 (Setup) by executing T001-T003, then move to Phase 3.2 (TDD tests)

**Reminder**: All tests MUST be written and MUST FAIL before ANY implementation begins (Constitutional Principle III - NON-NEGOTIABLE)
