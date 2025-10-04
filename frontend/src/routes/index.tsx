import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: IndexComponent,
});

function IndexComponent() {
  return (
    <div className="app-layout">
      <main className="main-content">
        <div className="empty-state">
          <h2>Welcome to Soapy</h2>
          <p>Navigate to /user to access conversations</p>
          <p className="help-text">
            Full-featured AI conversation management with Git-backed storage, branching, and multi-format support
          </p>
        </div>
      </main>
    </div>
  );
}
