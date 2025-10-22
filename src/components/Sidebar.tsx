import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Trash2, Menu, X } from "lucide-react";
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
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 h-10 w-10"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-[#0f0f0f] text-white transition-all duration-300 ease-in-out z-40 ${
          isOpen ? "w-[260px]" : "w-0"
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full pt-20 pb-4">
          {/* New Chat Button */}
          <div className="px-3 mb-2">
            <Button
              onClick={onNewConversation}
              className="w-full bg-transparent border border-white/20 hover:bg-white/10 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              New chat
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto px-3 space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conversation.id
                    ? "bg-white/10"
                    : "hover:bg-white/5"
                }`}
                onMouseEnter={() => setHoveredId(conversation.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <MessageSquare className="w-4 h-4 shrink-0 text-white/60" />
                <span className="flex-1 text-sm truncate">
                  {conversation.title}
                </span>
                {hoveredId === conversation.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-white/60 hover:text-white hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conversation.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
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

