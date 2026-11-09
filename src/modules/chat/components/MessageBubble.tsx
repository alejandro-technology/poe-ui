import { forwardRef, useEffect, useRef, useState } from "react";
import type { UiChatMessage } from "../hooks/useChat";
import { MessageMarkdown } from "./MessageMarkdown";
import { ToolCallList } from "./ToolCallList";
import { cn } from "cn";
import { Check, Copy } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export interface MessageBubbleProps {
  message: UiChatMessage;
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(area);
  if (!copied) throw new Error("No se pudo copiar");
}

function CopyMessageButton({ text }: { text: string }) {
  const [copied, setCopied] = useState<boolean>(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function copy(): Promise<void> {
    try {
      await writeClipboard(text);
      setCopied(true);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      aria-label={copied ? "Mensaje copiado" : "Copiar mensaje"}
      className="text-muted-foreground hover:text-card-foreground focus-visible:ring-ring/50 inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-foreground/10 focus-visible:ring-2 focus-visible:outline-none"
      onClick={() => void copy()}
      title={copied ? "Copiado" : "Copiar mensaje"}
    >
      {copied ? (
        <Check aria-hidden="true" className="text-success size-3.5" />
      ) : (
        <Copy aria-hidden="true" className="size-3.5" />
      )}
    </button>
  );
}

export const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
  function MessageBubble({ message }, ref) {
    const reducedMotion = useReducedMotion();
    const time = new Date(message.createdAt).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const streaming = message.status === "streaming";
    const isUser = message.role === "user";

    return (
      <motion.div
        ref={ref}
        className={cn(
          "flex w-full",
          isUser ? "justify-end" : "justify-start",
        )}
        initial={{
          opacity: 0,
          y: reducedMotion ? 0 : 18,
          x: isUser && !reducedMotion ? 12 : 0,
          scale: reducedMotion ? 1 : 0.96,
        }}
        animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
        exit={{
          opacity: 0,
          y: reducedMotion ? 0 : -8,
          scale: reducedMotion ? 1 : 0.98,
        }}
        transition={
          reducedMotion
            ? { duration: 0.01 }
            : { type: "spring", stiffness: 320, damping: 26 }
        }
      >
        <div
          className={cn(
            "max-w-3xl min-w-0 break-words rounded-2xl px-4 pt-2.5 pb-1.5 text-sm leading-relaxed transition-opacity",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card text-card-foreground rounded-bl-md border",
            message.status === "sending" && "opacity-60",
            message.status === "error" &&
              "border-destructive/50 bg-destructive/10 text-destructive",
          )}
        >
          <ToolCallList calls={message.toolCalls} />
          {isUser ? (
            <div className="wrap-anywhere whitespace-pre-wrap">
              {message.content}
            </div>
          ) : (
            <div className={cn(streaming && "streaming-caret")}>
              <MessageMarkdown content={message.content} />
            </div>
          )}
          <div className="mt-1 flex items-center justify-end gap-1">
            {!isUser && <CopyMessageButton text={message.content} />}
            <span className="text-[10.5px] tracking-wide opacity-60">
              {time}
            </span>
          </div>
        </div>
      </motion.div>
    );
  },
);
