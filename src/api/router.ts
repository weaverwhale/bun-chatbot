import { createRouter } from "better-call";
import {
  chat,
  getConversations,
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
  saveMessages,
} from "@/api/endpoints";

export const apiRouter = createRouter({
  chat,
  getConversations,
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
  saveMessages,
});

export type APIRouter = typeof apiRouter;
