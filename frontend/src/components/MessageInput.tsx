import { useState, useRef, KeyboardEvent } from 'react';
import './MessageInput.css';

interface MessageInputProps {
  onSend: (content: string, files?: File[]) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = 'file-input-' + Math.random().toString(36).substr(2, 9);

  const handleSend = () => {
    if (!content.trim() && files.length === 0) return;
    onSend(content, files.length > 0 ? files : undefined);
    setContent('');
    setFiles([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleAttachClick = () => {
    // Try both ref and direct DOM query
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      const input = document.getElementById(fileInputId) as HTMLInputElement;
      input?.click();
    }
  };

  return (
    <div className="message-input">
      {files.length > 0 && (
        <div className="attached-files">
          {files.map((file, index) => (
            <div key={index} className="attached-file">
              <span className="file-name">{file.name}</span>
              <button
                type="button"
                className="remove-file"
                onClick={() => removeFile(index)}
                aria-label="Remove file"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="input-area">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Shift+Enter for new line)"
          disabled={disabled}
          rows={3}
        />
        <div className="input-actions">
          <input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="secondary small"
            onClick={handleAttachClick}
            disabled={disabled}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8.5 1.5A1.5 1.5 0 007 3v9a1.5 1.5 0 003 0V5a.5.5 0 00-1 0v7a.5.5 0 01-1 0V3a.5.5 0 011 0v8.5a.5.5 0 001 0V3A1.5 1.5 0 008.5 1.5z" />
            </svg>
            Attach
          </button>
          <button onClick={handleSend} disabled={disabled || (!content.trim() && files.length === 0)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M15.854.146a.5.5 0 01.11.54l-5.819 14.547a.75.75 0 01-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 01.124-1.33L15.314.037a.5.5 0 01.54.11z" />
            </svg>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
