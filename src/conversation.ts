import { Database } from "bun:sqlite";

// Initialize SQLite database
export const db = new Database("conversations.db");

// Create tables if they don't exist
db.run(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    model TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
  )
`);

// Migration: Add model column if it doesn't exist
try {
  const tableInfo = db.query("PRAGMA table_info(conversations)").all() as any[];
  const hasModelColumn = tableInfo.some((col) => col.name === "model");

  if (!hasModelColumn) {
    console.log(
      "Migrating database: Adding model column to conversations table"
    );
    db.run("ALTER TABLE conversations ADD COLUMN model TEXT");
    console.log("Migration completed successfully");
  }
} catch (error) {
  console.error("Migration error:", error);
}

// Conversation route handlers
export const conversationRoutes = {
  "/api/conversations": {
    // Get all conversations
    async GET(req: Request) {
      try {
        const conversations = db
          .query("SELECT * FROM conversations ORDER BY updated_at DESC")
          .all();
        return Response.json(conversations);
      } catch (error: any) {
        console.error("Get conversations error:", error);
        return Response.json(
          { error: error.message || "Failed to fetch conversations" },
          { status: 500 }
        );
      }
    },
    // Create new conversation
    async POST(req: Request) {
      try {
        const body = await req.json();
        const { title = "New Chat", model } = body;

        const result = db.run(
          "INSERT INTO conversations (title, model) VALUES (?, ?)",
          [title, model || null]
        );

        const conversation = db
          .query("SELECT * FROM conversations WHERE id = ?")
          .get(result.lastInsertRowid);

        return Response.json(conversation);
      } catch (error: any) {
        console.error("Create conversation error:", error);
        return Response.json(
          { error: error.message || "Failed to create conversation" },
          { status: 500 }
        );
      }
    },
  },

  "/api/conversations/:id": {
    // Get conversation with messages
    async GET(req: Request) {
      try {
        const id = (req as any).params.id;
        const conversation = db
          .query("SELECT * FROM conversations WHERE id = ?")
          .get(id);

        if (!conversation) {
          return Response.json(
            { error: "Conversation not found" },
            { status: 404 }
          );
        }

        const messages = db
          .query(
            "SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC"
          )
          .all(id);

        return Response.json({ ...conversation, messages });
      } catch (error: any) {
        console.error("Get conversation error:", error);
        return Response.json(
          { error: error.message || "Failed to fetch conversation" },
          { status: 500 }
        );
      }
    },
    // Update conversation
    async PUT(req: Request) {
      try {
        const id = (req as any).params.id;
        const body = await req.json();
        const { title, model } = body;

        if (!title && !model) {
          return Response.json(
            { error: "Title or model is required" },
            { status: 400 }
          );
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

        return Response.json(conversation);
      } catch (error: any) {
        console.error("Update conversation error:", error);
        return Response.json(
          { error: error.message || "Failed to update conversation" },
          { status: 500 }
        );
      }
    },
    // Delete conversation
    async DELETE(req: Request) {
      try {
        const id = (req as any).params.id;
        db.run("DELETE FROM conversations WHERE id = ?", [id]);
        return Response.json({ success: true });
      } catch (error: any) {
        console.error("Delete conversation error:", error);
        return Response.json(
          { error: error.message || "Failed to delete conversation" },
          { status: 500 }
        );
      }
    },
  },
};
