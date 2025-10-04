import { useEffect, useRef, useState } from 'react';
import { useApi } from '../context/ApiContext';
import type { Message, ConversationItem } from '../types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  GitBranch, 
  User, 
  Bot, 
  FileText, 
  Code, 
  CheckCircle2, 
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
      const isUser = item.role === 'user';
      const isAssistant = item.role === 'assistant';
      const isSystem = item.role === 'system';
      
      return (
        <Card 
          key={item.sequenceNumber} 
          className={cn(
            "max-w-[80%]",
            isUser && "ml-auto bg-primary text-primary-foreground border-primary",
            isAssistant && "mr-auto",
            isSystem && "mx-auto max-w-[90%] bg-muted"
          )}
        >
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {isUser && <User className="h-3 w-3" />}
                {isAssistant && <Bot className="h-3 w-3" />}
                <span className="font-semibold uppercase tracking-wide">
                  {item.role}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("opacity-70", isUser && "text-primary-foreground")}>
                  {formatTimestamp(item.timestamp)}
                </span>
                {item.commitHash && (
                  <Badge 
                    variant={isUser ? "secondary" : "outline"} 
                    className={cn(
                      "font-mono text-xs",
                      isUser && "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
                    )}
                    title={item.commitHash}
                  >
                    {item.commitHash.substring(0, 7)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 whitespace-pre-wrap break-words leading-relaxed">
                {item.content}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {branchesBySequence[item.sequenceNumber] && branchesBySequence[item.sequenceNumber].length > 0 && onBranchSwitch && (
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3 opacity-70" title={`${branchesBySequence[item.sequenceNumber].length} branch(es) diverge from here`} />
                    <select
                      className={cn(
                        "text-xs px-2 py-1 rounded border cursor-pointer max-w-[150px] transition-colors",
                        isUser 
                          ? "bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/30" 
                          : "bg-background border-border hover:bg-muted"
                      )}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 opacity-60 hover:opacity-100",
                      isUser && "text-primary-foreground hover:bg-primary-foreground/20"
                    )}
                    onClick={() => handleBranchClick(item.sequenceNumber)}
                    title="Create new branch from this message"
                  >
                    <GitBranch className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {item.attachments && item.attachments.length > 0 && conversationId && (
              <div className={cn(
                "pt-3 mt-3 space-y-2 border-t",
                isUser ? "border-primary-foreground/20" : "border-border"
              )}>
                {item.attachments.map((attachment, idx) => (
                  <a
                    key={idx}
                    href={`${config.baseUrl}/v1/chat/${conversationId}/files/${attachment.filename}`}
                    download={attachment.filename}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors",
                      isUser 
                        ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30" 
                        : "bg-muted hover:bg-muted/80"
                    )}
                    title={`${attachment.filename} (${(attachment.size / 1024).toFixed(2)} KB)`}
                  >
                    <FileText className="h-4 w-4" />
                    {attachment.filename}
                  </a>
                ))}
              </div>
            )}

            {item.aiProvider && (
              <div className="pt-2">
                <Badge variant="secondary" className="text-xs">
                  {item.aiProvider}
                  {item.model && ` (${item.model})`}
                </Badge>
              </div>
            )}

            {branchingFrom === item.sequenceNumber && (
              <div className={cn(
                "mt-3 p-3 rounded border space-y-2",
                isUser 
                  ? "bg-primary-foreground/10 border-primary-foreground/20" 
                  : "bg-muted/50 border-border"
              )}>
                <Input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Enter branch name..."
                  autoFocus
                  className={cn(
                    "text-sm",
                    isUser && "bg-background/90 border-primary-foreground/30"
                  )}
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={handleCreateBranch} 
                    disabled={!branchName.trim()}
                    className="flex-1"
                  >
                    Create
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline" 
                    onClick={handleCancelBranch}
                    className={cn(
                      "flex-1",
                      isUser && "border-primary-foreground/30 hover:bg-primary-foreground/20"
                    )}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      );
    }

    if (item.itemType === 'tool_call') {
      return (
        <Card 
          key={item.sequenceNumber} 
          className="max-w-[70%] mr-auto border-l-4 border-l-amber-500"
        >
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-amber-500" />
                <span className="font-semibold uppercase tracking-wide text-amber-600">
                  Tool Call
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {formatTimestamp(item.requestedAt)}
                </span>
                {item.commitHash && (
                  <Badge variant="outline" className="font-mono text-xs" title={item.commitHash}>
                    {item.commitHash.substring(0, 7)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <div className="font-semibold text-amber-600">{item.toolName}</div>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(item.parameters, null, 2)}
                </pre>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {branchesBySequence[item.sequenceNumber] && branchesBySequence[item.sequenceNumber].length > 0 && onBranchSwitch && (
                  <select
                    className="text-xs px-2 py-1 rounded border bg-background border-border hover:bg-muted cursor-pointer"
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-60 hover:opacity-100"
                    onClick={() => handleBranchClick(item.sequenceNumber)}
                    title="Branch from this point"
                  >
                    <GitBranch className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {branchingFrom === item.sequenceNumber && (
              <div className="mt-3 p-3 rounded border bg-muted/50 border-border space-y-2">
                <Input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Enter branch name..."
                  autoFocus
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={handleCreateBranch} 
                    disabled={!branchName.trim()}
                    className="flex-1"
                  >
                    Create
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline" 
                    onClick={handleCancelBranch}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      );
    }

    if (item.itemType === 'tool_result') {
      const isSuccess = item.status === 'success';
      const statusColor = isSuccess ? 'text-green-600' : 'text-destructive';
      const borderColor = isSuccess ? 'border-l-green-500' : 'border-l-destructive';
      
      return (
        <Card 
          key={item.sequenceNumber} 
          className={cn("max-w-[70%] mr-auto border-l-4", borderColor)}
        >
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Code className={cn("h-4 w-4", statusColor)} />
                <span className={cn("font-semibold uppercase tracking-wide", statusColor)}>
                  Tool Result
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {formatTimestamp(item.executedAt)}
                </span>
                <Badge 
                  variant={isSuccess ? "default" : "destructive"}
                  className="text-xs flex items-center gap-1"
                >
                  {isSuccess ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {item.status}
                </Badge>
                {item.commitHash && (
                  <Badge variant="outline" className="font-mono text-xs" title={item.commitHash}>
                    {item.commitHash.substring(0, 7)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(item.result, null, 2)}
                </pre>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {branchesBySequence[item.sequenceNumber] && branchesBySequence[item.sequenceNumber].length > 0 && onBranchSwitch && (
                  <select
                    className="text-xs px-2 py-1 rounded border bg-background border-border hover:bg-muted cursor-pointer"
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-60 hover:opacity-100"
                    onClick={() => handleBranchClick(item.sequenceNumber)}
                    title="Branch from this point"
                  >
                    <GitBranch className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {branchingFrom === item.sequenceNumber && (
              <div className="mt-3 p-3 rounded border bg-muted/50 border-border space-y-2">
                <Input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Enter branch name..."
                  autoFocus
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={handleCreateBranch} 
                    disabled={!branchName.trim()}
                    className="flex-1"
                  >
                    Create
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline" 
                    onClick={handleCancelBranch}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {displayItems.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>No messages yet. Start a conversation!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {displayItems.map((item) => renderItem(item))}
          {streaming && (
            <Card className="max-w-[80%] mr-auto">
              <div className="p-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <Bot className="h-3 w-3" />
                    <span className="font-semibold uppercase tracking-wide">assistant</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse delay-75" style={{ animationDelay: '0.15s' }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse delay-150" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
            </Card>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
