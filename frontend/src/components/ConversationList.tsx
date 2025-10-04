import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useApi } from '../context/ApiContext';
import { ApiClient } from '../services/ApiClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  selectedId: string | null;
  onConversationCreated?: () => void;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

const ConversationListComponent = forwardRef<{ refresh: () => void }, ConversationListProps>(
  ({ selectedId, onConversationCreated }, ref) => {
  const navigate = useNavigate();
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
    // Navigate to the new conversation using router with default namespace and user appsection
    navigate({ to: '/user/$namespace/$conversationId', params: { namespace: 'default', conversationId: newId } });
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
        navigate({ to: '/user/$namespace', params: { namespace: 'default' } });
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
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <Button 
          className="w-full" 
          onClick={handleNewConversation}
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && <div className="text-sm text-muted-foreground text-center p-4">Loading...</div>}
        {error && <div className="text-sm text-destructive text-center p-4">{error}</div>}
        {!loading && !error && conversations.length === 0 && (
          <div className="text-sm text-muted-foreground text-center p-4">
            No conversations yet. Click "New Conversation" to start.
          </div>
        )}
        {conversations.map((conv) => (
          <div key={conv.id} className="flex items-stretch gap-1">
            <Button
              variant={selectedId === conv.id ? "secondary" : "ghost"}
              className={cn(
                "flex-1 justify-start h-auto py-2 px-3",
                selectedId === conv.id && "bg-secondary"
              )}
              onClick={() => navigate({ to: '/user/$namespace/$conversationId', params: { namespace: 'default', conversationId: conv.id } })}
            >
              <div className="flex flex-col items-start w-full">
                <div className="font-medium text-sm truncate w-full text-left">{conv.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-auto"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(conv.id, conv.title);
              }}
              title="Delete conversation"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && handleCancelDelete()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.title}"?
              <br />
              <span className="text-destructive font-medium">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

ConversationListComponent.displayName = 'ConversationList';

export const ConversationList = ConversationListComponent;
