import type { JSONValue } from "ai";
import { type UIMessage } from "@ai-sdk/react";
import { Bot, User, Loader2, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

import { getModelLabel } from "@/lib/models";
import { examplePrompts } from "@/lib/prompts";
import { extractMessageContent } from "@/lib/utils";
import { ChatToolOutput } from "@/components/ChatToolOutput";

// Tool part type with AI SDK properties
interface ToolPart {
  type: `tool-${string}`;
  state: "input-streaming" | "output-available" | "output-error";
  output?: JSONValue;
  errorText?: string;
}

interface ChatMessagesProps {
  messages: UIMessage[];
  model: string;
  timeOfDay: string;
  handleExamplePromptClick: (prompt: string) => void;
  isWaitingForStream: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessages = ({
  messages,
  model,
  timeOfDay,
  handleExamplePromptClick,
  isWaitingForStream,
  messagesEndRef,
}: ChatMessagesProps) => {
  return (
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
              <div key={message.id || index} className="group px-4 py-8 w-full">
                <div className="flex gap-4 md:gap-6 mx-auto max-w-3xl">
                  {/* Avatar */}
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${
                      message.role === "user" ? "bg-[#5436DA]" : "bg-[#10A37F]"
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
                      {message.role === "user" ? "You" : getModelLabel(model)}
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
                                const isError = part.state === "output-error";

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
                                          <ChatToolOutput
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
  );
};
