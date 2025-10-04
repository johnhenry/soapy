# Test Failure Analysis - Soapy Repository

**Date**: 2025-10-04  
**Total Tests**: 58  
**Passing**: 48 (82.8%)  
**Failing**: 10 (17.2%)  

---

## Executive Summary

After analyzing all 10 failing tests, I've identified **3 root causes**:

1. **Tests expect removed branding feature** (1 test) - Test needs to be updated or removed
2. **Endpoints don't exist in implementation** (5 tests) - Missing streaming endpoint
3. **Implementation bugs** (4 tests) - Actual bugs in branch creation and SOAP error handling

### Severity Classification

- **🔴 CRITICAL (Test Issue)**: 1 test - Expects removed GetBranding operation
- **🟡 HIGH (Missing Feature)**: 5 tests - Missing `/stream` endpoint
- **🟠 MEDIUM (Implementation Bug)**: 4 tests - Branch creation returns 500, SOAP fault handling returns 400

---

## Detailed Analysis

### 1. Contract Test Failure - GetBranding ❌

**Test**: `tests/contract/soap.test.ts > should define GetBranding operation in WSDL`  
**Status**: ❌ FAILING  
**Reason**: **TEST IS INCORRECT**

#### Problem
The test expects `GetBranding` operation to exist in the WSDL, but this feature was intentionally removed in commit `ddd52b9`:

```typescript
it('should define GetBranding operation in WSDL', async () => {
  const response = await fetch(`${baseUrl}/soap?wsdl`);
  const wsdl = await response.text();
  
  expect(wsdl).toContain('GetBranding');          // ❌ This will fail
  expect(wsdl).toContain('GetBrandingRequest');   // ❌ This will fail
  expect(wsdl).toContain('GetBrandingResponse');  // ❌ This will fail
});
```

#### Root Cause
- **Decision made**: Branding feature was deferred/removed from implementation
- **Code updated**: GetBranding removed from `backend/src/api/soap/soapy.wsdl` and `service.ts`
- **Test not updated**: This test still expects the removed feature

#### Recommendation
**ACTION REQUIRED**: Remove or skip this test

```typescript
it.skip('should define GetBranding operation in WSDL', async () => {
  // Branding feature deferred - test skipped
  // See: commit ddd52b9
});
```

**OR** Delete lines 56-63 from `tests/contract/soap.test.ts`

#### Impact
- **User Impact**: None - test is checking for removed feature
- **Project Health**: False negative - makes it appear there's a problem when there isn't

---

### 2. Streaming Tests Failure - Missing Endpoint ❌

**Tests**: 3 tests in `scenario-3-streaming.test.ts`  
**Status**: ❌ FAILING  
**Reason**: **ENDPOINT DOESN'T EXIST**

#### Problem
Tests expect `GET /v1/chat/:id/stream` endpoint but implementation has different streaming endpoints:

**Expected by tests**:
```
GET /v1/chat/${conversationId}/stream
```

**Actually implemented**:
```
POST /v1/chat/:id/completion/stream     (line 547 in plugin.ts)
POST /v1/chat/:id/messages/stream       (line 745 in plugin.ts)
```

#### Failing Tests

1. **Test 1**: `should accept SSE streaming request with proper headers`
   ```typescript
   const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/stream`, {
     headers: { Accept: 'text/event-stream' },
   });
   expect(response.status).toBe(200);  // ❌ Gets 404
   ```

2. **Test 2**: `should send SSE events in proper format`
   ```typescript
   const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/stream`, {
     headers: { Accept: 'text/event-stream' },
   });
   const text = await response.text();
   expect(text).toContain('data:');  // ❌ Gets 404, not SSE data
   ```

3. **Test 3**: `should support concurrent streams per conversation`
   ```typescript
   const promises = Array.from({ length: 3 }, (_, i) =>
     fetch(`${baseUrl}/v1/chat/${conversationId}/stream`, {
       headers: { Accept: 'text/event-stream' },
     })
   );
   const responses = await Promise.all(promises);
   responses.forEach((response) => {
     expect(response.status).toBe(200);  // ❌ All get 404
   });
   ```

#### Root Cause Analysis

**Mismatch between test expectations and implementation**:

| What Tests Expect | What's Actually Implemented |
|-------------------|----------------------------|
| `GET /v1/chat/:id/stream` | `POST /v1/chat/:id/completion/stream` |
| Simple GET endpoint | POST endpoint requiring body |
| Generic streaming | Specific completion/messages streaming |

#### Recommendation

