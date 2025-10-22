import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Bot } from "lucide-react";

const availableModels = [
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { value: "claude-4.5-sonnet", label: "Claude 4.5 Sonnet", provider: "Anthropic" },
  { value: "huihui-gpt-oss-20b-abliterated", label: "GPT OSS 20B Abliterated" }
];

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#2f2f2f] rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-xl font-semibold">Settings</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
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
                {availableModels.map((modelOption) => (
                  <SelectItem key={modelOption.value} value={modelOption.value}>
                    <div className="flex items-center gap-2">
                      <Bot className="w-3 h-3" />
                      <span>{modelOption.label}</span>
                      <span className="text-xs text-gray-500">({modelOption.provider || 'OpenAI'})</span>
                    </div>
                  </SelectItem>
                ))}
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
        <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-white/10">
          <Button 
            onClick={onClose}
            className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-6"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

