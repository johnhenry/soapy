# Data Model

**Date**: 2025-10-01
**Purpose**: Define data entities, relationships, validation rules, and storage formats for Soapy

**Total Entities**: 9 (6 persisted, 3 transient)

---

## Entity Definitions

### 1. Conversation

**Purpose**: Represents a complete AI conversation session with versioned message history

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | UUID v4 | Yes | RFC 4122 format | Unique conversation identifier |
| `organizationId` | UUID v4 | Yes | Must reference valid Organization | Organization owner for access control |
| `ownerId` | UUID v4 | Yes | Must reference valid User | Creator of the conversation |
| `createdAt` | ISO 8601 | Yes | Timestamp | Conversation creation timestamp |
| `mainBranch` | string | Yes | Default: `"main"` | Name of the primary branch |
| `branches` | string[] | Yes | Default: `["main"]` | List of all branch names |

**Storage**:
- Git repository at `conversations/{id}/`
- Metadata stored in `.soapy-metadata.json` at repo root:
```json
{
  "id": "uuid-v4",
  "organizationId": "uuid-v4",
  "ownerId": "uuid-v4",
  "createdAt": "2025-10-01T12:00:00Z",
  "mainBranch": "main",
  "branches": ["main", "alternative-1"]
}
```

**Relationships**:
- `belongsTo` Organization (via `organizationId`)
- `belongsTo` User (via `ownerId`)
- `hasMany` Messages (via Git commits)
- `hasMany` Branches (via Git branches)
- `hasOne` Branding (via `branding.yml`)

**State Transitions**:
```
[Created] → [Active] → [Deleted]
```
- **Created**: New conversation initialized with `.soapy-metadata.json` and initial commit
- **Active**: Normal state, accepts new messages and branches
- **Deleted**: Hard delete removes entire Git repository (FR-080)

**Validation Rules**:
- `id` must be globally unique
- `organizationId` must exist in system
- `branches` array must include `mainBranch`
- Cannot delete conversation with active stream sessions

**Indexes** (if database used for lookup):
- Primary: `id`
- Foreign: `organizationId`, `ownerId`
- Composite: `(organizationId, createdAt)` for retention queries

---

### 2. Message

**Purpose**: Represents a single turn in conversation (user input or AI assistant response)

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `sequenceNumber` | integer | Yes | > 0, unique per branch | Sequential message number |
| `role` | enum | Yes | `"user"`, `"assistant"`, `"system"` | Message role |
| `content` | string or JSON | Yes | Max 1MB | Message content (text or structured) |
| `timestamp` | ISO 8601 | Yes | Timestamp | Message creation time |
| `aiProvider` | string | Conditional | Only for `assistant` role | AI provider name (e.g., `"openai"`, `"anthropic"`) |
| `model` | string | Conditional | Only for `assistant` role | Model identifier (e.g., `"gpt-4"`, `"claude-3-opus"`) |
| `commitHash` | SHA-1 hex | Yes | 40-char hex string | Git commit hash for this message |

**Storage**:
- File: `{sequenceNumber:04d}-{role}.md` (e.g., `0001-user.md`, `0002-assistant.md`)
- Markdown format:
```markdown
---
role: user
timestamp: 2025-10-01T12:00:00Z
sequenceNumber: 1
---

Hello, how are you?
```
- For assistant messages, add frontmatter:
```markdown
---
role: assistant
timestamp: 2025-10-01T12:00:30Z
sequenceNumber: 2
aiProvider: openai
model: gpt-4
---

I'm doing well, thank you!
```

**Relationships**:
- `belongsTo` Conversation (via parent Git repository)
- `belongsTo` Branch (via Git branch ref)
- `hasMany` ToolCalls (via sequence number reference)

**Validation Rules**:
- `sequenceNumber` must be sequential within branch (gaps allowed if commit failed per spec)
- `role` must be valid enum value
- `aiProvider` and `model` required if `role === "assistant"`
- `content` cannot be empty string
- Git commit must be atomic (all message components commit together, FR-031)

**Sequencing Invariant** (FR-038):
```
For messages M1, M2 on same branch:
  If M1.sequenceNumber < M2.sequenceNumber
  Then M1.timestamp <= M2.timestamp
```

---

### 3. Branch

**Purpose**: Represents an alternative conversation path for exploring different outcomes

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | string | Yes | Unique per conversation, alphanumeric + hyphens | Branch name (e.g., `"alternative-1"`) |
| `sourceMessageNumber` | integer | Yes | Must reference existing message | Branching point in history |
| `createdAt` | ISO 8601 | Yes | Timestamp | Branch creation time |
| `creatorId` | UUID v4 | Yes | Must reference valid User | User who created branch |
| `messageCount` | integer | Yes | >= sourceMessageNumber | Current message count on branch |

