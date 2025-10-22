import { useState, useEffect } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const loadConversation = async (id: number) => {
    try {
      const response = await fetch(`/api/conversations/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentConversationId(id);
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const createNewConversation = async (title: string = "New Chat") => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        const newConversation = await response.json();
        setConversations([newConversation, ...conversations]);
        setCurrentConversationId(newConversation.id);
        setMessages([]);
        return newConversation;
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
    return null;
  };

  const deleteConversation = async (id: number) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setConversations(conversations.filter((c) => c.id !== id));
        if (currentConversationId === id) {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const updateConversationTitle = async (id: number, title: string) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      loadConversations();
    } catch (error) {
      console.error("Failed to update conversation title:", error);
    }
  };

  return {
    conversations,
    currentConversationId,
    messages,
    setCurrentConversationId,
    setMessages,
    loadConversations,
    loadConversation,
    createNewConversation,
    deleteConversation,
    updateConversationTitle,
  };
}
