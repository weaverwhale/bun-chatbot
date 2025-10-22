# OpenAI Chat Client - Bun + React

A full-stack OpenAI chat client built with Bun, React, and shadcn/ui components, featuring streaming responses, conversation history, model selection, and custom system prompts.

## Features

- **Streaming Responses**: Real-time message streaming as the AI generates responses
- **Conversation History**: Maintains full conversation context
- **Model Selection**: Choose between GPT-4o, GPT-4o Mini, and GPT-3.5 Turbo
- **System Prompts**: Customize AI behavior with optional system prompts
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS and shadcn/ui
- **Fast Development**: Built with Bun for lightning-fast builds and hot module reloading

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure OpenAI API Key

Create a `.env` file in the project root:

```bash
OPENAI_API_KEY=your-api-key-here
```

Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys).

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
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **API**: OpenAI Node SDK with streaming support
- **Server**: Bun's native HTTP server with routing

This project demonstrates Bun's full-stack capabilities with HTML imports and native API routes.
