import { useEffect } from "react";
import { Mic, MicOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Orb } from "../fx";
import { motion } from "motion/react";
import type { VoiceState } from "./useVoiceLive";

export interface VoiceOverlayProps {
  state: VoiceState;
  reconnecting: boolean;
  inputTranscript: string;
  outputTranscript: string;
  error: string | null;
  muted: boolean;
  onToggleMute: () => void;
  onClose: () => void;
  onRetry: () => void;
}

function orbEnergyState(state: VoiceState): "idle" | "thinking" | "streaming" | "error" {
  if (state === "thinking") return "thinking";
  if (state === "speaking") return "streaming";
  if (state === "error") return "error";
  return "idle";
}

function statusLabel(state: VoiceState): string {
  switch (state) {
    case "connecting":
      return "Conectando con Poe…";
    case "listening":
      return "Escuchando…";
    case "thinking":
      return "Pensando…";
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-black/85 via-violet-950/80 to-black/90 backdrop-blur-md"
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
            {inputTranscript || statusLabel(state)}
          </p>
        )}
      </div>
    </motion.div>
  );
}
