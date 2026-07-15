import { useEffect, useState } from "react";

export interface Toast {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

let toastListeners: ((t: Toast) => void)[] = [];

export function showToast(message: string, type: Toast["type"] = "info"): void {
  const toast: Toast = { id: crypto.randomUUID(), message, type };
  toastListeners.forEach((fn) => fn(toast));
}

const typeStyles: Record<Toast["type"], string> = {
  info: "bg-blue-600 text-white",
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  warning: "bg-amber-500 text-white",
};

export function Toasts(): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (t: Toast): void => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 4000);
    };
    toastListeners.push(handler);
    return () => { toastListeners = toastListeners.filter((fn) => fn !== handler); };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded shadow-lg text-sm pointer-events-auto ${typeStyles[t.type]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
