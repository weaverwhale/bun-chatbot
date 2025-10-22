import { serve } from "bun";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import index from "./index.html";
import { db, conversationRoutes } from "./conversation";

const server = serve({
  port: process.env.PORT || 3000,
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello/:name": async (req) => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    "/api/chat": {
      async POST(req) {
        try {
          const body = await req.json();
          const {
            messages,
            model = "gpt-4o-mini",
            systemPrompt,
            conversationId,
          } = body;

          if (!process.env.OPENAI_API_KEY) {
            return Response.json(
              { error: "OpenAI API key not configured" },
              { status: 500 }
            );
          }

          if (!messages || !Array.isArray(messages)) {
            return Response.json(
              { error: "Messages array is required" },
              { status: 400 }
            );
          }

          // Save user message to database if conversationId is provided
          if (conversationId) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage) {
              db.run(
                "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
                [conversationId, lastMessage.role, lastMessage.content]
              );
              db.run(
                "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [conversationId]
              );
            }
          }

          // Determine which AI provider to use based on model name
          let aiModel;
          if (model.startsWith("claude-")) {
            // Anthropic Claude models
            const anthropic = createAnthropic({
              apiKey: process.env.ANTHROPIC_API_KEY,
            });
            aiModel = anthropic(model);
          } else if (model.startsWith("gemini-")) {
            // Google Gemini models
            const google = createGoogleGenerativeAI({
              apiKey: process.env.GOOGLE_API_KEY,
            });
            aiModel = google(model);
          } else {
            // Default to OpenAI
            const openai = createOpenAI({
              apiKey: process.env.OPENAI_API_KEY,
            });
            aiModel = openai(model);
          }

          // Create streaming response using AI SDK
          const result = streamText({
            model: aiModel,
            messages,
            system: systemPrompt || undefined,
            async onFinish({ text }) {
              // Save assistant message to database if conversationId is provided
              if (conversationId && text) {
                db.run(
                  "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
                  [conversationId, "assistant", text]
                );
                db.run(
                  "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                  [conversationId]
                );
              }
            },
          });

          // Return the streaming response
          return result.toTextStreamResponse();
        } catch (error: any) {
          console.error("Chat API error:", error);
          return Response.json(
            { error: error.message || "An error occurred" },
            { status: 500 }
          );
        }
      },
    },

    // Import conversation routes
    ...conversationRoutes,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
