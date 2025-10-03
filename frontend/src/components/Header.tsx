import { useApi } from '../context/ApiContext';
import './Header.css';

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  const { config } = useApi();

  // Generate compact protocol indicator
  const getProtocolIndicator = () => {
    const req = config.requestProtocol === 'rest' ? 'R' : 'S';
    const res = config.responseProtocol === 'rest' ? 'R' : 'S';
    // Only show streaming indicator if response protocol is REST (SOAP doesn't support streaming)
    const streaming = config.streaming && config.responseProtocol === 'rest' ? '⚡' : '';

    // If direct response and same protocol
    if (config.directResponse && req === res) {
      return `${req}${streaming}`;
    }

    // If different protocols or hybrid mode
    return `${req}→${res}${streaming}`;
  };

  // Generate detailed tooltip
  const getTooltip = () => {
    const reqProtocol = config.requestProtocol.toUpperCase();
    const resProtocol = config.responseProtocol.toUpperCase();
    const mode = config.directResponse ? 'Direct' : 'Hybrid';
    const streamStatus = config.streaming ? 'Enabled' : 'Disabled';

    const lines = [
      `Protocol Configuration:`,
      ``,
      `Request Protocol: ${reqProtocol}`,
      `Response Protocol: ${resProtocol}`,
      `Mode: ${mode} ${config.directResponse ? '(single round-trip)' : '(submit then fetch)'}`,
      `Streaming: ${streamStatus}${config.streaming && resProtocol === 'REST' ? ' (SSE)' : ''}`,
    ];

    if (!config.directResponse) {
      lines.push(``, `Flow: Send via ${reqProtocol} → Retrieve via ${resProtocol}`);
    }

    return lines.join('\n');
  };

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">Soapy</h1>
        <span className="protocol-indicator" title={getTooltip()}>
          {getProtocolIndicator()}
        </span>
        <button className="header-settings" onClick={onSettingsClick} aria-label="Settings">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </header>
  );
}
