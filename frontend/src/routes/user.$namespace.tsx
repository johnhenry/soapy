import { createFileRoute, redirect } from '@tanstack/react-router';
import { ConversationList } from '../components/ConversationList';
import { useRef } from 'react';

export const Route = createFileRoute('/user/$namespace')({
  component: NamespaceComponent,
  beforeLoad: ({ params }) => {
    // If namespace contains a slash, it's actually namespace/conversationId
    // Redirect to the conversation route
    if (params.namespace.includes('/')) {
      const [namespace, conversationId] = params.namespace.split('/', 2);
      throw redirect({
        to: '/user/$namespace/$conversationId',
        params: { namespace, conversationId },
      });
    }
  },
});

function NamespaceComponent() {
  const conversationListRef = useRef<{ refresh: () => void }>(null);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <ConversationList ref={conversationListRef} selectedId={null} />
      </aside>

      <main className="main-content">
        <div className="empty-state">
          <h2>Welcome to Soapy</h2>
          <p>Select a conversation or create a new one to get started</p>
          <p className="help-text">
            Full-featured AI conversation management with Git-backed storage, branching, and multi-format support
          </p>
        </div>
      </main>
    </div>
  );
}
