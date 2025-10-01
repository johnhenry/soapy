# Feature Specification: Soapy - Hybrid SOAP/REST AI API System

**Feature Branch**: `002-create-a-comprehensive`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "Create a comprehensive specification for Soapy, a hybrid SOAP/REST AI API system with Git-backed conversation storage. The system should provide: 1) SOAP submission endpoint with WSDL contracts for enterprise clients, 2) REST retrieval endpoints supporting multiple formats (OpenAI, Anthropic, custom), 3) Streaming support via SSE/WebSocket, 4) Git-based conversation versioning with branching, 5) Agent/tool support with deterministic replay, 6) Multi-format error handling, 7) Per-conversation branding. Reference the PRD at ../soapy-prd.md for detailed requirements."

## Execution Flow (main)
```
1. Parse user description from Input
   � Extract key concepts: SOAP, REST, Git, streaming, agents, branding
2. Identify actors: enterprise clients, modern developers, compliance officers, AI researchers
3. For each unclear aspect: marked with [NEEDS CLARIFICATION]
4. Fill User Scenarios & Testing section
   � Primary flows: SOAP submission, REST retrieval, branching, streaming
5. Generate Functional Requirements
   � API endpoints, storage, format conversion, error handling
6. Identify Key Entities
   � Conversations, Messages, Branches, Branding, Tools
7. Run Review Checklist
   � SUCCESS (spec ready for planning)
```

---

## � Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-01
- Q: What authentication method(s) should the system support? → A: API Keys only (simple token-based authentication)
- Q: What concurrency control strategy should the system use? → A: Queue-based (serialize all writes per conversation)
- Q: What permission model should the system use for conversation access? → A: Organization-wide (all org members can access)
- Q: Git repository corruption recovery strategy (FR-040)? → A: Manual intervention
- Q: Transport security requirements (FR-078)? → A: HTTPS optional (support both HTTP and HTTPS)
- Q: Conversation deletion policy (FR-080)? → A: Hard delete
- Q: Target conversation scale (FR-088)? → A: Thousands (1K-10K conversations)
- Q: Default branding source (FR-073)? → A: System-wide defaults
- Q: What should happen when a Git merge conflict occurs between conversation branches? → A: Reject merge operation, keep branches independent
- Q: What should happen when a tool call execution fails or times out? → A: Retry automatically with exponential backoff
- Q: How should the system handle tool calls with side effects during replay? → A: Execute tools normally (allow side effects)
- Q: What should happen when tool definitions change between recording and replay? → A: Warn user, continue with current definition
- Q: How should the system handle messages that cannot be cleanly converted between formats (e.g., SOAP-specific features in OpenAI format)? → A: Convert to closest equivalent, log warning
- Q: Implementation platform requirement? → A: Node.js version 24
- Q: Testing/validation client requirement? → A: Vite-based test client that exercises all features
- Q: Does the system integrate with actual AI providers to generate assistant responses? → A: Full integration - calls AI APIs to generate responses (with connectors for multiple providers)
- Q: What should happen when conversation repositories grow very large (thousands of messages)? → A: No special handling (allow unlimited growth)
- Q: What should happen when a client requests an unsupported format combination? → A: Use default format, log warning
- Q: How should the system handle client disconnection during streaming? → A: Continue generation, store in Git

---

## User Scenarios & Testing

### Primary User Stories

**Enterprise Integration Team**
As an enterprise integration team, I need to submit AI conversation messages via SOAP with formal contracts (WSDL) so I can integrate AI capabilities into our existing ESB infrastructure while maintaining compliance, security, and audit requirements.

**Modern Development Team**
As a web developer, I want to retrieve AI conversations using OpenAI-compatible JSON REST endpoints with streaming support so I can quickly integrate AI features without learning SOAP while still accessing enterprise-managed conversation state.

**Compliance Officer**
As a compliance officer, I need complete audit trails of AI conversations with cryptographic verification (Git commits) so I can ensure regulatory compliance, investigate issues, and prove data integrity.

**AI Researcher**
As an AI researcher, I want to branch conversations and replay agent reasoning with different tool results so I can test alternative decision paths, validate AI behavior, and compare outcomes.

### Acceptance Scenarios

#### Scenario 1: SOAP Message Submission
1. **Given** an enterprise client with SOAP infrastructure, **When** they submit a user message via the SOAP CommitMessage operation with valid conversation ID and message content, **Then** the system MUST accept the message, store it in the Git repository as a numbered commit, and return a success response with the commit reference.