**Storage**:
- Git branch ref (`.git/refs/heads/{name}`)
- Branch metadata in `.soapy-branches.json`:
```json
{
  "alternative-1": {
    "sourceMessageNumber": 3,
    "createdAt": "2025-10-01T12:05:00Z",
    "creatorId": "uuid-v4",
    "messageCount": 5
  }
}
```

**Relationships**:
- `belongsTo` Conversation (via parent Git repository)
- `hasMany` Messages (via Git commits on branch)
- `references` Message (via `sourceMessageNumber`)

**Validation Rules**:
- `name` must not conflict with existing branch names (FR-060)
- `sourceMessageNumber` must exist in parent branch
- Branch creation preserves messages 1 to `sourceMessageNumber` (FR-055)
- No merge operations allowed (FR-095)

**Branch Lifecycle**:
```
[Created from main] → [Independent messages added] → [Persists indefinitely]
```
- Branches never merge back to main
- Deletion: Delete Git branch ref (optional, not required by spec)

---

### 4. ToolCall

**Purpose**: Represents an AI agent's request to execute a function or external tool

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `sequenceNumber` | integer | Yes | > 0, unique per branch | Sequential tool call number (shares namespace with messages) |
| `toolName` | string | Yes | Non-empty | Tool/function identifier |
| `parameters` | JSON object | Yes | Valid JSON | Tool input parameters |
| `requestedAt` | ISO 8601 | Yes | Timestamp | Tool call request time |
| `commitHash` | SHA-1 hex | Yes | 40-char hex string | Git commit hash |

**Storage**:
- File: `{sequenceNumber:04d}-tool_call.json`
- JSON format:
```json
{
  "sequenceNumber": 3,
  "toolName": "search_web",
  "parameters": {
    "query": "latest AI research",
    "maxResults": 10
  },
  "requestedAt": "2025-10-01T12:01:00Z"
}
```

**Relationships**:
- `belongsTo` Conversation (via parent Git repository)
- `belongsTo` Message (conceptually, shares sequence space)
- `hasOne` ToolResult (via matching sequence number)

**Validation Rules**:
- `toolName` must not be empty
- `parameters` must be valid JSON object
- Git commit message format: `"tool_call: {toolName} (seq {sequenceNumber})"`
- Parameters preserved exactly as submitted (FR-066)

---

### 5. ToolResult

**Purpose**: Represents the outcome of executing a ToolCall

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `sequenceNumber` | integer | Yes | > 0, unique per branch | Sequential number (shares namespace) |
| `toolCallRef` | integer | Yes | Must reference existing ToolCall | Reference to originating tool call |
| `result` | JSON object | Yes | Valid JSON | Tool execution result data |
| `executedAt` | ISO 8601 | Yes | Timestamp | Execution completion time |
| `status` | enum | Yes | `"success"`, `"failure"` | Execution outcome |
| `retryCount` | integer | Yes | >= 0 | Number of retry attempts (FR-096) |
| `commitHash` | SHA-1 hex | Yes | 40-char hex string | Git commit hash |

**Storage**:
- File: `{sequenceNumber:04d}-tool_result.json`
- JSON format:
```json
{
  "sequenceNumber": 4,
  "toolCallRef": 3,
  "result": {
    "results": ["Article 1", "Article 2"],
    "count": 2
  },
  "executedAt": "2025-10-01T12:01:05Z",
  "status": "success",
  "retryCount": 0
}
```
- Failure example:
```json
{
  "sequenceNumber": 6,
  "toolCallRef": 5,
  "result": {
    "error": "Timeout after 30s"
  },
  "executedAt": "2025-10-01T12:02:00Z",
  "status": "failure",
  "retryCount": 3
}
```

**Relationships**:
- `belongsTo` ToolCall (via `toolCallRef`)
- `belongsTo` Conversation (via parent Git repository)

**Validation Rules**:
- `toolCallRef` must exist in same conversation
- `sequenceNumber` > `toolCallRef` (result follows call)
- `retryCount` <= max retries (configured in research.md as 3)
- Failure status requires `result` to include error information

---

### 6. Branding

**Purpose**: Visual and textual customization for conversation UI

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `logoUrl` | URL string | Yes | HTTPS URL, RFC 3986 | Logo image URL |
| `primaryColor` | string | Yes | Hex color `#RGB` or `#RRGGBB` | Primary brand color |
| `secondaryColor` | string | No | Hex color | Secondary brand color |
| `accentColor` | string | No | Hex color | Accent color |
| `footerText` | string | No | Max 500 chars | Footer attribution text |
| `versionTimestamp` | ISO 8601 | Yes | Timestamp | Last branding update time |

