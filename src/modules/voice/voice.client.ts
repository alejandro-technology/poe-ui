import { CORE_BASE_URL } from "../../config";

export interface VoiceClientHandlers {
  onSession: (conversationId: string, model: string) => void;
  onInputTranscript: (text: string) => void;
  onOutputTranscript: (text: string) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onGoAway: (timeLeft?: number) => void;
  onReconnecting: () => void;
  onReconnected: () => void;
  onError: (message: string) => void;
  onAudio: (buffer: ArrayBuffer) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

function voiceWsUrl(): string {
  const url = new URL(CORE_BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/api/voice";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export class VoiceClient {
  private ws: WebSocket | null = null;
  private handlers: VoiceClientHandlers;

  constructor(handlers: VoiceClientHandlers) {
    this.handlers = handlers;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(voiceWsUrl());
      } catch (err) {
        reject(err);
        return;
      }
      ws.binaryType = "arraybuffer";
      ws.onopen = () => {
        this.ws = ws;
        this.handlers.onOpen?.();
        resolve();
      };
      ws.onmessage = (event: MessageEvent) => this.dispatch(event);
      ws.onclose = () => {
        this.ws = null;
        this.handlers.onClose?.();
      };
      ws.addEventListener(
        "error",
        () => {
          if (ws.readyState !== WebSocket.OPEN) reject(new Error("WebSocket error"));
        },
        { once: true },
      );
    });
  }

  sendStart(): void {
    this.sendText({ type: "start" });
  }

  sendStop(): void {
    this.sendText({ type: "stop" });
  }

  sendAudio(buffer: ArrayBuffer): void {
    const ws = this.ws;
    if (ws !== null && ws.readyState === WebSocket.OPEN) {
      ws.send(buffer);
    }
  }

  close(): void {
    const ws = this.ws;
    this.ws = null;
    if (ws !== null) {
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
  }

  private sendText(frame: { type: string }): void {
    const ws = this.ws;
    if (ws !== null && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(frame));
    }
  }

  private dispatch(event: MessageEvent): void {
    const data = event.data;
    if (typeof data === "string") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        return;
      }
      if (typeof parsed !== "object" || parsed === null) return;
      const type = (parsed as { type?: unknown }).type;
      switch (type) {
        case "session": {
          const p = parsed as { conversationId?: unknown; model?: unknown };
          if (typeof p.conversationId === "string" && typeof p.model === "string") {
            this.handlers.onSession(p.conversationId, p.model);
          }
          break;
        }
        case "input-transcript": {
          const p = parsed as { text?: unknown };
          if (typeof p.text === "string") this.handlers.onInputTranscript(p.text);
          break;
        }
        case "output-transcript": {
          const p = parsed as { text?: unknown };
          if (typeof p.text === "string") this.handlers.onOutputTranscript(p.text);
          break;
        }
        case "interrupted":
          this.handlers.onInterrupted();
          break;
        case "turn-complete":
          this.handlers.onTurnComplete();
          break;
        case "go-away": {
          const p = parsed as { timeLeft?: unknown };
          this.handlers.onGoAway(
            typeof p.timeLeft === "number" ? p.timeLeft : undefined,
          );
          break;
        }
        case "reconnecting":
          this.handlers.onReconnecting();
          break;
        case "reconnected":
          this.handlers.onReconnected();
          break;
        case "error": {
          const p = parsed as { message?: unknown };
          this.handlers.onError(
            typeof p.message === "string" ? p.message : "Error de voz",
          );
          break;
        }
        default:
          break;
      }
      return;
    }
    if (data instanceof ArrayBuffer) {
      this.handlers.onAudio(data);
      return;
    }
    if (data instanceof Blob) {
      void data.arrayBuffer().then((buf) => this.handlers.onAudio(buf));
    }
  }
}
