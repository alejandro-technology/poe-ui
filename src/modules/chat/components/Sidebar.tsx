import type { ConversationDto, McpServerStatusDto } from "../../core";
import { ConnectionBadge } from "./ConnectionBadge";
import { ConversationItem } from "./ConversationItem";
import { ErrorBanner } from "./ErrorBanner";
import { McpServers } from "./McpServers";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
  mcpToggling: string | null;
  onToggleMcp: (name: string, enabled: boolean) => void;
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
  mcpToggling,
  onToggleMcp,
  onSelect,
  onNewChat,
  onDelete,
}: SidebarProps) {
  let body;
  if (loading) {
    body = (
      <p className="animate-pulse px-4 py-6 text-center text-sm text-muted-foreground">
        Cargando…
      </p>
    );
  } else if (error) {
    body = <ErrorBanner message={error} className="mx-2 mt-2" />;
  } else if (conversations.length === 0) {
    body = (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        Sin conversaciones todavía
      </p>
    );
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
    <aside className="glass-panel relative flex w-72 shrink-0 flex-col overflow-hidden border-sidebar-border border-r">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h1 className="text-base font-bold tracking-wide">Poe</h1>
        <ConnectionBadge online={online} />
      </div>
      <Button
        type="button"
        variant="outline"
        className="mx-3 mb-3 h-9 justify-start dark:border-input"
        onClick={onNewChat}
      >
        <Plus data-icon="inline-start" />
        Nueva conversación
      </Button>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 pb-3">
        {body}
      </div>
      <McpServers
        servers={mcpServers}
        loading={mcpLoading}
        error={mcpError}
        mcpToggling={mcpToggling}
        onToggleMcp={onToggleMcp}
      />
    </aside>
  );
}
