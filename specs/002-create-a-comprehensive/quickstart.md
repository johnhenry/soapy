# Soapy Quickstart Guide

**Last Updated**: 2025-10-01
**Version**: 1.0.0

This guide walks you through setting up Soapy and validating all core features in under 10 minutes.

---

## Prerequisites

- **Node.js 24** (check: `node --version`)
- **Git CLI** (check: `git --version`)
- **curl** or **Postman** (for API testing)
- **OpenAI API key** OR **Anthropic API key** (for AI integration)

---

## Step 1: Installation

```bash
# Clone repository
git clone https://github.com/soapy/soapy.git
cd soapy

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add your API keys
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
```

---

## Step 2: Initialize Test Data

```bash
# Create test conversation repository
npm run setup-test-data

# Expected output:
# ✓ Created test conversation: 550e8400-e29b-41d4-a716-446655440000
# ✓ Initialized Git repository
# ✓ Created default branding configuration
```

---

## Step 3: Start the Server

```bash
# Terminal 1: Start backend server
npm run start:backend

# Expected output:
# Soapy server listening on http://localhost:3000
# SOAP endpoint: http://localhost:3000/soap
# REST endpoint: http://localhost:3000/v1
# WSDL available at: http://localhost:3000/soap?wsdl
```

---

## Step 4: Validate SOAP Interface

### 4.1 Retrieve WSDL Contract

```bash
curl http://localhost:3000/soap?wsdl

# Expected: XML WSDL document with 8 operations
# Should see: CommitMessage, BranchConversation, GetConversation, CommitFile, GetFile, etc.
```

### 4.2 Submit Message via SOAP

Create `commit-message.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:CommitMessageRequest>
      <tns:conversationId>550e8400-e29b-41d4-a716-446655440000</tns:conversationId>
      <tns:role>user</tns:role>
      <tns:content>Hello, what is the weather like today?</tns:content>
    </tns:CommitMessageRequest>
  </soap:Body>
</soap:Envelope>
```

Submit via SOAP:
```bash
curl -X POST http://localhost:3000/soap \
  -H "Content-Type: text/xml" \
  -H "X-API-Key: test-api-key-123" \
  -d @commit-message.xml

# Expected response:
# <CommitMessageResponse>
#   <commitHash>abc123...</commitHash>
#   <sequenceNumber>1</sequenceNumber>
#   <timestamp>2025-10-01T12:00:00Z</timestamp>
# </CommitMessageResponse>
```

**✅ Success Criterion**: SOAP response with valid commit hash

---

## Step 5: Validate REST Interface

### 5.1 Retrieve Conversation (OpenAI Format)

```bash
curl http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000?format=openai \
  -H "X-API-Key: test-api-key-123"

# Expected response:
{
  "messages": [
    {
      "role": "user",
      "content": "Hello, what is the weather like today?"
    }
  ]
}
```

**✅ Success Criterion**: JSON response with OpenAI-compatible message structure

### 5.2 Retrieve Conversation (Anthropic Format)

```bash
curl http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000?format=anthropic \
  -H "X-API-Key: test-api-key-123"

# Expected response:
{
  "messages": [
    {
      "role": "user",
      "content": "Hello, what is the weather like today?"
    }
  ]
}
```

**✅ Success Criterion**: JSON response with Anthropic-compatible message structure

### 5.3 Submit Message via REST (Trigger AI Response)

```bash
curl -X POST http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-123" \
  -d '{
    "role": "user",
    "content": "Tell me a joke about programming",
    "aiProvider": "openai",
    "model": "gpt-4"
  }'

# Expected response:
{
  "commitHash": "def456...",
  "sequenceNumber": 2,
  "timestamp": "2025-10-01T12:00:30Z"
}
```

**✅ Success Criterion**: Commit hash returned, AI response generated and stored in Git

---

## Step 6: Validate Streaming (SSE)

```bash
# Stream AI response in real-time
curl -N http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000 \
  -H "Accept: text/event-stream" \
  -H "X-API-Key: test-api-key-123"

# Expected output (streamed tokens):
event: data
data: {"token": "Sure"}

event: data
data: {"token": ","}

event: data
data: {"token": " here's"}

# ... (more tokens)

event: done
data: {"sequenceNumber": 3, "commitHash": "ghi789..."}
```

**✅ Success Criterion**: Real-time token streaming via Server-Sent Events

---

## Step 7: Validate Branching

### 7.1 Create a Branch

```bash
curl -X POST http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000/branch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-123" \
  -d '{
    "branchName": "alternative-joke",
    "fromMessageNumber": 2
  }'

# Expected response:
{
  "branchRef": "alternative-joke",
  "createdAt": "2025-10-01T12:05:00Z"
}
```

### 7.2 Add Message to Branch

```bash
curl -X POST http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-123" \
  -d '{
    "role": "user",
    "content": "Actually, tell me a joke about databases instead"
  }' \
  --url 'http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000/message?branch=alternative-joke'

# Expected: New message on branch, independent from main
```

### 7.3 Retrieve Branch