2. **Given** a SOAP client requesting the WSDL contract, **When** they access the WSDL endpoint, **Then** the system MUST return a complete, valid WSDL document defining all operations (CommitMessage, BranchConversation, GetConversation, GetBranding) with proper type definitions.

#### Scenario 2: REST Retrieval with Multiple Formats
1. **Given** a conversation with existing messages, **When** a REST client requests GET /chat/{chatId}?format=openai, **Then** the system MUST return the conversation in OpenAI-compatible JSON format with all messages in the correct structure.

2. **Given** the same conversation, **When** a REST client requests GET /chat/{chatId}?format=anthropic, **Then** the system MUST return the conversation in Anthropic-compatible JSON format with proper message role mapping.

3. **Given** the same conversation, **When** a REST client requests GET /chat/{chatId}?type=xml&format=soap, **Then** the system MUST return the conversation as SOAP-wrapped XML.

#### Scenario 3: Streaming Support
1. **Given** a conversation being processed by an AI model, **When** a REST client requests GET /chat/{chatId} with Accept: text/event-stream header, **Then** the system MUST stream response tokens via Server-Sent Events as they are generated.

2. **Given** a WebSocket connection to a conversation endpoint, **When** the AI generates response tokens, **Then** the system MUST send real-time token updates through the WebSocket connection.

#### Scenario 4: Git-Backed Conversation Branching
1. **Given** a conversation with 5 messages on the main branch, **When** a client executes BranchConversation operation with branch name "alternative" starting from message 3, **Then** the system MUST create a new Git branch containing messages 1-3 and allow independent continuation.

2. **Given** a branched conversation, **When** messages are added to the branch, **Then** the system MUST store them as separate Git commits on that branch without affecting the main branch.

3. **Given** multiple conversation branches, **When** a client retrieves a specific branch, **Then** the system MUST return only the messages from that branch in chronological order.

#### Scenario 5: Agent and Tool Support
1. **Given** an AI agent conversation, **When** the agent requests a tool call, **Then** the system MUST store the tool call as a structured commit (tool_call.json) in the Git repository with all parameters.

2. **Given** a stored tool call, **When** the system receives a tool result via CommitToolResult operation, **Then** the system MUST store the result as a numbered commit (tool_result.json) linked to the original tool call.

3. **Given** a conversation with tool calls and results, **When** a client requests deterministic replay, **Then** the system MUST reconstruct the exact agent reasoning chain including all tool interactions in sequence.

#### Scenario 6: Per-Conversation Branding
1. **Given** a new conversation, **When** branding information (logo URL, colors, footer text) is provided via SOAP or REST, **Then** the system MUST store it as branding.yml in the conversation's Git repository.

2. **Given** a conversation with branding information, **When** a client calls GetBranding operation, **Then** the system MUST return the current branding configuration from the Git repository.

3. **Given** branding changes over time, **When** accessing historical conversation versions, **Then** the system MUST return the branding that was active at that point in history.

#### Scenario 7: Multi-Format Error Handling
1. **Given** an invalid SOAP request, **When** the system encounters a validation error, **Then** it MUST return a SOAP Fault with proper structure and error code.

2. **Given** an invalid REST request, **When** the system encounters an error and format=openai, **Then** it MUST return an error in OpenAI's error format with appropriate error type and message.

3. **Given** an error during SSE streaming, **When** the system encounters an error, **Then** it MUST send an error event through the stream with proper event type and data.

### Edge Cases

#### Message Sequencing
- **What happens when** concurrent clients submit messages to the same conversation? The system maintains a per-conversation write queue that serializes all message commits, ensuring sequential numbering and preventing Git conflicts.
- **How does the system handle** gaps in message numbering if commits fail? Failed commits are retried within the queue; if permanently failed, the message number is skipped and logged for audit purposes.

#### Git Operations
- **What happens when** a Git merge conflict occurs between conversation branches? The system rejects any merge operation and maintains branches as independent histories. Branches are intended for alternative conversation paths, not for merging back together.
- **How does the system handle** Git repository corruption or unavailability? When corruption is detected, the system returns an error to the client and logs the incident for manual recovery. No automatic repair is attempted.
- **What happens when** conversation repositories grow very large (thousands of messages)? The system allows unlimited growth with no special handling, archiving, or hard limits. Git repository performance is expected to degrade gracefully as repositories grow.

