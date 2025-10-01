# Soapy: Hybrid SOAP/REST AI API System
## Product Requirements Document v1.0

### Executive Summary

Soapy is a hybrid API gateway that bridges the gap between enterprise SOAP requirements and modern REST/streaming AI APIs. It provides a unified interface for AI services that supports both traditional enterprise integration patterns (SOAP with strong contracts, WS-Security, reliable messaging) and modern developer-friendly patterns (JSON REST, Server-Sent Events, WebSockets).

### Problem Statement

Current AI APIs (OpenAI, Anthropic, Hugging Face) use JSON REST exclusively, creating friction for enterprise adoption:

- **Enterprise Integration Gap**: Large organizations often require SOAP for WS-Security, formal contracts (WSDL), guaranteed delivery, and integration with existing ESBs
- **Conversation State Management**: Current APIs are stateless, requiring full message history retransmission for multi-turn conversations
- **Error Handling Inconsistency**: Each provider uses different JSON error formats, requiring custom client logic
- **Limited Branching/Auditing**: No native support for conversation branching, version control, or audit trails
- **Streaming Limitations**: SOAP has no standardized streaming format for real-time token generation

### Product Vision

Create a polyglot AI API that serves both enterprise and modern development needs through:
- SOAP submission with strong contracts and enterprise features
- Multi-format retrieval (JSON, XML, streaming) from the same conversation state
- Git-backed conversation storage for versioning, branching, and auditing
- Agent/tool-use support with deterministic replay capabilities

### Core Features

#### 1. Hybrid API Architecture

**SOAP Submission Endpoint**
- `POST /` - Single SOAP endpoint handling all operations
- Full WSDL contract with type safety
- Support for WS-Security, WS-ReliableMessaging
- Operations: CommitMessage, BranchConversation, GetConversation, GetBranding

**REST Retrieval Endpoints**
- `GET /chat/:chatId?type=json|xml|plain&format=openai|anthropic|soap`
- `GET /conversation/:conversationId` 
- Support for SSE and WebSocket upgrades on same endpoints
- Multi-format output (OpenAI-compatible, Anthropic-compatible, SOAP-wrapped)

#### 2. Git-Backed Conversation Storage

**Repository Structure**
```
conversations/
  conv-123/
    main/
      0001-user.md
      0002-assistant.md 
      0003-tool_call.json
      0004-tool_result.json
    branch-alt/
      0001-user.md
      0002-assistant.md
      0003-tool_call.json
      0004b-tool_result.json
    branding.yml
    files/
```

**Benefits**
- Deterministic conversation replay
- Natural branching and merging
- Cryptographic audit trail
- Version control semantics for conversations

#### 3. Agent and Tool Support

**Agent Loop as Git Commits**
- `user` commits for user input
- `assistant` commits for LLM responses  
- `tool_call` commits for tool requests
- `tool_result` commits for tool outputs
- Branching supports alternative tool results and reasoning paths

**SOAP Operations**
- CommitToolCall - structured tool request submission
- CommitToolResult - tool execution result storage
- Full deterministic replay of agent reasoning chains

#### 4. Multi-Format Error Handling

**Unified Error Mapping**
- SOAP Faults with standard structure
- JSON errors mapped to provider formats (OpenAI, Anthropic)
- SSE error events for streaming
- Consistent error taxonomy across all interfaces

#### 5. Branding and Customization

**Per-Conversation Branding**
- `branding.yml` files in Git repositories
- Logo URLs, color schemes, footer text
- Versioned with conversation history
- Accessible via SOAP GetBranding operation

### Technical Specifications

#### API Contracts

**SOAP WSDL** (excerpt)
```xml
<operation name="CommitMessage">
  <input message="tns:CommitMessageRequest"/>
  <output message="tns:CommitMessageResponse"/>
</operation>
```

**OpenAPI REST** (excerpt)
```yaml
/chat/{chatId}:
  get:
    parameters:
      - name: type
        schema: {enum: [json, xml, plain]}
      - name: format  
        schema: {enum: [openai, anthropic, soap]}
```

#### State Management

