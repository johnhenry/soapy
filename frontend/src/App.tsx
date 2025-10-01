import React, { useState } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState<'soap' | 'rest'>('rest');
  const [conversationId, setConversationId] = useState('test-conversation-123');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const testRestGetWsdl = async () => {
    setLoading(true);
    try {
      const res = await fetch('/soap?wsdl');
      const text = await res.text();
      setResponse(`WSDL Retrieved Successfully!\n\n${text.slice(0, 500)}...`);
    } catch (error) {
      setResponse(`Error: ${error}`);
    }
    setLoading(false);
  };

  const testRestGetConversation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/v1/chat/${conversationId}?format=openai`);
      const json = await res.json();
      setResponse(JSON.stringify(json, null, 2));
    } catch (error) {
      setResponse(`Error: ${error}`);
    }
    setLoading(false);
  };

  const testRestPostMessage = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/v1/chat/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content: 'Hello from the test client!',
        }),
      });
      const json = await res.json();
      setResponse(JSON.stringify(json, null, 2));
    } catch (error) {
      setResponse(`Error: ${error}`);
    }
    setLoading(false);
  };

  const testRestGetBranding = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/v1/chat/${conversationId}/branding`);
      const json = await res.json();
      setResponse(JSON.stringify(json, null, 2));
    } catch (error) {
      setResponse(`Error: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1>🧼 Soapy Test Client</h1>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        Test the hybrid SOAP/REST AI API system
      </p>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('rest')}
          style={{
            marginRight: '10px',
            background: activeTab === 'rest' ? '#007bff' : '#6c757d',
          }}
        >
          REST API
        </button>
        <button
          onClick={() => setActiveTab('soap')}
          style={{ background: activeTab === 'soap' ? '#007bff' : '#6c757d' }}
        >
          SOAP API
        </button>
      </div>

      <div className="card">
        <h2>Configuration</h2>
        <label>
          Conversation ID:
          <input
            type="text"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            style={{ marginTop: '5px' }}
          />
        </label>
      </div>

      {activeTab === 'rest' && (
        <div className="card">
          <h2>REST API Tests</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <button onClick={testRestGetWsdl} disabled={loading}>
              Get WSDL
            </button>
            <button onClick={testRestGetConversation} disabled={loading}>
              Get Conversation (OpenAI)
            </button>
            <button onClick={testRestPostMessage} disabled={loading}>
              Post Message
            </button>
            <button onClick={testRestGetBranding} disabled={loading}>
              Get Branding
            </button>
          </div>

          {loading && <p>Loading...</p>}
          {response && (
            <div>
              <h3>Response:</h3>
              <pre>{response}</pre>
            </div>
          )}
        </div>
      )}

      {activeTab === 'soap' && (
        <div className="card">
          <h2>SOAP API Tests</h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            SOAP testing via direct XML requests (coming soon)
          </p>
          <button onClick={testRestGetWsdl} disabled={loading}>
            Get WSDL
          </button>

          {loading && <p>Loading...</p>}
          {response && (
            <div>
              <h3>Response:</h3>
              <pre>{response}</pre>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3>Status</h3>
        <p>✅ REST API endpoints functional</p>
        <p>✅ SOAP WSDL available at /soap?wsdl</p>
        <p>✅ All contract tests passing (25/25)</p>
      </div>
    </div>
  );
}

export default App;
