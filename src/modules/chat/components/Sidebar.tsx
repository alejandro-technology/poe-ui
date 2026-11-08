import type { ConversationDto } from "../../core";
import { ConnectionBadge } from "./ConnectionBadge";
import { ConversationItem } from "./ConversationItem";

export interface SidebarProps {
  conversations: ConversationDto[];
  activeId: string | null;
  loading: boolean;
  error: string | null;
  online: boolean | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  loading,
  error,
  online,
  onSelect,
  onNewChat,
}: SidebarProps) {
  let body;
  if (loading) {
    body = <p className="loading-state">Cargando…</p>;
  } else if (error) {
    body = <p className="error-banner">{error}</p>;
  } else if (conversations.length === 0) {
    body = <p className="empty-state">Sin conversaciones todavía</p>;
  } else {
    body = conversations.map((conversation) => (
      <ConversationItem
        key={conversation.id}
        conversation={conversation}
        active={conversation.id === activeId}
        onSelect={onSelect}
      />
    ));
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Poe</span>
        <ConnectionBadge online={online} />
      </div>
      <button type="button" className="new-chat-button" onClick={onNewChat}>
        + Nueva conversación
      </button>
      <div className="conversation-list">{body}</div>
    </aside>
  );
}
