import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Bot } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: string;
  setModel: (model: string) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  model,
  setModel,
  systemPrompt,
  setSystemPrompt,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#2f2f2f] rounded-lg shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-semibold">Settings</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model-select" className="text-sm font-medium">
              Model
            </Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-full" id="model-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">
                  <div className="flex items-center gap-2">
                    <Bot className="w-3 h-3" />
                    <span>GPT-4o</span>
                  </div>
                </SelectItem>
                <SelectItem value="gpt-4o-mini">
                  <div className="flex items-center gap-2">
                    <Bot className="w-3 h-3" />
                    <span>GPT-4o Mini</span>
                  </div>
                </SelectItem>
                <SelectItem value="gpt-3.5-turbo">
                  <div className="flex items-center gap-2">
                    <Bot className="w-3 h-3" />
                    <span>GPT-3.5 Turbo</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="system-prompt" className="text-sm font-medium">
              System Instructions
            </Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Define how the AI should behave... (e.g., You are a helpful coding assistant)"
              className="min-h-[120px] text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-white/10">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

