#!/usr/bin/env node
import http from "node:http";
// Mock de poe-core para probar visualmente los estados del Orb del Composer.
//
// Uso:
//   1. node scripts/orb-state-mock-core.mjs --port 4103
//   2. VITE_POE_CORE_URL=http://localhost:4103 npm run dev   (en poe-ui)
//   3. Abre la app, escribí "Usá la tool world_time" y enviá.
//
// La secuencia SSE emulada (POST /api/chat/stream) con delays reales:
//   400ms  meta
//   800ms  text "Buena idea, "
//  1100ms  text "consulto la hora."
//  2500ms  tool_use world_time      <- orb debe pasar a "tool"
//  4500ms  tool_result world_time   (<- 2s dentro del estado tool)
//  4900ms  text "Son las "
//  5000ms  text "19:03 UTC."
//  5300ms  usage
//  5500ms  reply_saved              <- orb vuelve a "idle"
//  5700ms  done

const args = process.argv.slice(2);
const portArg = args.indexOf("--port");
const PORT = portArg >= 0 ? Number(args[portArg + 1]) : 4103;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sendEvent(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function handleChatStream(req, res, body) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  await sleep(400);
  sendEvent(res, {
    type: "meta",
    conversationId: "conv-mock",
    model: "mock-sonnet",
  });

  const deltas = ["Buena idea, ", "consulto la hora."];
  for (const delta of deltas) {
    await sleep(300);
    sendEvent(res, { type: "text", delta });
  }

  await sleep(1400);
  console.log("[mock] tool_use world_time");
  sendEvent(res, { type: "tool_use", name: "world_time" });

  await sleep(2000);
  console.log("[mock] tool_result world_time");
  sendEvent(res, {
    type: "tool_result",
    name: "world_time",
    isError: false,
  });

  await sleep(400);
  sendEvent(res, { type: "text", delta: "Son las " });
  await sleep(100);
  sendEvent(res, { type: "text", delta: "19:03 UTC." });

  await sleep(300);
  sendEvent(res, {
    type: "usage",
    conversationId: "conv-mock",
    inputTokens: 42,
    outputTokens: 17,
  });
  await sleep(200);
  sendEvent(res, {
    type: "reply_saved",
    conversationId: "conv-mock",
    replyId: "msg-mock-1",
  });
  await sleep(200);
  sendEvent(res, {
    type: "done",
    text: "Buena idea, consulto la hora.Son las 19:03 UTC.",
  });
  res.end();
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

  let body = "";
  for await (const chunk of req) body += chunk;

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const json = (payload) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  };

  if (url.pathname === "/api/health") {
    return json({ status: "ok" });
  }
  if (url.pathname === "/api/conversations") {
    return json([]);
  }
  if (url.pathname === "/api/mcp/servers") {
    return json([]);
  }
  if (url.pathname === "/api/tokens/count" && req.method === "POST") {
    const text = JSON.parse(body || "{}").text ?? "";
    return json({ tokens: 1, characters: text.length });
  }
  if (url.pathname === "/api/chat" && req.method === "POST") {
    const parsed = JSON.parse(body || "{}");
    return json({
      conversationId: "conv-mock",
      model: "mock-sonnet",
      reply: {
        id: "msg-mock-1",
        conversationId: "conv-mock",
        role: "assistant",
        content: parsed.message,
        createdAt: new Date().toISOString(),
      },
    });
  }
  if (url.pathname === "/api/chat/stream" && req.method === "POST") {
    console.log("[mock] stream solicitado:", JSON.parse(body || "{}").message);
    return void (await handleChatStream(req, res, body));
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`[mock] mock de poe-core en http://localhost:${PORT}`);
});
