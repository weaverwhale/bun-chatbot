import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sidebar } from "@/components/Sidebar";
import { SettingsModal } from "@/components/SettingsModal";
import { 
  Send, 
  Bot, 
  User, 
  Loader2,
  Settings
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export function ChatClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("gpt-4o-mini");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

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

  const createNewConversation = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      
      if (response.ok) {
        const newConversation = await response.json();
        setConversations([newConversation, ...conversations]);
        setCurrentConversationId(newConversation.id);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const deleteConversation = async (id: number) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setConversations(conversations.filter(c => c.id !== id));
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

  const sendMessage = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;

    // Create conversation if none exists
    let conversationId = currentConversationId;
    if (!conversationId) {
      try {
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: input.trim().slice(0, 50) }),
        });
        
        if (response.ok) {
          const newConversation = await response.json();
          conversationId = newConversation.id;
          setCurrentConversationId(conversationId);
          setConversations([newConversation, ...conversations]);
        }
      } catch (error) {
        console.error("Failed to create conversation:", error);
        return;
      }
    }

    const userMessage: Message = { 
      role: "user", 
      content: input.trim(),
    };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setStreamingMessage("");

    // Update conversation title if it's the first message
    if (messages.length === 0 && conversationId) {
      updateConversationTitle(conversationId, input.trim().slice(0, 50));
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          model,
          systemPrompt: systemPrompt.trim() || undefined,
          conversationId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let assistantMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            
            if (data === "[DONE]") {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantMessage += parsed.content;
                setStreamingMessage(assistantMessage);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Add the complete assistant message to history
      if (assistantMessage) {
        setMessages([...newMessages, { 
          role: "assistant", 
          content: assistantMessage,
        }]);
      }
      setStreamingMessage("");
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages([
        ...newMessages,
        { 
          role: "assistant", 
          content: `Error: ${error.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-[#f7f7f8] dark:bg-[#212121]">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={loadConversation}
        onNewConversation={createNewConversation}
        onDeleteConversation={deleteConversation}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        model={model}
        setModel={setModel}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
      />

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'lg:ml-[260px]' : 'ml-0'}`}>
        {/* Header */}
        <div className="h-16 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#2f2f2f] flex items-center justify-between px-4">
          <div className="flex-1" />
          <h1 className="text-lg font-semibold absolute left-1/2 transform -translate-x-1/2">
            {currentConversationId ? conversations.find(c => c.id === currentConversationId)?.title || "Chat" : "Bun Chatbot"}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="h-10 w-10"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {messages.length === 0 && !streamingMessage && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#19c37d] flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold">How can I help you today?</h3>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`py-6 ${message.role === "assistant" ? "bg-[#f7f7f8] dark:bg-[#2f2f2f]" : ""}`}
              >
                <div className="max-w-3xl mx-auto flex gap-4 px-4">
                  {/* Avatar */}
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === "user" 
                      ? "bg-[#5436da]" 
                      : "bg-[#19c37d]"
                  }`}>
                    {message.role === "user" ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  {/* Message Content */}
                  <div className="flex-1 space-y-2">
                    <div className="text-sm font-semibold">
                      {message.role === "user" ? "You" : "Bun"}
                    </div>
                    <div className="text-[15px] leading-7 whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {streamingMessage && (
              <div className="py-6 bg-[#f7f7f8] dark:bg-[#2f2f2f]">
                <div className="max-w-3xl mx-auto flex gap-4 px-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-[#19c37d] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="text-sm font-semibold">Bun Chatbot</div>
                    <div className="text-[15px] leading-7 whitespace-pre-wrap">
                      {streamingMessage}
                      <span className="inline-block w-1.5 h-5 bg-gray-900 dark:bg-gray-100 ml-1 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#2f2f2f] p-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={sendMessage} className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Bun Chatbot"
                disabled={isLoading}
                className="min-h-[52px] max-h-[200px] resize-none pr-12 text-base rounded-2xl"
                rows={1}
              />
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                size="icon"
                className="absolute right-2 bottom-2 h-8 w-8 rounded-lg"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