**Storage**:
- File: `branding.yml` at repository root
- YAML format:
```yaml
logoUrl: https://example.com/logo.png
primaryColor: "#3B82F6"
secondaryColor: "#10B981"
accentColor: "#F59E0B"
footerText: "Powered by Example Corp"
versionTimestamp: "2025-10-01T12:00:00Z"
```

**Relationships**:
- `belongsTo` Conversation (one branding config per conversation)
- Versioned in Git history (FR-069)

**Validation Rules** (per research.md FR-072 decision):
- `logoUrl` must match pattern `^https://.*`
- Colors must match pattern `^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$`
- `footerText` length <= 500 characters
- Validated via JSON Schema before Git commit

**Defaults** (FR-073):
- If `branding.yml` missing, fall back to system-wide defaults:
```yaml
logoUrl: https://soapy.example.com/default-logo.png
primaryColor: "#000000"
secondaryColor: "#666666"
accentColor: "#999999"
footerText: ""
```

**Historical Retrieval** (FR-071):
- Checkout specific commit: `git show <commit>:branding.yml`
- Returns branding active at that point in history

---

### 7. FileAttachment (Persisted)

**Purpose**: Represents a file uploaded to a conversation (image, PDF, text, etc.)

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | Yes | Name of the file (e.g., `screenshot.png`) |
| `path` | string | Yes | Relative path within conversation (e.g., `files/screenshot.png`) |
| `size` | integer | Yes | File size in bytes |
| `contentType` | string | Yes | MIME type (e.g., `image/png`, `application/pdf`) |
| `hash` | string | Yes | SHA-256 hash of file contents for integrity verification |
| `uploadedAt` | ISO 8601 | Yes | Upload timestamp |
| `uploadedBy` | UUID v4 | Yes | User ID who uploaded the file |
| `commitHash` | string | Yes | Git commit hash when file was added (40-char hex) |

**Storage**:
- **Filesystem**: Files stored in `files/` subdirectory of conversation repo
- **Metadata**: Stored in `.soapy-metadata.json` under `attachments[]` array
- **Git**: Each file upload creates a commit with message: `"Add file: {filename}"`

**Example `.soapy-metadata.json` entry**:
```json
{
  "attachments": [
    {
      "filename": "screenshot.png",
      "path": "files/screenshot.png",
      "size": 145823,
      "contentType": "image/png",
      "hash": "a1b2c3d4e5f6...",
      "uploadedAt": "2025-10-01T14:32:00Z",
      "uploadedBy": "user-456",
      "commitHash": "abc123def456..."
    }
  ]
}
```

**Validation Rules** (FR-116):
- Max size: 10MB per file
- Allowed types: `image/*`, `application/pdf`, `text/*`, `application/json`, `text/csv`
- Filename sanitization: No path traversal (`../`), no special chars except `-_.`

**Relationships**:
- `belongs to` Conversation (via conversation directory)
- `referenced by` Messages (via markdown links)

**Git Layout**:
```
conversations/550e8400.../
├── files/
│   ├── screenshot.png
│   ├── report.pdf
│   └── data.csv
├── .soapy-metadata.json  # Contains attachments[] array
└── ...
```

**Retrieval**:
- Direct file access: `GET /v1/chat/{chatId}/files/{filename}`
- List files: Parse `.soapy-metadata.json` attachments array
- References in messages: Markdown links like `![Screenshot](files/screenshot.png)`

---

### 8. SOAPOperation (Transient)

**Purpose**: Represents a SOAP request/response interaction (not persisted)

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `operationName` | enum | Yes | One of: `CommitMessage`, `BranchConversation`, `GetConversation`, `GetBranding`, `CommitToolCall`, `CommitToolResult` |
| `requestParams` | XML | Yes | SOAP request body (parsed) |
| `responseData` | XML | Yes | SOAP response body (to be generated) |
| `sessionContext` | object | Yes | Security/session metadata |

**Lifetime**: Request → Process → Response (discarded after response sent)

**Defined In**: WSDL contract (`contracts/soapy.wsdl`)

**Relationships**:
- `operates on` Conversation, Message, Branch, Branding (via parameters)

**Not Stored**: SOAP operations are stateless RPC calls, no persistence

---

### 8. StreamSession (Transient)

**Purpose**: Represents an active SSE/WebSocket streaming connection (in-memory only)

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | UUID v4 | Yes | Unique stream session identifier |
| `conversationId` | UUID v4 | Yes | Conversation being streamed |
| `connectionState` | enum | Yes | One of: `connecting`, `streaming`, `completed`, `disconnected` |
| `clientId` | string | Yes | Client identifier (IP + User-Agent hash) |
| `startedAt` | ISO 8601 | Yes | Stream start time |

