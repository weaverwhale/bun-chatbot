# Bun Chatbot

A full-stack AI chat client built with Bun, React, and shadcn/ui components, featuring streaming responses from multiple AI providers, conversation history, markdown rendering, and custom system prompts.

## Features

- **Multiple AI Providers**: Support for OpenAI, Anthropic Claude, Google Gemini, and LM Studio (local models) via Vercel AI SDK
- **Streaming Responses**: Real-time message streaming as the AI generates responses
- **Markdown Rendering**: Beautiful markdown rendering with syntax highlighting for code blocks
- **Conversation History**: Maintains full conversation context with SQLite storage
- **Model Selection**: Choose from OpenAI, Anthropic, Google, and local LM Studio models
- **System Prompts**: Customize AI behavior with optional system prompts
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS and shadcn/ui
- **Fast Development**: Built with Bun for lightning-fast builds and hot module reloading

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure API Keys

Create a `.env` file in the project root with your API keys:

```bash
# Required for OpenAI models
OPENAI_API_KEY=your-openai-api-key-here

# Optional: For Anthropic Claude models
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Optional: For Google Gemini models
GOOGLE_API_KEY=your-google-api-key-here

# Optional: For LM Studio (local models)
# Default is http://localhost:1234/v1 if not set
LMSTUDIO_BASE_URL=http://localhost:1234/v1
```

Get your API keys from:

- [OpenAI Platform](https://platform.openai.com/api-keys)
- [Anthropic Console](https://console.anthropic.com/)
- [Google AI Studio](https://makersuite.google.com/app/apikey)

#### LM Studio Setup (Optional)

To use local models with LM Studio:

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Download a model in LM Studio (e.g., any GGUF model)
3. Start the local server in LM Studio (Server tab → Start Server)
4. The default endpoint is `http://localhost:1234/v1` (OpenAI-compatible API)
5. Make sure the model name in the code matches your loaded model in LM Studio

### 3. Start the development server

```bash
bun dev
```

The app will be available at `http://localhost:3000` (or the port shown in the console).

### 4. Start chatting!

Open your browser, select a model, and start a conversation with the AI.

## Production

To run for production:

```bash
bun start
```

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) - Fast all-in-one JavaScript runtime
- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui components + Tailwind Typography
- **AI Integration**: [Vercel AI SDK](https://sdk.vercel.ai) with streaming support
- **AI Providers**: OpenAI, Anthropic Claude, Google Gemini, LM Studio (local models)
- **Markdown**: react-markdown with syntax highlighting (rehype-highlight)
- **Database**: SQLite (Bun's built-in `bun:sqlite`)
- **Server**: Bun's native HTTP server with routing

This project demonstrates Bun's full-stack capabilities with HTML imports, native API routes, and multi-provider AI streaming.
