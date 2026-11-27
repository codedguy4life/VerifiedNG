import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => ({
  plugins: [react(), {
    name: "restore-classic-home-in-dev",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (new URL(req.url || "/", "http://localhost").pathname !== "/") return next();
        res.statusCode = 302;
        res.setHeader("Location", "/classic/");
        res.end();
      });
    }
  }],
  // The React app serves /app and supporting routes; the classic landing serves /.
  base: "/",
}));
