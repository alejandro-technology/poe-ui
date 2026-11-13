import { useCallback, useRef, useState } from "react";
import { VoiceClient } from "./voice.client";

export type VoiceState =
  | "connecting"
  | "listening"
  | "thinking"
  | "tool"
  | "speaking"
  | "error";

export interface UseVoiceLiveOptions {
  refresh: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
}

export interface UseVoiceLiveResult {
  active: boolean;
  state: VoiceState;
  reconnecting: boolean;
  inputTranscript: string;
  outputTranscript: string;
  activeToolName: string | null;
  error: string | null;
  muted: boolean;
  conversationId: string | null;
  open: () => Promise<void>;
  close: () => void;
  retry: () => Promise<void>;
  toggleMute: () => void;
}

const MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

export function useVoiceLive(options: UseVoiceLiveOptions): UseVoiceLiveResult {
  const [active, setActive] = useState(false);
  const [state, setState] = useState<VoiceState>("connecting");
  const [reconnecting, setReconnecting] = useState(false);
  const [inputTranscript, setInputTranscript] = useState("");
  const [outputTranscript, setOutputTranscript] = useState("");
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const clientRef = useRef<VoiceClient | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const captureSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const captureNodeRef = useRef<AudioWorkletNode | null>(null);
  const captureGainRef = useRef<GainNode | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackNodeRef = useRef<AudioWorkletNode | null>(null);
  const playbackFallbackRef = useRef(false);
  const mutedRef = useRef(false);
  const closingRef = useRef(false);
  const thinkingTimerRef = useRef<number | null>(null);

  const clearThinkingTimer = useCallback(() => {
    if (thinkingTimerRef.current !== null) {
      window.clearTimeout(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
  }, []);

  const scheduleThinking = useCallback(() => {
    clearThinkingTimer();
    thinkingTimerRef.current = window.setTimeout(() => {
      setState((prev) => (prev === "listening" ? "thinking" : prev));
    }, 700);
  }, [clearThinkingTimer]);

  const cleanupAudio = useCallback(() => {
    try {
      captureNodeRef.current?.disconnect();
    } catch {
      // ignore
    }
    try {
      captureSourceRef.current?.disconnect();
    } catch {
      // ignore
    }
    try {
      captureGainRef.current?.disconnect();
    } catch {
      // ignore
    }
    captureNodeRef.current = null;
    captureSourceRef.current = null;
    captureGainRef.current = null;
    if (captureCtxRef.current) {
      void captureCtxRef.current.close();
      captureCtxRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    try {
      playbackNodeRef.current?.disconnect();
    } catch {
      // ignore
    }
    playbackNodeRef.current = null;
    if (playbackCtxRef.current) {
      void playbackCtxRef.current.close();
      playbackCtxRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    closingRef.current = true;
    clearThinkingTimer();
    const client = clientRef.current;
    clientRef.current = null;
    if (client) {
      client.sendStop();
      window.setTimeout(() => client.close(), 50);
    }
    cleanupAudio();
    setActive(false);
    setState("connecting");
    setReconnecting(false);
    setMuted(false);
    mutedRef.current = false;
    setActiveToolName(null);
    const cid = conversationId;
    void options.refresh();
    if (cid) void options.selectConversation(cid);
  }, [cleanupAudio, clearThinkingTimer, conversationId, options]);

  const open = useCallback(async () => {
    closingRef.current = false;
    setActive(true);
    setState("connecting");
    setError(null);
    setInputTranscript("");
    setOutputTranscript("");
    setReconnecting(false);
    setConversationId(null);
    setMuted(false);
    mutedRef.current = false;
    setActiveToolName(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS });
    } catch (err) {
      const msg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Habilitá el micrófono para usar la voz."
          : "No se pudo acceder al micrófono.";
      setError(msg);
      setState("error");
      return;
    }
    streamRef.current = stream;

    let captureCtx: AudioContext;
    try {
      captureCtx = new AudioContext({ sampleRate: 48000 });
    } catch {
      captureCtx = new AudioContext();
    }
    try {
      await captureCtx.resume();
    } catch {
      // ignore
    }
    captureCtxRef.current = captureCtx;
    try {
      await captureCtx.audioWorklet.addModule(
        new URL("./audio/capture.worklet.ts", import.meta.url),
      );
    } catch (err) {
      setError("No se pudo cargar el procesador de captura.");
      setState("error");
      cleanupAudio();
      return;
    }
    const source = captureCtx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(captureCtx, "capture-processor");
    const gain = captureCtx.createGain();
    gain.gain.value = 0;
    source.connect(node);
    node.connect(gain);
    gain.connect(captureCtx.destination);
    captureSourceRef.current = source;
    captureNodeRef.current = node;
    captureGainRef.current = gain;
    node.port.onmessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; buffer?: ArrayBuffer };
      if (data?.type === "audio" && data.buffer) {
        if (mutedRef.current) return;
        clientRef.current?.sendAudio(data.buffer);
      }
    };

    let playbackCtx: AudioContext;
    let fallback = false;
    try {
      playbackCtx = new AudioContext({ sampleRate: 24000 });
      if (playbackCtx.sampleRate !== 24000) {
        playbackCtx.close();
        throw new Error("unsupported rate");
      }
    } catch {
      playbackCtx = new AudioContext({ sampleRate: 48000 });
      fallback = true;
    }
    try {
      await playbackCtx.resume();
    } catch {
      // ignore
    }
    playbackCtxRef.current = playbackCtx;
    playbackFallbackRef.current = fallback;
    try {
      await playbackCtx.audioWorklet.addModule(
        new URL("./audio/playback.worklet.ts", import.meta.url),
      );
    } catch (err) {
      setError("No se pudo cargar el procesador de reproducción.");
      setState("error");
      cleanupAudio();
      return;
    }
    const playbackNode = new AudioWorkletNode(playbackCtx, "playback-processor");
    playbackNode.connect(playbackCtx.destination);
    playbackNodeRef.current = playbackNode;

    const client = new VoiceClient({
      onSession: (cid, _model) => {
        setConversationId(cid);
        setState("listening");
      },
      onInputTranscript: (text) => {
        setInputTranscript((prev) => prev + text);
        scheduleThinking();
      },
      onOutputTranscript: (text) => {
        clearThinkingTimer();
        setState("speaking");
        setOutputTranscript((prev) => prev + text);
      },
      onToolStart: (name) => {
        clearThinkingTimer();
        setActiveToolName(name);
        setState("tool");
      },
      onToolResult: () => {
        setActiveToolName(null);
        setState((prev) => (prev === "tool" ? "thinking" : prev));
      },
      onInterrupted: () => {
        clearThinkingTimer();
        playbackNodeRef.current?.port.postMessage({ type: "clear" });
        setOutputTranscript("");
        setState("listening");
      },
      onTurnComplete: () => {
        clearThinkingTimer();
        setInputTranscript("");
        setOutputTranscript("");
        setState("listening");
      },
      onGoAway: () => {
        setReconnecting(true);
      },
      onReconnecting: () => {
        setReconnecting(true);
      },
      onReconnected: () => {
        setReconnecting(false);
      },
      onError: (msg) => {
        clearThinkingTimer();
        setError(msg);
        setState("error");
      },
      onAudio: (buf) => {
        clearThinkingTimer();
        setState("speaking");
        let toSend: ArrayBuffer = buf;
        if (playbackFallbackRef.current) {
          const src = new Int16Array(buf);
          const out = new Int16Array(src.length * 2);
          for (let i = 0; i < src.length; i++) {
            out[i * 2] = src[i];
            out[i * 2 + 1] = src[i];
          }
          toSend = out.buffer;
        }
        playbackNodeRef.current?.port.postMessage(
          { type: "pcm", buffer: toSend },
          [toSend],
        );
      },
      onClose: () => {
        if (!closingRef.current) {
          // unexpected
        }
      },
    });

    try {
      await client.connect();
    } catch (err) {
      setError("No se pudo conectar con Poe.");
      setState("error");
      cleanupAudio();
      return;
    }
    clientRef.current = client;
    client.sendStart();
  }, [cleanupAudio, clearThinkingTimer, scheduleThinking, options]);

  const retry = useCallback(async () => {
    close();
    await new Promise((r) => window.setTimeout(r, 100));
    await open();
  }, [close, open]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      const stream = streamRef.current;
      if (stream) {
        for (const track of stream.getAudioTracks()) track.enabled = !next;
      }
      return next;
    });
  }, []);

  return {
    active,
    state,
    reconnecting,
    inputTranscript,
    outputTranscript,
    activeToolName,
    error,
    muted,
    conversationId,
    open,
    close,
    retry,
    toggleMute,
  };
}
