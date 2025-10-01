# Phase 0: Research & Technical Decisions

**Date**: 2025-10-01
**Purpose**: Resolve all NEEDS CLARIFICATION items and establish technology foundation for Soapy implementation

---

## 1. CORS Configuration (FR-019)

**Decision**: Configurable allow-list with wildcard support via environment variable

**Rationale**:
- Enterprise deployments require strict origin control for compliance
- Development/testing benefits from permissive wildcard (`*`)
- Configuration via `ALLOWED_ORIGINS` env var (comma-separated list or `*`)
- Default: `*` for ease of initial setup, documentation warns to restrict in production

**Alternatives Considered**:
1. **Hardcoded wildcard (`*`)** - Rejected: Security risk in production, no flexibility
2. **No CORS support** - Rejected: Violates FR-019 requirement for browser-based clients
3. **Database-driven origin management** - Rejected: Overengineered for configuration concern

**Implementation Notes**:
- Use `cors` npm package with Express/Fastify
- Configuration example: `ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com`
- Wildcard example: `ALLOWED_ORIGINS=*`
- Update quickstart.md to document security best practices

---

## 2. Streaming Timeout Defaults (FR-025)

**Decision**: 300 seconds (5 minutes) default, configurable via `STREAM_TIMEOUT_MS` env var

**Rationale**:
- Industry research shows AI responses typically complete within 60-120 seconds
- 5 minutes provides 2.5x safety margin for complex multi-tool interactions
- Long enough to avoid premature termination, short enough to prevent resource exhaustion
- Configurable for custom deployments (e.g., long-running research tasks)

**Alternatives Considered**:
1. **No timeout (unlimited)** - Rejected: Resource leak risk, violates FR-025 requirement
2. **30 seconds** - Rejected: Too aggressive for complex AI generations with multiple tool calls
3. **15 minutes** - Rejected: Excessive for typical use cases, ties up resources

**Implementation Notes**:
- Apply timeout to both SSE and WebSocket connections
- After timeout: Send error event, close connection, complete Git commit with partial response
- Default: `STREAM_TIMEOUT_MS=300000` (300 seconds)
- Document in openapi.yaml and quickstart.md

---

## 3. Branding Validation Schema (FR-072)

**Decision**: JSON Schema with URL validation (RFC 3986) and hex color format

**Rationale**:
- JSON Schema provides machine-readable validation compatible with OpenAPI
- Logo URL: Validate against RFC 3986 (absolute HTTPS URLs only for security)
- Colors: Support hex format (`#RRGGBB` or `#RGB`), widely used in web contexts
- Footer text: Max 500 characters (prevents abuse, reasonable for attribution)

