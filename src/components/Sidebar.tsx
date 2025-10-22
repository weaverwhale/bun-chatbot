import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Trash2, Menu, X, PanelLeftClose } from "lucide-react";
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
      {/* Toggle button */}
      <Button
        variant={isOpen ? "default" : "ghost"}
        size="icon"
        onClick={onToggle}
        className="fixed top-2 left-3 z-50 h-10 w-10 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg"
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isOpen ? <PanelLeftClose className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-[#171717] text-white transition-all duration-300 ease-in-out z-40 flex flex-col ${
          isOpen ? "w-[260px]" : "w-0"
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Header with New Chat Button */}
          <div className="pt-16 px-2 pb-3 shrink-0">
            <Button
              onClick={onNewConversation}
              className="w-full bg-transparent border border-white/20 hover:bg-white/10 text-white gap-2 rounded-lg h-11 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New chat
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {conversations.length === 0 ? (
              <div className="text-center text-white/40 text-sm py-8 px-4">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                      currentConversationId === conversation.id
                        ? "bg-white/10"
                        : "hover:bg-white/5"
                    }`}
                    onMouseEnter={() => setHoveredId(conversation.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => onSelectConversation(conversation.id)}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0 text-white/70" />
                    <span className="flex-1 text-sm truncate text-white/90">
                      {conversation.title}
                    </span>
                    {(hoveredId === conversation.id || currentConversationId === conversation.id) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-white/60 hover:text-white hover:bg-white/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this conversation?")) {
                            onDeleteConversation(conversation.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
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
