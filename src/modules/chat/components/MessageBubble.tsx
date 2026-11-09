import { forwardRef } from "react";
import type { UiChatMessage } from "../hooks/useChat";
import { ToolCallList } from "./ToolCallList";
import { cn } from "cn";
import { motion, useReducedMotion } from "motion/react";

export interface MessageBubbleProps {
  message: UiChatMessage;
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
          <div
            className={cn(
              "wrap-anywhere whitespace-pre-wrap",
              streaming && "streaming-caret",
            )}
          >
            {message.content}
          </div>
          <span className="mt-1 block text-right text-[10.5px] tracking-wide opacity-60">
            {time}
          </span>
        </div>
      </motion.div>
    );
  },
);
