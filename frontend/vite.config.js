import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Vite serves at / locally. The production path reserves a subfolder so
  // the current GitHub Pages homepage and legacy HTML pages can remain intact.
  base: command === "serve" ? "/" : "/VerifiedNG/community/",
}));
