import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useApi } from '../context/ApiContext';
import { ApiClient } from '../services/ApiClient';
import './ConversationList.css';

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConversationCreated?: () => void;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

const ConversationListComponent = forwardRef<{ refresh: () => void }, ConversationListProps>(
  ({ selectedId, onSelect, onConversationCreated }, ref) => {
  const { config } = useApi();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

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
      const client = new ApiClient(config.baseUrl, config.apiKey, config.requestProtocol, config.responseProtocol, config.streaming);
      const convList = await client.listConversations();
      setConversations(convList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refresh: loadConversations,
  }));

  const handleNewConversation = async () => {
    const newId = `conv-${Date.now()}`;
    onSelect(newId);
    // Reload conversations after a brief delay to allow backend to create it
    setTimeout(() => {
      loadConversations();
      onConversationCreated?.();
    }, 500);
  };

  const handleDeleteClick = (id: string, title: string) => {
    setDeleteConfirm({ id, title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const client = new ApiClient(config.baseUrl, config.apiKey, config.requestProtocol, config.responseProtocol, config.streaming);
      await client.deleteConversation(deleteConfirm.id);

      // If deleted conversation was selected, clear selection
      if (selectedId === deleteConfirm.id) {
        onSelect(null as any);
      }

      // Reload conversation list
      await loadConversations();
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversation');
      setDeleteConfirm(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
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
          <div key={conv.id} className="conversation-item-wrapper">
            <button
              className={`conversation-item ${selectedId === conv.id ? 'selected' : ''}`}
              onClick={() => onSelect(conv.id)}
            >
              <div className="conversation-item-title">{conv.title}</div>
              <div className="conversation-item-date">
                {new Date(conv.updatedAt).toLocaleDateString()}
              </div>
            </button>
            <button
              className="delete-conversation-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(conv.id, conv.title);
              }}
              title="Delete conversation"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      {deleteConfirm && (
        <div className="delete-modal-overlay" onClick={handleCancelDelete}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Conversation?</h3>
            <p>Are you sure you want to delete "{deleteConfirm.title}"?</p>
            <p className="delete-warning">This action cannot be undone.</p>
            <div className="delete-modal-actions">
              <button onClick={handleCancelDelete} className="btn-cancel">Cancel</button>
              <button onClick={handleConfirmDelete} className="btn-delete">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ConversationListComponent.displayName = 'ConversationList';

export const ConversationList = ConversationListComponent;