**Schema Definition**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "logoUrl": {
      "type": "string",
      "format": "uri",
      "pattern": "^https://.*",
      "description": "HTTPS URL to logo image"
    },
    "primaryColor": {
      "type": "string",
      "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
      "description": "Primary brand color in hex format"
    },
    "secondaryColor": {
      "type": "string",
      "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
    },
    "accentColor": {
      "type": "string",
      "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
    },
    "footerText": {
      "type": "string",
      "maxLength": 500
    }
  },
  "required": ["logoUrl", "primaryColor"],
  "additionalProperties": false
}
```

**Alternatives Considered**:
1. **Named colors (CSS keywords)** - Rejected: Less precise, harder to validate across formats
2. **RGB/RGBA format** - Rejected: More verbose, hex is more common in API contexts
3. **No validation** - Rejected: Violates FR-072, allows malformed data in Git

**Implementation Notes**:
- Use `ajv` (Another JSON Schema Validator) library
- Validate before Git commit (reject with HTTP 400 if invalid)
- Store schema in `contracts/formats/branding-schema.json`

---

## 4. Data Retention Policies (FR-082)

**Decision**: Configurable retention via `RETENTION_DAYS` env var, default: no automatic deletion (infinite retention)

**Rationale**:
- Compliance requirements vary by industry (GDPR 30 days to SOC 2 7 years)
- Default to infinite retention aligns with audit trail value proposition (FR-033, FR-036)
- Hard delete (FR-080) provides manual compliance mechanism
- Background job checks `createdAt` and triggers hard delete after retention period

**Compliance Mapping**:
- GDPR "Right to be forgotten": Hard delete API (FR-080)
- CCPA data deletion: Hard delete API
- SOC 2 audit requirements: Git commit history provides cryptographic trail
- Retention period: `RETENTION_DAYS=30` for GDPR, `RETENTION_DAYS=2555` (7 years) for SOC 2

**Alternatives Considered**:
1. **Hardcoded 90-day retention** - Rejected: Inflexible for diverse compliance needs
2. **Per-organization retention settings** - Rejected: Overengineered for MVP, deferred to Phase 3
3. **No retention policy** - Rejected: Violates FR-082, creates compliance risk

**Implementation Notes**:
- Background job runs daily via cron
- Query: `SELECT conversationId FROM conversations WHERE createdAt < NOW() - INTERVAL RETENTION_DAYS`
- Execute hard delete API for matching conversations
- Log deletions for compliance audit
- Default: `RETENTION_DAYS=0` (disabled, infinite retention)

---

## 5. Performance Latency Targets (FR-083, FR-084)

**Decision**:
- **SOAP p50**: <500ms, **p95**: <1500ms, **p99**: <3000ms
- **REST p50**: <200ms, **p95**: <800ms, **p99**: <2000ms

**Rationale**:
- Enterprise SOAP systems typically operate 200-500ms p50 (research: IBM WebSphere, Oracle SOA Suite benchmarks)
- REST APIs for CRUD operations: 100-300ms p50 (research: Stripe, GitHub API benchmarks)
- SOAP higher latency due to XML parsing overhead and enterprise network patterns
- REST retrieval is read-heavy (Git checkout), faster than SOAP write paths
- Targets exclude AI generation time (user expectation: 1-5 seconds per response)

**Measurement Strategy**:
- Instrument with OpenTelemetry tracing
- Measure from request receipt to response sent (exclude network transit)
- Separate metrics: SOAP operations, REST endpoints, Git operations, AI provider calls
- Percentile calculation via Prometheus histogram

**Alternatives Considered**:
1. **Uniform 100ms p95 for all endpoints** - Rejected: Unrealistic for SOAP XML processing
2. **No defined targets** - Rejected: Violates FR-083/FR-084, prevents performance regression detection
3. **Strict 50ms p50** - Rejected: Requires caching/optimization beyond MVP scope

**Implementation Notes**:
- Use `prom-client` for Prometheus metrics
- Middleware: `http_request_duration_seconds{operation, percentile}`
- Alert if p95 exceeds threshold for 5 consecutive minutes
- Document in quickstart.md: "Excludes AI generation latency"

---

## 6. Concurrent Stream Limits (FR-086)

**Decision**: 10 concurrent streams per conversation, configurable via `MAX_STREAMS_PER_CONVERSATION` env var

**Rationale**:
- Memory footprint research: ~2MB per SSE connection, ~5MB per WebSocket connection
- 10 concurrent streams = ~50MB max per conversation (reasonable for 4GB server)
- Research: Most use cases have 1-3 simultaneous viewers (collaboration scenarios)
- 10 provides safety margin for peak usage without resource exhaustion
- HTTP 429 (Too Many Requests) returned when limit exceeded

**Resource Calculation**:
- 1K conversations × 10 streams = 10K max connections
- 10K × 5MB = 50GB memory upper bound (assumes all WebSocket)
- Mitigated by SSE preference (lower memory) and idle connection cleanup

**Alternatives Considered**:
1. **Unlimited streams** - Rejected: DoS risk, violates FR-086 requirement
2. **1 stream per conversation** - Rejected: Prevents legitimate collaboration use cases
3. **100 streams** - Rejected: Excessive resource consumption for typical deployments

**Implementation Notes**:
- Track in-memory map: `conversationId → Set<streamSessionId>`
- Before opening stream: Check `map.get(conversationId).size < MAX_STREAMS_PER_CONVERSATION`
- Return HTTP 429 with `Retry-After: 60` header if exceeded
- Default: `MAX_STREAMS_PER_CONVERSATION=10`

---

## 7. Git Optimization Strategy (FR-087)

**Decision**: Lazy loading with in-memory LRU cache (1000 entries), shallow clone for initial read

**Rationale**:
- Shallow clone reduces disk I/O for large repos (clone depth=1 loads only latest commit)
- LRU cache (Least Recently Used) keeps hot data in memory (commit metadata, recent messages)
- Cache size 1000 = ~10MB memory (10KB avg per entry: commit hash + metadata)
- Research: 80/20 rule applies (20% of conversations account for 80% of reads)

**Optimization Techniques**:
1. **Shallow clone**: `git clone --depth=1` for first-time conversation retrieval
2. **LRU cache**: `lru-cache` npm package for commit metadata
3. **Pagination**: Return max 100 messages per request, client requests next page
4. **Git packfile optimization**: Run `git gc` weekly via cron

**Alternatives Considered**:
1. **Full clone every time** - Rejected: Slow for large repos (thousands of messages)
2. **Redis cache** - Rejected: Adds infrastructure complexity for MVP
3. **No caching** - Rejected: Performance degrades with repository growth (violates FR-087)

**Implementation Notes**:
- Use `lru-cache` package: `new LRUCache({ max: 1000 })`
- Cache key: `${conversationId}:${commitHash}`
- Cache value: `{ message, timestamp, author }`
- Eviction policy: Least Recently Used (LRU) - when cache reaches 1000 entries, evict the entry with the oldest access time
- Cache storage: In-memory using `lru-cache` npm package with `max: 1000` option
- Cache invalidation: No manual invalidation needed (Git commit hashes are immutable, entries never stale)
- Cache hit metrics: Log cache hit rate to monitor effectiveness (target: >80% hit rate in production)
- TTL: 1 hour (conversations actively being read stay hot)
- Invalidate on write to same conversation

---

## 8. Repository Sharding Strategy (FR-090)

**Decision**: Deferred to Phase 3+ (post-MVP)

**Rationale**:
- MVP targets 1K-10K conversations (FR-088), well within single-node file system capacity
- Early optimization violates Constitutional Principle VII (Simplicity & YAGNI)
- No measured performance bottleneck exists yet
- Sharding adds significant operational complexity (migration, routing, backup)

**Alternatives Considered**:
- **Hash-based sharding by conversation ID**: Rejected - adds routing complexity before proving necessary
- **Organization-based sharding**: Rejected - uneven distribution risk, premature optimization
- **Time-based sharding**: Rejected - requires migration logic, deferred until scale demands it

**Implementation Notes**:
- When needed (>10K conversations or measured I/O bottleneck), implement hash-based sharding
- Sharding key: `conversationId` (first 2 hex chars → 256 shards)
- Path pattern: `conversations/{shard}/{conversationId}/`
- Migration strategy: Background process moves repos to sharded structure
- No application logic changes required (abstracted in git-storage library)

**MVP Approach**: Single `conversations/` directory, no sharding. Monitor file system performance metrics (inode count, directory listing latency) in production.

---

## Technology Stack Decisions

### SOAP Library: `strong-soap`

**Decision**: Use `strong-soap` v1.x

**Rationale**:
- WSDL 1.1 and 2.0 support (broader compatibility)
- Active maintenance (last updated 2024)
- WS-Security plugin available (needed for Phase 3 per constitution)
- TypeScript types available via `@types/strong-soap`

**Alternatives Considered**:
1. **`soap`** - Rejected: Less active maintenance, WSDL 2.0 support unclear
2. **`node-soap`** - Rejected: Smaller community, fewer plugins

**Implementation Notes**:
- Install: `npm install strong-soap @types/strong-soap`
- WSDL generation: Use `soap.wsdl.WSDL` class programmatically
- Endpoint: `/soap` (WSDL at `/soap?wsdl`)

---

### REST Framework: Fastify

**Decision**: Use Fastify v4.x

**Rationale**:
- Performance: 2-3x faster than Express (benchmarks: ~76k req/s vs Express ~34k req/s)
- Native schema validation (JSON Schema-based, matches FR-072 branding validation)
- First-class TypeScript support
- SSE plugin available (`@fastify/sse`), WebSocket plugin (`@fastify/websocket`)

**Alternatives Considered**:
1. **Express** - Rejected: Slower, middleware callback hell, TypeScript bolted on
2. **Koa** - Rejected: Smaller ecosystem, less mature streaming plugins

**Implementation Notes**:
- Install: `npm install fastify @fastify/sse @fastify/websocket`
- Schema validation: Built-in via route schema option
- Port: 3000 (configurable via `PORT` env var)

---

### Git Library: `isomorphic-git`

**Decision**: Use `isomorphic-git` v1.x

**Rationale**:
- Pure JavaScript (no native bindings, easier deployment)
- Designed for programmatic use (cleaner API than `simple-git`)
- Supports shallow clone (`depth` option)
- Browser-compatible (future-proofs for potential web-based Git UI)

**Alternatives Considered**:
1. **`simple-git`** - Rejected: Wrapper around `git` CLI (requires system Git, shell execution overhead)
2. **`nodegit`** - Rejected: Native bindings (libgit2), complex build, overkill for file-based operations

**Implementation Notes**:
- Install: `npm install isomorphic-git`
- File system: Use Node.js `fs` for file operations
- Lightning file system (`@isomorphic-git/lightning-fs`): Not needed (server-side only)
- Example: `git.clone({ fs, http, dir, url, depth: 1 })`

---

### AI Provider SDKs: Official SDKs

**Decision**: Use official SDKs for OpenAI and Anthropic

**Packages**:
- OpenAI: `openai` v4.x (official SDK)
- Anthropic: `@anthropic-ai/sdk` v0.x (official SDK)

**Rationale**:
- Official SDKs maintained by providers (first-class feature support)
- Streaming support built-in (essential for FR-021)
- TypeScript types included
- Function calling / tool use APIs match spec requirements (FR-106)

**Alternatives Considered**:
1. **Custom HTTP clients** - Rejected: Reinventing the wheel, slower feature parity
2. **Third-party wrappers** - Rejected: Dependency risk, delayed updates

**Implementation Notes**:
- Install: `npm install openai @anthropic-ai/sdk`
- API keys via env vars: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- Retry logic: Use SDK built-in retries (configure via `maxRetries` option)
- Exponential backoff: Implemented per FR-096 using SDK retry hooks

---

### Test Framework: Vitest

**Decision**: Use Vitest v1.x

**Rationale**:
- Vite-native (required for FR-102 Vite test client integration)
- Fast: Vite's HMR speeds up test iteration
- Jest-compatible API (easy migration if needed)
- ESM-first (matches Node.js 24 ES module focus)

**Alternatives Considered**:
1. **Jest** - Rejected: Slower, ESM support still experimental, not Vite-native
2. **Mocha + Chai** - Rejected: More boilerplate, separate assertion library

**Implementation Notes**:
- Install: `npm install -D vitest @vitest/ui`
- Config: `vitest.config.ts` extends Vite config
- Contract tests: Use `supertest` for HTTP assertions
- Integration tests: Spin up real server with test database

---

### Additional Dependencies

**Logging**: `pino` (fast JSON logger, 5x faster than Winston)
**Validation**: `ajv` (JSON Schema validator for FR-072)
**Metrics**: `prom-client` (Prometheus client for latency tracking)
**Caching**: `lru-cache` (in-memory LRU cache for Git optimization)
**Environment**: `dotenv` (load `.env` files)

---

## Unresolved Items

**None** - All 8 NEEDS CLARIFICATION items have been resolved with concrete decisions. Technology stack is finalized and ready for Phase 1 design.

---

## Next Steps

1. ✅ Phase 0 complete - All unknowns resolved
2. → Proceed to Phase 1: Generate data-model.md, contracts/, and tests
3. → Update plan.md Progress Tracking

