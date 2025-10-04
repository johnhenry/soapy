import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';

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

  // Generate config summary text
  const getConfigSummary = () => {
    if (directResponseLocal) {
      const streaming = requestProtocol === 'rest' && streamingLocal ? ' (Streaming)' : requestProtocol === 'rest' ? ' (Non-streaming)' : '';
      return `${requestProtocol.toUpperCase()} Direct Response${streaming}`;
    } else {
      const streaming = responseProtocol === 'rest' && streamingLocal ? ' (Streaming)' : responseProtocol === 'rest' ? ' (Non-streaming)' : '';
      return `${requestProtocol.toUpperCase()} → ${responseProtocol.toUpperCase()}${streaming}`;
    }
  };

  const getConfigDescription = () => {
    if (directResponseLocal && requestProtocol === 'rest' && streamingLocal)
      return '✓ REST Direct: Single round-trip with real-time streaming (recommended)';
    if (directResponseLocal && requestProtocol === 'rest' && !streamingLocal)
      return '✓ REST Direct: Single round-trip, non-streaming';
    if (directResponseLocal && requestProtocol === 'soap')
      return '✓ SOAP Direct: Single round-trip (synchronous, non-streaming)';
    if (!directResponseLocal && requestProtocol === 'rest' && responseProtocol === 'rest' && streamingLocal)
      return '✓ REST→REST Hybrid: Submit message, then stream response (ID-based)';
    if (!directResponseLocal && requestProtocol === 'rest' && responseProtocol === 'rest' && !streamingLocal)
      return '✓ REST→REST Hybrid: Submit message, then poll response (ID-based)';
    if (!directResponseLocal && requestProtocol === 'rest' && responseProtocol === 'soap')
      return '✓ REST→SOAP Hybrid: Submit via REST, retrieve via SOAP (ID-based)';
    if (!directResponseLocal && requestProtocol === 'soap' && responseProtocol === 'soap')
      return '✓ SOAP→SOAP Hybrid: Submit via SOAP, retrieve via SOAP (ID-based)';
    if (!directResponseLocal && requestProtocol === 'soap' && responseProtocol === 'rest' && streamingLocal)
      return '✓ SOAP→REST Hybrid: Submit via SOAP, stream via REST (ID-based)';
    if (!directResponseLocal && requestProtocol === 'soap' && responseProtocol === 'rest' && !streamingLocal)
      return '✓ SOAP→REST Hybrid: Submit via SOAP, poll via REST (ID-based)';
    return '';
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
          <DialogDescription>
            Configure your API connection and protocol settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKeyLocal(e.target.value)}
                placeholder="Enter your API key"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base-url">Base URL</Label>
            <Input
              id="base-url"
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:3000"
              disabled
            />
            <p className="text-sm text-muted-foreground">Base URL is currently read-only</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-protocol">Request Protocol</Label>
            <select
              id="request-protocol"
              value={requestProtocol}
              onChange={(e) => setRequestProtocolLocal(e.target.value as 'rest' | 'soap')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="rest">REST</option>
              <option value="soap">SOAP</option>
            </select>
            <p className="text-sm text-muted-foreground">Protocol for submitting messages and operations</p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="direct-response"
              checked={directResponseLocal}
              onCheckedChange={(checked) => setDirectResponseLocal(checked as boolean)}
            />
            <Label htmlFor="direct-response" className="text-sm font-normal cursor-pointer">
              Direct Response
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">
            {directResponseLocal
              ? 'Response returned directly in single round-trip using same protocol'
              : 'Request returns ID, then separate fetch retrieves response'}
          </p>

          {!directResponseLocal && (
            <div className="space-y-2">
              <Label htmlFor="response-protocol">Response Protocol</Label>
              <select
                id="response-protocol"
                value={responseProtocol}
                onChange={(e) => setResponseProtocolLocal(e.target.value as 'rest' | 'soap')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="rest">REST</option>
                <option value="soap">SOAP</option>
              </select>
              <p className="text-sm text-muted-foreground">Protocol for retrieving the response after ID is returned</p>
            </div>
          )}

          {(directResponseLocal ? requestProtocol === 'rest' : responseProtocol === 'rest') && (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="streaming"
                  checked={streamingLocal}
                  onCheckedChange={(checked) => setStreamingLocal(checked as boolean)}
                />
                <Label htmlFor="streaming" className="text-sm font-normal cursor-pointer">
                  Enable Streaming
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Stream AI responses in real-time (only available with REST response)
              </p>
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-medium mb-2">{getConfigSummary()}</div>
              <p className="text-sm text-muted-foreground">{getConfigDescription()}</p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

