import { createClient } from "better-call/client";
import type { APIRouter } from "@/api/router";

export const api = createClient<APIRouter>({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
});