**Option 1: Fix Tests** (Update tests to match implementation)
```typescript
// Change from:
const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/stream`);

// To:
const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/completion/stream`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  },
  body: JSON.stringify({ /* required params */ })
});
```

**Option 2: Add Missing Endpoint** (Implement what tests expect)
```typescript
// Add to plugin.ts:
fastify.get('/v1/chat/:id/stream', async (request, reply) => {
  // Implement generic streaming endpoint
  // Could delegate to completion/stream internally
});
```

**Option 3: Skip Tests** (Temporary)
```typescript
it.skip('should accept SSE streaming request', async () => {
  // Endpoint not implemented - see TEST_FAILURE_ANALYSIS.md
});
```

#### Impact
- **User Impact**: Medium - Documented streaming endpoint doesn't work as advertised
- **Integration**: Tests are based on specification, implementation differs
- **Documentation**: README shows streaming endpoints exist, but path is wrong

---

### 3. Branching Tests Failure - Implementation Bug ❌

**Tests**: 2 tests in `scenario-4-branching.test.ts`  
**Status**: ❌ FAILING  
**Reason**: **IMPLEMENTATION BUG**

#### Problem
Branch creation endpoint returns `500 Internal Server Error` instead of `201 Created`:

```typescript
const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/branch`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    branchName: 'experiment-1',
    fromMessage: 5,
  }),
});

