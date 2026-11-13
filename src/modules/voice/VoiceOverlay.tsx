import { useEffect } from "react";
import { Mic, MicOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Orb } from "../fx";
import type { OrbEnergyState } from "../fx";
import { motion } from "motion/react";
import type { VoiceState } from "./useVoiceLive";

export interface VoiceOverlayProps {
  state: VoiceState;
  reconnecting: boolean;
  inputTranscript: string;
  outputTranscript: string;
  activeToolName: string | null;
  error: string | null;
  muted: boolean;
  onToggleMute: () => void;
  onClose: () => void;
  onRetry: () => void;
}

function orbEnergyState(state: VoiceState): OrbEnergyState {
  if (state === "thinking") return "thinking";
  if (state === "tool") return "tool";
  if (state === "speaking") return "streaming";
  if (state === "error") return "error";
  return "idle";
}

function statusLabel(
  state: VoiceState,
  activeToolName: string | null,
): string {
  switch (state) {
    case "connecting":
      return "Conectando con Poe…";
    case "listening":
      return "Escuchando…";
    case "thinking":
      return "Pensando…";
    case "tool":
      return activeToolName === null
        ? "Ejecutando herramienta…"
        : `Ejecutando ${activeToolName}…`;
    case "speaking":
      return "Poe está hablando…";
    case "error":
      return "Error";
    default:
      return "";
  }
}

export function VoiceOverlay({
  state,
  reconnecting,
  inputTranscript,
  outputTranscript,
  activeToolName,
  error,
  muted,
  onToggleMute,
  onClose,
  onRetry,
}: VoiceOverlayProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      data-tauri-drag-region
      className="fixed inset-0 z-50 flex flex-col items-center justify-center rounded-[10px] bg-background/40"
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-white/80 hover:text-white"
          onClick={onToggleMute}
          aria-label={muted ? "Activar micrófono" : "Silenciar micrófono"}
        >
          {muted ? <MicOff /> : <Mic />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-white/80 hover:text-white"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X />
        </Button>
      </div>

      {reconnecting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
          Reconectando…
        </div>
      )}

      <div className="absolute top-16 left-0 right-0 px-8 text-center">
        <p className="text-lg text-white/90 min-h-[1.5rem]">
          {outputTranscript}
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <Orb size={280} state={orbEnergyState(state)} />
      </div>

      <div className="absolute bottom-24 left-0 right-0 px-8 text-center">
        {state === "error" ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-red-300">{error ?? "Error de voz"}</p>
            <Button type="button" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : (
          <p className="text-sm text-white/70 min-h-[1.25rem]">
            {inputTranscript || statusLabel(state, activeToolName)}
          </p>
        )}
      </div>
    </motion.div>
  );
}
