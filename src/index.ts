import { serve } from "bun";
import OpenAI from "openai";
import index from "./index.html";
import { db, conversationRoutes } from "./conversation";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const server = serve({
  port: process.env.PORT || 3000,
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    "/api/chat": {
      async POST(req) {
        try {
          const body = await req.json();
          const { messages, model = "gpt-4o-mini", systemPrompt, conversationId } = body;

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

          // Build messages array with optional system prompt
          const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
          
          if (systemPrompt) {
            chatMessages.push({
              role: "system",
              content: systemPrompt,
            });
          }

          chatMessages.push(...messages);

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

          // Create streaming response
          const stream = await openai.chat.completions.create({
            model,
            messages: chatMessages,
            stream: true,
          });

          // Create a readable stream for the response
          const encoder = new TextEncoder();
          let fullResponse = "";
          const readableStream = new ReadableStream({
            async start(controller) {
              try {
                for await (const chunk of stream) {
                  const content = chunk.choices[0]?.delta?.content || "";
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                }
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                
                // Save assistant message to database if conversationId is provided
                if (conversationId && fullResponse) {
                  db.run(
                    "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
                    [conversationId, "assistant", fullResponse]
                  );
                  db.run(
                    "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [conversationId]
                  );
                }
                
                controller.close();
              } catch (error) {
                controller.error(error);
              }
            },
          });

          return new Response(readableStream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
            },
          });
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
