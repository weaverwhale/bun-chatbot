import { Database } from "bun:sqlite";

// Initialize SQLite database
export const db = new Database("conversations.db");

// Create tables if they don't exist
db.run(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
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
        const { title = "New Chat" } = body;

        const result = db.run("INSERT INTO conversations (title) VALUES (?)", [
          title,
        ]);

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
        const { title } = body;

        if (!title) {
          return Response.json({ error: "Title is required" }, { status: 400 });
        }

        db.run(
          "UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [title, id]
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
