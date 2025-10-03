import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';
import { ApiClient } from '../services/ApiClient';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { BranchManager } from './BranchManager';
import { FileUploader } from './FileUploader';
import { ToolCallView } from './ToolCallView';
import type { Message, ToolCall, ToolResult, ConversationItem, AIProvider } from '../types';
import './ConversationView.css';

interface ConversationViewProps {
  conversationId: string;
  onConversationCreated?: () => void;
}

export function ConversationView({ conversationId, onConversationCreated }: ConversationViewProps) {
  const { config } = useApi();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [branches, setBranches] = useState<Array<{ name: string; sourceMessageNumber: number }>>([]);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);

  // Model lists for each provider
  const providerModels: Record<AIProvider, string[]> = {
    'openai': ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    'anthropic': ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    'ollama': ['llama2', 'llama2:13b', 'mistral', 'mixtral', 'codellama', 'phi'],
    'lmstudio': ['local-model'], // LM Studio uses whatever model is loaded
    'openai-compatible': ['default'], // Custom endpoints may vary
  };

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
        setSelectedModel(providerModels[providers[0]][0]);
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const conversationItems = await client.getConversationItems(conversationId, currentBranch !== 'main' ? currentBranch : undefined);
      setItems(conversationItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const branchList = await client.getBranches(conversationId);
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
          conversationId,
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
          conversationId,
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
      await client.createBranch(conversationId, branchName, sequenceNumber);

      // Reload branches to update dropdown
      await loadBranches();

      // Switch to the new branch
      setCurrentBranch(branchName);

      // Reload items on the new branch
      await loadItems();
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
      await client.deleteBranch(conversationId, currentBranch);

      // Switch to main
      setCurrentBranch('main');

      // Reload branches
      await loadBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete branch');
    }
  };

  return (
    <div className="conversation-view">
      <div className="conversation-header">
        <div className="branch-info">
          <div className="branch-selector">
            <label>Branch:</label>
            <select value={currentBranch} onChange={(e) => setCurrentBranch(e.target.value)}>
              <option value="main">main</option>
              {branches.map((branch) => (
                <option key={branch.name} value={branch.name}>{branch.name}</option>
              ))}
            </select>
            {currentBranch !== 'main' && (
              <button
                className="delete-branch-btn"
                onClick={handleDeleteBranch}
                title={`Delete branch "${currentBranch}"`}
              >
                ×
              </button>
            )}
          </div>
          <div className="branch-stats">
            {items.length} item{items.length !== 1 ? 's' : ''}
            {currentBranch !== 'main' && <span className="branch-indicator">📍 viewing branch</span>}
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="conversation-content">
        <MessageList
          conversationId={conversationId}
          items={items}
          streaming={streaming}
          onBranchFromMessage={handleBranchFromMessage}
          branches={branches}
          currentBranch={currentBranch}
          onBranchSwitch={setCurrentBranch}
        />
        <div className="ai-controls">
              <label>
                Provider:
                <select value={selectedProvider} onChange={(e) => {
                  const newProvider = e.target.value as AIProvider;
                  setSelectedProvider(newProvider);
                  setSelectedModel(providerModels[newProvider][0]);
                }}>
                  {availableProviders.map((provider) => (
                    <option key={provider} value={provider}>{providerNames[provider]}</option>
                  ))}
                </select>
              </label>
              <label>
                Model:
                <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                  {providerModels[selectedProvider].map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </label>
            </div>
        <MessageInput onSend={handleSendMessage} disabled={streaming || loading} />
      </div>
    </div>
  );
}
