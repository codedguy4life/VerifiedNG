import { Check, Monitor, Moon, Sun } from "lucide-react";
import { THEME_OPTIONS } from "../lib/theme.js";
import "../theme-controls.css";

const names = { light: "Light", dark: "Dark", system: "System" };
const icons = { light: Sun, dark: Moon, system: Monitor };

// The detailed three-way choice lives in Settings. The sidebar uses a one-tap switch.
export default function ThemePicker({ theme, onChange }) {
  return <div className="theme-choice" role="group" aria-label="Choose appearance">
    {THEME_OPTIONS.map(value => {
      const Icon = icons[value];
      return <button
        type="button" key={value}
        className={theme === value ? "theme-choice-button selected" : "theme-choice-button"}
        aria-pressed={theme === value}
        onClick={() => onChange(value)}
      >
        <Icon size={17} strokeWidth={2} aria-hidden="true"/>
        <span>{names[value]}</span>
        {theme === value && <Check className="theme-choice-check" size={13} aria-hidden="true"/>}
      </button>;
    })}
  </div>;
}
