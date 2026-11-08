import type { ConversationDto, McpServerStatusDto } from "../../core";
import { ConnectionBadge } from "./ConnectionBadge";
import { ConversationItem } from "./ConversationItem";
import { McpServers } from "./McpServers";

export interface SidebarProps {
  conversations: ConversationDto[];
  activeId: string | null;
  activeTotalTokens: number | null;
  loading: boolean;
  error: string | null;
  online: boolean | null;
  mcpServers: McpServerStatusDto[];
  mcpLoading: boolean;
  mcpError: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

export function Sidebar({
  conversations,
  activeId,
  activeTotalTokens,
  loading,
  error,
  online,
  mcpServers,
  mcpLoading,
  mcpError,
  onSelect,
  onNewChat,
  onDelete,
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
        onDelete={onDelete}
        totalTokensOverride={
          conversation.id === activeId
            ? activeTotalTokens ?? undefined
            : undefined
        }
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
      <McpServers
        servers={mcpServers}
        loading={mcpLoading}
        error={mcpError}
      />
    </aside>
  );
}
