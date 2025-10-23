import { useState, useEffect } from "react";
import { availableModels, DEFAULT_MODEL } from "@/lib/models";

export function useModelSettings() {
  const [model, setModel] = useState(() => {
    const stored = localStorage.getItem("selectedModel");
    if (stored) {
      const isValid = availableModels.some((m) => m.value === stored);
      if (isValid) return stored;
    }
    return availableModels?.[0]?.value || DEFAULT_MODEL;
  });

  const [systemPrompt, setSystemPrompt] = useState(() => {
    const stored = localStorage.getItem("systemPrompt");
    return stored || "";
  });

  useEffect(() => {
    localStorage.setItem("selectedModel", model);
  }, [model]);

  useEffect(() => {
    localStorage.setItem("systemPrompt", systemPrompt);
  }, [systemPrompt]);

  return {
    model,
    setModel,
    systemPrompt,
    setSystemPrompt,
  };
}
