import { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useApi } from '../context/ApiContext';
import { ApiClient } from '../services/ApiClient';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { BranchManager } from './BranchManager';
import { FileUploader } from './FileUploader';
import { ToolCallView } from './ToolCallView';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import type { Message, ToolCall, ToolResult, ConversationItem, AIProvider } from '../types';

interface ConversationViewProps {
  appsection: string;
  namespace: string;
  conversationId: string;
  onConversationCreated?: () => void;
}

export function ConversationView({ appsection, namespace, conversationId, onConversationCreated }: ConversationViewProps) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { branchId?: string };
  const { config } = useApi();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  // Use branchId from URL if present, otherwise default to 'main'
  const currentBranch = params.branchId || 'main';
  const [branches, setBranches] = useState<Array<{ name: string; sourceMessageNumber: number }>>([]);
  
  // Create namespaced conversation ID for API calls
  const namespacedId = `${namespace}/${conversationId}`;
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const providerNames: Record<AIProvider, string> = {
    'openai': 'OpenAI',
    'anthropic': 'Anthropic',
    'ollama': 'Ollama (Local)',
    'lmstudio': 'LM Studio (Local)',
    'openai-compatible': 'Custom OpenAI-Compatible',
  };

  const [client] = useState(() => new ApiClient(config.baseUrl, config.apiKey, config.requestProtocol, config.responseProtocol, config.directResponse, config.streaming));

  useEffect(() => {
    loadItems();
    loadBranches();
    loadProviders();
  }, [conversationId, currentBranch]);

  const loadProviders = async () => {
    try {
      const providers = await client.listProviders();
      setAvailableProviders(providers);
      // If current provider is not available, switch to first available
      if (providers.length > 0 && !providers.includes(selectedProvider)) {
        setSelectedProvider(providers[0]);
        await loadModels(providers[0]);
      } else if (providers.length > 0 && providers.includes(selectedProvider)) {
        // Load models for current provider on initial mount
        await loadModels(selectedProvider);
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  };

  const loadModels = async (provider: AIProvider) => {
    try {
      const models = await client.listModels(provider);
      setAvailableModels(models);
      // Set first model as selected if current model isn't available
      if (models.length > 0 && !models.includes(selectedModel)) {
        setSelectedModel(models[0]);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
      setAvailableModels([]);
    }
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const conversationItems = await client.getConversationItems(namespacedId, currentBranch !== 'main' ? currentBranch : undefined);
      setItems(conversationItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const branchList = await client.getBranches(namespacedId);
      setBranches(branchList);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    try {
      setError(null);
      setStreaming(true);

      // Force non-streaming mode when files are attached (streaming doesn't support files)
      const shouldStream = config.streaming && (!files || files.length === 0);

      if (shouldStream) {

        // Optimistically add user message to UI immediately (streaming mode only)
        const optimisticUserMessage: Message & { itemType: 'message' } = {
          sequenceNumber: items.length + 1,
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
          commitHash: '',
          itemType: 'message',
        };

        // Add placeholder for assistant message
        const assistantMessage: Message & { itemType: 'message' } = {
          sequenceNumber: items.length + 2,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          commitHash: '',
          itemType: 'message',
        };
        setItems([...items, optimisticUserMessage, assistantMessage]);

        // Stream the response
        let streamedContent = '';
        for await (const chunk of client.sendMessageStream(
          namespacedId,
          'user',
          content,
          currentBranch !== 'main' ? currentBranch : undefined,
          selectedProvider,
          selectedModel
        )) {
          if (chunk.type === 'delta' && chunk.content) {
            streamedContent += chunk.content;
            // Update the assistant message with streamed content
            setItems((prevItems) => {
              const updated = [...prevItems];
              const lastItem = updated[updated.length - 1];
              if (lastItem.itemType === 'message' && lastItem.role === 'assistant') {
                lastItem.content = streamedContent;
              }
              return updated;
            });
          } else if (chunk.type === 'done') {
            // Refresh to get final committed items with proper metadata
            await loadItems();
            // Notify parent that conversation was created (for first message)
            if (items.length === 0) {
              onConversationCreated?.();
            }
          } else if (chunk.type === 'error') {
            setError(chunk.message || 'Streaming failed');
          }
        }
      } else {
        // Non-streaming mode - better for tool calls
        // Add optimistic user message for immediate UI feedback
        const optimisticUserMessage: Message & { itemType: 'message' } = {
          sequenceNumber: items.length + 1,
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
          commitHash: '',
          itemType: 'message',
        };

        // Add loading placeholder for assistant response
        const loadingMessage: Message & { itemType: 'message' } = {
          sequenceNumber: items.length + 2,
          role: 'assistant',
          content: '...',
          timestamp: new Date().toISOString(),
          commitHash: '',
          itemType: 'message',
        };
        setItems([...items, optimisticUserMessage, loadingMessage]);

        await client.sendMessage(
          namespacedId,
          'user',
          content,
          currentBranch !== 'main' ? currentBranch : undefined,
          selectedProvider,
          selectedModel,
          files
        );

        // Refresh to get all items including AI response and tool calls
        await loadItems();

        // Notify parent that conversation was created (for first message)
        if (items.length === 0) {
          onConversationCreated?.();
        }
      }
    } catch (err) {
      console.error('ERROR in handleSendMessage:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Reload items to remove optimistic updates on error
      await loadItems();
    } finally {
      setStreaming(false);
    }
  };

  const handleBranchFromMessage = async (sequenceNumber: number, branchName: string) => {
    try {
      setError(null);
      await client.createBranch(namespacedId, branchName, sequenceNumber);

      // Reload branches to update dropdown
      await loadBranches();

      // Switch to the new branch via URL navigation
      navigate({ 
        to: '/user/$namespace/$conversationId/branch/$branchId', 
        params: { namespace, conversationId, branchId: branchName } 
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
    }
  };

  const handleDeleteBranch = async () => {
    if (currentBranch === 'main') {
      return;
    }

    try {
      setError(null);
      await client.deleteBranch(namespacedId, currentBranch);

      // Switch to main via URL navigation
      navigate({ to: '/user/$namespace/$conversationId', params: { namespace, conversationId } });

      // Reload branches
      await loadBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete branch');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-3 bg-background">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="branch-select" className="text-sm">Branch:</Label>
            <Select 
              value={currentBranch} 
              onValueChange={(branch) => {
                if (branch === 'main') {
                  navigate({ to: '/user/$namespace/$conversationId', params: { namespace, conversationId } });
                } else {
                  navigate({ 
                    to: '/user/$namespace/$conversationId/branch/$branchId', 
                    params: { namespace, conversationId, branchId: branch } 
                  });
                }
              }}
            >
              <SelectTrigger id="branch-select" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">main</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.name} value={branch.name}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentBranch !== 'main' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteBranch}
                title={`Delete branch "${currentBranch}"`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
            {currentBranch !== 'main' && <Badge variant="secondary">📍 viewing branch</Badge>}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <MessageList
          conversationId={conversationId}
          items={items}
          streaming={streaming}
          onBranchFromMessage={handleBranchFromMessage}
          branches={branches}
          currentBranch={currentBranch}
          onBranchSwitch={(branch) => {
            if (branch === 'main') {
              navigate({ to: '/user/$namespace/$conversationId', params: { namespace, conversationId } });
            } else {
              navigate({ 
                to: '/user/$namespace/$conversationId/branch/$branchId', 
                params: { namespace, conversationId, branchId: branch } 
              });
            }
          }}
        />
        <div className="border-t p-3 bg-muted/50 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="provider-select" className="text-sm">Provider:</Label>
            <Select 
              value={selectedProvider} 
              onValueChange={async (value) => {
                const newProvider = value as AIProvider;
                setSelectedProvider(newProvider);
                await loadModels(newProvider);
              }}
            >
              <SelectTrigger id="provider-select" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableProviders.map((provider) => (
                  <SelectItem key={provider} value={provider}>{providerNames[provider]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="model-select" className="text-sm">Model:</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model-select" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <MessageInput onSend={handleSendMessage} disabled={streaming || loading} />
      </div>
    </div>
  );
}
