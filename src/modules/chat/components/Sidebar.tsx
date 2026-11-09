import { useEffect, useState } from "react";
import type { ConversationDto, McpServerStatusDto } from "../../core";
import { ConnectionBadge } from "./ConnectionBadge";
import { ConversationItem } from "./ConversationItem";
import { ErrorBanner } from "./ErrorBanner";
import { McpServers } from "./McpServers";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { cn } from "cn";

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

const COLLAPSED_STORAGE_KEY = "poe.sidebar.collapsed";
const EXPANDED_WIDTH = 288;
const COLLAPSED_WIDTH = 56;

const CONNECTION_DOT: Record<"online" | "offline" | "unknown", string> = {
  online: "bg-success",
  offline: "bg-destructive",
  unknown: "bg-muted-foreground animate-pulse",
};

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function ConnectionDot({ online }: { online: boolean | null }) {
  const state =
    online === true ? "online" : online === false ? "offline" : "unknown";
  const label =
    online === true
      ? "Conectado"
      : online === false
        ? "Desconectado"
        : "Conectando…";

  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className={cn("block size-2 rounded-full", CONNECTION_DOT[state])}
    />
  );
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
  const reducedMotion = useReducedMotion();
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        COLLAPSED_STORAGE_KEY,
        collapsed ? "1" : "0",
      );
    } catch {
      // storage may be unavailable; collapsing still works for the session
    }
  }, [collapsed]);

  const toggleCollapsed = (): void => setCollapsed((value) => !value);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={
        reducedMotion
          ? { duration: 0.01 }
          : { type: "spring", stiffness: 420, damping: 38 }
      }
      className="glass-panel border-sidebar-border relative flex shrink-0 flex-col overflow-hidden border-r"
    >
      <motion.div
        initial={false}
        animate={{ opacity: collapsed ? 0 : 1, x: collapsed ? -12 : 0 }}
        transition={{ duration: reducedMotion ? 0.01 : 0.18, ease: "easeOut" }}
        aria-hidden={collapsed}
        inert={collapsed}
        className={cn(
          "flex h-full w-72 flex-col",
          collapsed && "pointer-events-none",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
          <h1 className="font-display text-base font-medium tracking-[0.02em]">
            <span>poe</span>
            <span aria-hidden="true" className="text-primary">
              °
            </span>
          </h1>
          <div className="flex items-center gap-1">
            <ConnectionBadge online={online} />
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={toggleCollapsed}
              title="Colapsar menú lateral"
              aria-label="Colapsar menú lateral"
              aria-expanded={!collapsed}
            >
              <PanelLeftClose />
            </Button>
          </div>
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
          <LayoutGroup id="sidebar-conversations">
            <AnimatePresence initial={false}>
              {loading ? (
                <p
                  key="loading"
                  className="animate-pulse px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  Cargando…
                </p>
              ) : error ? (
                <ErrorBanner key="error" message={error} className="mx-2 mt-2" />
              ) : conversations.length === 0 ? (
                <p
                  key="empty"
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  Sin conversaciones todavía
                </p>
              ) : (
                conversations.map((conversation, index) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === activeId}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    animationIndex={index}
                    totalTokensOverride={
                      conversation.id === activeId
                        ? activeTotalTokens ?? undefined
                        : undefined
                    }
                  />
                ))
              )}
            </AnimatePresence>
          </LayoutGroup>
        </div>
        <McpServers
          servers={mcpServers}
          loading={mcpLoading}
          error={mcpError}
          mcpToggling={mcpToggling}
          onToggleMcp={onToggleMcp}
        />
      </motion.div>

      <AnimatePresence initial={false}>
        {collapsed && (
          <motion.div
            key="sidebar-rail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reducedMotion ? 0.01 : 0.16,
              delay: reducedMotion ? 0 : 0.08,
            }}
            className="absolute inset-0 flex flex-col items-center gap-2 px-1.5 py-3"
          >
            <span
              aria-hidden="true"
              className="font-display pb-1 text-sm font-medium tracking-[0.02em]"
            >
              p<span className="text-primary">°</span>
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={toggleCollapsed}
              title="Expandir menú lateral"
              aria-label="Expandir menú lateral"
              aria-expanded={!collapsed}
            >
              <PanelLeftOpen />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="dark:border-input"
              onClick={onNewChat}
              title="Nueva conversación"
              aria-label="Nueva conversación"
            >
              <Plus />
            </Button>
            <span className="mt-auto pb-1">
              <ConnectionDot online={online} />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
