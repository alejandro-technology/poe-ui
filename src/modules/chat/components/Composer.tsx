import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

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
    <div className="glass-panel bg-card/30 relative flex shrink-0 items-end gap-3 border-t px-5 py-3.5">
      <textarea
        ref={textareaRef}
        rows={2}
        placeholder="Escribí un mensaje para Poe…"
        value={text}
        disabled={disabled}
        onChange={(event) => setText(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        className="bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex-1 resize-none rounded-lg border border-input px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button
        type="button"
        className="h-10 px-4"
        disabled={!canSend}
        onClick={() => void submit()}
      >
        Enviar
        <Send data-icon="inline-end" />
      </Button>
    </div>
  );
}
