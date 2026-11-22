import { Moon, Sun } from "lucide-react";
import { nextManualTheme } from "../lib/theme.js";
import "../theme-controls.css";

// One click switches between actual Light and Dark, even when System is selected.
export default function ThemeToggleButton({ resolvedTheme = "light", onChange, className = "" }) {
  const isDark = resolvedTheme === "dark";
  const Icon = isDark ? Sun : Moon;
  const nextTheme = nextManualTheme(resolvedTheme);
  const label = isDark ? "Light mode" : "Dark mode";
  return <button type="button"
    className={["theme-quick-toggle", className].filter(Boolean).join(" ")}
    aria-label={"Switch to " + label.toLowerCase()}
    title={"Switch to " + label.toLowerCase()}
    onClick={() => onChange(nextTheme)}
  >
    <span className="theme-quick-icon"><Icon size={18} strokeWidth={2} aria-hidden="true"/></span>
    <span className="theme-quick-copy"><strong>{label}</strong><small>Tap to change</small></span>
    <span className={isDark ? "theme-quick-track on" : "theme-quick-track"} aria-hidden="true"><span/></span>
  </button>;
}
