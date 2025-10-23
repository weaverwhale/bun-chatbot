import { useState, useEffect } from "react";
import { api } from "@/api/client";

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
      setConversations((prev) => [response.data, ...prev]);
      setCurrentConversationId(response.data.id);
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
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
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
      // Update the conversation locally instead of reloading all conversations
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, title, updated_at: response.data.updated_at }
            : c
        )
      );
    } catch (error) {
      console.error("Failed to update conversation title:", error);
    }
  };

  const clearCurrentConversation = () => {
    setCurrentConversationId(null);
  };

  return {
    conversations,
    currentConversationId,
    loading,
    error,
    setCurrentConversationId,
    loadConversations,
    loadConversation,
    createNewConversation,
    deleteConversation,
    updateConversationTitle,
    clearCurrentConversation,
  };
}
