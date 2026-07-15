<p align="center">
  <a href="https://github.com/pranavajy/burro">
    <img alt="Burro" src="./image-2.png" width="300">
  </a>
</p>

<p align="center">
  A visual AI workspace for exploring questions, branching into ideas, and keeping evidence attached.
</p>

<p align="center">
  <a href="LICENSE.md"><img src="https://img.shields.io/github/license/pranavajy/burro?style=flat-square&color=8b5cf6" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/React-19-18181b?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/tldraw-5-18181b?style=flat-square" alt="tldraw 5">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-f38020?style=flat-square&logo=cloudflare" alt="Cloudflare Workers">
</p>

---

Burro turns linear AI conversations into spatial maps of understanding. Start with a question, branch from any answer or highlighted concept, inspect the sources behind important claims, and keep every useful path visible on an infinite canvas.

## Product preview

<p align="center">
  <img src="./ui_screenshots/landing-canvas-overview.png" alt="A branching Burro research canvas" width="100%">
</p>

<p align="center">
  <img src="./ui_screenshots/landing-sources-detail.png" alt="A grounded Burro answer with sources expanded" width="49%">
  <img src="./ui_screenshots/landing-empty-state.png" alt="The Burro new canvas experience" width="49%">
</p>

## What Burro does

- **Branching conversations** — Follow up from any completed answer while preserving the full path of context.
- **Multi-AI support** — Continue with OpenAI, Claude, Gemini, Ollama, Burro’s hosted trial, or any OpenAI-compatible agent.
- **Guided provider onboarding** — Provider-specific setup explains the API key, model ID, endpoint, and local runtime requirements before entering the canvas.
- **Web-grounded responses** — Gemini Google Search grounding provides inline citation markers and source metadata when available.
- **Evidence inspection** — Expand a compact source section or open connected source cards for important claims.
- **Concept deep dives** — Click underlined concepts to generate focused child branches automatically.
- **Visual research cards** — Relevant reference images appear as interactive, previewable photo stacks.
- **Structured layouts** — Conversation trees flow left-to-right and can be tidied automatically.
- **Compact mode** — Collapse completed cards into title-only nodes, then expand an individual card on demand.
- **Persistent canvases** — Local canvas history includes visual thumbnails, search, and recently updated ordering.
- **Draft-aware history** — Empty new canvases are discarded when you navigate away instead of becoming stray “Untitled” entries.
- **Canvas tools** — Grab, select, draw, add shapes, highlight, frame, and customize the workspace using the compact dock.

## Experience

### Start cleanly

First-time users choose how Burro should think: start on the hosted trial, bring an OpenAI, Anthropic, or Google API key, connect Ollama, or provide a compatible custom endpoint. New canvases then open with a focused composer and prompt starters.

### Bring your own AI

Provider settings remain available from the canvas toolbar, so changing models does not affect saved canvases. API keys are kept only for the current browser-tab session. OpenAI, Claude, and Gemini requests pass through Burro’s Worker without storing the key; Ollama and custom OpenAI-compatible requests go directly from the browser to the configured endpoint.

### Explore naturally

Hover over a completed card and choose **Ask follow up**, or select an underlined concept to create a deep-dive branch. Burro carries the relevant parent conversation into the new request.

### Verify important claims

Grounded responses can include citation markers and a centered **View sources** control. Source cards use a secondary dashed connection style so evidence remains visually distinct from the conversation itself.

## Tech stack

| Layer | Technology |
| --- | --- |
| UI | React 19, TypeScript, Tailwind CSS v4 |
| Canvas | tldraw 5 with custom shapes, bindings, ports, and overlays |
| Motion | Framer Motion |
| Search UI | cmdk |
| AI | AI SDK with OpenAI, Anthropic Claude, and Google Gemini providers |
| Local/custom AI | Ollama and OpenAI-compatible chat-completions endpoints |
| Grounding | Gemini Google Search tool when using Gemini |
| Runtime | Cloudflare Workers |
| Build | Vite 8 |

## Project structure

```text
client/
├── App.tsx                       # Canvas app, sidebar, history, and app chrome
├── LandingPage.tsx               # Public product landing page
├── ai/providerConfig.ts          # Provider defaults and browser-session credentials
├── components/
│   ├── ProviderOnboarding.tsx    # Multi-AI selection and setup guidance
│   └── WorkflowToolbar.tsx
├── connection/                   # Custom connection shapes and bindings
├── nodes/                        # Node utilities, layouts, and creation flows
│   └── types/
│       ├── MessageNode.tsx       # Composer, streaming answer, citations, images
│       └── SourceNode.tsx        # Connected evidence cards
└── ports/                        # Connection-port interaction state

worker/
├── worker.ts                     # Streaming AI and grounding endpoints
└── types.ts                      # Worker environment bindings
```