```bash
curl 'http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000?branch=alternative-joke&format=openai' \
  -H "X-API-Key: test-api-key-123"

# Expected: Messages from alternative-joke branch only
```

**✅ Success Criterion**: Branch created, independent messages on branch

---

## Step 8: Validate Tool Execution

### 8.1 Submit Tool Call

```bash
curl -X POST http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000/tool-call \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-123" \
  -d '{
    "toolName": "search_web",
    "parameters": {
      "query": "latest AI research",
      "maxResults": 5
    }
  }'

# Expected response:
{
  "commitHash": "jkl012...",
  "sequenceNumber": 4
}
```

### 8.2 Submit Tool Result

```bash
curl -X POST http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000/tool-result \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-123" \
  -d '{
    "toolCallRef": 4,
    "result": {
      "results": ["Article 1: Transformers", "Article 2: RAG Systems"],
      "count": 2
    },
    "status": "success"
  }'

# Expected response:
{
  "commitHash": "mno345...",
  "sequenceNumber": 5
}
```

**✅ Success Criterion**: Tool call and result stored in Git as JSON files

---

## Step 9: Validate Branding

### 9.1 Get Current Branding

```bash
curl http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000/branding \
  -H "X-API-Key: test-api-key-123"

# Expected response:
{
  "logoUrl": "https://soapy.example.com/default-logo.png",
  "primaryColor": "#000000",
  "secondaryColor": "#666666",
  "accentColor": "#999999",
  "footerText": "",
  "versionTimestamp": "2025-10-01T12:00:00Z"
}
```

### 9.2 Update Branding

```bash
curl -X PUT http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000/branding \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-123" \
  -d '{
    "logoUrl": "https://example.com/custom-logo.png",
    "primaryColor": "#3B82F6",
    "secondaryColor": "#10B981",
    "footerText": "Powered by Example Corp"
  }'

# Expected: Updated branding with new versionTimestamp
```

**✅ Success Criterion**: Branding updated and versioned in Git

---

## Step 10: Validate File Attachments

### 10.1 Upload File via REST

```bash
# Create a test file
echo "Sample document content" > test-document.txt

# Upload file to conversation
curl -X POST http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000/files \
  -H "X-API-Key: test-api-key-123" \
  -F "file=@test-document.txt"

# Expected response:
{
  "commitHash": "pqr789...",
  "fileMetadata": {
    "filename": "test-document.txt",
    "path": "files/test-document.txt",
    "size": 25,
    "contentType": "text/plain",
    "hash": "sha256-hash-here...",
    "uploadedAt": "2025-10-01T12:10:00Z",
    "uploadedBy": "user-456",
    "commitHash": "pqr789..."
  }
}
```

### 10.2 List Files

```bash
curl http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000/files \
  -H "X-API-Key: test-api-key-123"

# Expected response:
{
  "files": [
    {
      "filename": "test-document.txt",
      "path": "files/test-document.txt",
      "size": 25,
      "contentType": "text/plain",
      "hash": "sha256-hash-here...",
      "uploadedAt": "2025-10-01T12:10:00Z"
    }
  ]
}
```

### 10.3 Download File

```bash
curl http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000/files/test-document.txt \
  -H "X-API-Key: test-api-key-123" \
  --output downloaded-file.txt

# Verify downloaded content
cat downloaded-file.txt
# Expected: "Sample document content"
```

### 10.4 Upload File via SOAP

Create `upload-file.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:CommitFileRequest>
      <tns:conversationId>550e8400-e29b-41d4-a716-446655440000</tns:conversationId>
      <tns:filename>test-image.png</tns:filename>
      <tns:contentType>image/png</tns:contentType>
      <tns:data>iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==</tns:data>
    </tns:CommitFileRequest>
  </soap:Body>
</soap:Envelope>
```

Submit via SOAP:
```bash
curl -X POST http://localhost:3000/soap \
  -H "Content-Type: text/xml" \
  -H "X-API-Key: test-api-key-123" \
  -d @upload-file.xml

# Expected response:
<CommitFileResponse>
  <commitHash>stu012...</commitHash>
  <fileMetadata>
    <filename>test-image.png</filename>
    <path>files/test-image.png</path>
    <size>95</size>
    <contentType>image/png</contentType>
    <hash>sha256-hash...</hash>
    <uploadedAt>2025-10-01T12:11:00Z</uploadedAt>
    <uploadedBy>user-456</uploadedBy>
  </fileMetadata>
</CommitFileResponse>
```

**✅ Success Criterion**: Files uploaded via both REST and SOAP, stored in Git with commits

---

## Step 11: Validate Git Storage

Inspect the Git repository directly:

```bash
cd conversations/550e8400-e29b-41d4-a716-446655440000

# List files
ls -la
# Expected: 0001-user.md, 0002-assistant.md, 0003-assistant.md, 0004-tool_call.json, 0005-tool_result.json, branding.yml

# View Git log
git log --oneline
# Expected: Chronological commits with message descriptions

# View specific message
cat 0001-user.md
# Expected: Markdown with frontmatter (role, timestamp, sequenceNumber) and content

# View tool call
cat 0004-tool_call.json
# Expected: JSON with toolName, parameters, requestedAt

# Check branches
git branch -a
# Expected: main, alternative-joke

# View branding history
git log --all -- branding.yml
# Expected: Commits showing branding changes
```

