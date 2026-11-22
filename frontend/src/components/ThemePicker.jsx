import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { THEME_OPTIONS } from "../lib/theme.js";
import "../theme-controls.css";

const names = { light: "Light", dark: "Dark", system: "System" };
const icons = { light: Sun, dark: Moon, system: Monitor };

export default function ThemePicker({ theme, onChange, menu = false }) {
  const [open, setOpen] = useState(false);
  const holder = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const dismiss = (event) => {
      if (event.type === "keydown") {
        if (event.key === "Escape") setOpen(false);
      } else if (!holder.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, [open]);

  if (menu) {
    const CurrentIcon = icons[theme] || Monitor;
    return <div className="theme-menu" ref={holder}>
      <button type="button" className="theme-menu-trigger" aria-label={"Appearance: " + names[theme] + ". Change theme"} aria-expanded={open} aria-haspopup="true" title="Change appearance" onClick={() => setOpen(value => !value)}>
        <CurrentIcon size={19} aria-hidden="true" />
      </button>
      {open && <div className="theme-menu-options" role="group" aria-label="Appearance">
        <strong>Appearance</strong>
        {THEME_OPTIONS.map(value => {
          const Icon = icons[value];
          return <button type="button" key={value} className={theme === value ? "theme-option selected" : "theme-option"} aria-pressed={theme === value} onClick={() => { onChange(value); setOpen(false); }}>
            <Icon size={17} aria-hidden="true" />
            <span>{names[value]}</span>
            {theme === value && <Check size={16} aria-hidden="true"/>}
          </button>;
        })}
      </div>}
    </div>;
  }

  return <div className="theme-choice" role="group" aria-label="Choose appearance">
    {THEME_OPTIONS.map(value => {
      const Icon = icons[value];
      return <button type="button" key={value} className={theme === value ? "theme-choice-button selected" : "theme-choice-button"} aria-pressed={theme === value} onClick={() => onChange(value)}>
        <Icon size={17} aria-hidden="true" />
        <span>{names[value]}</span>
      </button>;
    })}
  </div>;
}
