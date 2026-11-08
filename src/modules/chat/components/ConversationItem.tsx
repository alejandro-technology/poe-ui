import { useEffect, useRef, useState } from "react";
import { formatTokens, totalTokens, type ConversationDto } from "../../core";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export interface ConversationItemProps {
  conversation: ConversationDto;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  totalTokensOverride?: number;
  animationIndex: number;
}

const DELETE_CONFIRM_TIMEOUT_MS = 4000;

export function ConversationItem({
  conversation,
  active,
  onSelect,
  onDelete,
  totalTokensOverride,
  animationIndex,
}: ConversationItemProps) {
  const reducedMotion = useReducedMotion();
  const [confirming, setConfirming] = useState<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updated = new Date(conversation.updatedAt).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const tokens = totalTokensOverride ?? totalTokens(conversation);

  const clearTimer = (): void => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const resetConfirm = (): void => {
    clearTimer();
    setConfirming(false);
  };

  useEffect(() => clearTimer, []);

  function handleSelect(): void {
    resetConfirm();
    onSelect(conversation.id);
  }

  function handleDelete(): void {
    if (!confirming) {
      clearTimer();
      setConfirming(true);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setConfirming(false);
      }, DELETE_CONFIRM_TIMEOUT_MS);
      return;
    }

    resetConfirm();
    onDelete(conversation.id);
  }

  return (
    <motion.div
      className="group/row flex items-start gap-1 rounded-md"
      initial={{
        opacity: animationIndex >= 8 || reducedMotion ? 1 : 0,
        y: animationIndex >= 8 || reducedMotion ? 0 : 4,
      }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.92 }}
      transition={{
        duration: reducedMotion ? 0.01 : 0.18,
        delay: reducedMotion || animationIndex >= 8 ? 0 : animationIndex * 0.025,
      }}
    >
      <button
        type="button"
        onClick={handleSelect}
        className={cn(
          "relative flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          active
            ? "text-sidebar-accent-foreground"
            : "hover:bg-muted/50",
        )}
      >
        {active && (
          <motion.div
            layoutId="conv-active-pill"
            aria-hidden="true"
            className="absolute inset-0 rounded-md bg-sidebar-accent"
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
          />
        )}
        <span className="relative z-10 line-clamp-1 max-w-full text-sm font-medium">
          {conversation.title}
        </span>
        <span className="relative z-10 text-xs whitespace-nowrap text-muted-foreground">
          {updated}
        </span>
        <Badge
          variant="ghost"
          className="relative z-10 mt-0.5 h-4 bg-muted/70 px-1.5 text-[10px] font-semibold text-muted-foreground"
        >
          {formatTokens(tokens)} tokens
        </Badge>
      </button>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        title={
          confirming
            ? "Click para eliminar definitivamente"
            : "Eliminar conversación"
        }
        aria-label={
          confirming
            ? "Confirmar eliminación de la conversación"
            : "Eliminar conversación"
        }
        onClick={(event) => {
          event.stopPropagation();
          handleDelete();
        }}
        onBlur={resetConfirm}
        className={cn(
          "mt-2 shrink-0 opacity-0 transition-opacity group-hover/row:opacity-60 focus-visible:opacity-100 hover:bg-destructive/10 hover:text-destructive hover:opacity-100",
          confirming &&
            "h-auto bg-destructive/15 px-2 text-[10px] font-bold text-destructive opacity-100 hover:bg-destructive/20",
        )}
      >
        {confirming ? "¿Eliminar?" : <Trash2 />}
      </Button>
    </motion.div>
  );
}
