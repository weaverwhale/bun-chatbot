import { z } from "zod";
import {
  streamText,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { createEndpoint } from "better-call";
import { tools } from "@/lib/tools";
import { db } from "@/db";
import { DEFAULT_MODEL, availableModels } from "@/lib/models";
import { DEFAULT_CLIENT, getClient } from "@/lib/clients";

// Database row types
interface DBMessage {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  timestamp: string;
}

// Schema definitions
const ConversationSchema = z.object({
  id: z.number(),
  title: z.string(),
  model: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Chat request body schema
const ChatRequestSchema = z
  .object({
    messages: z.array(z.any()), // UIMessage structure is complex, validated by AI SDK
    model: z.string(),
    systemPrompt: z.string().optional(),
    conversationId: z.number().nullable().optional(),
  })
  .catchall(z.unknown());

// Helper to extract text content from UIMessage
function extractTextContent(message: UIMessage): string {
  // Handle parts-based content
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
  }
  return "";
}

// Chat endpoint
export const chat = createEndpoint(
  "/api/chat",
  {
    method: "POST",
    body: ChatRequestSchema,
  },
  async (ctx) => {
    const { messages, model, systemPrompt, conversationId } = ctx.body;

    if (!messages || !Array.isArray(messages)) {
      throw ctx.error(400, {
        error: "Messages array is required",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      throw ctx.error(500, {
        error: "OpenAI API key not configured",
      });
    }

    // Save user message to database if conversationId is provided
    if (conversationId) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === "user") {
        const content = extractTextContent(lastMessage);
        db.run(
          "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
          [conversationId, lastMessage.role, content]
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

    // Add system prompt if provided
    const messagesWithSystem: UIMessage[] = systemPrompt
      ? [
          {
            role: "system" as const,
            id: `system-${Date.now()}`,
            parts: [
              {
                type: "text" as const,
                text: systemPrompt,
              },
            ],
          } as UIMessage,
          ...messages,
        ]
      : messages;

    // Convert UIMessages to model messages format
    const modelMessages = convertToModelMessages(messagesWithSystem);

    // Create streaming response using AI SDK
    const result = streamText({
      model: resolvedModel,
      messages: modelMessages,
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

    // Return AI SDK formatted response with tool support
    return result.toUIMessageStreamResponse();
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

// Get conversation with messages (converted to UIMessage format)
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

    const dbMessages = db
      .query(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC"
      )
      .all(id) as DBMessage[];

    // Convert DB messages to UIMessage format
    const uiMessages = dbMessages.map((msg) => ({
      id: `${msg.id}`,
      role: msg.role,
      content: msg.content, // Use content format for compatibility
    }));

    return {
      ...ConversationSchema.parse(conversation),
      messages: uiMessages,
    };
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

// Save messages to conversation
export const saveMessages = createEndpoint(
  "/api/conversations/:id/messages",
  {
    method: "POST",
    body: z.object({
      messages: z.array(
        z.object({
          role: z.string(),
          content: z.string(),
        })
      ),
    }),
  },
  async (ctx) => {
    const id = ctx.params.id;
    const { messages } = ctx.body;

    // Insert all messages
    for (const message of messages) {
      db.run(
        "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
        [id, message.role, message.content]
      );
    }

    db.run(
      "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );

    return { success: true };
  }
);
