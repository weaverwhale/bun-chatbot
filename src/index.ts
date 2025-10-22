import { serve } from "bun";
import index from "./index.html";
import { apiRouter } from "./api/router";

const server = serve({
  port: process.env.PORT || 3000,

  routes: {
    // API routes are handled by better-call router
    "/api/*": {
      async GET(req) {
        return apiRouter.handler(req);
      },
      async POST(req) {
        return apiRouter.handler(req);
      },
      async PUT(req) {
        return apiRouter.handler(req);
      },
      async DELETE(req) {
        return apiRouter.handler(req);
      },
    },

    // Serve index.html for all unmatched routes
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