#### Format Conversion
- **How does the system handle** messages that cannot be cleanly converted between formats (e.g., SOAP-specific features in OpenAI format)? The system converts features to the closest equivalent in the target format and logs a warning. Conversion is always attempted rather than rejected.
- **What happens when** a client requests an unsupported format combination? The system uses a default format (JSON with OpenAI structure), logs a warning about the incompatible parameters, and continues processing the request.

#### Streaming
- **How does the system handle** client disconnection during streaming? The system continues AI generation to completion and stores the full assistant response in Git, even if the client disconnects. The complete response remains available for later retrieval.
- **What happens when** multiple clients stream the same conversation simultaneously? The system allows up to 10 concurrent streaming sessions per conversation (configurable via MAX_STREAMS_PER_CONVERSATION). If the limit is exceeded, new streaming requests receive HTTP 429 (Too Many Requests) with a Retry-After header. Each client receives independent streaming sessions of the same content; all sessions stream the same AI-generated response in real-time.
- **How does the system handle** streaming timeout for long-running AI responses? The system applies a 300-second (5-minute) default timeout for streaming connections (configurable via STREAM_TIMEOUT_MS). When timeout is reached, the system sends a final SSE error event or WebSocket close frame with code 1006 (abnormal closure), then continues generation to completion and stores the result in Git per FR-024. Clients can retrieve the completed response after timeout via GET endpoints.

#### Security and Access Control
- **How does the system handle** authentication for SOAP vs REST endpoints? Both SOAP and REST endpoints use API key authentication via headers (X-API-Key or Authorization: Bearer).
- **What happens when** a user attempts to access or branch a conversation they don't own? All members of an organization can access any conversation within that organization. Cross-organization access is denied with HTTP 403.
- **How are** permissions managed for conversation branches? All organization members have equal access to all branches within their organization's conversations.

#### Tool Execution
- **What happens when** a tool call execution fails or times out? The system automatically retries the tool execution using exponential backoff. After maximum retry attempts are exhausted, the system stores a failure result in the tool result commit.
- **How does the system handle** tool calls with side effects during replay? The system executes all tools normally during replay, allowing side effects to occur. Users must be aware that replay will re-execute tools with their actual effects.
- **What happens when** tool definitions change between recording and replay? The system warns the user about tool definition mismatches but continues replay using the current tool definition. This may result in different behavior or errors if signatures are incompatible.

---

## Requirements

### Functional Requirements

#### API Endpoints

**AI Provider Integration**
- **FR-103**: System MUST integrate with multiple AI provider APIs to generate assistant responses (OpenAI, Anthropic, and extensible to others)
- **FR-104**: System MUST allow clients to specify which AI provider to use for generating responses (via SOAP or REST parameters)
- **FR-105**: System MUST handle AI provider API failures with appropriate error responses to clients
- **FR-106**: System MUST support provider-specific features (e.g., OpenAI function calling, Anthropic thinking blocks) when generating responses
- **FR-107**: System MUST store provider selection and model information with each assistant message in Git commits

**SOAP Operations**
- **FR-001**: System MUST provide a single SOAP endpoint accepting all SOAP operations with POST requests
- **FR-002**: System MUST provide a complete, valid WSDL contract document describing all SOAP operations and types
- **FR-003**: System MUST support CommitMessage operation to submit user and assistant messages to conversations
- **FR-004**: System MUST support BranchConversation operation to create new conversation branches from specific message points
- **FR-005**: System MUST support GetConversation operation to retrieve conversation state via SOAP
- **FR-006**: System MUST support GetBranding operation to retrieve conversation branding information
- **FR-007**: System MUST support CommitToolCall operation to submit structured tool/function requests
- **FR-008**: System MUST support CommitToolResult operation to submit tool execution results
- **FR-009**: System MUST validate all SOAP requests against WSDL schema and reject malformed requests

**REST Endpoints**
- **FR-012**: System MUST provide GET /chat/{chatId} endpoint to retrieve conversations
- **FR-013**: System MUST provide GET /conversation/{conversationId} endpoint to retrieve full conversation details
- **FR-014**: System MUST support query parameter 'type' with values: json, xml, plain
- **FR-015**: System MUST support query parameter 'format' with values: openai, anthropic, soap
- **FR-016**: System MUST support Accept header negotiation for content type selection
- **FR-017**: System MUST return HTTP 404 for non-existent conversation IDs
- **FR-018**: System MUST use default format (JSON with OpenAI structure) and log warnings when clients request unsupported format combinations
- **FR-019**: System MUST support CORS headers for browser-based clients [NEEDS CLARIFICATION: allowed origins - specific domains, wildcard, configurable?]

