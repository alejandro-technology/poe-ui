import { useEffect, useRef, useState } from "react";
import type { TokenCountDto } from "../../core";
import { countTextTokens, formatTokens } from "../../core";

const COUNT_DEBOUNCE_MS = 500;

export interface TokenMeterProps {
  text: string;
  onTextChange: (text: string) => void;
  onClose: () => void;
}

export function TokenMeter({ text, onTextChange, onClose }: TokenMeterProps) {
  const [result, setResult] = useState<TokenCountDto | null>(null);
  const [counting, setCounting] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const requestIdRef = useRef<number>(0);
  const firstRunRef = useRef<boolean>(true);

  // Conteo de tokens: debounced tras cada cambio; el primer conteo al abrir es inmediato.
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
  }, [text]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const characters = text.length;

  let countBody;
  if (error) {
    countBody = null;
  } else if (counting) {
    countBody = <span className="meter-count meter-count--pending">midiendo…</span>;
  } else if (result !== null) {
    countBody = (
      <span className="meter-count">
        <span className="meter-count-value">≈ {formatTokens(result.tokens)}</span>
        <span className="meter-count-unit">
          {" "}tokens · {formatTokens(characters)} caracteres
        </span>
      </span>
    );
  }

  return (
    <div
      className="meter-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="meter-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="token-meter-title"
      >
        <div className="meter-header">
          <span className="meter-title" id="token-meter-title">
            Medidor de tokens
          </span>
          <button
            type="button"
            className="meter-close"
            aria-label="Cerrar"
            title="Cerrar"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <textarea
          className="meter-textarea"
          value={text}
          autoFocus
          placeholder="Pegá un parrafo o escribí algo…"
          onChange={(event) => onTextChange(event.currentTarget.value)}
        />
        {error && (
          <div className="error-banner meter-error">
            No se pudo medir los tokens. ¿Core está corriendo?
          </div>
        )}
        {countBody}
        <p className="meter-note">
          Estimación aproximada con tokenizer offline; los tokens reales dependen
          del modelo
        </p>
      </div>
    </div>
  );
}
