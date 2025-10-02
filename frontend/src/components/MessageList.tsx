import { useEffect, useRef } from 'react';
import type { Message } from '../types';
import './MessageList.css';

interface MessageListProps {
  messages: Message[];
  streaming?: boolean;
}

export function MessageList({ messages, streaming }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
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
                <span className="message-role">{message.role}</span>
                <span className="message-meta">
                  {formatTimestamp(message.timestamp)}
                  {message.commitHash && (
                    <span className="commit-hash" title={message.commitHash}>
                      {message.commitHash.substring(0, 7)}
                    </span>
                  )}
                </span>
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
