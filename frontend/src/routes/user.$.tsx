import { createFileRoute } from '@tanstack/react-router';
import { ConversationList } from '../components/ConversationList';
import { ConversationView } from '../components/ConversationView';
import { useRef } from 'react';

export const Route = createFileRoute('/user/$')({
  component: ConversationComponent,
});

function ConversationComponent() {
  const params = Route.useParams();
  const conversationListRef = useRef<{ refresh: () => void }>(null);

  // The catch-all parameter "*" contains the full path after /user/
  // e.g., "default/1759598199716" or "default/1759598199716/branch/my-branch"
  const fullPath = (params as any)['*'] || '';

  // Extract conversation ID and optional branch
  const parts = fullPath.split('/');
  const namespace = parts[0] || 'default';
  const conversationId = parts[1] || '';
  const fullId = `${namespace}/${conversationId}`;

  // Check if this is a branch route (has "/branch/" in the path)
  const branchIndex = parts.indexOf('branch');
  const branchId = branchIndex !== -1 && parts[branchIndex + 1] ? parts[branchIndex + 1] : undefined;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <ConversationList
          ref={conversationListRef}
          selectedId={conversationId ? fullId : null}
        />
      </aside>

      <main className="main-content">
        {conversationId ? (
          <ConversationView
            key={branchId ? `${fullId}-${branchId}` : `${fullId}-main`}
            appsection="user"
            namespace={namespace}
            conversationId={conversationId}
            branchId={branchId}
            onConversationCreated={() => conversationListRef.current?.refresh()}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Welcome to Soapy</h2>
              <p>Select a conversation from the sidebar or create a new one to get started.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