expect(response.status).toBe(201);  // ❌ Gets 500
```

#### Failing Tests

1. **Test 1**: `should create a branch from a specific message point`
   - Expected: 201 Created
   - Actual: 500 Internal Server Error

2. **Test 2**: `should maintain independent message sequences on branches`
   - Expected: 201 Created (for branch creation step)
   - Actual: 500 Internal Server Error

#### Root Cause

**The endpoint exists but crashes when called**:

```typescript
// Line 925 in plugin.ts
fastify.post('/v1/chat/:id/branch', async (request, reply) => {
  // Implementation likely throws an error
  // Possibly: Git operations fail, missing conversation, validation error, etc.
});
```

**Possible causes**:
1. **Missing conversation**: Tests don't create conversation before branching
2. **Git operation failure**: `createBranch()` function has a bug
3. **Parameter mismatch**: Test sends `fromMessage: 5`, implementation expects different field name
4. **Missing dependencies**: Git storage not initialized properly

#### Investigation Needed

To diagnose, we need to:
1. Check server logs for the actual error
2. Examine `createBranch()` implementation in `lib/git-storage/branch.ts`
3. Verify test setup creates necessary conversation first
4. Check if `fromMessage` parameter name matches what implementation expects

#### Recommendation

**STEP 1**: Run test with logging to see actual error:
```bash
npm test -- scenario-4-branching.test.ts 2>&1 | grep -A20 "500"
```

**STEP 2**: Check implementation:
```typescript
// Examine: backend/src/lib/git-storage/branch.ts
// Look for: createBranch function
// Verify: Parameter names, error handling
```

**STEP 3**: Fix the bug based on findings

**Temporary**: Skip tests until fixed:
```typescript
it.skip('should create a branch from a specific message point', async () => {
  // Implementation bug: returns 500 - see TEST_FAILURE_ANALYSIS.md
});
```

#### Impact
- **User Impact**: HIGH - Branch creation is broken
- **Functionality**: Core feature (Git branching) doesn't work
- **Tests**: Tests are correct, implementation is buggy

---

### 4. Error Handling Tests Failure - Mixed Issues ❌

**Tests**: 2 tests in `scenario-7-errors.test.ts`  
**Status**: ❌ FAILING  
**Reason**: **IMPLEMENTATION BUG + MISSING ENDPOINT**

#### Test 1: SOAP Fault Handling

**Problem**: Invalid SOAP request returns `400 Bad Request` instead of `200 OK` with SOAP Fault

```typescript
it('should return SOAP Fault for invalid SOAP request', async () => {
  const invalidSoap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <InvalidOperation />
  </soap:Body>
</soap:Envelope>`;

  const response = await fetch(`${baseUrl}/soap`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: invalidSoap,
  });

  expect(response.status).toBe(200);  // ❌ Gets 400
  const text = await response.text();
  expect(text).toContain('soap:Envelope');  // Never reaches this
});
```

**Expected SOAP Behavior**:
```xml
HTTP/1.1 200 OK
Content-Type: text/xml

<soap:Envelope>
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Client</faultcode>
      <faultstring>Invalid operation: InvalidOperation</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>
```

**Actual Behavior**:
```
HTTP/1.1 400 Bad Request
(No SOAP envelope)
```

**Root Cause**: SOAP plugin doesn't handle invalid operations properly. Should return SOAP Fault in envelope, not HTTP 400.

**Recommendation**: Fix SOAP error handling in `backend/src/api/soap/plugin.ts` or `service.ts`

#### Test 2: SSE Error Event Streaming

**Problem**: Endpoint doesn't exist

```typescript
it('should send SSE error event during streaming failure', async () => {
  const response = await fetch(`${baseUrl}/v1/chat/error-stream/stream`, {
    headers: { Accept: 'text/event-stream' },
  });

  expect(response.status).toBe(200);  // ❌ Gets 404
  const text = await response.text();
  expect(text).toContain('data:');
});
```

**Root Cause**: Same as streaming tests above - `/stream` endpoint doesn't exist

**Recommendation**: Same as streaming tests - either fix test to use correct endpoint or implement missing endpoint

#### Impact
- **SOAP Fault**: Medium - Error handling doesn't follow SOAP standards
- **Streaming Error**: Same as other streaming tests

---

## Summary Table

| # | Test File | Test Name | Expected | Actual | Root Cause | Severity |
|---|-----------|-----------|----------|--------|------------|----------|
| 1 | `soap.test.ts` | GetBranding operation | GetBranding in WSDL | Not found | Test expects removed feature | 🔴 Critical |
| 2 | `scenario-3-streaming.test.ts` | SSE streaming request | 200 OK | 404 | Missing `/stream` endpoint | 🟡 High |
| 3 | `scenario-3-streaming.test.ts` | SSE events format | SSE data | 404 | Missing `/stream` endpoint | 🟡 High |
| 4 | `scenario-3-streaming.test.ts` | Concurrent streams | 200 OK | 404 | Missing `/stream` endpoint | 🟡 High |
| 5 | `scenario-4-branching.test.ts` | Create branch | 201 Created | 500 Error | Implementation bug | 🟠 Medium |
| 6 | `scenario-4-branching.test.ts` | Independent sequences | 201 Created | 500 Error | Implementation bug | 🟠 Medium |
| 7 | `scenario-7-errors.test.ts` | SOAP Fault | 200 + Fault | 400 | SOAP error handling bug | 🟠 Medium |
| 8 | `scenario-7-errors.test.ts` | SSE error event | 200 OK | 404 | Missing `/stream` endpoint | 🟡 High |
| 9 | `scenario-3-streaming.test.ts` | Timeout handling | 200 OK | 404 | Missing `/stream` endpoint | 🟡 High |

---

## Categorized Recommendations

### Immediate Actions (Fix Tests)

1. **Remove GetBranding test** from `tests/contract/soap.test.ts` (lines 56-63)
   - Feature was intentionally removed
   - Test is outdated

### High Priority (Fix Missing Features)

2. **Fix streaming endpoint mismatch**
   - Either: Update all streaming tests to use `POST /v1/chat/:id/completion/stream`
   - Or: Implement `GET /v1/chat/:id/stream` endpoint
   - Affected: 5 tests

### Medium Priority (Fix Implementation Bugs)

3. **Fix branch creation endpoint**
   - Debug why it returns 500
   - Likely bug in Git storage layer
   - Affected: 2 tests

4. **Fix SOAP fault handling**
   - Should return 200 with SOAP Fault envelope
   - Currently returns 400
   - Affected: 1 test

---

## Test vs Implementation Analysis

### Tests Are Wrong (1 test)
- **GetBranding test**: Expects removed feature

### Implementation Is Wrong (4 tests)
- **Branch creation**: Returns 500 instead of working
- **SOAP faults**: Returns 400 instead of SOAP Fault envelope

### Mismatch/Missing Feature (5 tests)
- **Streaming endpoint**: Tests expect `/stream`, implementation has `/completion/stream` and `/messages/stream`

---

## Conclusion

**The problem is a mix of both**:

1. **1 test is outdated** - needs to be removed (GetBranding)
2. **5 tests expect a different endpoint** - either tests or implementation needs updating (streaming)
3. **4 tests found real bugs** - implementation needs fixing (branching, SOAP faults)

**Recommended Priority**:
1. Remove GetBranding test (quick fix)
2. Decide on streaming endpoint strategy and align tests/implementation
3. Debug and fix branch creation bug
4. Fix SOAP fault handling to follow SOAP standards

**Overall Assessment**: Tests are generally correct and following specifications. Implementation has some bugs and missing features. The failures are mostly legitimate issues that should be fixed.
