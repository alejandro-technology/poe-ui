import { useEffect, useRef, useState } from "react";
import { formatTokens, totalTokens, type ConversationDto } from "../../core";

export interface ConversationItemProps {
  conversation: ConversationDto;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  totalTokensOverride?: number;
}

const DELETE_CONFIRM_TIMEOUT_MS = 4000;

export function ConversationItem({
  conversation,
  active,
  onSelect,
  onDelete,
  totalTokensOverride,
}: ConversationItemProps) {
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
    <div className="conversation-item-row">
      <button
        type="button"
        className={
          "conversation-item" + (active ? " conversation-item--active" : "")
        }
        onClick={handleSelect}
      >
        <span className="conversation-item-title">{conversation.title}</span>
        <span className="conversation-item-date">{updated}</span>
        <span className="conversation-item-tokens">
          {formatTokens(tokens)} tokens
        </span>
      </button>
      <button
        type="button"
        className={
          "conversation-item-delete" +
          (confirming ? " conversation-item-delete--confirming" : "")
        }
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
      >
        {confirming ? "¿Eliminar?" : "×"}
      </button>
    </div>
  );
}
