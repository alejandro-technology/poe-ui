import { useEffect, useRef, useState } from "react";
import type { TokenCountDto } from "../../core";
import { countTextTokens, formatTokens } from "../../core";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnimatePresence, motion } from "motion/react";

const COUNT_DEBOUNCE_MS = 500;

export interface TokenMeterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string;
  onTextChange: (text: string) => void;
}

export function TokenMeter({
  open,
  onOpenChange,
  text,
  onTextChange,
}: TokenMeterProps) {
  const [result, setResult] = useState<TokenCountDto | null>(null);
  const [counting, setCounting] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const requestIdRef = useRef<number>(0);
  const firstRunRef = useRef<boolean>(true);

  // Conteo de tokens: debounced tras cada cambio; el primer conteo al abrir es inmediato.
  useEffect(() => {
    if (open) firstRunRef.current = true;
  }, [open]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const delay = firstRunRef.current ? 0 : COUNT_DEBOUNCE_MS;
    firstRunRef.current = false;

    if (text.length === 0) {
      setCounting(false);
      setError(false);
      setResult({ tokens: 0, characters: 0 });
      return;
    }

    setCounting(true);
    setError(false);
    const timer = window.setTimeout(async () => {
      try {
        const counted = await countTextTokens(text);
        if (requestId !== requestIdRef.current) return;
        setResult(counted);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setError(true);
      } finally {
        if (requestId === requestIdRef.current) setCounting(false);
      }
    }, delay);

    return () => {
      window.clearTimeout(timer);
      // Invalida respuestas en vuelo si el texto cambia o el modal se cierra.
      requestIdRef.current += 1;
    };
  }, [text, open]);

  const characters = text.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-md">
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="token-meter-panel"
              initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="glass flex w-full flex-col gap-3 rounded-xl p-5"
            >
              <DialogHeader>
                <DialogTitle>Medidor de tokens</DialogTitle>
                <DialogDescription>
                  Pegá un texto para estimar cuántos tokens ocupa.
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md border-destructive/40 bg-destructive/10 border px-3 py-2 text-xs text-destructive">
                  No se pudo medir los tokens. ¿Core está corriendo?
                </div>
              )}
              <textarea
                value={text}
                placeholder="Escribí o pegá un párrafo…"
                onChange={(event) => onTextChange(event.currentTarget.value)}
                className="bg-background/60 focus-visible:border-ring focus-visible:ring-ring/50 min-h-36 w-full resize-y rounded-lg border border-input px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-3"
              />
              <div className="flex min-h-8 items-center justify-between gap-2">
                {error ? (
                  <span />
                ) : counting ? (
                  <span className="animate-pulse text-sm text-muted-foreground italic">
                    midiendo…
                  </span>
                ) : result !== null ? (
                  <span className="text-sm text-muted-foreground">
                    <span className="text-primary text-2xl font-bold tabular-nums">
                      ≈ {formatTokens(result.tokens)}
                    </span>{" "}
                    tokens · {formatTokens(characters)} caracteres
                  </span>
                ) : null}
                <Badge
                  variant="outline"
                  className="text-[10px] text-muted-foreground"
                >
                  estimación offline
                </Badge>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Estimación aproximada con tokenizer offline; los tokens reales
                dependen del modelo
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
