import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";

interface ChatInputProps {
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
}

export const ChatInput = ({
  handleSubmit,
  textareaRef,
  input,
  handleInputChange,
  handleKeyDown,
  isLoading,
}: ChatInputProps) => {
  return (
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
            className="min-h-[52px] max-h-[200px] resize-none pr-12 px-4 py-3.5 text-base leading-6 rounded-xl border-gray-200 dark:border-gray-700 shadow-sm focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 field-sizing-content"
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
  );
};
