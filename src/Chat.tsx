import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

import { Sidebar } from "@/components/Sidebar";
import { SettingsModal } from "@/components/SettingsModal";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessages } from "@/components/ChatMessages";
import { ChatInput } from "@/components/ChatInput";

import { useConversations } from "@/hooks/useConversations";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useModelSettings } from "@/hooks/useModelSettings";

import { getTimeOfDay, extractMessageContent } from "@/lib/utils";

export function Chat() {
  const {
    conversations,
    currentConversationId,
    loading: loadingConversations,
    error: errorConversations,
    loadConversation: loadConversationFromHook,
    createNewConversation: createNewConversationFromHook,
    deleteConversation,
    updateConversationTitle,
    clearCurrentConversation,
  } = useConversations();

  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const { model, setModel, systemPrompt, setSystemPrompt } = useModelSettings();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const timeOfDay = getTimeOfDay();

  const { messages, sendMessage, status, setMessages, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        model,
        systemPrompt: systemPrompt.trim() || undefined,
        conversationId: currentConversationId,
      }),
    }),
    onFinish: async ({ message, messages: finishedMessages }) => {
      // Create conversation if this is the first exchange and no conversation exists
      if (finishedMessages.length === 2 && !currentConversationId) {
        const firstUserMessage = finishedMessages.find(
          (m) => m.role === "user"
        );
        if (firstUserMessage) {
          const content = extractMessageContent(firstUserMessage);
          await createConversationRecord(
            content.slice(0, 50),
            finishedMessages
          );
        }
      } else if (finishedMessages.length === 2 && currentConversationId) {
        // Update conversation title if it's the first exchange
        const firstUserMessage = finishedMessages.find(
          (m) => m.role === "user"
        );
        if (firstUserMessage) {
          const content = extractMessageContent(firstUserMessage);
          updateConversationTitle(currentConversationId, content.slice(0, 50));
        }
      }
    },
  });

  // Wrapper functions to handle model state
  const loadConversation = async (id: number) => {
    if (id === currentConversationId) return;

    try {
      const conversation = await loadConversationFromHook(id);
      if (conversation) {
        if (conversation.model) {
          setModel(conversation.model);
        }
        // Convert messages to proper UIMessage format with parts
        const uiMessages: UIMessage[] = (
          conversation.messages as Array<{
            id: string;
            role: string;
            content: string;
          }>
        ).map((msg) => ({
          id: String(msg.id) || `msg-${Date.now()}-${Math.random()}`,
          role: msg.role as "system" | "user" | "assistant",
          parts: [
            {
              type: "text",
              text: msg.content || "",
            },
          ],
        }));

        // Just set the messages - useChat will handle the rest
        setMessages(uiMessages);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  // Create a conversation record without clearing messages (used during chat)
  const createConversationRecord = async (
    title: string,
    messages: UIMessage[]
  ) => {
    const newConv = await createNewConversationFromHook(title, model);

    // Save the messages to the database
    if (newConv) {
      const messagesToSave = messages.map((msg) => ({
        role: msg.role,
        content: extractMessageContent(msg),
      }));

      await fetch(`/api/conversations/${newConv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesToSave }),
      });
    }

    return newConv;
  };

  // Clear the UI for a new conversation (DB record created when user sends first message)
  const startNewConversation = () => {
    setMessages([]);
    clearCurrentConversation();
  };

  const handleDeleteConversation = async (id: number) => {
    // If deleting the current conversation, clear messages
    if (id === currentConversationId) {
      setMessages([]);
    }
    await deleteConversation(id);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const isLoading = status === "submitted" || status === "streaming";
  const isWaitingForStream = status === "submitted"; // Only show "Thinking..." before stream starts

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    // Send message using AI SDK (conversation will be created in onFinish if needed)
    const messageText = input.trim();
    setInput(""); // Clear input immediately
    await sendMessage({ text: messageText });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const handleExamplePromptClick = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex h-screen bg-white dark:bg-[#212121]">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        loading={loadingConversations}
        error={errorConversations}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={loadConversation}
        onNewConversation={startNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        model={model}
        setModel={setModel}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-200 ${isSidebarOpen ? "lg:ml-[260px]" : "ml-0"}`}
      >
        <ChatHeader
          model={model}
          toggleDarkMode={toggleDarkMode}
          isDarkMode={isDarkMode}
          setIsSettingsOpen={setIsSettingsOpen}
        />

        <ChatMessages
          messages={messages}
          model={model}
          timeOfDay={timeOfDay}
          handleExamplePromptClick={handleExamplePromptClick}
          isWaitingForStream={isWaitingForStream}
          messagesEndRef={messagesEndRef}
        />

        <ChatInput
          handleSubmit={handleSubmit}
          textareaRef={textareaRef}
          input={input}
          handleInputChange={handleInputChange}
          handleKeyDown={handleKeyDown}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