## Getting started

### Requirements

- Node.js 20 or newer
- npm
- One AI option: the hosted trial, an OpenAI/Claude/Gemini API key, Ollama, or an OpenAI-compatible endpoint

### Installation

```bash
git clone https://github.com/pranavajy/burro.git
cd burro
npm install
```

Start the local development server:

```bash
npm run dev
```

The public landing page is available at `/`. Choose **Open app** or visit `/app`, then select an AI provider in the onboarding flow.

### Hosted free trial

The hosted trial uses a server-side Gemini key supplied by the Burro deployment owner. To enable it in a local or self-hosted deployment, create `.env` in the project root:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key
```

You can create a key in [Google AI Studio](https://aistudio.google.com/apikey).

The trial key is never sent to the browser. If you do not want to offer the trial, users can still connect one of the bring-your-own-key or local options.

## AI providers

| Option | What the user provides | Request path | Grounding |
| --- | --- | --- | --- |
| Free trial | Nothing | Burro Worker using the deployment owner’s Gemini key | Google Search |
| OpenAI | API key and model ID | Burro Worker | No |
| Claude | Anthropic API key and model ID | Burro Worker | No |
| Gemini | Google AI API key and model ID | Burro Worker | Google Search |
| Ollama | Local/remote `/v1` URL and model ID | Browser → Ollama | No |
| Any agent | OpenAI-compatible base URL, model/agent ID, and optional bearer token | Browser → custom endpoint | Provider-dependent |

Provider names, model IDs, endpoints, and non-secret preferences persist locally. API keys and bearer tokens use `sessionStorage`, so they are cleared when the browser-tab session ends and are never stored by Burro’s Worker.

### Ollama

Start Ollama and install a model:

```shell
ollama serve
ollama pull gpt-oss:20b
curl http://localhost:11434/v1/models
```

Then select **Ollama** in Burro and use:

```text
Base URL: http://localhost:11434/v1
Model ID: gpt-oss:20b
```

Opening `http://localhost:11434/v1/` directly may show “page not found”; it is an API prefix, not a webpage. Test `/v1/models` instead. Burro sends chats to `/v1/chat/completions`.

When Burro is served from an origin Ollama does not allow by default, add that exact origin and restart Ollama:

```shell
OLLAMA_ORIGINS="http://localhost:5173" ollama serve
```

For a hosted HTTPS Burro deployment, expose Ollama through a trusted HTTPS endpoint or tunnel and use that endpoint as the base URL. Do not expose an unauthenticated Ollama server publicly.

### Custom agents

The **Any agent** option expects an OpenAI-compatible streaming chat-completions API:

- Base URL ending at the API prefix, such as `https://agent.example.com/v1`
- A model or agent identifier accepted by the endpoint
- An optional bearer token
- Browser CORS access for the Burro origin

Burro posts to `{baseUrl}/chat/completions` and reads OpenAI-compatible server-sent streaming events.

## Scripts

```bash
npm run dev       # Start Vite and the local Cloudflare Worker environment
npm run build     # Type-check and create a production build
npm run preview   # Preview the production build locally
```

## How responses work

1. Burro walks the selected node’s parent connections and reconstructs the relevant message history.
2. The client loads the chosen provider configuration for the current browser session.
3. OpenAI, Claude, Gemini, and trial requests stream through the Worker; Ollama and custom compatible requests stream directly to their configured endpoint.
4. Text is streamed into the card while relevant images are fetched in parallel.
5. When Gemini grounding is available, its metadata is normalized into sources and citation ranges for the canvas UI.

The response prompt is intentionally optimized for compact visual cards: it targets 70–100 words, preserves essential context, and marks useful concepts for further exploration.

## Extending Burro

### Add a node type

1. Create its schema, definition, and component in `client/nodes/types/`.
2. Register it in `client/nodes/nodeTypes.tsx`.
3. Define its dimensions and ports.
4. Add any creation and layout behavior required by the conversation tree.

### Change the model or provider

Use **AI provider settings** in the canvas toolbar to switch between supported providers or change the model ID. To add another first-class provider, extend `client/ai/providerConfig.ts`, `client/components/ProviderOnboarding.tsx`, and the provider resolver in `worker/worker.ts`. If it exposes grounding metadata, adapt the evidence normalization in the streaming handler as well.

## Deployment

Build the client and Worker bundle:

```bash
npm run build
```

Deploy with Wrangler after configuring your Cloudflare account and routes. Add the Gemini secret if the deployment should offer the hosted trial:

```bash
npx wrangler secret put GOOGLE_GENERATIVE_AI_API_KEY
npx wrangler deploy
```

The asset configuration uses single-page application fallback, so both `/` and `/app` resolve correctly.

## License

[MIT](LICENSE.md)
