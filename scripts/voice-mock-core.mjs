// Mock de poe-core con soporte WS para la prueba visual del modo voz (poe-ui).
//
//   1. node scripts/voice-mock-core.mjs [puerto por defecto 4107]
//   2. VITE_POE_CORE_URL=http://localhost:4107 npm run dev   (en poe-ui)
//
// Timeline sobre /api/voice (loop):
//   start → session → input deltas → output deltas + PCM 24kHz binario
//   → turn-complete | (turn 2) interrupted → go-away → reconnecting → ...
//   WS client se resuelve con el `ws` instalado en poe-core (evita dep duplicada).

import { createRequire } from "node:module";
import http from "node:http";

const ROOT = new URL("../../poe-core/package.json", import.meta.url);
const { WebSocketServer } = createRequire(ROOT)("ws");

const PORT = Number(process.argv[2] ?? 4107);

function pcm24k(ms, hz = 440) {
  const n = Math.floor(24000 * (ms / 1000));
  const buf = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    buf[i] = Math.round(Math.sin((2 * Math.PI * hz * i) / 24000) * 12000);
  }
  return new Uint8Array(buf.buffer);
}

let sendText = () => {};
let keepBinary = () => {};
const timers = [];
function schedule(fn, delay) {
  timers.push(setTimeout(fn, delay));
}

function sequence() {
  timers.push(
    setTimeout(() => {
      sendText({ type: "session", conversationId: `conv-voice-${Date.now().toString(36)}`, model: "mock-live" });
    }, 350),
  );
  schedule(() => sendText({ type: "input-transcript", text: "Hola Poe," }), 700);
  schedule(() => sendText({ type: "input-transcript", text: " ¿cómo estás hoy?" }), 900);
  schedule(() => sendText({ type: "output-transcript", text: "¡Hola! Todo bien," }), 1400);
  schedule(() => {
    keepBinary(pcm24k(330));
  }, 1500);
  schedule(() => sendText({ type: "output-transcript", text: " gracias por preguntar." }), 1800);
  schedule(() => {
    keepBinary(pcm24k(330, 330));
  }, 1900);
  schedule(() => sendText({ type: "turn-complete" }), 2400);

  // Turno 2 con barge-in
  schedule(() => sendText({ type: "input-transcript", text: "Contame algo más largo." }), 3200);
  schedule(() => sendText({ type: "output-transcript", text: "Claro, te cuento una historia" }), 3700);
  schedule(() => {
    keepBinary(pcm24k(330, 260));
  }, 3800);
  schedule(() => sendText({ type: "output-transcript", text: " muy extensa que" }), 4000);
  schedule(() => sendText({ type: "interrupted" }), 4600);
  schedule(() => sendText({ type: "output-transcript", text: "" }), 4605);

  // Reconexión en vivo
  schedule(() => sendText({ type: "go-away", timeLeft: "2s" }), 5400);
  schedule(() => sendText({ type: "reconnecting" }), 5800);
  schedule(() => sendText({ type: "reconnected" }), 6900);
  // Tercer ciclo → reanudar todo
  schedule(() => sendText({ type: "turn-complete" }), 7400);
  schedule(() => sequence(), 8600);
}

function clearTimers() {
  for (const t of timers) clearTimeout(t);
  timers.length = 0;
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const json = (payload) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  };

  if (url.pathname === "/api/health") {
    return json({ status: "ok", voice: { available: true, model: "mock-live" } });
  }
  if (url.pathname === "/api/conversations") {
    return json([]);
  }
  if (url.pathname === "/api/mcp/servers") {
    return json([]);
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });
let globalStartCount = 0;

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/api/voice") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws) => {
  console.log("[mock] ws /api/voice conectado");
  ws.on("close", () => {
    clearTimers();
  });
  ws.on("message", (data, isBinary) => {
    if (isBinary) return;
    let frame;
    try {
      frame = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (frame.type === "start") {
      clearTimers();
      if (++globalStartCount % 2 === 0) {
        // Cada segundo start global: frame error (cubre estado error/reintentar)
        schedule(() => {
          sendText({ type: "error", message: "Error simulado de la sesión de voz" });
        }, 300);
      } else {
        sequence();
      }
    } else if (frame.type === "stop") {
      clearTimers();
      ws.close();
    }
  });
const sendText01 = (event) => ws.send(JSON.stringify(event));
sendText = (event) => sendText01(event);
keepBinary = (bytes) => ws.send(Buffer.from(bytes), { binary: true });
});

server.listen(PORT, () => {
  console.log(`[mock] voice-mock-core en http://localhost:${PORT} (WS /api/voice)`);
});
