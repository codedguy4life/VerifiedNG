import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { applyTheme, readThemePreference } from "./lib/theme.js";
import "./styles.css";
import "./theme.css";

// Set the theme before React renders to avoid a flash of the wrong colour.
applyTheme(readThemePreference());

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
