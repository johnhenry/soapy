import { createContext, useContext, useState, ReactNode } from 'react';
import type { ApiConfig } from '../types';

interface ApiContextType {
  config: ApiConfig;
  setApiKey: (key: string) => void;
  setProtocol: (protocol: 'rest' | 'soap') => void;
}

const ApiContext = createContext<ApiContextType | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ApiConfig>(() => ({
    apiKey: localStorage.getItem('soapy_api_key') || 'dev-api-key',
    baseUrl: 'http://localhost:3000',
    protocol: (localStorage.getItem('soapy_protocol') as 'rest' | 'soap') || 'rest',
  }));

  const setApiKey = (key: string) => {
    localStorage.setItem('soapy_api_key', key);
    setConfig(prev => ({ ...prev, apiKey: key }));
  };

  const setProtocol = (protocol: 'rest' | 'soap') => {
    localStorage.setItem('soapy_protocol', protocol);
    setConfig(prev => ({ ...prev, protocol }));
  };

  return (
    <ApiContext.Provider value={{ config, setApiKey, setProtocol }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) throw new Error('useApi must be used within ApiProvider');
  return context;
}
