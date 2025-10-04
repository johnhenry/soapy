import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className={cn(
      "border-t bg-background p-4",
      "border-border"
    )}>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {files.map((file, index) => (
            <Badge key={index} variant="secondary" className="gap-2 pr-1">
              <span className="text-xs">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeFile(index)}
                aria-label="Remove file"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Shift+Enter for new line)"
          disabled={disabled}
          rows={3}
          className="resize-y min-h-[60px] max-h-[200px]"
        />
        <div className="flex gap-2 justify-end">
          <input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAttachClick}
            disabled={disabled}
          >
            <Paperclip className="h-4 w-4" />
            Attach
          </Button>
          <Button 
            size="sm"
            onClick={handleSend} 
            disabled={disabled || (!content.trim() && files.length === 0)}
          >
            <Send className="h-4 w-4" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
