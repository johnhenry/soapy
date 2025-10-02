import type { ToolCall, ToolResult } from '../types';
import './ToolCallView.css';

interface ToolCallViewProps {
  toolCall: ToolCall;
  toolResult?: ToolResult;
}

export function ToolCallView({ toolCall, toolResult }: ToolCallViewProps) {
  const formatJson = (obj: Record<string, unknown>) => {
    return JSON.stringify(obj, null, 2);
  };

  const getStatusColor = (status?: 'success' | 'failure') => {
    if (!status) return 'var(--text-tertiary)';
    return status === 'success' ? 'var(--secondary)' : 'var(--danger)';
  };

  const getStatusIcon = (status?: 'success' | 'failure') => {
    if (!status) {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
          <path d="M8.5 4.5a.5.5 0 0 0-1 0v3.362l-1.429 2.38a.5.5 0 1 0 .858.515l1.5-2.5A.5.5 0 0 0 8.5 8V4.5z" />
        </svg>
      );
    }

    if (status === 'success') {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
        </svg>
      );
    }

    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z" />
      </svg>
    );
  };

  return (
    <div className="tool-call-view">
      <div className="tool-call-header">
        <div className="tool-info">
          <h4 className="tool-name">{toolCall.toolName}</h4>
          <span className="sequence-number">#{toolCall.sequenceNumber}</span>
        </div>
        <div className="tool-status" style={{ color: getStatusColor(toolResult?.status) }}>
          {getStatusIcon(toolResult?.status)}
          <span>{toolResult?.status || 'Pending'}</span>
        </div>
      </div>

      <div className="tool-section">
        <div className="section-header">
          <h5>Parameters</h5>
          <span className="commit-hash" title={toolCall.commitHash}>
            {toolCall.commitHash.substring(0, 7)}
          </span>
        </div>
        <pre className="json-display">{formatJson(toolCall.parameters)}</pre>
        <div className="timestamp">
          Requested at {new Date(toolCall.requestedAt).toLocaleString()}
        </div>
      </div>

      {toolResult && (
        <div className="tool-section">
          <div className="section-header">
            <h5>Result</h5>
            <div className="result-meta">
              {toolResult.retryCount > 0 && (
                <span className="retry-count">Retries: {toolResult.retryCount}</span>
              )}
              <span className="commit-hash" title={toolResult.commitHash}>
                {toolResult.commitHash.substring(0, 7)}
              </span>
            </div>
          </div>
          <pre className="json-display">{formatJson(toolResult.result)}</pre>
          <div className="timestamp">
            Executed at {new Date(toolResult.executedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
