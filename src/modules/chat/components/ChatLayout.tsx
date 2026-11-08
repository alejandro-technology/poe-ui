import { useEffect } from "react";
import { useChat } from "../hooks/useChat";
import { useConversations } from "../hooks/useConversations";
import { useCoreHealth } from "../hooks/useCoreHealth";
import { useMcpServers } from "../hooks/useMcpServers";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { Sidebar } from "./Sidebar";

export function ChatLayout() {
  const { online } = useCoreHealth();
  const {
    conversations,
    loading,
    error: convError,
    refresh,
  } = useConversations();
  const {
    servers: mcpServers,
    loading: mcpLoading,
    error: mcpError,
  } = useMcpServers();
  const {
    activeConversationId,
    messages,
    isSending,
    messagesLoading,
    sendError,
    lastUpdateToken,
    selectConversation,
    startNewConversation,
    sendMessage,
  } = useChat();

  useEffect(() => {
    if (lastUpdateToken > 0) void refresh();
  }, [lastUpdateToken, refresh]);

  return (
    <div className="chat-layout">
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        loading={loading}
        error={convError}
        online={online}
        mcpServers={mcpServers}
        mcpLoading={mcpLoading}
        mcpError={mcpError}
        onSelect={(id) => void selectConversation(id)}
        onNewChat={startNewConversation}
      />
      <section className="chat-panel">
        <div className="chat-panel-topbar">
          <span className="chat-panel-title">
            {activeConversationId ? "Conversación" : "Nueva conversación"}
          </span>
        </div>
        {sendError && <div className="error-banner">{sendError}</div>}
        <MessageList
          messages={messages}
          isSending={isSending}
          messagesLoading={messagesLoading}
        />
        <Composer
          disabled={isSending || online === false}
          onSend={sendMessage}
        />
      </section>
    </div>
  );
}
