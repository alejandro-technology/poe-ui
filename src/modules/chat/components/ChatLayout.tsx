import { useEffect, useState } from "react";
import { deleteConversation } from "../../core";
import { useChat } from "../hooks/useChat";
import { useConversations } from "../hooks/useConversations";
import { useCoreHealth } from "../hooks/useCoreHealth";
import { useMcpServers } from "../hooks/useMcpServers";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { Sidebar } from "./Sidebar";

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.length > 0) return err.message;
  return fallback;
}

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
    toggling: mcpToggling,
    toggleServer,
  } = useMcpServers();
  const {
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
  } = useChat();

  const [actionError, setActionError] = useState<string | null>(null);
  const [promptPanelOpen, setPromptPanelOpen] = useState<boolean>(false);
  const [promptDraft, setPromptDraft] = useState<string>("");
  const [promptOriginal, setPromptOriginal] = useState<string>("");
  const [promptSaving, setPromptSaving] = useState<boolean>(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  useEffect(() => {
    if (lastUpdateToken > 0) void refresh();
  }, [lastUpdateToken, refresh]);

  async function handleDelete(id: string): Promise<void> {
    setActionError(null);
    try {
      await deleteConversation(id);
      await refresh();
      if (id === activeConversationId) {
        setPromptPanelOpen(false);
        startNewConversation();
      }
    } catch (err) {
      setActionError(
        describeError(err, "No se pudo eliminar la conversación"),
      );
    }
  }

  function handleSelect(id: string): void {
    setPromptPanelOpen(false);
    void selectConversation(id);
  }

  function handleNewChat(): void {
    setPromptPanelOpen(false);
    startNewConversation();
  }

  function openPromptPanel(): void {
    const current = activeSystemPrompt ?? "";
    setPromptDraft(current);
    setPromptOriginal(current);
    setPromptError(null);
    setPromptPanelOpen(true);
  }

  function cancelPromptPanel(): void {
    setPromptDraft(promptOriginal);
    setPromptError(null);
    setPromptPanelOpen(false);
  }

  async function savePrompt(): Promise<void> {
    const trimmed = promptDraft.trim();
    if (trimmed.length === 0 || trimmed === promptOriginal.trim()) return;

    setPromptSaving(true);
    setPromptError(null);
    try {
      await saveSystemPrompt(trimmed);
      setPromptPanelOpen(false);
    } catch (err) {
      setPromptError(
        describeError(err, "No se pudieron guardar las instrucciones"),
      );
    } finally {
      setPromptSaving(false);
    }
  }

  const promptUnchanged = promptDraft.trim() === promptOriginal.trim();
  const promptSaveDisabled =
    promptSaving || promptDraft.trim().length === 0 || promptUnchanged;
  const errorMessage = sendError ?? actionError;

  return (
    <div className="chat-layout">
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        activeTotalTokens={activeTotalTokens}
        loading={loading}
        error={convError}
        online={online}
        mcpServers={mcpServers}
        mcpLoading={mcpLoading}
        mcpError={mcpError}
        mcpToggling={mcpToggling}
        onToggleMcp={(name, enabled) => void toggleServer(name, enabled)}
        onSelect={handleSelect}
        onNewChat={handleNewChat}
        onDelete={(id) => void handleDelete(id)}
      />
      <section className="chat-panel">
        <div className="chat-panel-topbar">
          <span className="chat-panel-title">
            {activeConversationId ? "Conversación" : "Nueva conversación"}
          </span>
          <button
            type="button"
            className="system-prompt-button"
            title="Instrucciones de sistema"
            onClick={openPromptPanel}
          >
            <span aria-hidden="true">✎</span> Instrucciones
          </button>
        </div>
        {promptPanelOpen && (
          <div className="system-prompt-panel">
            <label
              className="system-prompt-label"
              htmlFor="system-prompt-textarea"
            >
              Instrucciones de sistema
            </label>
            <textarea
              id="system-prompt-textarea"
              className="system-prompt-textarea"
              rows={4}
              value={promptDraft}
              disabled={promptSaving}
              placeholder="Definí cómo querés que Poe responda…"
              onChange={(event) => setPromptDraft(event.currentTarget.value)}
            />
            {promptError && <p className="system-prompt-error">{promptError}</p>}
            <div className="system-prompt-actions">
              <button
                type="button"
                className="system-prompt-save"
                disabled={promptSaveDisabled}
                onClick={() => void savePrompt()}
              >
                {promptSaving ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                className="system-prompt-cancel"
                disabled={promptSaving}
                onClick={cancelPromptPanel}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        {errorMessage && <div className="error-banner">{errorMessage}</div>}
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
