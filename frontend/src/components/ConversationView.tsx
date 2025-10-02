import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';
import { RestClient } from '../services/RestClient';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { BranchManager } from './BranchManager';
import { FileUploader } from './FileUploader';
import { BrandingEditor } from './BrandingEditor';
import { ToolCallView } from './ToolCallView';
import type { Message, Branding, ToolCall, ToolResult } from '../types';
import './ConversationView.css';

type TabType = 'messages' | 'files' | 'tools' | 'branding';

interface ConversationViewProps {
  conversationId: string;
}

export function ConversationView({ conversationId }: ConversationViewProps) {
  const { config } = useApi();
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [messages, setMessages] = useState<Message[]>([]);
  const [branding, setBranding] = useState<Branding | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [branches, setBranches] = useState<string[]>(['main']);

  const client = new RestClient(config.baseUrl, config.apiKey);

  useEffect(() => {
    loadMessages();
    loadBranding();
    loadBranches();
  }, [conversationId, currentBranch]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const msgs = await client.getMessages(conversationId, config.format, currentBranch !== 'main' ? currentBranch : undefined);
      setMessages(msgs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadBranding = async () => {
    try {
      const brandingData = await client.getBranding(conversationId);
      setBranding(brandingData);
    } catch (err) {
      console.error('Failed to load branding:', err);
    }
  };

  const loadBranches = async () => {
    try {
      const branchList = await client.getBranches(conversationId);
      const branchNames = ['main', ...branchList.map(b => b.name)];
      setBranches(branchNames);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    try {
      setError(null);
      setStreaming(true);

      if (files && files.length > 0) {
        for (const file of files) {
          await client.uploadFile(conversationId, file);
        }
      }

      await client.sendMessage(conversationId, 'user', content, currentBranch !== 'main' ? currentBranch : undefined);
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setStreaming(false);
    }
  };

  const handleSaveBranding = async (newBranding: Branding) => {
    setBranding(newBranding);
  };

  const handleBranchFromMessage = async (sequenceNumber: number, branchName: string) => {
    try {
      setError(null);
      await client.createBranch(conversationId, branchName, sequenceNumber);

      // Reload branches to update dropdown
      await loadBranches();

      // Switch to the new branch
      setCurrentBranch(branchName);

      // Reload messages on the new branch
      await loadMessages();
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

  const tabs: { id: TabType; label: string }[] = [
    { id: 'messages', label: 'Messages' },
    { id: 'files', label: 'Files' },
    { id: 'tools', label: 'Tools' },
    { id: 'branding', label: 'Branding' },
  ];

  return (
    <div className="conversation-view">
      <div className="conversation-header">
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="branch-info">
          <div className="branch-selector">
            <label>Branch:</label>
            <select value={currentBranch} onChange={(e) => setCurrentBranch(e.target.value)}>
              {branches.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
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
            {messages.length} message{messages.length !== 1 ? 's' : ''}
            {currentBranch !== 'main' && <span className="branch-indicator">📍 viewing branch</span>}
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="conversation-content">
        {activeTab === 'messages' && (
          <>
            <MessageList
              messages={messages}
              streaming={streaming}
              onBranchFromMessage={handleBranchFromMessage}
            />
            <MessageInput onSend={handleSendMessage} disabled={streaming || loading} />
          </>
        )}

        {activeTab === 'files' && <FileUploader conversationId={conversationId} />}

        {activeTab === 'tools' && (
          <div className="tools-view">
            <p className="empty-state-text">Tool calls will appear here</p>
          </div>
        )}

        {activeTab === 'branding' && (
          <BrandingEditor
            conversationId={conversationId}
            branding={branding}
            onSave={handleSaveBranding}
          />
        )}
      </div>
    </div>
  );
}
