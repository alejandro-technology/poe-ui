export type MessageRole = "user" | "assistant";

export interface ChatMessageDto {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface ConversationDto {
  id: string;
  title: string;
  systemPrompt: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithMessagesDto extends ConversationDto {
  messages: ChatMessageDto[];
}

export interface SendMessageInput {
  message: string;
  conversationId?: string;
  systemPrompt?: string;
}

export interface SendMessageResultDto {
  conversationId: string;
  model: string;
  reply: ChatMessageDto;
}

export interface CoreHealthDto {
  status: string;
  [key: string]: unknown;
}

export type ChatStreamEventDto =
  | { type: "meta"; conversationId: string; model: string }
  | { type: "text"; delta: string }
  | { type: "tool_use"; name: string }
  | { type: "tool_result"; name: string; isError: boolean }
  | { type: "done"; text: string }
  | { type: "reply_saved"; conversationId: string; replyId: string }
  | { type: "error"; message: string };

export interface McpServerStatusDto {
  name: string;
  url: string;
  connected: boolean;
  tools: string[];
}
