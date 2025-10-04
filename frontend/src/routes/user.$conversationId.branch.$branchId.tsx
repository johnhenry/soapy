import { createFileRoute } from '@tanstack/react-router';
import { ConversationList } from '../components/ConversationList';
import { ConversationView } from '../components/ConversationView';
import { useRef } from 'react';

export const Route = createFileRoute('/user/$conversationId/branch/$branchId')({
  component: BranchComponent,
});

function BranchComponent() {
  const { conversationId: fullId } = Route.useParams();
  const conversationListRef = useRef<{ refresh: () => void }>(null);

  // Parse namespace and conversationId from full ID (e.g., "default/conv-123")
  const [namespace, conversationId] = fullId.includes('/')
    ? fullId.split('/', 2)
    : ['default', fullId];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <ConversationList
          ref={conversationListRef}
          selectedId={fullId}
        />
      </aside>

      <main className="main-content">
        <ConversationView
          appsection="user"
          namespace={namespace}
          conversationId={conversationId}
          onConversationCreated={() => conversationListRef.current?.refresh()}
        />
      </main>
    </div>
  );
}
