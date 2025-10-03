import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';
import { ApiClient } from '../services/ApiClient';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { BranchManager } from './BranchManager';
import { FileUploader } from './FileUploader';
import { ToolCallView } from './ToolCallView';
import type { Message, Branding, ToolCall, ToolResult, ConversationItem } from '../types';
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
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'anthropic'>('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');

  const [client] = useState(() => new ApiClient(config.baseUrl, config.apiKey, config.requestProtocol, config.responseProtocol, config.directResponse, config.streaming));

  useEffect(() => {
    loadItems();
    loadBranches();
  }, [conversationId, currentBranch]);

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
                  const newProvider = e.target.value as 'openai' | 'anthropic';
                  setSelectedProvider(newProvider);
                  setSelectedModel(newProvider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022');
                }}>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </label>
              <label>
                Model:
                {selectedProvider === 'openai' ? (
                  <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </select>
                ) : (
                  <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                  </select>
                )}
              </label>
            </div>
        <MessageInput onSend={handleSendMessage} disabled={streaming || loading} />
      </div>
    </div>
  );
}
