import type { ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Maximize2, Minus, X } from "lucide-react";

interface TrafficLightProps {
  className: string;
  label: string;
  onClick: () => void;
  children: ReactNode;
}

function TrafficLight({ className, label, onClick, children }: TrafficLightProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`group flex h-3 w-3 items-center justify-center rounded-full text-black/50 ${className}`}
    >
      <span className="opacity-0 transition-opacity group-hover:opacity-100">
        {children}
      </span>
    </button>
  );
}

export function TitleBar() {
  return (
    <header
      data-tauri-drag-region
      className="bg-background relative flex h-8 shrink-0 items-center gap-2 border-b border-white/5 px-3"
    >
      <TrafficLight
        className="bg-[#ff5f57]"
        label="Cerrar"
        onClick={() => void getCurrentWindow().close().catch(() => {})}
      >
        <X size={7} strokeWidth={2.5} />
      </TrafficLight>
      <TrafficLight
        className="bg-[#febc2e]"
        label="Minimizar"
        onClick={() => void getCurrentWindow().minimize().catch(() => {})}
      >
        <Minus size={7} strokeWidth={2.5} />
      </TrafficLight>
      <TrafficLight
        className="bg-[#28c840]"
        label="Maximizar"
        onClick={() => void getCurrentWindow().toggleMaximize().catch(() => {})}
      >
        <Maximize2 size={7} strokeWidth={2.5} />
      </TrafficLight>
      <span
        data-tauri-drag-region
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground"
      >
        Poe
      </span>
    </header>
  );
}
