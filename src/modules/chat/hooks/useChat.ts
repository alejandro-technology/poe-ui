import { useCallback, useRef, useState } from "react";
import type { MessageRole } from "../../core";
import {
  CoreApiError,
  getConversation,
  streamChatMessage,
} from "../../core";

export interface UiChatMessage {
  key: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  status: "sent" | "sending" | "streaming" | "error";
  toolStatus?: string | null;
}

export interface UseChatResult {
  activeConversationId: string | null;
  messages: UiChatMessage[];
  isSending: boolean;
  messagesLoading: boolean;
  sendError: string | null;
  lastUpdateToken: number;
  selectConversation: (id: string) => Promise<void>;
  startNewConversation: () => void;
  sendMessage: (text: string) => Promise<void>;
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.length > 0) return err.message;
  return fallback;
}

export function useChat(): UseChatResult {
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
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
      setMessagesLoading(true);
      try {
        const conversation = await getConversation(id);
        if (requestId !== selectionRequestRef.current) return;
        setMessages(
          conversation.messages.map((message) => ({
            key: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
            status: "sent",
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
    setMessages([]);
    setMessagesLoading(false);
    setSendError(null);
  }, []);

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

      try {
        await streamChatMessage(
          {
            message: content,
            conversationId: activeConversationId ?? undefined,
          },
          (event) => {
            switch (event.type) {
              case "meta": {
                metaReceived = true;
                markUserSent();
                if (activeConversationId === null) {
                  setActiveConversationId(event.conversationId);
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
                    toolStatus: null,
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
                setMessages((prev) =>
                  prev.map((message) =>
                    message.key === key
                      ? { ...message, toolStatus: event.name }
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
                      ? { ...message, toolStatus: null }
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
    [activeConversationId, isSending],
  );

  return {
    activeConversationId,
    messages,
    isSending,
    messagesLoading,
    sendError,
    lastUpdateToken,
    selectConversation,
    startNewConversation,
    sendMessage,
  };
}
