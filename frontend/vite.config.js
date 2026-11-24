import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { validatePreviewApiEnvironment } from "./scripts/validate-preview-env.mjs";

export default defineConfig(() => {
  validatePreviewApiEnvironment(process.env);
  return {
    plugins: [react()],
    // The React app is now the main website and is deployed at the domain root.
    base: "/",
  };
});
