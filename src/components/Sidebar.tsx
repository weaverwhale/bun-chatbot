import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Plus,
  Trash2,
  Menu,
  X,
  PanelLeftClose,
} from "lucide-react";
import { useState } from "react";

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  currentConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <>
      {/* Menu button (shown when sidebar is closed) */}
      {!isOpen && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="fixed top-2 left-3 z-50 h-10 w-10 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* New conversation button (shown when sidebar is closed) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNewConversation()}
            className="fixed top-2 left-15 z-50 h-10 w-10 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg"
            aria-label="New conversation"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </>
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-white dark:bg-[#171717] text-gray-800 dark:text-white border-r border-gray-200 dark:border-white/10 transition-all duration-300 ease-in-out z-40 flex flex-col ${
          isOpen ? "w-[260px]" : "w-0"
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Header with Close and New Chat Buttons */}
          <div className="px-2 py-[calc(0.65rem-1px)] shrink-0 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className=" hover:bg-black/5 dark:hover:bg-white/10 rounded-lg"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNewConversation()}
              className=" hover:bg-black/5 dark:hover:bg-white/10 rounded-lg"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto px-2 py-2 border-t border-gray-200 dark:border-white/10">
            {conversations.length === 0 ? (
              <div className="text-center text-gray-400 dark:text-white/40 text-sm py-8 px-4">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                      currentConversationId === conversation.id
                        ? "bg-gray-100 dark:bg-white/10"
                        : "hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                    onMouseEnter={() => setHoveredId(conversation.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => onSelectConversation(conversation.id)}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0 text-gray-600 dark:text-white/70" />
                    <span className="flex-1 text-sm truncate text-gray-800 dark:text-white/90">
                      {conversation.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 shrink-0 text-gray-500 dark:text-white/60 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-md transition-opacity ${
                        hoveredId === conversation.id ||
                        currentConversationId === conversation.id
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this conversation?")) {
                          onDeleteConversation(conversation.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
