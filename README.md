# Bun Chatbot

A full-stack AI chat client built with Bun, React, and shadcn/ui components, featuring streaming responses from multiple AI providers, conversation history, markdown rendering, and custom system prompts.

## Features

- **Multiple AI Providers**: Support for OpenAI, Anthropic Claude, and Google Gemini models via Vercel AI SDK
- **Streaming Responses**: Real-time message streaming as the AI generates responses
- **Markdown Rendering**: Beautiful markdown rendering with syntax highlighting for code blocks
- **Conversation History**: Maintains full conversation context with SQLite storage
- **Model Selection**: Choose from GPT-4o, Claude 3.5 Sonnet, Gemini 2.0 Flash, and more
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
# Required for OpenAI models (GPT-4o, GPT-3.5, etc.)
OPENAI_API_KEY=your-openai-api-key-here

# Optional: For Anthropic Claude models
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Optional: For Google Gemini models
GOOGLE_API_KEY=your-google-api-key-here
```

Get your API keys from:
- [OpenAI Platform](https://platform.openai.com/api-keys)
- [Anthropic Console](https://console.anthropic.com/)
- [Google AI Studio](https://makersuite.google.com/app/apikey)

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
- **AI Providers**: OpenAI, Anthropic Claude, Google Gemini
- **Markdown**: react-markdown with syntax highlighting (rehype-highlight)
- **Database**: SQLite (Bun's built-in `bun:sqlite`)
- **Server**: Bun's native HTTP server with routing

This project demonstrates Bun's full-stack capabilities with HTML imports, native API routes, and multi-provider AI streaming.
