import { useState } from "react";
import type { UiToolCall } from "../hooks/useChat";
import { formatTokens } from "../../core";
import { cn } from "cn";
import {
  ChevronRight,
  CircleCheck,
  CircleX,
  LoaderCircle,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export interface ToolCallListProps {
  calls: UiToolCall[];
}

function toolLabel(name: string): { label: string; server: string | null } {
  if (name.startsWith("mcp__")) {
    const rest = name.slice("mcp__".length);
    const separator = rest.indexOf("__");
    if (separator > 0) {
      return {
        server: rest.slice(0, separator).replace(/_/g, " "),
        label: rest.slice(separator + 2),
      };
    }
  }
  return { label: name, server: null };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toLocaleString("es-AR", {
    maximumFractionDigits: 1,
  })} s`;
}

function StatusIcon({ status }: { status: UiToolCall["status"] }) {
  if (status === "running") {
    return (
      <LoaderCircle
        aria-hidden="true"
        className="text-primary size-3.5 shrink-0 animate-spin"
      />
    );
  }
  if (status === "error") {
    return (
      <CircleX
        aria-hidden="true"
        className="text-destructive size-3.5 shrink-0"
      />
    );
  }
  return (
    <CircleCheck aria-hidden="true" className="text-success size-3.5 shrink-0" />
  );
}

function ToolCallItem({ call }: { call: UiToolCall }) {
  const [open, setOpen] = useState<boolean>(false);
  const reducedMotion = useReducedMotion();
  const { label, server } = toolLabel(call.name);

  const meta: string[] = [];
  if (call.status !== "running" && call.durationMs !== null) {
    meta.push(formatDuration(call.durationMs));
  }
  if (call.status !== "running" && call.resultTokens !== null) {
    meta.push(`≈ ${formatTokens(call.resultTokens)} tokens`);
  }

  const hasInput =
    call.input !== null && Object.keys(call.input).length > 0;
  const hasDetail = hasInput || call.resultPreview !== null;

  return (
    <div className="border-border/70 bg-background/35 overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        disabled={!hasDetail}
        className={cn(
          "focus-visible:ring-ring/40 flex w-full items-center gap-2 px-2.5 py-1.5 text-left outline-none focus-visible:ring-2",
          hasDetail ? "cursor-pointer" : "cursor-default",
        )}
      >
        <StatusIcon status={call.status} />
        <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] font-medium">
          {label}
        </span>
        {server !== null && (
          <span className="bg-primary/10 text-primary shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase">
            {server}
          </span>
        )}
        <span
          className="text-muted-foreground shrink-0 text-[10px] tabular-nums"
          title={
            call.resultTokens !== null
              ? "Cantidad estimada de tokens que el resultado de la tool agrega al contexto"
              : undefined
          }
        >
          {call.status === "running" ? "ejecutando…" : meta.join(" · ")}
        </span>
        {hasDetail && (
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "text-muted-foreground size-3 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && hasDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reducedMotion ? 0.01 : 0.18,
              ease: "easeOut",
            }}
            className="overflow-hidden"
          >
            <div className="border-border/60 flex min-w-0 flex-col gap-2 border-t px-2.5 py-2">
              {hasInput && (
                <div className="min-w-0">
                  <p className="text-muted-foreground mb-1 text-[9.5px] font-bold tracking-[0.08em] uppercase">
                    Argumentos
                  </p>
                  <pre className="bg-background/60 max-h-40 max-w-full overflow-auto rounded-md p-2 font-mono text-[10.5px] leading-relaxed">
                    {JSON.stringify(call.input, null, 2)}
                  </pre>
                </div>
              )}
              {call.resultPreview !== null && (
                <div className="min-w-0">
                  <p className="text-muted-foreground mb-1 text-[9.5px] font-bold tracking-[0.08em] uppercase">
                    Resultado
                  </p>
                  <pre className="bg-background/60 max-h-40 max-w-full overflow-auto rounded-md p-2 font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap">
                    {call.resultPreview}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ToolCallList({ calls }: ToolCallListProps) {
  if (calls.length === 0) return null;

  return (
    <div className="mb-2 flex flex-col gap-1">
      {calls.map((call) => (
        <ToolCallItem key={call.id} call={call} />
      ))}
    </div>
  );
}
