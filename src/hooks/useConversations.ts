import { useState, useEffect } from "react";
import { api } from "@/api/client";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface Conversation {
  id: number;
  title: string;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await api("/api/conversations", {
        method: "GET",
      });
      if (response.error) {
        console.error("Failed to load conversations:", response.error);
        setError(response.error.message || "Failed to load conversations");
        return;
      }
      setConversations(response.data);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load conversations"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (id: number) => {
    try {
      const response = await api("/api/conversations/:id", {
        method: "GET",
        params: { id: id.toString() },
      });
      if (response.error) {
        console.error("Failed to load conversation:", response.error);
        return null;
      }
      setCurrentConversationId(id);
      const validMessages = response.data.messages
        .filter(
          (msg): msg is typeof msg & { role: "user" | "assistant" } =>
            msg.role === "user" || msg.role === "assistant"
        )
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }));
      setMessages(validMessages);
      return response.data;
    } catch (error) {
      console.error("Failed to load conversation:", error);
      return null;
    }
  };

  const createNewConversation = async (
    title: string = "New Chat",
    model?: string
  ) => {
    try {
      const response = await api("@post/api/conversations", {
        body: { title, model },
      });
      if (response.error) {
        console.error("Failed to create conversation:", response.error);
        return null;
      }
      setConversations([response.data, ...conversations]);
      setCurrentConversationId(response.data.id);
      setMessages([]);
      return response.data;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }
  };

  const deleteConversation = async (id: number) => {
    try {
      const response = await api("@delete/api/conversations/:id", {
        params: { id: id.toString() },
      });
      if (response.error) {
        console.error("Failed to delete conversation:", response.error);
        return;
      }
      setConversations(conversations.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const updateConversationTitle = async (id: number, title: string) => {
    try {
      const response = await api("@put/api/conversations/:id", {
        params: { id: id.toString() },
        body: { title },
      });
      if (response.error) {
        console.error("Failed to update conversation title:", response.error);
        return;
      }
      loadConversations();
    } catch (error) {
      console.error("Failed to update conversation title:", error);
    }
  };

  return {
    conversations,
    currentConversationId,
    messages,
    loading,
    error,
    setCurrentConversationId,
    setMessages,
    loadConversations,
    loadConversation,
    createNewConversation,
    deleteConversation,
    updateConversationTitle,
  };
}
