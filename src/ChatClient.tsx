import {
  Send,
  Bot,
  User,
  Loader2,
  Settings,
  Moon,
  Sun,
  Code2,
  CheckCircle2,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport, type JSONValue } from "ai";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sidebar } from "@/components/Sidebar";
import { SettingsModal } from "@/components/SettingsModal";

import { useConversations } from "@/hooks/useConversations";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useModelSettings } from "@/hooks/useModelSettings";
import { getModelLabel } from "@/lib/models";
import { examplePrompts } from "@/lib/prompts";

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "night";
};

// Tool part type with AI SDK properties
interface ToolPart {
  type: `tool-${string}`;
  state: "input-streaming" | "output-available" | "output-error";
  output?: JSONValue;
  errorText?: string;
}

// Helper component to format tool output
const ToolOutput = ({ output }: { output: JSONValue }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!output) return null;

  // Handle string output
  if (typeof output === "string") {
    const isLong = output.length > 500;
    const displayText =
      isLong && !isExpanded ? output.slice(0, 500) + "..." : output;

    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap wrap-break-word">
          {displayText}
        </div>
        {isLong && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    );
  }

  // Handle object/array output - format as JSON
  const jsonString = JSON.stringify(output, null, 2);
  const isLong = jsonString.length > 800;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Code2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          Result
        </span>
      </div>
      <div
        className={`${isLong && !isExpanded ? "max-h-40" : "max-h-96"} overflow-y-auto`}
      >
        <pre className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <code>
            {isLong && !isExpanded
              ? jsonString.slice(0, 800) + "\n..."
              : jsonString}
          </code>
        </pre>
      </div>
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
};

export function ChatClient() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timeOfDay = getTimeOfDay();

  // Helper to extract text content from UIMessage
  const extractMessageContent = (message: UIMessage): string => {
    if (!message.parts) return "";
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
  };

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
      {/* Sidebar */}
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
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:ml-[260px]" : "ml-0"}`}
      >
        {/* Header*/}
        <div className="sticky top-0 z-10 h-14 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#212121]/80 backdrop-blur-md flex items-center justify-between px-3">
          <div className="flex-1"></div>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {getModelLabel(model)}
          </div>
          <div className="flex-1 flex justify-end items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="h-9 w-9 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-600 dark:text-gray-300"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="h-9 w-9 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-600 dark:text-gray-300"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <div className="max-w-2xl space-y-8">
                <div className="space-y-3">
                  <div className="text-4xl font-medium text-gray-800 dark:text-gray-100">
                    How can I help you this {timeOfDay}?
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
                  {examplePrompts.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleExamplePromptClick(example.prompt)}
                      className="p-4 text-left rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <div className="font-medium text-sm mb-1 text-gray-800 dark:text-gray-100">
                        {example.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {example.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="max-w-3xl mx-auto w-full py-8">
              {messages.map((message: UIMessage, index: number) => {
                const messageContent = extractMessageContent(message);
                return (
                  <div
                    key={message.id || index}
                    className="group px-4 py-8 w-full"
                  >
                    <div className="flex gap-4 md:gap-6 mx-auto max-w-3xl">
                      {/* Avatar */}
                      <div
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${
                          message.role === "user"
                            ? "bg-[#5436DA]"
                            : "bg-[#10A37F]"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm mb-2 text-gray-800 dark:text-gray-100">
                          {message.role === "user"
                            ? "You"
                            : getModelLabel(model)}
                        </div>
                        <div className="text-[15px] leading-7 text-gray-800 dark:text-gray-100 prose prose-slate dark:prose-invert max-w-none prose-pre:bg-[#0d1117] prose-pre:text-gray-100 prose-code:text-sm">
                          {message.role === "user" ? (
                            <div className="whitespace-pre-wrap">
                              {messageContent}
                            </div>
                          ) : (
                            <>
                              {/* Render tool invocations from parts */}
                              {message.parts && message.parts.length > 0 && (
                                <div className="space-y-3 mb-4">
                                  {(
                                    message.parts.filter((part) =>
                                      part.type.startsWith("tool-")
                                    ) as ToolPart[]
                                  ).map((part, idx: number) => {
                                    // Extract tool name from type
                                    const toolName = part.type
                                      .replace("tool-", "")
                                      .replace(/([A-Z])/g, " $1")
                                      .replace(/^./, (str: string) =>
                                        str.toUpperCase()
                                      )
                                      .trim();

                                    const isComplete =
                                      part.state === "output-available";
                                    const isError =
                                      part.state === "output-error";

                                    return (
                                      <div
                                        key={idx}
                                        className={`border rounded-lg p-4 transition-colors ${
                                          isComplete
                                            ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                                            : isError
                                              ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
                                              : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          {isComplete ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                          ) : (
                                            <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                                          )}
                                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                            {toolName}
                                          </span>
                                          <span
                                            className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                                              isComplete
                                                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                                : isError
                                                  ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                                                  : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                            }`}
                                          >
                                            {isComplete
                                              ? "Complete"
                                              : isError
                                                ? "Error"
                                                : "Running"}
                                          </span>
                                        </div>
                                        {isComplete &&
                                          part.output !== undefined && (
                                            <div className="pl-6 mt-3">
                                              <ToolOutput
                                                output={part.output}
                                              />
                                            </div>
                                          )}
                                        {isError && part.errorText && (
                                          <div className="pl-6 text-xs text-red-600 dark:text-red-400 mt-3">
                                            {String(part.errorText)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {/* Render text content */}
                              {messageContent && (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeHighlight]}
                                >
                                  {messageContent}
                                </ReactMarkdown>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Loading state - only show before streaming starts */}
              {isWaitingForStream && (
                <div className="group px-4 py-8 w-full">
                  <div className="flex gap-4 md:gap-6 mx-auto max-w-3xl">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-[#10A37F] flex items-center justify-center text-white">
                      <Bot className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm mb-2 text-gray-800 dark:text-gray-100">
                        {getModelLabel(model)}
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
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
            <form onSubmit={handleSubmit} className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Message AI"
                disabled={isLoading}
                className="min-h-[52px] max-h-[200px] resize-none pr-12 px-4 py-3.5 text-base leading-6 rounded-3xl border-gray-200 dark:border-gray-700 shadow-sm focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 field-sizing-content"
                rows={1}
                style={{ height: "auto", overflow: "hidden" }}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="icon"
                className="absolute right-2.5 bottom-2.5 h-8 w-8 rounded-lg bg-black dark:bg-white text-white dark:text-black disabled:dark:text-white hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400"
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
