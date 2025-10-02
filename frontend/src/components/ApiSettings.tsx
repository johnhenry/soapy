import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';
import type { OutputFormat } from '../types';
import './ApiSettings.css';

interface ApiSettingsProps {
  onClose: () => void;
}

export function ApiSettings({ onClose }: ApiSettingsProps) {
  const { config, setApiKey, setFormat, setProtocol } = useApi();
  const [apiKey, setApiKeyLocal] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [format, setFormatLocal] = useState<OutputFormat>('openai');
  const [protocol, setProtocolLocal] = useState<'rest' | 'soap'>('rest');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setApiKeyLocal(config.apiKey);
    setBaseUrl(config.baseUrl);
    setFormatLocal(config.format);
    setProtocolLocal(config.protocol);
  }, [config]);

  const handleSave = () => {
    setApiKey(apiKey);
    setFormat(format);
    setProtocol(protocol);
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
            <label>Output Format</label>
            <select value={format} onChange={(e) => setFormatLocal(e.target.value as OutputFormat)}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="soap">SOAP</option>
            </select>
            <p className="help-text">Message format for API responses</p>
          </div>

          <div className="form-group">
            <label>Protocol</label>
            <select value={protocol} onChange={(e) => setProtocolLocal(e.target.value as 'rest' | 'soap')}>
              <option value="rest">REST</option>
              <option value="soap">SOAP</option>
            </select>
            <p className="help-text">Communication protocol</p>
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
