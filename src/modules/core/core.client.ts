import type {
  CoreHealthDto,
  ConversationDto,
  ConversationWithMessagesDto,
  SendMessageInput,
  SendMessageResultDto,
} from "./dto";
import { fetchJson } from "./http";

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