**Storage**: In-memory `Map<sessionId, StreamSession>`

**Lifecycle**:
```
[connecting] → [streaming] → [completed] OR [disconnected]
```
- **connecting**: Client opened connection, not yet streaming
- **streaming**: Actively sending tokens/events
- **completed**: Stream finished successfully, connection closing
- **disconnected**: Client disconnected (continue generation per FR-024)

**Relationships**:
- `streams` Messages from Conversation

**Cleanup**:
- Completed/disconnected sessions removed after 60 seconds
- Memory leak prevention: Max 10 sessions per conversation (FR-086 per research.md)

---

## Entity Relationship Diagram

```
Organization (1) ──── (N) Conversation
                           │
                           ├── (1) Branding
                           ├── (N) Branch
                           └── (N) Message
                                    │
                                    └── (N) ToolCall
                                             │
                                             └── (1) ToolResult

Transient Entities (not shown in Git storage):
- SOAPOperation (stateless RPC)
- StreamSession (in-memory)
```

---

## Storage Layout Example

**Conversation ID**: `550e8400-e29b-41d4-a716-446655440000`

**Git Repository**: `conversations/550e8400-e29b-41d4-a716-446655440000/`

```
conversations/550e8400-e29b-41d4-a716-446655440000/
├── .git/                          # Git internals
│   ├── refs/heads/main            # Main branch
│   ├── refs/heads/alternative-1   # Alternative branch
│   └── ...
├── .soapy-metadata.json           # Conversation metadata
├── .soapy-branches.json           # Branch metadata
├── branding.yml                   # Branding configuration
├── 0001-user.md                   # First user message
├── 0002-assistant.md              # First assistant response
├── 0003-tool_call.json            # Tool call
├── 0004-tool_result.json          # Tool result
├── 0005-user.md                   # Second user message
├── 0006-assistant.md              # Second assistant response
└── files/                         # Optional: conversation-specific files
    └── uploaded-image.png
```

**Git Log Example**:
```
commit abc123 (HEAD -> main)
Author: assistant <assistant@soapy>
Date: 2025-10-01 12:01:00

message: assistant response (seq 6, provider: openai, model: gpt-4)

commit def456
Author: user <user@soapy>
Date: 2025-10-01 12:00:50

message: user message (seq 5)

commit ghi789
Author: system <system@soapy>
Date: 2025-10-01 12:00:45

tool_result: success (seq 4, ref: 3)

commit jkl012
Author: system <system@soapy>
Date: 2025-10-01 12:00:40

tool_call: search_web (seq 3)
```

---

## Validation Summary

**Atomic Operations** (FR-031):
- All message components (file + metadata + commit) succeed or fail together
- Use Git transactions (stage all → commit all)

**Sequential Numbering** (FR-038):
- Enforced per branch via file naming and metadata validation
- Gaps allowed only if commit permanently fails (logged)

**Append-Only** (FR-037):
- No Git history rewriting
- No file deletions (except hard delete of entire conversation)
- Git garbage collection disabled for conversation repos

**Cryptographic Verification** (FR-036):
- Every commit has SHA-1 hash
- Hash chain ensures tamper-proof history
- Optional: GPG signing for commit signatures (Phase 3)

---

## Migration & Versioning

**Repository Schema Version**: Stored in `.soapy-version` file
```
1.0.0
```

**Migration Strategy**:
- Major version bump: Breaking schema change (e.g., rename `.soapy-metadata.json`)
- Migration script: `soapy-migrate` CLI reads `.soapy-version`, applies transforms
- Backwards compatibility: System reads both old and new formats during transition

**Example Migration (1.0.0 → 2.0.0)**:
1. Detect `.soapy-version == 1.0.0`
2. Transform metadata JSON structure
3. Update `.soapy-version` to `2.0.0`
4. Commit migration as Git commit with message: `"migrate: schema 1.0.0 → 2.0.0"`

---

## Performance Considerations

**Read Optimization**:
- LRU cache for commit metadata (1000 entries, ~10MB RAM per research.md)
- Shallow clone for initial reads (`git clone --depth=1`)
- Pagination: Max 100 messages per API response

**Write Optimization**:
- Queue-based serialization per conversation (FR-091, FR-092)
- Batch commits: Group multiple small files into single commit if submitted together
- Async Git operations (non-blocking I/O)

**Scale Limits** (per research.md):
- 1K-10K conversations (MVP target)
- Unlimited messages per conversation (graceful degradation)
- 10 concurrent streams per conversation (FR-086)

---

## Next Steps

1. ✅ Data model defined
2. → Generate API contracts (WSDL, OpenAPI) in `contracts/`
3. → Generate contract tests that validate this data model

