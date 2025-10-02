import { useEffect, useRef, useState } from 'react';
import { useApi } from '../context/ApiContext';
import type { Message, ConversationItem } from '../types';
import './MessageList.css';

interface MessageListProps {
  conversationId?: string;
  messages?: Message[];
  items?: ConversationItem[];
  streaming?: boolean;
  onBranchFromMessage?: (sequenceNumber: number, branchName: string) => Promise<void>;
  branches?: Array<{ name: string; sourceMessageNumber: number }>;
  currentBranch?: string;
  onBranchSwitch?: (branchName: string) => void;
}

export function MessageList({ conversationId, messages, items, streaming, onBranchFromMessage, branches = [], currentBranch = 'main', onBranchSwitch }: MessageListProps) {
  const { config } = useApi();
  // Use items if provided, otherwise fall back to messages for backward compatibility
  const displayItems = items || (messages || []).map(m => ({ ...m, itemType: 'message' as const }));
  const [branchingFrom, setBranchingFrom] = useState<number | null>(null);
  const [branchName, setBranchName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Build a map of sequence number -> branches that originate from that point
  const branchesBySequence = branches.reduce((acc, branch) => {
    const seqNum = branch.sourceMessageNumber;
    if (!acc[seqNum]) acc[seqNum] = [];
    acc[seqNum].push(branch.name);
    return acc;
  }, {} as Record<number, string[]>);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayItems]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleBranchClick = (sequenceNumber: number) => {
    setBranchingFrom(sequenceNumber);
    // Generate random branch name: branch-XXXXX (5 random alphanumeric chars)
    const randomId = Math.random().toString(36).substring(2, 7).toLowerCase();
    setBranchName(`branch-${randomId}`);
  };

  const handleCreateBranch = async () => {
    if (branchingFrom !== null && branchName.trim() && onBranchFromMessage) {
      await onBranchFromMessage(branchingFrom, branchName);
      setBranchingFrom(null);
      setBranchName('');
    }
  };

  const handleCancelBranch = () => {
    setBranchingFrom(null);
    setBranchName('');
  };

  const renderItem = (item: ConversationItem) => {
    if (item.itemType === 'message') {
      return (
        <div key={item.sequenceNumber} className={`message message-${item.role}`}>
          <div className="message-header">
            <span className="message-role">{item.role.toUpperCase()}</span>
            <span className="message-meta">
              {formatTimestamp(item.timestamp)}
              {item.commitHash && (
                <span className="commit-hash" title={item.commitHash}>
                  {item.commitHash.substring(0, 7)}
                </span>
              )}
            </span>
            <div className="branch-controls">
              {branchesBySequence[item.sequenceNumber] && branchesBySequence[item.sequenceNumber].length > 0 && onBranchSwitch && (
                <div className="branch-indicator">
                  <span className="branch-icon" title={`${branchesBySequence[item.sequenceNumber].length} branch(es) diverge from here`}>
                    🔀
                  </span>
                  <select
                    className="inline-branch-selector"
                    onChange={(e) => {
                      const selectedBranch = e.target.value;
                      if (selectedBranch && onBranchSwitch) {
                        onBranchSwitch(selectedBranch);
                      }
                      // Reset to default after selection
                      e.target.value = '';
                    }}
                    title="Jump to a branch that diverged from this message"
                    defaultValue=""
                  >
                    <option value="">→ {branchesBySequence[item.sequenceNumber].join(', ')}</option>
                    {branchesBySequence[item.sequenceNumber].map(branchName => (
                      <option key={branchName} value={branchName}>{branchName}</option>
                    ))}
                  </select>
                </div>
              )}
              {onBranchFromMessage && (
                <button
                  className="branch-btn"
                  onClick={() => handleBranchClick(item.sequenceNumber)}
                  title="Create new branch from this message"
                >
                  🌿
                </button>
              )}
            </div>
          </div>
          <div className="message-content">{item.content}</div>
          {item.attachments && item.attachments.length > 0 && conversationId && (
            <div className="message-attachments">
              {item.attachments.map((attachment, idx) => (
                <a
                  key={idx}
                  href={`${config.baseUrl}/v1/chat/${conversationId}/files/${attachment.filename}`}
                  download={attachment.filename}
                  className="attachment-link"
                  title={`${attachment.filename} (${(attachment.size / 1024).toFixed(2)} KB)`}
                >
                  📎 {attachment.filename}
                </a>
              ))}
            </div>
          )}
          {item.aiProvider && (
            <div className="message-footer">
              <span className="provider-badge">
                {item.aiProvider}
                {item.model && ` (${item.model})`}
              </span>
            </div>
          )}
          {branchingFrom === item.sequenceNumber && (
            <div className="branch-form">
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Enter branch name..."
                autoFocus
              />
              <button onClick={handleCreateBranch} disabled={!branchName.trim()}>
                Create
              </button>
              <button onClick={handleCancelBranch}>Cancel</button>
            </div>
          )}
        </div>
      );
    }

    if (item.itemType === 'tool_call') {
      return (
        <div key={item.sequenceNumber} className="message message-tool-call">
          <div className="message-header">
            <span className="message-role">🔧 TOOL CALL</span>
            <span className="message-meta">
              {formatTimestamp(item.requestedAt)}
              {item.commitHash && (
                <span className="commit-hash" title={item.commitHash}>
                  {item.commitHash.substring(0, 7)}
                </span>
              )}
            </span>
            <div className="branch-controls">
              {branchesBySequence[item.sequenceNumber] && branchesBySequence[item.sequenceNumber].length > 0 && onBranchSwitch && (
                <select
                  className="inline-branch-selector"
                  value={currentBranch}
                  onChange={(e) => onBranchSwitch(e.target.value)}
                  title="Switch to a branch from this point"
                >
                  <option value="">Jump to branch...</option>
                  {branchesBySequence[item.sequenceNumber].map(branchName => (
                    <option key={branchName} value={branchName}>{branchName}</option>
                  ))}
                </select>
              )}
              {onBranchFromMessage && (
                <button
                  className="branch-btn"
                  onClick={() => handleBranchClick(item.sequenceNumber)}
                  title="Branch from this point"
                >
                  🌿
                </button>
              )}
            </div>
          </div>
          <div className="tool-call-content">
            <div className="tool-call-name">{item.toolName}</div>
            <pre className="tool-call-args">{JSON.stringify(item.parameters, null, 2)}</pre>
          </div>
          {branchingFrom === item.sequenceNumber && (
            <div className="branch-form">
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Enter branch name..."
                autoFocus
              />
              <button onClick={handleCreateBranch} disabled={!branchName.trim()}>
                Create
              </button>
              <button onClick={handleCancelBranch}>Cancel</button>
            </div>
          )}
        </div>
      );
    }

    if (item.itemType === 'tool_result') {
      return (
        <div key={item.sequenceNumber} className={`message message-tool-result message-tool-result-${item.status}`}>
          <div className="message-header">
            <span className="message-role">📊 TOOL RESULT</span>
            <span className="message-meta">
              {formatTimestamp(item.executedAt)}
              <span className={`status-badge status-${item.status}`}>{item.status}</span>
              {item.commitHash && (
                <span className="commit-hash" title={item.commitHash}>
                  {item.commitHash.substring(0, 7)}
                </span>
              )}
            </span>
            <div className="branch-controls">
              {branchesBySequence[item.sequenceNumber] && branchesBySequence[item.sequenceNumber].length > 0 && onBranchSwitch && (
                <select
                  className="inline-branch-selector"
                  value={currentBranch}
                  onChange={(e) => onBranchSwitch(e.target.value)}
                  title="Switch to a branch from this point"
                >
                  <option value="">Jump to branch...</option>
                  {branchesBySequence[item.sequenceNumber].map(branchName => (
                    <option key={branchName} value={branchName}>{branchName}</option>
                  ))}
                </select>
              )}
              {onBranchFromMessage && (
                <button
                  className="branch-btn"
                  onClick={() => handleBranchClick(item.sequenceNumber)}
                  title="Branch from this point"
                >
                  🌿
                </button>
              )}
            </div>
          </div>
          <div className="tool-result-content">
            <pre className="tool-result-data">{JSON.stringify(item.result, null, 2)}</pre>
          </div>
          {branchingFrom === item.sequenceNumber && (
            <div className="branch-form">
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Enter branch name..."
                autoFocus
              />
              <button onClick={handleCreateBranch} disabled={!branchName.trim()}>
                Create
              </button>
              <button onClick={handleCancelBranch}>Cancel</button>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="message-list">
      {displayItems.length === 0 ? (
        <div className="empty-messages">
          <p>No messages yet. Start a conversation!</p>
        </div>
      ) : (
        <div className="messages">
          {displayItems.map((item) => renderItem(item))}
          {streaming && (
            <div className="message message-assistant">
              <div className="message-header">
                <span className="message-role">assistant</span>
                <span className="streaming-indicator">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
