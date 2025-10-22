export interface ModelOption {
  value: string;
  label: string;
  provider?: string;
}

export const availableModels: ModelOption[] = [
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "OpenAI" },
  {
    value: "claude-4.5-sonnet",
    label: "Claude 4.5 Sonnet",
    provider: "Anthropic",
  },
  {
    value: "huihui-gpt-oss-20b-abliterated",
    label: "GPT OSS 20B Abliterated",
    provider: "LM Studio",
  },
];

/**
 * Resolves a model value to its display label
 * @param modelValue - The model value
 * @returns The model label or a formatted fallback
 */
export function getModelLabel(modelValue: string): string {
  const model = availableModels.find((m) => m.value === modelValue);

  if (model) {
    return model.label;
  }

  // Fallback: format the value nicely
  return modelValue
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Gets the full model information by value
 * @param modelValue - The model value
 * @returns The ModelOption or undefined if not found
 */
export function getModelInfo(modelValue: string): ModelOption | undefined {
  return availableModels.find((m) => m.value === modelValue);
}
