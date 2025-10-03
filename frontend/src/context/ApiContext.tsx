import { createContext, useContext, useState, ReactNode } from 'react';
import type { ApiConfig } from '../types';

interface ApiContextType {
  config: ApiConfig;
  setApiKey: (key: string) => void;
  setProtocol: (protocol: 'rest' | 'soap') => void;
  setRequestProtocol: (protocol: 'rest' | 'soap') => void;
  setResponseProtocol: (protocol: 'rest' | 'soap') => void;
  setDirectResponse: (directResponse: boolean) => void;
  setStreaming: (streaming: boolean) => void;
}

const ApiContext = createContext<ApiContextType | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ApiConfig>(() => {
    const legacyProtocol = (localStorage.getItem('soapy_protocol') as 'rest' | 'soap') || 'rest';
    const directResponseStored = localStorage.getItem('soapy_direct_response');
    return {
      apiKey: localStorage.getItem('soapy_api_key') || 'dev-api-key',
      baseUrl: 'http://localhost:3000',
      protocol: legacyProtocol, // Keep for backward compatibility
      requestProtocol: (localStorage.getItem('soapy_request_protocol') as 'rest' | 'soap') || legacyProtocol,
      responseProtocol: (localStorage.getItem('soapy_response_protocol') as 'rest' | 'soap') || legacyProtocol,
      directResponse: directResponseStored !== null ? directResponseStored === 'true' : true,
      streaming: localStorage.getItem('soapy_streaming') === 'true' || true,
    };
  });

  const setApiKey = (key: string) => {
    localStorage.setItem('soapy_api_key', key);
    setConfig(prev => ({ ...prev, apiKey: key }));
  };

  const setProtocol = (protocol: 'rest' | 'soap') => {
    localStorage.setItem('soapy_protocol', protocol);
    localStorage.setItem('soapy_request_protocol', protocol);
    localStorage.setItem('soapy_response_protocol', protocol);
    setConfig(prev => ({ ...prev, protocol, requestProtocol: protocol, responseProtocol: protocol }));
  };

  const setRequestProtocol = (protocol: 'rest' | 'soap') => {
    localStorage.setItem('soapy_request_protocol', protocol);
    setConfig(prev => ({ ...prev, requestProtocol: protocol }));
  };

  const setResponseProtocol = (protocol: 'rest' | 'soap') => {
    localStorage.setItem('soapy_response_protocol', protocol);
    setConfig(prev => ({ ...prev, responseProtocol: protocol }));
  };

  const setDirectResponse = (directResponse: boolean) => {
    localStorage.setItem('soapy_direct_response', String(directResponse));
    setConfig(prev => ({ ...prev, directResponse }));
  };

  const setStreaming = (streaming: boolean) => {
    localStorage.setItem('soapy_streaming', String(streaming));
    setConfig(prev => ({ ...prev, streaming }));
  };

  return (
    <ApiContext.Provider value={{ config, setApiKey, setProtocol, setRequestProtocol, setResponseProtocol, setDirectResponse, setStreaming }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) throw new Error('useApi must be used within ApiProvider');
  return context;
}
