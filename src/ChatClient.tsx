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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

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

const examplePrompts = [
  {
    title: "Write code",
    description: "Help me build a React component",
    prompt: "Help me build a React component with TypeScript"
  },
  {
    title: "Debug an issue",
    description: "Find and fix errors in my code",
    prompt: "I'm getting an error in my code. Can you help me debug it?"
  },
  {
    title: "Explain concepts",
    description: "Learn about programming topics",
    prompt: "Can you explain how async/await works in JavaScript?"
  },
  {
    title: "Optimize code",
    description: "Make my code faster and cleaner",
    prompt: "Can you review my code and suggest optimizations?"
  }
];

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

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
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;
        setStreamingMessage(assistantMessage);
        
        // Clear loading state on first chunk
        if (isFirstChunk) {
          setIsLoading(false);
          isFirstChunk = false;
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
    <div className="flex h-screen bg-white dark:bg-[#212121]">
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
        {/* Header*/}
        <div className="sticky top-0 z-10 h-14 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#212121]/80 backdrop-blur-md flex items-center justify-between px-3">
          <div className="flex-1"></div>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {model.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
          </div>
          <div className="flex-1 flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="h-9 w-9 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !streamingMessage && (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <div className="max-w-2xl space-y-8">
                <div className="space-y-3">
                  <div className="text-4xl font-medium text-gray-800 dark:text-gray-100">
                    How can I help you today?
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
                  {examplePrompts.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(example.prompt)}
                      className="p-4 text-left rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <div className="font-medium text-sm mb-1">{example.title}</div>
                      <div className="text-xs text-gray-500">{example.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {(messages.length > 0 || streamingMessage) && (
            <div className="max-w-3xl mx-auto w-full py-8">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className="group px-4 py-8 w-full"
                >
                  <div className="flex gap-4 md:gap-6 mx-auto max-w-3xl">
                    {/* Avatar */}
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${
                      message.role === "user" 
                        ? "bg-[#5436DA]" 
                        : "bg-[#10A37F]"
                    }`}>
                      {message.role === "user" ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    
                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm mb-2 text-gray-800 dark:text-gray-100">
                        {message.role === "user" ? "You" : "AI"}
                      </div>
                      <div className="text-[15px] leading-7 text-gray-800 dark:text-gray-100 prose prose-slate dark:prose-invert max-w-none prose-pre:bg-[#0d1117] prose-pre:text-gray-100 prose-code:text-sm">
                        {message.role === "user" ? (
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        ) : (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                          >
                            {message.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading state before streaming starts */}
              {isLoading && !streamingMessage && (
                <div className="group px-4 py-8 w-full">
                  <div className="flex gap-4 md:gap-6 mx-auto max-w-3xl">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-[#10A37F] flex items-center justify-center text-white">
                      <Bot className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm mb-2 text-gray-800 dark:text-gray-100">
                        AI
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Streaming response */}
              {streamingMessage && (
                <div className="group px-4 py-8 w-full">
                  <div className="flex gap-4 md:gap-6 mx-auto max-w-3xl">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-[#10A37F] flex items-center justify-center text-white">
                      <Bot className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm mb-2 text-gray-800 dark:text-gray-100">
                        Bun
                      </div>
                      <div className="text-[15px] leading-7 text-gray-800 dark:text-gray-100 prose prose-slate dark:prose-invert max-w-none prose-pre:bg-[#0d1117] prose-pre:text-gray-100 prose-code:text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                        >
                          {streamingMessage}
                        </ReactMarkdown>
                        <span className="inline-block w-1 h-5 bg-gray-500 ml-0.5 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-[#212121] p-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={sendMessage} className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message AI"
                disabled={isLoading}
                className="min-h-[52px] max-h-[200px] resize-none pr-12 px-4 py-3.5 text-base leading-6 rounded-3xl border-gray-200 dark:border-gray-700 shadow-sm focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 field-sizing-content"
                rows={1}
                style={{ height: 'auto', overflow: 'hidden' }}
              />
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                size="icon"
                className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            <div className="text-center text-xs text-gray-500 mt-3">
              AI can make mistakes. Check important info.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
