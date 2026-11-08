import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

export interface ComposerProps {
  disabled: boolean;
  onSend: (text: string) => Promise<void>;
}

export function Composer({ disabled, onSend }: ComposerProps) {
  const [text, setText] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = !disabled && text.trim().length > 0;

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  async function submit(): Promise<void> {
    const content = text.trim();
    if (disabled || content.length === 0) return;
    await onSend(content);
    setText("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey && !disabled) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className="composer">
      <textarea
        ref={textareaRef}
        className="composer-textarea"
        rows={2}
        placeholder="Escribí un mensaje para Poe…"
        value={text}
        disabled={disabled}
        onChange={(event) => setText(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="composer-send-button"
        disabled={!canSend}
        onClick={() => void submit()}
      >
        Enviar
      </button>
    </div>
  );
}
