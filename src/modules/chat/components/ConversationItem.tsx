import type { ConversationDto } from "../../core";

export interface ConversationItemProps {
  conversation: ConversationDto;
  active: boolean;
  onSelect: (id: string) => void;
}

export function ConversationItem({ conversation, active, onSelect }: ConversationItemProps) {
  const updated = new Date(conversation.updatedAt).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      type="button"
      className={"conversation-item" + (active ? " conversation-item--active" : "")}
      onClick={() => onSelect(conversation.id)}
    >
      <span className="conversation-item-title">{conversation.title}</span>
      <span className="conversation-item-date">{updated}</span>
    </button>
  );
}
