import { createEndpoint } from "better-call";
import { z } from "zod";
import { db } from "../conversation";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

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
      model: z.string().default("gpt-4.1-mini"),
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

    // Determine which AI provider to use based on model name
    let aiModel;

    // List of LM Studio models (local models)
    const lmStudioModels = ["huihui-gpt-oss-20b-abliterated"];

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
    } else if (lmStudioModels.includes(model)) {
      // LM Studio models (local OpenAI-compatible API)
      const lmStudio = createOpenAI({
        baseURL: process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1",
        apiKey: "lm-studio", // LM Studio doesn't require a real API key
      });
      aiModel = lmStudio(model);
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
