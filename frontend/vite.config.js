import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => ({
  plugins: [react()],
  // The React app is now the main website and is deployed at the domain root.
  base: "/",
}));
