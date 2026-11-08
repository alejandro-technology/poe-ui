import { useEffect, useRef } from "react";
import type { UiChatMessage } from "../hooks/useChat";
import { MessageBubble } from "./MessageBubble";

export interface MessageListProps {
  messages: UiChatMessage[];
  isSending: boolean;
  messagesLoading: boolean;
}

export function MessageList({ messages, isSending, messagesLoading }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isSending, messagesLoading]);

  let body;
  if (messagesLoading) {
    body = <p className="messages-loading">Cargando mensajes…</p>;
  } else if (messages.length === 0) {
    body = <div className="empty-state">Empezá una conversación con Poe…</div>;
  } else {
    body = messages.map((message) => <MessageBubble key={message.key} message={message} />);
  }

  return (
    <div className="message-list" ref={listRef}>
      {body}
      {isSending && <p className="composer-status">Poe está pensando…</p>}
    </div>
  );
}
