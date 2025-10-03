import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';
import './ApiSettings.css';

interface ApiSettingsProps {
  onClose: () => void;
}

export function ApiSettings({ onClose }: ApiSettingsProps) {
  const { config, setApiKey, setRequestProtocol, setResponseProtocol, setDirectResponse, setStreaming } = useApi();
  const [apiKey, setApiKeyLocal] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [requestProtocol, setRequestProtocolLocal] = useState<'rest' | 'soap'>('rest');
  const [directResponseLocal, setDirectResponseLocal] = useState(true);
  const [responseProtocol, setResponseProtocolLocal] = useState<'rest' | 'soap'>('rest');
  const [streamingLocal, setStreamingLocal] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setApiKeyLocal(config.apiKey);
    setBaseUrl(config.baseUrl);
    setRequestProtocolLocal(config.requestProtocol);
    setResponseProtocolLocal(config.responseProtocol);
    setDirectResponseLocal(config.directResponse);
    setStreamingLocal(config.streaming);
  }, [config]);

  const handleSave = () => {
    setApiKey(apiKey);
    setRequestProtocol(requestProtocol);
    // If direct response is checked, response protocol matches request protocol
    // Otherwise, use the explicitly selected response protocol
    const finalResponseProtocol = directResponseLocal ? requestProtocol : responseProtocol;
    setResponseProtocol(finalResponseProtocol);
    setDirectResponse(directResponseLocal);
    setStreaming(streamingLocal);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content api-settings-modal">
        <div className="modal-header">
          <h2>API Settings</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>API Key</label>
            <div className="password-input-wrapper">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKeyLocal(e.target.value)}
                placeholder="Enter your API key"
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowApiKey(!showApiKey)}
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Base URL</label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:3000"
              disabled
            />
            <p className="help-text">Base URL is currently read-only</p>
          </div>

          <div className="form-group">
            <label>Request Protocol</label>
            <select value={requestProtocol} onChange={(e) => setRequestProtocolLocal(e.target.value as 'rest' | 'soap')}>
              <option value="rest">REST</option>
              <option value="soap">SOAP</option>
            </select>
            <p className="help-text">Protocol for submitting messages and operations</p>
          </div>

          <div className="form-group">
            <label>
              Direct Response
              {' '}
              <input
                type="checkbox"
                checked={directResponseLocal}
                onChange={(e) => setDirectResponseLocal(e.target.checked)}
              />
            </label>
            <p className="help-text">
              {directResponseLocal
                ? 'Response returned directly in single round-trip using same protocol'
                : 'Request returns ID, then separate fetch retrieves response'}
            </p>
          </div>

          {!directResponseLocal && (
            <div className="form-group">
              <label>Response Protocol</label>
              <select value={responseProtocol} onChange={(e) => setResponseProtocolLocal(e.target.value as 'rest' | 'soap')}>
                <option value="rest">REST</option>
                <option value="soap">SOAP</option>
              </select>
              <p className="help-text">Protocol for retrieving the response after ID is returned</p>
            </div>
          )}

          {(directResponseLocal ? requestProtocol === 'rest' : responseProtocol === 'rest') && (
            <div className="form-group">
              <label>
                Enable Streaming
                {' '}
                <input
                  type="checkbox"
                  checked={streamingLocal}
                  onChange={(e) => setStreamingLocal(e.target.checked)}
                />
              </label>
              <p className="help-text">
                Stream AI responses in real-time (only available with REST response)
              </p>
            </div>
          )}

          <div className="protocol-combinations">
            <h3>Current Configuration</h3>
            <div className="config-summary">
              {directResponseLocal ? (
                <>
                  <strong>{requestProtocol.toUpperCase()}</strong> Direct Response
                  {requestProtocol === 'rest' && streamingLocal && ' (Streaming)'}
                  {requestProtocol === 'rest' && !streamingLocal && ' (Non-streaming)'}
                </>
              ) : (
                <>
                  <strong>{requestProtocol.toUpperCase()}</strong> → <strong>{responseProtocol.toUpperCase()}</strong>
                  {responseProtocol === 'rest' && streamingLocal && ' (Streaming)'}
                  {responseProtocol === 'rest' && !streamingLocal && ' (Non-streaming)'}
                </>
              )}
            </div>
            <p className="help-text">
              {directResponseLocal && requestProtocol === 'rest' && streamingLocal &&
                '✓ REST Direct: Single round-trip with real-time streaming (recommended)'}
              {directResponseLocal && requestProtocol === 'rest' && !streamingLocal &&
                '✓ REST Direct: Single round-trip, non-streaming'}
              {directResponseLocal && requestProtocol === 'soap' &&
                '✓ SOAP Direct: Single round-trip (synchronous, non-streaming)'}
              {!directResponseLocal && requestProtocol === 'rest' && responseProtocol === 'rest' && streamingLocal &&
                '✓ REST→REST Hybrid: Submit message, then stream response (ID-based)'}
              {!directResponseLocal && requestProtocol === 'rest' && responseProtocol === 'rest' && !streamingLocal &&
                '✓ REST→REST Hybrid: Submit message, then poll response (ID-based)'}
              {!directResponseLocal && requestProtocol === 'rest' && responseProtocol === 'soap' &&
                '✓ REST→SOAP Hybrid: Submit via REST, retrieve via SOAP (ID-based)'}
              {!directResponseLocal && requestProtocol === 'soap' && responseProtocol === 'soap' &&
                '✓ SOAP→SOAP Hybrid: Submit via SOAP, retrieve via SOAP (ID-based)'}
              {!directResponseLocal && requestProtocol === 'soap' && responseProtocol === 'rest' && streamingLocal &&
                '✓ SOAP→REST Hybrid: Submit via SOAP, stream via REST (ID-based)'}
              {!directResponseLocal && requestProtocol === 'soap' && responseProtocol === 'rest' && !streamingLocal &&
                '✓ SOAP→REST Hybrid: Submit via SOAP, poll via REST (ID-based)'}
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
