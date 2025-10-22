import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL } from "@/lib/models";

export const webSearch = tool({
  description: "Search the web for up-to-date information",
  inputSchema: z.object({
    query: z.string().min(1).max(100).describe("The search query"),
  }),
  execute: async ({ query }) => {
    const result = await generateText({
      model: openai.responses(DEFAULT_MODEL),
      prompt: query,
      tools: {
        web_search_preview: openai.tools.webSearchPreview({}),
      },
    });

    return {
      ...result,
    };
  },
});

export const tools = {
  webSearch,
};

// Display names for tools
export const toolDisplayNames: Record<string, string> = {
  webSearch: "Searching the web",
};