**✅ Success Criterion**: All messages and metadata stored in Git with proper commits

---

## Step 12: Launch Test Client (Vite)

```bash
# Terminal 2: Start frontend test client
cd frontend
npm install
npm run dev

# Expected output:
# Vite dev server running at http://localhost:5173
```

Open browser: `http://localhost:5173`

### Test Client Features

1. **SOAP Tester**: Submit SOAP operations via form
2. **REST Tester**: Test REST endpoints with different formats
3. **Streaming Tester**: View SSE/WebSocket streams in real-time
4. **Branching Tester**: Create and navigate branches visually
5. **Tool Tester**: Submit tool calls and view results

**✅ Success Criterion**: All test client features functional, validating FR-102

---

## Step 13: Run Automated Tests

```bash
# Run all tests (contract, integration, unit)
npm test

# Expected output:
# PASS tests/contract/soap.test.ts (6 tests)
# PASS tests/contract/rest.test.ts (10 tests)
# PASS tests/integration/scenario-1-soap-submission.test.ts (2 tests)
# PASS tests/integration/scenario-2-rest-retrieval.test.ts (3 tests)
# PASS tests/integration/scenario-3-streaming.test.ts (2 tests)
# PASS tests/integration/scenario-4-branching.test.ts (3 tests)
# PASS tests/integration/scenario-5-tools.test.ts (3 tests)
# PASS tests/integration/scenario-6-branding.test.ts (3 tests)
# PASS tests/integration/scenario-7-errors.test.ts (3 tests)
# PASS tests/unit/git-storage.test.ts
# PASS tests/unit/format-converter.test.ts
# PASS tests/unit/ai-providers.test.ts
#
# Tests: 40+ passed
# Time: ~30 seconds
```

**✅ Success Criterion**: All tests pass, 100% coverage of core features

---

## Troubleshooting

### Issue: "Cannot find module 'isomorphic-git'"

**Solution**:
```bash
npm install
```

### Issue: "SOAP endpoint returns 404"

**Solution**: Check server started successfully, verify `http://localhost:3000/soap?wsdl` accessible

### Issue: "AI provider error: Invalid API key"

**Solution**: Verify `.env` file contains valid `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`

### Issue: "Git operation failed"

**Solution**: Check `conversations/` directory permissions, ensure Git is installed

### Issue: "Streaming timeout"

**Solution**: Default timeout is 300 seconds. Adjust via `STREAM_TIMEOUT_MS` env var if needed

---

## Performance Validation

Run load tests to verify latency targets:

```bash
# Install artillery (load testing tool)
npm install -g artillery

# Run SOAP load test
artillery quick --count 100 --num 10 http://localhost:3000/soap

# Expected: p95 latency < 1500ms (SOAP target from research.md)

# Run REST load test
artillery quick --count 100 --num 10 http://localhost:3000/v1/chat/550e8400-e29b-41d4-a716-446655440000

# Expected: p95 latency < 800ms (REST target from research.md)
```

---

## Next Steps

1. ✅ **All core features validated** - Soapy is operational
2. → Read `/docs/architecture.md` for system design details
3. → Explore `/docs/api-reference.md` for complete API documentation
4. → Deploy to production (see `/docs/deployment.md`)

---

## CLI Tools (Constitutional Principle II)

Validate CLI tools expose library functionality:

```bash
# Git storage CLI
soapy-git list-conversations
soapy-git create-conversation --org-id=123
soapy-git get-messages --conversation-id=550e8400-e29b-41d4-a716-446655440000 --json

# Format conversion CLI
soapy-convert openai-to-anthropic < conversation.json
soapy-convert git-to-soap --conversation-id=550e8400-e29b-41d4-a716-446655440000

# AI provider CLI
soapy-ai generate --provider=openai --model=gpt-4 --prompt="Hello"
soapy-ai test-tool --tool-name=search_web --params='{"query":"test"}'

# Auth CLI
soapy-auth validate-key --key=test-api-key-123
soapy-auth check-org --user-id=abc --conversation-id=550e8400-e29b-41d4-a716-446655440000
```

**✅ Success Criterion**: All CLI tools work, providing text I/O interface to libraries

---

**Quickstart Complete!** All 7 acceptance scenarios validated + CLI tools tested + Vite test client running.

**Validation Checklist**:
- [x] SOAP interface operational (WSDL + 8 operations including file upload/download)
- [x] REST interface operational (12 endpoints including file operations)
- [x] Streaming functional (SSE)
- [x] Branching working (create/retrieve branches)
- [x] Tool execution stored (call + result)
- [x] Branding versioned in Git
- [x] File attachments (upload, list, download via REST and SOAP)
- [x] Multi-format conversion (OpenAI, Anthropic, SOAP)
- [x] Git storage validated (direct inspection)
- [x] Test client functional (FR-102)
- [x] Automated tests passing
- [x] CLI tools operational (Constitutional Principle II)

**Ready for Phase 4 Implementation!**
