import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ApiProvider } from '../context/ApiContext';
import { Header } from '../components/Header';
import { ApiSettings } from '../components/ApiSettings';
import { useState } from 'react';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
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

        <Outlet />
      </div>
    </ApiProvider>
  );
}
