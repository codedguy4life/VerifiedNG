import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => ({
  plugins: [react(), {
    name: "restore-classic-home-in-dev",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const route = {
          "/": "/classic/",
          "/signup": "/classic/signup-customer.html",
          "/become-a-provider": "/classic/signup-provider.html",
        }[new URL(req.url || "/", "http://localhost").pathname];
        if (!route) return next();
        res.statusCode = 302;
        res.setHeader("Location", route);
        res.end();
      });
    }
  }],
  // The React app serves /app and supporting routes; the classic landing serves /.
  base: "/",
}));
