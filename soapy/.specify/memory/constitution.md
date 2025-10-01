<!--
SYNC IMPACT REPORT
Version Change: Template → 1.0.0
Modified Principles: None (initial constitution)
Added Sections:
  - All core principles (I-VII)
  - Enterprise Integration Requirements
  - Development Workflow
  - Governance
Removed Sections: None (initial creation)
Templates Requiring Updates:
  ✅ .specify/templates/plan-template.md - Updated Constitution Check reference to v1.0.0
  ✅ .specify/templates/spec-template.md - No changes needed (no constitution references)
  ✅ .specify/templates/tasks-template.md - No changes needed (follows plan.md)
  ✅ .specify/templates/agent-file-template.md - No changes needed (generic template)
Follow-up TODOs: None
-->

# Soapy Constitution

## Core Principles

### I. Library-First Architecture
Every feature MUST start as a standalone library. Libraries MUST be:
- Self-contained with clear boundaries
- Independently testable without external dependencies
- Fully documented with purpose and API contracts
- Reusable across SOAP and REST interfaces

**Rationale**: Hybrid API architecture requires core logic to be interface-agnostic. Libraries ensure SOAP submission and REST retrieval read from the same canonical state without duplication.

### II. CLI Interface Requirement
Every library MUST expose functionality via CLI using text I/O protocol:
- Input via stdin or command arguments
- Output to stdout (data) and stderr (errors)
- Support both JSON and human-readable formats
- Enable scriptable workflows and debugging

**Rationale**: Enterprise integration requires inspectable, automatable operations. CLI tools enable testing, debugging, and operations without API overhead.

### III. Test-First Development (NON-NEGOTIABLE)
TDD is MANDATORY for all features:
1. Write tests first
2. Get user approval on test coverage
3. Verify tests fail (Red)
4. Implement to pass tests (Green)
5. Refactor while maintaining green (Refactor)

**Rationale**: Hybrid SOAP/REST system with Git-backed storage requires deterministic behavior. Tests serve as executable contracts preventing state inconsistency between interfaces.

### IV. Integration Testing Focus
Integration tests are REQUIRED for:
- New library contract tests (SOAP/REST interface contracts)
- Contract changes (schema version updates)
- Inter-service communication (Git storage, AI provider APIs)
- Shared schemas (conversation format, branding structure)

**Rationale**: Multiple API formats (SOAP, REST, streaming) reading from Git repositories require end-to-end validation that unit tests cannot provide.

### V. Observability Through Text I/O
All components MUST ensure debuggability:
- Text-based I/O for transparent inspection
- Structured logging to stderr using JSON format
- Git commit messages as audit trail
- Request/response logging for all API formats

**Rationale**: Enterprise deployments require comprehensive audit trails. Text I/O and Git storage provide cryptographic verification and deterministic replay capabilities.

### VI. Versioning & Breaking Changes
Semantic versioning MUST follow MAJOR.MINOR.PATCH:
- **MAJOR**: Breaking changes to SOAP WSDL, REST API contracts, or Git repository structure
- **MINOR**: New operations, optional fields, backward-compatible additions
- **PATCH**: Bug fixes, performance improvements, documentation updates

WSDL and OpenAPI schemas MUST version independently from service version.

**Rationale**: Enterprise SOAP integrations require stable contracts. Schema versioning enables gradual migration without breaking existing clients.

### VII. Simplicity & YAGNI
Start with the simplest solution:
- Implement only specified requirements
- Defer optimization until measured bottlenecks exist
- Prefer standard libraries over custom abstractions
- Question every new dependency or pattern

**Rationale**: Hybrid architecture introduces inherent complexity. Simplicity in implementation prevents compounding technical debt.

## Enterprise Integration Requirements

All SOAP operations MUST:
- Validate input against WSDL schema
- Return SOAP Faults for all error conditions
- Support WS-Security headers (Phase 3)
- Enable WS-ReliableMessaging (Phase 3)

All REST endpoints MUST:
- Accept and return JSON by default
- Support XML format via `Accept` header
- Provide OpenAPI 3.0 schema documentation
- Enable CORS for browser-based clients

Git-backed storage MUST:
- Use atomic commits for state changes
- Maintain referential integrity across branches
- Support deterministic replay of conversation history
- Enable cryptographic audit via commit signatures

## Development Workflow

### Code Review Requirements
All pull requests MUST:
- Include passing tests (contract, integration, unit)
- Update relevant API documentation (WSDL, OpenAPI)
- Verify constitutional compliance (see Governance below)
- Update quickstart.md if user-facing changes exist

### Quality Gates
Before merge, verify:
- All tests pass (no skipped or pending tests)
- Contract tests validate SOAP and REST interfaces
- Integration tests cover happy path and error cases
- Performance benchmarks meet targets (Phase 2+)

### Deployment Approval
Production deployments require:
- Successful staging validation
- API contract backward compatibility check
- Git repository migration plan (if schema changes)
- Rollback procedure documented

## Governance

This Constitution supersedes all other development practices and guidelines. All feature specifications, implementation plans, and pull requests MUST verify compliance with constitutional principles.

### Amendment Procedure
Constitution changes require:
1. Proposed amendment with rationale and impact analysis
2. Approval from project stakeholders
3. Migration plan for existing code violating new rules
4. Version bump following semantic versioning rules (see Principle VI)

### Compliance Verification
All design reviews MUST include Constitution Check section validating:
- Library-first architecture (Principle I)
- CLI interface availability (Principle II)
- TDD workflow followed (Principle III)
- Integration test coverage (Principle IV)
- Observability instrumentation (Principle V)
- Versioning compliance (Principle VI)
- Simplicity justification (Principle VII)

Violations MUST be documented in plan.md Complexity Tracking with explicit justification.

### Complexity Deviations
When constitutional principles conflict with requirements:
1. Document the violation in Complexity Tracking table
2. Explain why the violation is necessary
3. Describe simpler alternatives considered and why rejected
4. Get explicit stakeholder approval before proceeding

**Version**: 1.0.0 | **Ratified**: 2025-10-01 | **Last Amended**: 2025-10-01
