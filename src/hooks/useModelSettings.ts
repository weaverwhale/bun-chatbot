import { useState, useEffect } from "react";
import { availableModels, DEFAULT_MODEL } from "@/lib/models";

export function useModelSettings() {
  const [model, setModel] = useState(() => {
    // Check localStorage for saved model preference
    const stored = localStorage.getItem("selectedModel");
    if (stored) {
      // Verify the stored model is still valid
      const isValid = availableModels.some((m) => m.value === stored);
      if (isValid) return stored;
    }
    return availableModels?.[0]?.value || DEFAULT_MODEL;
  });

  const [systemPrompt, setSystemPrompt] = useState(() => {
    // Check localStorage for saved system prompt
    const stored = localStorage.getItem("systemPrompt");
    return stored || "";
  });

  // Save model preference to localStorage
  useEffect(() => {
    localStorage.setItem("selectedModel", model);
  }, [model]);

  // Save system prompt to localStorage
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