**Streaming Support**
- **FR-020**: System MUST support Server-Sent Events (SSE) streaming when Accept: text/event-stream header is provided (see FR-024 for disconnection handling)
- **FR-021**: System MUST stream AI response tokens in real-time as they are generated
- **FR-022**: System MUST support WebSocket upgrade on REST endpoints for bidirectional communication
- **FR-023**: System MUST send proper SSE event types for data, errors, and completion
- **FR-024**: System MUST continue AI generation to completion and store the full response in Git when clients disconnect during streaming. The completed response MUST remain available for later retrieval via standard GET endpoints (applies to both SSE and WebSocket connections)
- **FR-025**: System MUST support streaming timeout configuration [NEEDS CLARIFICATION: default timeout value and configurability]
- **FR-109**: [REMOVED - Consolidated into FR-024]

#### Conversation Storage

**Git-Backed Storage**
- **FR-026**: System MUST store each conversation in a dedicated Git repository under conversations/{conversationId}/
- **FR-027**: System MUST store each message as a numbered file (0001-user.md, 0002-assistant.md, etc.) in chronological order
- **FR-028**: System MUST create a Git commit for each message with proper commit message and author information
- **FR-029**: System MUST store tool calls as structured JSON files (NNNN-tool_call.json)
- **FR-030**: System MUST store tool results as structured JSON files (NNNN-tool_result.json)
- **FR-031**: System MUST maintain atomic consistency - all message components MUST commit together or fail together
- **FR-032**: System MUST support conversation branches as Git branches with independent message histories
- **FR-033**: System MUST preserve complete Git history for audit trails and version control
- **FR-034**: System MUST store branding configuration as branding.yml in the conversation repository
- **FR-035**: System MUST store conversation-specific files in a files/ subdirectory

**Data Integrity**
- **FR-036**: System MUST provide cryptographic verification of conversation history via Git commit hashes
- **FR-037**: System MUST prevent message deletion or modification (append-only conversation history)
- **FR-038**: System MUST ensure sequential message numbering within each branch
- **FR-039**: System MUST validate Git repository integrity on read operations
- **FR-040**: System MUST handle Git repository corruption by returning an error response to the client and logging the incident for manual recovery (no automatic repair attempted)

#### Format Conversion

**Multi-Format Output**
- **FR-041**: System MUST convert Git-stored messages to OpenAI chat completion format with proper role mapping (user, assistant, system, tool)
- **FR-042**: System MUST convert Git-stored messages to Anthropic messages format with proper role and content structure
- **FR-043**: System MUST convert Git-stored messages to SOAP XML format with proper SOAP envelope wrapping
- **FR-044**: System MUST preserve all message content and metadata during format conversion
- **FR-045**: System MUST handle format-specific features (e.g., OpenAI function calling, Anthropic thinking blocks)
- **FR-046**: System MUST return plain text format with basic message concatenation when type=plain
- **FR-047**: System MUST maintain consistent message ordering across all output formats
- **FR-100**: System MUST convert format-incompatible features to the closest equivalent in the target format and log warnings rather than rejecting conversion

**Error Mapping**
- **FR-048**: System MUST return SOAP Faults for SOAP endpoint errors with proper fault codes
- **FR-049**: System MUST return OpenAI-compatible error JSON when format=openai
- **FR-050**: System MUST return Anthropic-compatible error JSON when format=anthropic
- **FR-051**: System MUST maintain consistent error taxonomy across all formats
- **FR-052**: System MUST include appropriate HTTP status codes for REST errors
- **FR-053**: System MUST send error events via SSE for streaming errors
- **FR-054**: System MUST map internal error types to provider-specific error codes and messages

#### Branching and Versioning

**Conversation Branching**
- **FR-055**: System MUST allow creating new branches from any message point in conversation history
- **FR-056**: System MUST maintain independent message sequences on different branches
- **FR-057**: System MUST allow retrieving specific branch state via branch name parameter
- **FR-058**: System MUST list all available branches for a conversation
- **FR-059**: System MUST support branching from historical messages without modifying main branch
- **FR-060**: System MUST prevent branch name conflicts within a conversation
- **FR-061**: System MUST preserve branch creation metadata (timestamp, creator, source message)
- **FR-095**: System MUST reject any merge operations between conversation branches, maintaining branches as independent alternative conversation paths

