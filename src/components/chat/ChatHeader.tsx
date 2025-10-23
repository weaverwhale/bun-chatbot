import { getModelLabel } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Settings, Moon, Sun } from "lucide-react";

interface ChatHeaderProps {
  model: string;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
}

export const ChatHeader = ({
  model,
  toggleDarkMode,
  isDarkMode,
  setIsSettingsOpen,
}: ChatHeaderProps) => {
  return (
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
  );
};
