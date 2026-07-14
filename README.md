# Burro

A visual branching conversation interface — create interactive AI chat trees on an infinite canvas.

## Features

- **Visual Chat Trees**: Create branching conversation flows on an infinite canvas
- **AI Integration**: Stream responses from AI models with real-time updates
- **Interactive Nodes**: Drag, connect, and organize conversation messages visually
- **Context Awareness**: AI responses consider the entire conversation branch history
- **Image Cards**: Relevant reference images fetched and displayed as a photo stack on each answer
- **Full Stack**: Cloudflare Workers backend with streaming responses

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment setup

Create a `.env` file in the root directory and add your Google Generative API key:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

Get your API key from [Google AI Studio](https://aistudio.google.com/apikey).
You can also switch to a different provider using the [Vercel AI SDK](https://ai-sdk.dev/providers/ai-sdk-providers).

### 3. Start Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see the branching chat interface.

## How to Use

1. **Create Message Nodes**: Click the message icon in the toolbar to add chat nodes
2. **Connect Conversations**: Drag from output ports to input ports to create conversation branches
3. **Send Messages**: Type in any node and click send to get AI responses
4. **Branch Conversations**: Create multiple paths by connecting nodes in different ways
5. **Build Context**: The AI considers all connected previous messages when responding

## Architecture

### Frontend (`/client`)

- **Custom Shapes**: `NodeShapeUtil` for chat message nodes
- **Custom Tools**: Interactive port connections for linking conversations
- **Custom UI**: Workflow-specific toolbar and components
- **Streaming Updates**: Real-time AI response rendering

### Backend (`/worker`)

- **Cloudflare Workers**: Edge computing for global performance
- **AI Integration**: Vercel AI SDK with streaming support
- **API Routes**: Endpoints for chat operations

## Deployment

```bash
# Build the frontend
npm run build

# Deploy to Cloudflare (requires wrangler CLI)
npx wrangler deploy
```

Make sure to set your `GOOGLE_GENERATIVE_AI_API_KEY` in your Cloudflare Workers environment variables.

## Customization

### Adding New Node Types

1. Create a new node definition in `/client/nodes/types/`
2. Add to the `NodeDefinitions` array in `nodeTypes.tsx`
3. Implement required methods: `Component`, `getPorts`, etc.

### Changing AI Providers

Modify `/worker/worker.ts` to use different AI providers supported by the Vercel AI SDK.

