# Soapy Frontend - Full-Featured AI Conversation Management

A comprehensive React + TypeScript frontend for the Soapy hybrid SOAP/REST AI API system.

## Features

### 🎯 Core Functionality

- **Conversation Management**: Create, view, and manage AI conversations with Git-backed storage
- **Multi-Format Support**: Switch between OpenAI, Anthropic, and SOAP formats
- **Dual Protocol**: REST and SOAP API support
- **Real-time Streaming**: SSE-based streaming for AI responses
- **Authentication**: API key management with secure storage

### 🌿 Git Operations

- **Branching**: Create conversation branches from any message point
- **Branch Switching**: Navigate between different conversation paths
- **Commit History**: View Git commit hashes for audit trails
- **Deterministic Replay**: Explore alternative conversation outcomes

### 📁 File Management

- **Drag-and-Drop Upload**: Easy file attachment to conversations
- **Multiple Formats**: Support for images, PDFs, text files, JSON, CSV
- **Download Support**: Retrieve uploaded files
- **SHA-256 Hashing**: File integrity verification
- **Git Storage**: Files versioned with conversation history

### 🎨 Branding & Customization

- **Logo Configuration**: Set custom logo URLs
- **Color Schemes**: Primary, secondary, and accent colors
- **Footer Text**: Custom attribution text
- **Live Preview**: See branding changes in real-time
- **Version History**: Branding changes tracked in Git

### 🛠️ Tool Support

- **Tool Call Visualization**: Display AI tool/function calls
- **Parameter Display**: JSON formatting for tool parameters
- **Result Tracking**: Show tool execution results
- **Status Indicators**: Success/failure states
- **Retry Counts**: Track automatic retry attempts

## Architecture

### Components

```
components/
├── Header.tsx              # Top navigation bar
├── ConversationList.tsx    # Sidebar conversation list
├── ConversationView.tsx    # Main conversation display with tabs
├── MessageList.tsx         # Message bubble display
├── MessageInput.tsx        # Message composition
├── BranchManager.tsx       # Branch creation/switching
├── FileUploader.tsx        # File upload/download UI
├── BrandingEditor.tsx      # Branding configuration
├── ToolCallView.tsx        # Tool execution display
└── ApiSettings.tsx         # API configuration modal
```

### Services

```
services/
└── RestClient.ts          # REST API client with all endpoints
```

### Context

```
context/
└── ApiContext.tsx         # Global API configuration state
```

### Types

```
types/
└── index.ts               # TypeScript interfaces for all entities
```

## Component Details

### ConversationView

Tabbed interface with:
- **Messages**: Chronological message display with streaming
- **Branches**: Branch management and navigation
- **Files**: File upload/download interface
- **Tools**: Tool call and result visualization
- **Branding**: Conversation branding editor

### MessageList

Features:
- Role-based styling (user/assistant/system)
- Timestamp display
- Commit hash display (for audit)
- Streaming indicators
- Auto-scroll to latest message
- JSON formatting for structured content

### BranchManager

Capabilities:
- List all branches in conversation
- Create new branch from specific message
- Switch active branch
- View branch metadata (creator, creation time, message count)
- Branch name validation

### FileUploader

Features:
- Drag-and-drop zone
- File size validation (10MB limit)
- Content type filtering (images, PDFs, text, JSON, CSV)
- Upload progress indication
- File list with metadata (size, type, hash, upload time)
- Download functionality
- Base64 encoding for API transport

### BrandingEditor

Controls:
- Logo URL input with HTTPS validation
- Color pickers for primary/secondary/accent colors
- Hex color validation (#RGB or #RRGGBB)
- Footer text editor (500 char limit)
- Live preview panel
- Save/reset functionality

## API Integration

### REST Client Methods

**Conversations**:
- `getConversation(id, format)` - Retrieve conversation
- `getMessages(id, format)` - Get all messages
- `sendMessage(id, role, content)` - Submit message

**Branches**:
- `createBranch(id, name, fromMessage)` - Create branch
- `getBranches(id)` - List all branches

**Files**:
- `uploadFile(id, file)` - Upload file
- `listFiles(id)` - List uploaded files
- `downloadFile(id, filename)` - Download file

**Tools**:
- `submitToolCall(id, name, params)` - Submit tool call
- `submitToolResult(id, ref, result, status)` - Submit result

**Branding**:
- `getBranding(id)` - Get branding config

**Streaming**:
- `streamMessages(id, onMessage, onError)` - SSE streaming

## Format Switching

Supports three output formats:
1. **OpenAI**: Compatible with OpenAI chat completion format
2. **Anthropic**: Compatible with Anthropic messages format
3. **SOAP**: XML-based SOAP envelope format

Switch formats in API Settings modal.

## Protocol Support

### REST (Default)
- JSON-based API
- Standard HTTP methods
- SSE for streaming
- Modern web-friendly

### SOAP
- XML-based API
- WSDL contract available at `/soap?wsdl`
- Enterprise integration support
- Formal operation definitions

## State Management

Uses React Context API for:
- API key storage (localStorage)
- Base URL configuration
- Format preference
- Protocol selection

## Styling

CSS custom properties for theming:
- `--primary`: Main brand color (#3b82f6)
- `--secondary`: Secondary color (#10b981)
- `--danger`: Error/delete color (#ef4444)
- `--warning`: Warning color (#f59e0b)
- `--bg-*`: Background colors
- `--text-*`: Text colors
- `--border`: Border color
- `--radius`: Border radius (0.5rem)

## Usage

### Development

```bash
npm install
npm run dev
```

Frontend runs on http://localhost:5173 (Vite default)

Backend proxy configured for:
- `/v1/*` → `http://localhost:3000`
- `/soap` → `http://localhost:3000`

### Production Build

```bash
npm run build
npm run preview
```

### Configuration

1. Click settings icon in header
2. Enter API key
3. Select format (OpenAI/Anthropic/SOAP)
4. Select protocol (REST/SOAP)
5. Save settings

## Key Features Implemented

### ✅ All Backend Features Supported

- [x] REST API endpoints
- [x] SOAP API endpoints
- [x] Multiple output formats
- [x] Conversation branching
- [x] File attachments
- [x] Tool calls and results
- [x] Branding configuration
- [x] SSE streaming
- [x] Authentication

### ✅ Advanced UI Features

- [x] Tabbed conversation interface
- [x] Branch visualization
- [x] File drag-and-drop
- [x] Color pickers
- [x] JSON formatters
- [x] Loading states
- [x] Error handling
- [x] Modal dialogs
- [x] Responsive layout
- [x] Keyboard shortcuts

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Dependencies

- React 18.2
- TypeScript 5.3
- Vite 5.0

No additional UI libraries - pure React + CSS.

## Future Enhancements

Potential additions:
- WebSocket streaming (in addition to SSE)
- Dark mode theme
- Conversation export (JSON/Markdown)
- Search functionality
- Conversation tags/labels
- Collaborative editing
- Git commit history viewer
- Diff view for branches

## Architecture Decisions

- **Pure React**: No heavy UI frameworks for simplicity
- **Type Safety**: Full TypeScript coverage
- **Context API**: Lightweight state management
- **CSS Variables**: Theme consistency
- **REST First**: SOAP support via same client
- **Modular Components**: Single responsibility principle
- **Error Boundaries**: Graceful error handling
