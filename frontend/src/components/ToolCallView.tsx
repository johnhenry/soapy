import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolCall, ToolResult } from '../types';

interface ToolCallViewProps {
  toolCall: ToolCall;
  toolResult?: ToolResult;
}

export function ToolCallView({ toolCall, toolResult }: ToolCallViewProps) {
  const formatJson = (obj: Record<string, unknown>) => {
    return JSON.stringify(obj, null, 2);
  };

  const getStatusColor = (status?: 'success' | 'failure') => {
    if (!status) return 'text-muted-foreground';
    return status === 'success' ? 'text-green-600' : 'text-destructive';
  };

  const getStatusIcon = (status?: 'success' | 'failure') => {
    if (!status) return <Clock className="h-4 w-4" />;
    if (status === 'success') return <CheckCircle2 className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  const getStatusText = (status?: 'success' | 'failure') => {
    if (!status) return 'Pending';
    return status === 'success' ? 'Success' : 'Failed';
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">{toolCall.toolName}</CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              #{toolCall.sequenceNumber}
            </Badge>
          </div>
          <div className={cn("flex items-center gap-1.5", getStatusColor(toolResult?.status))}>
            {getStatusIcon(toolResult?.status)}
            <span className="text-sm font-medium">{getStatusText(toolResult?.status)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-semibold">Parameters</h5>
            <Badge variant="secondary" className="font-mono text-xs" title={toolCall.commitHash}>
              {toolCall.commitHash.substring(0, 7)}
            </Badge>
          </div>
          <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto font-mono">
            {formatJson(toolCall.parameters)}
          </pre>
          <div className="text-xs text-muted-foreground">
            Requested at {new Date(toolCall.requestedAt).toLocaleString()}
          </div>
        </div>

        {toolResult && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold">Result</h5>
              <div className="flex items-center gap-2">
                {toolResult.retryCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    Retries: {toolResult.retryCount}
                  </Badge>
                )}
                <Badge variant="secondary" className="font-mono text-xs" title={toolResult.commitHash}>
                  {toolResult.commitHash.substring(0, 7)}
                </Badge>
              </div>
            </div>
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto font-mono">
              {formatJson(toolResult.result)}
            </pre>
            <div className="text-xs text-muted-foreground">
              Executed at {new Date(toolResult.executedAt).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
