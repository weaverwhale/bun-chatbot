import { z } from "zod";
import { streamText, stepCountIs } from "ai";
import { createEndpoint } from "better-call";
import { tools, toolDisplayNames } from "@/lib/tools";
import { db } from "@/conversation";
import { DEFAULT_MODEL, availableModels } from "@/lib/models";
import { DEFAULT_CLIENT, getClient } from "@/lib/clients";

// Schema definitions
const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const DBMessageSchema = z.object({
  id: z.number(),
  conversation_id: z.number(),
  role: z.string(),
  content: z.string(),
  timestamp: z.string(),
});

const ConversationSchema = z.object({
  id: z.number(),
  title: z.string(),
  model: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const ConversationWithMessagesSchema = ConversationSchema.extend({
  messages: z.array(DBMessageSchema),
});

// Chat endpoint
export const chat = createEndpoint(
  "/api/chat",
  {
    method: "POST",
    body: z.object({
      messages: z.array(MessageSchema),
      model: z.string().default(DEFAULT_MODEL),
      systemPrompt: z.string().optional(),
      conversationId: z.number().optional(),
    }),
  },
  async (ctx) => {
    const { messages, model, systemPrompt, conversationId } = ctx.body;

    if (!process.env.OPENAI_API_KEY) {
      throw ctx.error(500, {
        error: "OpenAI API key not configured",
      });
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

    // Find the model in the available models
    const currentModel = availableModels.find((m) => m.value === model);
    const client = getClient(currentModel?.provider || DEFAULT_CLIENT);
    const resolvedModel = client(currentModel?.value || DEFAULT_MODEL);

    if (!currentModel) {
      throw ctx.error(400, {
        error: "Invalid model",
      });
    }

    // Create streaming response using AI SDK
    const result = streamText({
      model: resolvedModel,
      messages,
      system: systemPrompt || undefined,
      tools,
      stopWhen: stepCountIs(10),
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

    // Use fullStream to show tool usage and stream text properly
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.fullStream) {
            if (chunk.type === "tool-call") {
              // Get the display name from the mapping
              const toolDisplayName =
                toolDisplayNames[chunk.toolName] || chunk.toolName;
              // Send tool call indicator
              controller.enqueue(
                encoder.encode(`\n\n**${toolDisplayName}**...\n\n`)
              );
            } else if (chunk.type === "text-delta") {
              // Stream text as it comes
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }
);

// Get all conversations
export const getConversations = createEndpoint(
  "/api/conversations",
  {
    method: "GET",
  },
  async (ctx) => {
    const conversations = db
      .query("SELECT * FROM conversations ORDER BY updated_at DESC")
      .all();
    return ConversationSchema.array().parse(conversations);
  }
);

// Create new conversation
export const createConversation = createEndpoint(
  "/api/conversations",
  {
    method: "POST",
    body: z.object({
      title: z.string().default("New Chat"),
      model: z.string().optional(),
    }),
  },
  async (ctx) => {
    const { title, model } = ctx.body;

    const result = db.run(
      "INSERT INTO conversations (title, model) VALUES (?, ?)",
      [title, model || null]
    );

    const conversation = db
      .query("SELECT * FROM conversations WHERE id = ?")
      .get(result.lastInsertRowid);

    return ConversationSchema.parse(conversation);
  }
);

// Get conversation with messages
export const getConversation = createEndpoint(
  "/api/conversations/:id",
  {
    method: "GET",
  },
  async (ctx) => {
    const id = ctx.params.id;
    const conversation = db
      .query("SELECT * FROM conversations WHERE id = ?")
      .get(id);

    if (!conversation) {
      throw ctx.error(404, {
        error: "Conversation not found",
      });
    }

    const messages = db
      .query(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC"
      )
      .all(id);

    return ConversationWithMessagesSchema.parse({ ...conversation, messages });
  }
);

// Update conversation
export const updateConversation = createEndpoint(
  "/api/conversations/:id",
  {
    method: "PUT",
    body: z.object({
      title: z.string().optional(),
      model: z.string().optional(),
    }),
  },
  async (ctx) => {
    const id = ctx.params.id;
    const { title, model } = ctx.body;

    if (!title && !model) {
      throw ctx.error(400, {
        error: "Title or model is required",
      });
    }

    // Build dynamic query based on what's being updated
    const updates = [];
    const values = [];

    if (title) {
      updates.push("title = ?");
      values.push(title);
    }
    if (model !== undefined) {
      updates.push("model = ?");
      values.push(model);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    db.run(
      `UPDATE conversations SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    const conversation = db
      .query("SELECT * FROM conversations WHERE id = ?")
      .get(id);

    return ConversationSchema.parse(conversation);
  }
);

// Delete conversation
export const deleteConversation = createEndpoint(
  "/api/conversations/:id",
  {
    method: "DELETE",
  },
  async (ctx) => {
    const id = ctx.params.id;
    db.run("DELETE FROM conversations WHERE id = ?", [id]);
    return { success: true };
  }
);
