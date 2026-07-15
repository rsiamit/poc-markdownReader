import { useEditorStore } from "../store";

export function ThemeToggle(): JSX.Element {
  const { settings, setSettings } = useEditorStore();
  const isDark = settings.theme === "dark";
  return (
    <button
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-base"
      onClick={() => setSettings({ theme: isDark ? "light" : "dark" })}
    >
      {isDark ? "☀" : "☾"}
    </button>
  );
}
