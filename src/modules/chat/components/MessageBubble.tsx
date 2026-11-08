import type { UiChatMessage } from "../hooks/useChat";

export interface MessageBubbleProps {
  message: UiChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const statusClass =
    message.status === "sending"
      ? " message-bubble--sending"
      : message.status === "error"
        ? " message-bubble--error"
        : "";
  const time = new Date(message.createdAt).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={"message-row message-row--" + message.role}>
      <div className={"message-bubble message-bubble--" + message.role + statusClass}>
        <div className="message-bubble-content">{message.content}</div>
        <span className="message-bubble-time">{time}</span>
      </div>
    </div>
  );
}
