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
interface TableInfo {
  name: string;
  type: string;
}

try {
  const tableInfo = db
    .query("PRAGMA table_info(conversations)")
    .all() as TableInfo[];
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

