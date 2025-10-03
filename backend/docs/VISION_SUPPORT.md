# Vision Support in Format Converter

The format-converter library now supports image attachments (vision) when converting between formats.

## Features

### OpenAI Format
- Converts messages with image attachments to OpenAI's vision format
- Uses content array with `text` and `image_url` blocks
- Supports base64 data URLs: `data:image/jpeg;base64,...`
- Backward compatible: text-only messages still use simple string content

### Anthropic Format  
- Converts messages with image attachments to Anthropic's vision format
- Uses content blocks with `text` and `image` types
- Image blocks include base64 source with media type
- Only includes images that have base64 data

## Usage

### CLI Examples

Convert internal format with images to OpenAI format:
```bash
cat messages.json | soapy convert to-openai
```

Convert internal format with images to Anthropic format:
```bash
cat messages.json | soapy convert to-anthropic
```

### Input Format

Internal message format with image attachment:
```json
{
  "messages": [
    {
      "sequenceNumber": 1,
      "role": "user",
      "content": "What is in this image?",
      "timestamp": "2024-01-01T00:00:00Z",
      "commitHash": "abc123",
      "attachments": [
        {
          "filename": "photo.jpg",
          "contentType": "image/jpeg",
          "size": 1024,
          "data": "iVBORw0KGgoAAAA..."
        }
      ]
    }
  ],
  "toolCalls": [],
  "toolResults": []
}
```

### OpenAI Output

```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,iVBORw0KGgoAAAA..."
          }
        }
      ]
    }
  ]
}
```

### Anthropic Output

```json
{
  "model": "claude-3-opus-20240229",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is in this image?"
        },
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": "iVBORw0KGgoAAAA..."
          }
        }
      ]
    }
  ],
  "max_tokens": 4096
}
```

## Implementation Details

### OpenAI Format Conversion
- **Interface**: `OpenAIMessage.content` can be `string | null | Array<{type: 'text' | 'image_url', ...}>`
- **Logic**: 
  - If message has image attachments, use array format
  - First element is always text content
  - Subsequent elements are image_url blocks for each image
  - Non-image attachments are ignored
- **Data URLs**: Images with `data` field become `data:${contentType};base64,${data}`
- **Path URLs**: Images with only `path` field use the path as URL

### Anthropic Format Conversion
- **Interface**: `AnthropicMessage.content` is always an array of content blocks
- **Image block type**: `{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }`
- **Logic**:
  - Always starts with text content block
  - Adds image blocks for attachments with `contentType.startsWith('image/')` AND `data` field
  - Images without base64 data are skipped (Anthropic requires base64)
- **Media types**: Preserves original `contentType` (e.g., `image/jpeg`, `image/png`)

## Backward Compatibility

- Text-only messages in OpenAI format still use simple string content
- All existing tests pass without modification
- Tool calls work alongside vision content
- Format converter is backward compatible with messages that don't have attachments

## Testing

Vision support is validated by 12 comprehensive unit tests:
- Text-only message conversion (OpenAI & Anthropic)
- Single image message conversion
- Multiple images in one message
- Non-image attachment handling
- Messages with tool calls and images
- Round-trip conversion preservation
- Edge cases (missing data, empty attachments)

All tests passing ✅
