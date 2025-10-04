import { useApi } from '../context/ApiContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <header className="bg-background border-b border-border px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-primary">Soapy</h1>
        <Badge 
          variant="secondary"
          className={cn(
            "font-mono text-xs cursor-help transition-all whitespace-pre-line",
            "hover:bg-muted hover:border-primary"
          )}
          title={getTooltip()}
        >
          {getProtocolIndicator()}
        </Badge>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onSettingsClick} 
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
