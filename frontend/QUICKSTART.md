# Soapy Frontend - Quick Start Guide

## Installation

```bash
cd frontend
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

Frontend will be available at: http://localhost:5173

## First Time Setup

### 1. Configure API Settings

1. Click the ⚙️ settings icon in the top-right header
2. Enter your API key (or use a test key)
3. Verify base URL is set to `http://localhost:3000`
4. Select format: **OpenAI** (recommended for testing)
5. Select protocol: **REST** (recommended for testing)
6. Click **Save Settings**

### 2. Create Your First Conversation

1. Click **New Conversation** in the sidebar
2. A new conversation will be created (e.g., "conv-1")
3. Click on the conversation to select it

### 3. Send a Message

1. In the **Messages** tab, type a message in the input box
2. Click **Send** or press **Enter**
3. Watch the AI response stream in real-time

## Feature Walkthroughs

### Working with Branches

**Create a Branch**:
1. Go to **Branches** tab
2. Click **Create New Branch**
3. Enter branch name (e.g., "alternative-path")
4. Select message number to branch from
5. Click **Create**

**Switch Branches**:
1. Use the branch dropdown in conversation header
2. Select different branch
3. Messages update to show branch history

### Uploading Files

**Drag and Drop**:
1. Go to **Files** tab
2. Drag a file (image, PDF, etc.) to the upload zone
3. Wait for upload confirmation
4. File appears in list with metadata

**Click to Upload**:
1. Go to **Files** tab
2. Click **Choose File** button
3. Select file from dialog
4. File uploads automatically

**Download Files**:
1. View file list in **Files** tab
2. Click **Download** button next to file
3. File downloads to browser

### Customizing Branding

1. Go to **Branding** tab
2. Enter HTTPS logo URL (e.g., `https://example.com/logo.png`)
3. Click color pickers to choose colors:
   - Primary color (main theme)
   - Secondary color (accents)
   - Accent color (highlights)
4. Enter footer text (max 500 chars)
5. View live preview on right
6. Click **Save Branding**

### Viewing Tool Calls

1. Go to **Tools** tab
2. View list of tool calls made by AI
3. Expand tool call to see:
   - Tool name
   - Parameters (JSON)
   - Execution result
   - Success/failure status
   - Retry count

### Switching Formats

**OpenAI Format**:
```json
{
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi!"}
  ]
}
```

**Anthropic Format**:
```json
{
  "messages": [
    {"role": "user", "content": [{"type": "text", "text": "Hello"}]},
    {"role": "assistant", "content": [{"type": "text", "text": "Hi!"}]}
  ]
}
```

**SOAP Format**:
```xml
<soap:Envelope>
  <soap:Body>
    <GetConversationResponse>
      <messages>...</messages>
    </GetConversationResponse>
  </soap:Body>
</soap:Envelope>
```

## Common Tasks

### Task 1: Compare Conversation Branches

1. Create conversation and send 3 messages
2. Create branch "branch-A" from message 2
3. Send different message on branch-A
4. Switch back to main branch
5. Send different message on main
6. Compare message histories

### Task 2: Upload and Reference Files

1. Upload image to Files tab
2. Go to Messages tab
3. Send message: "Please analyze this image: files/screenshot.png"
4. AI can reference the uploaded file

### Task 3: Monitor Tool Execution

1. Send message that triggers tool call
2. Go to Tools tab
3. Watch tool call appear
4. View parameters sent to tool
5. View result returned
6. Check success status

### Task 4: Test Different AI Providers

1. Settings → Format → OpenAI
2. Send message, view response
3. Settings → Format → Anthropic
4. Send message, view different format
5. Compare response structures

## Keyboard Shortcuts

- `Enter` - Send message (in input field)
- `Shift + Enter` - New line (in input field)
- `Esc` - Close modal/dialog
- `Tab` - Navigate between fields

## Troubleshooting

### Backend Connection Error

**Problem**: "Failed to fetch" or "Network error"

**Solution**:
1. Verify backend is running on port 3000
2. Check backend console for errors
3. Verify CORS is configured
4. Check API key is correct

### No Conversations Appear

**Problem**: Sidebar is empty

**Solution**:
1. Click "New Conversation" to create one
2. Check backend logs for errors
3. Verify API key has permissions

### File Upload Fails

**Problem**: Upload returns error

**Solution**:
1. Check file size (max 10MB)
2. Verify file type is supported
3. Check backend storage permissions
4. View network tab for error details

### Streaming Doesn't Work

**Problem**: Messages don't stream

**Solution**:
1. Verify SSE endpoint is accessible
2. Check browser console for errors
3. Ensure backend streaming is enabled
4. Try switching to different browser

### Branding Won't Save

**Problem**: Colors/logo won't persist

**Solution**:
1. Verify logo URL is HTTPS
2. Check color format is hex (#RRGGBB)
3. Ensure footer text < 500 chars
4. Check validation errors

## Development Tips

### Hot Module Replacement

Vite provides instant HMR:
- Edit component → See changes immediately
- No page reload needed
- State preserved during edits

### Component Development

Edit files in `src/components/`:
```
src/components/
├── Header.tsx
├── ConversationList.tsx
├── ConversationView.tsx
├── MessageList.tsx
├── MessageInput.tsx
├── BranchManager.tsx
├── FileUploader.tsx
├── BrandingEditor.tsx
├── ToolCallView.tsx
└── ApiSettings.tsx
```

### Style Customization

Edit CSS variables in `src/index.css`:
```css
:root {
  --primary: #3b82f6;      /* Change primary color */
  --secondary: #10b981;    /* Change secondary color */
  --radius: 0.5rem;        /* Change border radius */
}
```

### API Client Extension

Add methods to `src/services/RestClient.ts`:
```typescript
async newMethod(id: string): Promise<Data> {
  const response = await this.fetch(`/v1/chat/${id}/custom`);
  return response.json();
}
```

## Production Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Deploy `dist/` directory to static hosting:
- Netlify
- Vercel
- AWS S3
- GitHub Pages

## Environment Configuration

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_DEFAULT_FORMAT=openai
VITE_DEFAULT_PROTOCOL=rest
```

Access in code:
```typescript
const baseUrl = import.meta.env.VITE_API_BASE_URL;
```

## Testing Checklist

- [ ] Create conversation
- [ ] Send message
- [ ] View streaming response
- [ ] Create branch
- [ ] Switch branches
- [ ] Upload file
- [ ] Download file
- [ ] Edit branding
- [ ] View tool calls
- [ ] Switch formats
- [ ] Switch protocols
- [ ] Configure API settings

## Next Steps

1. **Explore the Features**: Try all 5 tabs
2. **Test Branching**: Create multiple branches
3. **Upload Files**: Test different file types
4. **Customize Branding**: Make it your own
5. **Monitor Tools**: Watch AI tool execution
6. **Switch Formats**: Compare OpenAI vs Anthropic

## Support

- Check `README.md` for architecture details
- Check `FEATURES.md` for feature documentation
- View component source code for implementation
- Check browser console for runtime errors
- Check backend logs for API errors

Enjoy using Soapy! 🧼