**Canonical Storage**: Git repositories with structured commits
**State Synchronization**: All API formats read from same Git state
**Consistency**: Atomic commits ensure all views remain synchronized

#### Streaming Support

**Server-Sent Events**: Real-time token streaming on REST endpoints
**WebSocket**: Bidirectional communication for interactive sessions
**SOAP Workaround**: Hybrid approach - submit via SOAP, consume via SSE

### User Stories

#### Enterprise Integration Team
*"As an enterprise integration team, I need SOAP with WS-Security so I can integrate AI capabilities into our existing ESB infrastructure while maintaining compliance and audit requirements."*

#### Modern Development Team  
*"As a web developer, I want OpenAI-compatible JSON streaming so I can quickly integrate AI without learning SOAP while still accessing enterprise-managed conversations."*

#### Compliance Officer
*"As a compliance officer, I need complete audit trails of AI conversations with cryptographic verification so I can ensure regulatory compliance and investigate issues."*

#### AI Researcher
*"As an AI researcher, I want to branch conversations and replay agent reasoning with different tool results so I can test and validate AI decision-making processes."*

### Success Metrics

#### Adoption Metrics
- Number of enterprise SOAP integrations
- REST API usage growth
- Developer satisfaction scores

#### Technical Metrics  
- API response times (SOAP vs REST)
- Conversation storage efficiency
- Error handling consistency across formats

#### Business Metrics
- Enterprise customer acquisition
- Developer ecosystem growth
- Support ticket reduction (standardized errors)

### Implementation Phases

#### Phase 1: Core Hybrid API (MVP)
- Basic SOAP submission endpoint
- REST retrieval with JSON/XML formats  
- Simple Git-backed storage
- OpenAI format compatibility

#### Phase 2: Advanced Features
- Agent/tool support with Git commits
- Conversation branching operations
- Streaming (SSE/WebSocket) support
- Error handling unification

#### Phase 3: Enterprise Features
- WS-Security implementation
- Branding/customization system
- Advanced SOAP operations
- Enterprise deployment tools

#### Phase 4: Ecosystem
- Multiple AI provider backends
- Plugin system for custom tools
- Advanced analytics and monitoring
- Developer SDK/tooling

### Technical Risks and Mitigations

#### Risk: Git Performance at Scale
**Mitigation**: Repository sharding, lazy loading, Git-LFS for large files

#### Risk: SOAP/REST State Consistency  
**Mitigation**: Atomic Git commits, read-after-write consistency checks

#### Risk: Complex Error Mapping
**Mitigation**: Comprehensive error taxonomy, automated testing across formats

#### Risk: Enterprise Security Requirements
**Mitigation**: Early engagement with security teams, WS-Security expertise

### Dependencies

#### External Dependencies
- Git storage system (local or hosted)
- AI provider APIs (OpenAI, Anthropic, etc.)
- SOAP framework/library
- WebSocket/SSE infrastructure

#### Internal Dependencies  
- Authentication/authorization system
- Monitoring and logging infrastructure
- Developer documentation platform
- Enterprise deployment pipeline

### Success Criteria

#### MVP Success
- [ ] SOAP endpoint accepts and validates messages
- [ ] REST endpoint returns conversations in multiple formats
- [ ] Git storage persists conversation state
- [ ] Basic error handling works across formats

#### Full Product Success
- [ ] Enterprise customers successfully integrate via SOAP
- [ ] Modern developers adopt REST/streaming interfaces  
- [ ] Conversation branching enables new use cases
- [ ] Agent/tool workflows provide business value
- [ ] System handles production-scale loads

### Appendix

#### Competitive Analysis
- **OpenAI Assistants API**: Stateful but JSON-only, no SOAP, limited branching
- **Enterprise SOAP Gateways**: SOAP support but no AI-specific features  
- **LangChain/Semantic Kernel**: Client-side frameworks, no unified API

#### Technical Architecture References
- WSDL specifications for SOAP contracts
- OpenAPI specifications for REST interfaces
- Git internals for conversation storage design
- WebSocket/SSE standards for streaming