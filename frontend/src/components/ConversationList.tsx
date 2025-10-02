import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';
import { RestClient } from '../services/RestClient';
import './ConversationList.css';

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { config } = useApi();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, [config.apiKey]);

  const loadConversations = async () => {
    if (!config.apiKey) {
      setConversations([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const client = new RestClient(config.baseUrl, config.apiKey);
      // TODO: Add GET /v1/conversations endpoint to backend
      // For now, conversations will be empty until backend implements this
      setConversations([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = async () => {
    const newId = `conv-${Date.now()}`;
    // TODO: Call API to create conversation when backend implements POST /v1/conversations
    onSelect(newId);
  };

  return (
    <div className="conversation-list">
      <div className="conversation-list-header">
        <button className="new-conversation-btn" onClick={handleNewConversation}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z" clipRule="evenodd" />
          </svg>
          New Conversation
        </button>
      </div>
      <div className="conversation-items">
        {loading && <div className="conversation-list-message">Loading...</div>}
        {error && <div className="conversation-list-error">{error}</div>}
        {!loading && !error && conversations.length === 0 && (
          <div className="conversation-list-empty">
            No conversations yet. Click "New Conversation" to start.
          </div>
        )}
        {conversations.map((conv) => (
          <button
            key={conv.id}
            className={`conversation-item ${selectedId === conv.id ? 'selected' : ''}`}
            onClick={() => onSelect(conv.id)}
          >
            <div className="conversation-item-title">{conv.title}</div>
            <div className="conversation-item-date">
              {new Date(conv.updatedAt).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
