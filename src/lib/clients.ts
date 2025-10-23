import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

export const lmStudio = createOpenAI({
  baseURL: process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1",
  apiKey: "lm-studio",
});

export const DEFAULT_CLIENT = "OpenAI";

export const getClient = (provider: string) => {
  switch (provider) {
    case "Anthropic":
      return anthropic;
    case "Google":
      return google;
    case "LM Studio":
      return lmStudio;
    default:
      return openai;
  }
};
