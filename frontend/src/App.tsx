import { useState } from 'react';
import { ApiProvider } from './context/ApiContext';
import { ConversationList } from './components/ConversationList';
import { ConversationView } from './components/ConversationView';
import { ApiSettings } from './components/ApiSettings';
import { Header } from './components/Header';

export default function App() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <ApiProvider>
      <div className="app">
        <Header onSettingsClick={() => setShowSettings(!showSettings)} />

        {showSettings && (
          <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <ApiSettings onClose={() => setShowSettings(false)} />
            </div>
          </div>
        )}

        <div className="app-layout">
          <aside className="sidebar">
            <ConversationList
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
            />
          </aside>

          <main className="main-content">
            {selectedConversationId ? (
              <ConversationView conversationId={selectedConversationId} />
            ) : (
              <div className="empty-state">
                <h2>Welcome to Soapy</h2>
                <p>Select a conversation or create a new one to get started</p>
                <p className="help-text">
                  Full-featured AI conversation management with Git-backed storage, branching, and multi-format support
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </ApiProvider>
  );
}
