import { createRouter } from "better-call";
import {
  chat,
  getConversations,
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
} from "./endpoints";

export const apiRouter = createRouter({
  chat,
  getConversations,
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
});

export type APIRouter = typeof apiRouter;

