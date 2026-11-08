import { CORE_BASE_URL } from "../../config";
import type {
  ChatStreamEventDto,
  CoreHealthDto,
  ConversationDto,
  ConversationWithMessagesDto,
  McpServerStatusDto,
  SendMessageInput,
  SendMessageResultDto,
} from "./dto";
import { CoreApiError, fetchJson } from "./http";

const SSE_TIMEOUT_MS = 300_000;

export function getHealth(): Promise<CoreHealthDto> {
  return fetchJson<CoreHealthDto>("/api/health");
}

export function sendMessage(
  input: SendMessageInput,
): Promise<SendMessageResultDto> {
  const body: Record<string, string> = { message: input.message };
  if (input.conversationId !== undefined) {
    body.conversationId = input.conversationId;
  }
  if (input.systemPrompt !== undefined) {
    body.systemPrompt = input.systemPrompt;
  }

  return fetchJson<SendMessageResultDto>("/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listConversations(): Promise<ConversationDto[]> {
  return fetchJson<ConversationDto[]>("/api/conversations");
}

export function getConversation(
  id: string,
): Promise<ConversationWithMessagesDto> {
  return fetchJson<ConversationWithMessagesDto>(
    `/api/conversations/${encodeURIComponent(id)}`,
  );
}

export function getMcpServers(): Promise<McpServerStatusDto[]> {
  return fetchJson<McpServerStatusDto[]>("/api/mcp/servers");
}

function isChatStreamEvent(value: unknown): value is ChatStreamEventDto {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === "meta" ||
    type === "text" ||
    type === "tool_use" ||
    type === "tool_result" ||
    type === "done" ||
    type === "reply_saved" ||
    type === "error"
  );
}

function findFrameDelimiter(
  buffer: string,
): { index: number; length: number } | null {
  const crlfIndex = buffer.indexOf("\r\n\r\n");
  const lfIndex = buffer.indexOf("\n\n");
  if (crlfIndex === -1 && lfIndex === -1) return null;
  if (crlfIndex === -1) return { index: lfIndex, length: 2 };
  if (lfIndex === -1) return { index: crlfIndex, length: 4 };
  return crlfIndex < lfIndex
    ? { index: crlfIndex, length: 4 }
    : { index: lfIndex, length: 2 };
}

function processFrame(
  frame: string,
  onEvent: (event: ChatStreamEventDto) => void,
): void {
  const dataLines: string[] = [];
  for (const rawLine of frame.split(/\r?\n/)) {
    if (rawLine.startsWith("data:")) {
      dataLines.push(rawLine.slice(5).replace(/^ /, ""));
    }
  }
  if (dataLines.length === 0) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(dataLines.join("\n"));
  } catch (err) {
    console.warn("[poe-ui] evento SSE ignorado", err);
    return;
  }

  if (!isChatStreamEvent(parsed)) {
    console.warn("[poe-ui] evento SSE ignorado", parsed);
    return;
  }

  onEvent(parsed);
}

export async function streamChatMessage(
  input: SendMessageInput,
  onEvent: (event: ChatStreamEventDto) => void,
  signal?: AbortSignal,
): Promise<void> {
  const body: Record<string, string> = { message: input.message };
  if (input.conversationId !== undefined) {
    body.conversationId = input.conversationId;
  }
  if (input.systemPrompt !== undefined) {
    body.systemPrompt = input.systemPrompt;
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "text/event-stream");

  const timeoutSignal = AbortSignal.timeout(SSE_TIMEOUT_MS);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  let res: Response;
  try {
    res = await fetch(`${CORE_BASE_URL}/api/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: combinedSignal,
    });
  } catch {
    throw new CoreApiError("Core inaccesible", null);
  }

  if (!res.ok) {
    let bodyText = "";
    try {
      bodyText = (await res.text()).trim();
    } catch {
      bodyText = "";
    }
    const detail = bodyText.length > 0 ? `: ${bodyText}` : "";
    throw new CoreApiError(`Core devolvió ${res.status}${detail}`, res.status);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const drainFrames = (): void => {
    let delimiter = findFrameDelimiter(buffer);
    while (delimiter !== null) {
      const frame = buffer.slice(0, delimiter.index);
      buffer = buffer.slice(delimiter.index + delimiter.length);
      processFrame(frame, onEvent);
      delimiter = findFrameDelimiter(buffer);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    drainFrames();
  }

  buffer += decoder.decode();
  drainFrames();
  if (buffer.trim().length > 0) {
    processFrame(buffer, onEvent);
  }
}