**Deterministic Replay**
- **FR-062**: System MUST reconstruct complete agent reasoning chains from Git history
- **FR-063**: System MUST replay tool calls and results in exact chronological order
- **FR-064**: System MUST support replay from any point in conversation history
- **FR-065**: System MUST allow replay with alternative tool results on branches
- **FR-066**: System MUST preserve tool call parameters exactly as originally submitted
- **FR-067**: System MUST identify points where replay diverges from original execution
- **FR-096**: System MUST retry failed or timed-out tool executions using exponential backoff
- **FR-097**: System MUST store failure status and retry count in tool result commits when maximum retry attempts are exhausted
- **FR-098**: System MUST execute tools normally during replay, allowing side effects to occur (no sandboxing or dry-run mode)
- **FR-099**: System MUST warn users when tool definitions change between recording and replay, then continue replay using the current tool definition

#### Branding and Customization

**Per-Conversation Branding**
- **FR-068**: System MUST store branding configuration (logo URL, color scheme, footer text) per conversation
- **FR-069**: System MUST version branding changes with conversation history in Git
- **FR-070**: System MUST retrieve active branding for current conversation state
- **FR-071**: System MUST retrieve historical branding for past conversation states
- **FR-072**: System MUST validate branding configuration schema [NEEDS CLARIFICATION: validation rules - required fields, URL format, color format?]
- **FR-073**: System MUST fall back to system-wide default branding configuration when a conversation has no explicit branding defined

#### Security and Access Control

**Authentication**
- **FR-074**: System MUST authenticate all API requests using API keys provided in request headers (X-API-Key or Authorization: Bearer token)
- **FR-075**: System MUST authorize conversation access to all members within the same organization (organization-wide access model)
- **FR-076**: System MUST prevent unauthorized cross-organization access to conversation data
- **FR-077**: System MUST audit all access attempts in system logs
- **FR-078**: System MUST support both HTTP and HTTPS protocols for credential transmission, allowing client-chosen transport security
- **FR-093**: System MUST associate each API key with a specific organization for access control
- **FR-094**: System MUST allow any organization member to read, write, and branch conversations within their organization

**Data Privacy**
- **FR-079**: System MUST isolate conversation data between different organizations
- **FR-080**: System MUST support hard deletion of conversations, permanently removing the conversation repository and all associated Git data
- **FR-081**: System MUST sanitize error messages to prevent information leakage
- **FR-082**: System MUST comply with data retention policies [NEEDS CLARIFICATION: retention periods - configurable, compliance requirements?]

#### Performance and Scalability

**Performance Requirements**
- **FR-083**: System MUST respond to SOAP requests within acceptable latency [NEEDS CLARIFICATION: target latency - p50, p95, p99 thresholds?]
- **FR-084**: System MUST respond to REST requests within acceptable latency [NEEDS CLARIFICATION: target latency thresholds?]
- **FR-085**: System MUST handle concurrent requests to different conversations without blocking
- **FR-086**: System MUST support concurrent streaming clients [NEEDS CLARIFICATION: maximum concurrent streams per conversation?]
- **FR-087**: System MUST optimize Git operations for large conversation histories [NEEDS CLARIFICATION: optimization strategy - lazy loading, pagination, caching?]
- **FR-091**: System MUST serialize write operations per conversation using a queue-based concurrency control mechanism
- **FR-092**: System MUST process queued write operations in FIFO order to maintain message sequence integrity

**Scalability Requirements**
- **FR-088**: System MUST support a target scale of thousands of conversations (1K-10K range) with acceptable performance
- **FR-089**: System MUST support unlimited message count per conversation with no hard limits or special archiving
- **FR-090**: System MUST handle repository sharding for scale [NEEDS CLARIFICATION: sharding strategy - by user, by time, by hash?]
- **FR-108**: System MUST allow Git repositories to grow without enforced archiving, accepting graceful performance degradation for very large conversations

#### Implementation Constraints

**Platform and Technology**
- **FR-101**: System MUST be implemented using Node.js version 24
- **FR-102**: System MUST include a Vite-based test client that exercises all functional requirements and validates SOAP, REST, streaming, branching, tool execution, and branding features

### Key Entities

**Conversation**
- Represents a complete interaction session between users and AI
- Contains: unique conversation ID, creation timestamp, organization ID, owner/creator identity, main branch, list of branches
- Stored as: Git repository under conversations/{conversationId}/
- Relationships: belongs to Organization, has many Messages, has many Branches, has one Branding configuration

