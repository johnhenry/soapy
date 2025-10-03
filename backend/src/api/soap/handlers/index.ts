import { soapHandlerRegistry } from './registry.js';
import { CommitMessageHandler } from './CommitMessage.js';
import { GetConversationHandler } from './GetConversation.js';
import { GetCompletionHandler } from './GetCompletion.js';
import { BranchConversationHandler } from './BranchConversation.js';
import { CommitToolCallHandler } from './CommitToolCall.js';
import { CommitToolResultHandler } from './CommitToolResult.js';
import { CommitFileHandler } from './CommitFile.js';
import { GetFileHandler } from './GetFile.js';
import { ListConversationsHandler } from './ListConversations.js';
import { DeleteConversationHandler } from './DeleteConversation.js';
import { ListBranchesHandler } from './ListBranches.js';
import { DeleteBranchHandler } from './DeleteBranch.js';
import { ListFilesHandler } from './ListFiles.js';

// Register all SOAP operation handlers
export function registerSoapHandlers(): void {
  soapHandlerRegistry.register('CommitMessage', CommitMessageHandler);
  soapHandlerRegistry.register('GetConversation', GetConversationHandler);
  soapHandlerRegistry.register('GetCompletion', GetCompletionHandler);
  soapHandlerRegistry.register('BranchConversation', BranchConversationHandler);
  soapHandlerRegistry.register('CommitToolCall', CommitToolCallHandler);
  soapHandlerRegistry.register('CommitToolResult', CommitToolResultHandler);
  soapHandlerRegistry.register('CommitFile', CommitFileHandler);
  soapHandlerRegistry.register('GetFile', GetFileHandler);
  soapHandlerRegistry.register('ListConversations', ListConversationsHandler);
  soapHandlerRegistry.register('DeleteConversation', DeleteConversationHandler);
  soapHandlerRegistry.register('ListBranches', ListBranchesHandler);
  soapHandlerRegistry.register('DeleteBranch', DeleteBranchHandler);
  soapHandlerRegistry.register('ListFiles', ListFilesHandler);
}

export { soapHandlerRegistry };
