import { createFileRoute } from '@tanstack/react-router';
import { ConversationList } from '../components/ConversationList';
import { ConversationView } from '../components/ConversationView';
import { useRef } from 'react';

export const Route = createFileRoute('/$conversationId/$branchId')({
  component: BranchComponent,
});

function BranchComponent() {
  const { namespace, conversationId } = Route.useParams();
  const conversationListRef = useRef<{ refresh: () => void }>(null);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <ConversationList
          ref={conversationListRef}
          selectedId={conversationId}
          onSelect={() => {}}
        />
      </aside>

      <main className="main-content">
        <ConversationView
          namespace={namespace}
          conversationId={conversationId}
          onConversationCreated={() => conversationListRef.current?.refresh()}
        />
      </main>
    </div>
  );
}