**Message**
- Represents a single communication turn (user input or assistant response)
- Contains: sequence number, role (user/assistant/system), content (text/structured), timestamp, AI provider name (for assistant messages), model name (for assistant messages), commit hash
- Stored as: numbered files (NNNN-{role}.md) with corresponding Git commits
- Relationships: belongs to Conversation, belongs to Branch, may reference Tool Calls

**Branch**
- Represents an alternative conversation path from a divergence point
- Contains: branch name, source message reference, creation timestamp, creator identity, current message count
- Stored as: Git branch within conversation repository
- Relationships: belongs to Conversation, has many Messages, has branching point reference

**Tool Call**
- Represents an agent's request to execute a function or tool
- Contains: sequence number, tool/function name, parameters (structured), request timestamp, commit hash
- Stored as: NNNN-tool_call.json files with Git commits
- Relationships: belongs to Message/Conversation, has corresponding Tool Result

**Tool Result**
- Represents the outcome of a tool execution
- Contains: sequence number, tool call reference, result data (structured), execution timestamp, success/failure status, retry count, commit hash
- Stored as: NNNN-tool_result.json files with Git commits
- Relationships: belongs to Tool Call, belongs to Conversation

**Branding**
- Represents visual and textual customization for a conversation
- Contains: logo URL, primary color, secondary color, accent color, footer text, version timestamp
- Stored as: branding.yml in conversation repository root
- Relationships: belongs to Conversation, versioned in Git history

**SOAP Operation**
- Represents a SOAP request/response interaction
- Contains: operation name (CommitMessage, BranchConversation, GetConversation, GetBranding, CommitToolCall, CommitToolResult), request parameters, response data, session/security context
- Defined in: WSDL contract document
- Relationships: operates on Conversations, Messages, Branches, Branding

**Stream Session**
- Represents an active streaming connection (SSE or WebSocket)
- Contains: session ID, conversation reference, connection state, client identifier, start timestamp
- Lifecycle: established on connection, terminated on completion or disconnect
- Relationships: streams Messages from Conversation

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain - **6 clarifications needed** (deferred to planning)
- [x] Requirements are testable and unambiguous (except deferred items)
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

### Outstanding Clarifications

**Security & Authentication (High Priority) - Deferred to Planning**
1. WS-Security profiles required (FR-010) - SOAP-specific implementation detail
2. WS-ReliableMessaging delivery guarantees (FR-011) - SOAP-specific implementation detail
3. CORS configuration (FR-019) - Configuration detail better suited for planning phase

**Data Management (Medium Priority)**
4. Data retention policies (FR-082) - Compliance requirement needing stakeholder input

**Performance & Scale (Medium Priority) - Deferred to Planning**
5. Performance latency targets (FR-083, FR-084) - Quantitative targets to be defined during architecture planning
6. Maximum concurrent streams (FR-086) - Resource allocation decision for planning phase
7. Message count limits per conversation (FR-089) - Scalability constraint to be determined during design
8. Repository sharding strategy (FR-090) - Architecture decision for planning phase

**Configuration (Low Priority) - Deferred to Planning**
9. Streaming timeout defaults (FR-025) - Configuration parameter for implementation phase
10. Branding validation rules (FR-072) - Schema design detail for planning phase
11. Git optimization strategy (FR-087) - Performance optimization strategy for planning phase

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted (SOAP, REST, Git, streaming, agents, branding, AI integration)
- [x] Ambiguities marked and resolved
- [x] User scenarios defined (7 primary scenarios, 6 edge case categories - all resolved)
- [x] Requirements generated (109 functional requirements)
- [x] Entities identified (8 key entities with updated attributes)
- [x] Clarification phase completed (17 total questions answered: 8 from first session + 9 from second session)
- [x] Implementation constraints specified (Node.js 24, Vite test client)
- [x] AI provider integration clarified (multi-provider support)
- [x] All critical edge cases resolved
- [x] Spec updated with complete clarification results
- [x] Review checklist updated

---

## Next Steps

1. **Optional**: Run `/clarify` again if further functional clarifications are needed before planning
2. **Recommended**: Proceed to `/plan` to create detailed implementation design
3. **After Planning**: Run `/tasks` to generate actionable task breakdown
4. **Implementation**: Execute tasks with iterative testing and validation

---
