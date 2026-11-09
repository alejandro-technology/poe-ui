import { useCallback, useRef, useState } from "react";
import type { MessageRole } from "../../core";
import {
  CoreApiError,
  getConversation,
  streamChatMessage,
  updateConversation,
} from "../../core";

export interface UiToolCall {
  id: string;
  name: string;
  input: Record<string, unknown> | null;
  status: "running" | "ok" | "error";
  durationMs: number | null;
  resultTokens: number | null;
  resultPreview: string | null;
}

export interface UiChatMessage {
  key: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  status: "sent" | "sending" | "streaming" | "error";
  toolCalls: UiToolCall[];
}

export interface UseChatResult {
  activeConversationId: string | null;
  activeTotalTokens: number | null;
  activeSystemPrompt: string | null;
  messages: UiChatMessage[];
  isSending: boolean;
  messagesLoading: boolean;
  sendError: string | null;
  lastUpdateToken: number;
  selectConversation: (id: string) => Promise<void>;
  startNewConversation: () => void;
  sendMessage: (text: string) => Promise<void>;
  saveSystemPrompt: (prompt: string) => Promise<void>;
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.length > 0) return err.message;
  return fallback;
}

export function useChat(): UseChatResult {
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [activeTotalTokens, setActiveTotalTokens] = useState<number | null>(
    null,
  );
  const [activeSystemPrompt, setActiveSystemPrompt] = useState<string | null>(
    "",
  );
  const [pendingSystemPrompt, setPendingSystemPrompt] = useState<string>("");
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastUpdateToken, setLastUpdateToken] = useState<number>(0);
  const selectionRequestRef = useRef<number>(0);

  const selectConversation = useCallback(
    async (id: string): Promise<void> => {
      if (id === activeConversationId) return;

      const requestId = ++selectionRequestRef.current;
      setActiveConversationId(id);
      setSendError(null);
      setPendingSystemPrompt("");
      setMessagesLoading(true);
      try {
        const conversation = await getConversation(id);
        if (requestId !== selectionRequestRef.current) return;
        setActiveTotalTokens(
          conversation.inputTokens + conversation.outputTokens,
        );
        setActiveSystemPrompt(conversation.systemPrompt);
        setMessages(
          conversation.messages.map((message) => ({
            key: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
            status: "sent",
            toolCalls: message.toolCalls.map((call) => ({
              id: call.id,
              name: call.name,
              input: call.input,
              status: call.isError ? ("error" as const) : ("ok" as const),
              durationMs: call.durationMs,
              resultTokens: call.resultTokens,
              resultPreview: call.resultPreview,
            })),
          })),
        );
      } catch (err) {
        if (requestId !== selectionRequestRef.current) return;
        setMessages([]);
        setSendError(describeError(err, "No se pudo cargar la conversación"));
      } finally {
        if (requestId === selectionRequestRef.current) {
          setMessagesLoading(false);
        }
      }
    },
    [activeConversationId],
  );

  const startNewConversation = useCallback((): void => {
    selectionRequestRef.current += 1;
    setActiveConversationId(null);
    setActiveTotalTokens(null);
    setActiveSystemPrompt("");
    setPendingSystemPrompt("");
    setMessages([]);
    setMessagesLoading(false);
    setSendError(null);
  }, []);

  const saveSystemPrompt = useCallback(
    async (prompt: string): Promise<void> => {
      if (activeConversationId === null) {
        setPendingSystemPrompt(prompt);
        setActiveSystemPrompt(prompt);
        return;
      }

      const conversation = await updateConversation(activeConversationId, {
        systemPrompt: prompt,
      });
      setActiveSystemPrompt(conversation.systemPrompt);
      setLastUpdateToken((token) => token + 1);
    },
    [activeConversationId],
  );

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const content = text.trim();
      if (content.length === 0 || isSending) return;

      const optimisticKey = crypto.randomUUID();
      const optimisticMessage: UiChatMessage = {
        key: optimisticKey,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
        status: "sending",
        toolCalls: [],
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setIsSending(true);
      setSendError(null);

      let assistantKey: string | null = null;
      let metaReceived = false;

      const markUserSent = (): void => {
        setMessages((prev) =>
          prev.map((message) =>
            message.key === optimisticKey
              ? { ...message, status: "sent" as const }
              : message,
          ),
        );
      };

      const failAssistant = (): void => {
        if (!assistantKey) return;
        const key = assistantKey;
        setMessages((prev) => {
          const target = prev.find((message) => message.key === key);
          if (!target) return prev;
          if (target.content.length === 0) {
            return prev.filter((message) => message.key !== key);
          }
          return prev.map((message) =>
            message.key === key
              ? { ...message, status: "error" as const }
              : message,
          );
        });
      };

      const systemPrompt =
        activeConversationId === null && pendingSystemPrompt.trim().length > 0
          ? pendingSystemPrompt.trim()
          : undefined;

      try {
        await streamChatMessage(
          {
            message: content,
            conversationId: activeConversationId ?? undefined,
            systemPrompt,
          },
          (event) => {
            switch (event.type) {
              case "meta": {
                metaReceived = true;
                markUserSent();
                if (activeConversationId === null) {
                  setActiveConversationId(event.conversationId);
                  setActiveTotalTokens(0);
                  setPendingSystemPrompt("");
                }
                const key = crypto.randomUUID();
                assistantKey = key;
                setMessages((prev) => [
                  ...prev,
                  {
                    key,
                    role: "assistant",
                    content: "",
                    createdAt: new Date().toISOString(),
                    status: "streaming",
                    toolCalls: [],
                  },
                ]);
                break;
              }
              case "text": {
                if (!assistantKey) break;
                const key = assistantKey;
                setMessages((prev) =>
                  prev.map((message) =>
                    message.key === key
                      ? { ...message, content: message.content + event.delta }
                      : message,
                  ),
                );
                break;
              }
              case "tool_use": {
                if (!assistantKey) break;
                const key = assistantKey;
                const toolCall: UiToolCall = {
                  id: event.id,
                  name: event.name,
                  input: event.input,
                  status: "running",
                  durationMs: null,
                  resultTokens: null,
                  resultPreview: null,
                };
                setMessages((prev) =>
                  prev.map((message) =>
                    message.key === key
                      ? {
                          ...message,
                          toolCalls: [...message.toolCalls, toolCall],
                        }
                      : message,
                  ),
                );
                break;
              }
              case "tool_result": {
                if (!assistantKey) break;
                const key = assistantKey;
                setMessages((prev) =>
                  prev.map((message) =>
                    message.key === key
                      ? {
                          ...message,
                          toolCalls: message.toolCalls.map((toolCall) =>
                            toolCall.id === event.id
                              ? {
                                  ...toolCall,
                                  status: event.isError
                                    ? ("error" as const)
                                    : ("ok" as const),
                                  durationMs: event.durationMs,
                                  resultTokens: event.resultTokens,
                                  resultPreview: event.resultPreview,
                                }
                              : toolCall,
                          ),
                        }
                      : message,
                  ),
                );
                break;
              }
              case "done": {
                if (!assistantKey) break;
                const key = assistantKey;
                setMessages((prev) =>
                  prev.map((message) =>
                    message.key === key
                      ? { ...message, content: event.text }
                      : message,
                  ),
                );
                break;
              }
              case "usage": {
                setActiveTotalTokens(
                  (prev) =>
                    (prev ?? 0) + event.inputTokens + event.outputTokens,
                );
                break;
              }
              case "reply_saved": {
                if (!assistantKey) break;
                const oldKey = assistantKey;
                const newKey = event.replyId;
                assistantKey = newKey;
                setMessages((prev) =>
                  prev.map((message) =>
                    message.key === oldKey
                      ? { ...message, key: newKey, status: "sent" as const }
                      : message,
                  ),
                );
                break;
              }
              case "error": {
                failAssistant();
                setSendError(`No se pudo enviar: ${event.message}`);
                break;
              }
            }
          },
        );
      } catch (err) {
        failAssistant();
        if (!metaReceived) {
          setMessages((prev) =>
            prev.map((message) =>
              message.key === optimisticKey
                ? { ...message, status: "error" as const }
                : message,
            ),
          );
        }
        const detail =
          err instanceof CoreApiError
            ? err.message
            : describeError(err, "Core inaccesible");
        setSendError(`No se pudo enviar: ${detail}`);
      } finally {
        setIsSending(false);
        if (metaReceived) {
          setLastUpdateToken((token) => token + 1);
        }
      }
    },
    [activeConversationId, isSending, pendingSystemPrompt],
  );

  return {
    activeConversationId,
    activeTotalTokens,
    activeSystemPrompt,
    messages,
    isSending,
    messagesLoading,
    sendError,
    lastUpdateToken,
    selectConversation,
    startNewConversation,
    sendMessage,
    saveSystemPrompt,
  };
}
