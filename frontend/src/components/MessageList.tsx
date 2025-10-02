import { useEffect, useRef, useState } from 'react';
import type { Message } from '../types';
import './MessageList.css';

interface MessageListProps {
  messages: Message[];
  streaming?: boolean;
  onBranchFromMessage?: (sequenceNumber: number, branchName: string) => Promise<void>;
}

export function MessageList({ messages, streaming, onBranchFromMessage }: MessageListProps) {
  const [branchingFrom, setBranchingFrom] = useState<number | null>(null);
  const [branchName, setBranchName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="empty-messages">
          <p>No messages yet. Start a conversation!</p>
        </div>
      ) : (
        <div className="messages">
          {messages.map((message) => (
            <div key={message.sequenceNumber} className={`message message-${message.role}`}>
              <div className="message-header">
                <span className="message-role">{message.role.toUpperCase()}</span>
                <span className="message-meta">
                  {formatTimestamp(message.timestamp)}
                  {message.commitHash && (
                    <span className="commit-hash" title={message.commitHash}>
                      {message.commitHash.substring(0, 7)}
                    </span>
                  )}
                </span>
                {onBranchFromMessage && (
                  <button
                    className="branch-btn"
                    onClick={() => handleBranchClick(message.sequenceNumber)}
                    title="Branch from this message"
                  >
                    🌿
                  </button>
                )}
              </div>
              <div className="message-content">{message.content}</div>
              {message.aiProvider && (
                <div className="message-footer">
                  <span className="provider-badge">
                    {message.aiProvider}
                    {message.model && ` (${message.model})`}
                  </span>
                </div>
              )}
              {branchingFrom === message.sequenceNumber && (
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
          ))}
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
