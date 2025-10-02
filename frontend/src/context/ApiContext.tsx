import { createContext, useContext, useState, ReactNode } from 'react';
import type { ApiConfig, OutputFormat } from '../types';

interface ApiContextType {
  config: ApiConfig;
  setApiKey: (key: string) => void;
  setFormat: (format: OutputFormat) => void;
  setProtocol: (protocol: 'rest' | 'soap') => void;
}

const ApiContext = createContext<ApiContextType | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ApiConfig>(() => ({
    apiKey: localStorage.getItem('soapy_api_key') || 'dev-api-key',
    baseUrl: 'http://localhost:3000',
    format: 'openai',
    protocol: 'rest',
  }));

  const setApiKey = (key: string) => {
    localStorage.setItem('soapy_api_key', key);
    setConfig(prev => ({ ...prev, apiKey: key }));
  };

  const setFormat = (format: OutputFormat) => {
    setConfig(prev => ({ ...prev, format }));
  };

  const setProtocol = (protocol: 'rest' | 'soap') => {
    setConfig(prev => ({ ...prev, protocol }));
  };

  return (
    <ApiContext.Provider value={{ config, setApiKey, setFormat, setProtocol }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) throw new Error('useApi must be used within ApiProvider');
  return context;
}
