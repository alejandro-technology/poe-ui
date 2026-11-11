import { useEffect, useRef, useState } from "react";
import { deleteConversation } from "../../core";
import { useChat } from "../hooks/useChat";
import { useConversations } from "../hooks/useConversations";
import { useCoreHealth } from "../hooks/useCoreHealth";
import { useMcpServers } from "../hooks/useMcpServers";
import { useVoiceLive } from "../../voice/useVoiceLive";
import { VoiceOverlay } from "../../voice/VoiceOverlay";
import { Button } from "@/components/ui/button";
import { Composer } from "./Composer";
import { ErrorBanner } from "./ErrorBanner";
import { MessageList } from "./MessageList";
import { Sidebar } from "./Sidebar";
import { Pencil } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useOrbEnergy } from "../../fx";
import { TitleBar } from "./TitleBar";

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.length > 0) return err.message;
  return fallback;
}

export function ChatLayout() {
  const { online, voiceAvailable } = useCoreHealth();
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
  const { state: orbState, setEnergy } = useOrbEnergy();
  const lastMessage = messages[messages.length - 1];
  const streamingLast = lastMessage?.status === "streaming";
  const toolActive =
    streamingLast === true &&
    (lastMessage?.toolCalls.some((call) => call.status === "running") ?? false);

  const [toolGlow, setToolGlow] = useState<boolean>(false);
  const toolDwellRef = useRef<number>(0);
  useEffect(() => {
    if (toolActive) {
      window.clearTimeout(toolDwellRef.current);
      setToolGlow(true);
      return;
    }
    toolDwellRef.current = window.setTimeout(() => setToolGlow(false), 2000);
  }, [toolActive]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [promptPanelOpen, setPromptPanelOpen] = useState<boolean>(false);
  const [promptDraft, setPromptDraft] = useState<string>("");
  const [promptOriginal, setPromptOriginal] = useState<string>("");
  const [promptSaving, setPromptSaving] = useState<boolean>(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  const voice = useVoiceLive({
    refresh,
    selectConversation,
  });

  useEffect(() => {
    if (lastUpdateToken > 0) void refresh();
  }, [lastUpdateToken, refresh]);

  useEffect(() => {
    if (sendError) {
      setEnergy("error");
    } else if (toolGlow) {
      setEnergy("tool");
    } else if (streamingLast) {
      setEnergy("streaming");
    } else if (isSending && lastMessage?.role !== "assistant") {
      setEnergy("thinking");
    } else {
      setEnergy("idle");
    }
  }, [sendError, toolGlow, streamingLast, isSending, lastMessage?.role, setEnergy]);

  useEffect(() => {
    if (voice.active) {
      document.body.classList.add("voice-live");
      return;
    }
    const timer = window.setTimeout(() => {
      document.body.classList.remove("voice-live");
    }, 240);
    return () => window.clearTimeout(timer);
  }, [voice.active]);

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
    <div className="relative z-10 flex h-full w-full overflow-hidden">
      <div
        className={
          "flex min-w-0 flex-1 flex-col overflow-hidden transition-opacity duration-200" +
          (voice.active ? " opacity-0 pointer-events-none" : "")
        }
      >
        <TitleBar />
        <div className="flex min-w-0 flex-1 overflow-hidden">
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
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="glass-panel bg-card/50 flex shrink-0 items-center gap-3 border-b px-5 py-3">
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
                {activeConversationId ? "Conversación" : "Nueva conversación"}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary"
                title="Instrucciones de sistema"
                onClick={openPromptPanel}
              >
                <Pencil data-icon="inline-start" />
                Instrucciones
              </Button>
            </div>
            <AnimatePresence initial={false}>
              {promptPanelOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="glass-panel bg-card/50 flex shrink-0 flex-col gap-2.5 overflow-hidden border-b px-5 py-3.5"
                >
                  <label
                    className="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase"
                    htmlFor="system-prompt-textarea"
                  >
                    Instrucciones de sistema
                  </label>
                  <textarea
                    id="system-prompt-textarea"
                    rows={4}
                    value={promptDraft}
                    disabled={promptSaving}
                    placeholder="Definí cómo querés que Poe responda…"
                    onChange={(event) => setPromptDraft(event.currentTarget.value)}
                    className="bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-lg border border-input px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {promptError && (
                    <p className="text-xs text-destructive">{promptError}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={promptSaveDisabled}
                      onClick={() => void savePrompt()}
                    >
                      {promptSaving ? "Guardando…" : "Guardar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={promptSaving}
                      onClick={cancelPromptPanel}
                    >
                      Cancelar
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {errorMessage && (
              <ErrorBanner message={errorMessage} className="mx-5 mt-3" />
            )}
            <MessageList
              messages={messages}
              isSending={isSending}
              messagesLoading={messagesLoading}
            />
            <Composer
              disabled={isSending || online === false}
              onSend={sendMessage}
              orbState={orbState}
              onVoiceClick={() => void voice.open()}
              voiceEnabled={online === true && voiceAvailable}
            />
          </section>
        </div>
      </div>
      <AnimatePresence>
        {voice.active && (
          <VoiceOverlay
            key="voice-overlay"
            state={voice.state}
            reconnecting={voice.reconnecting}
            inputTranscript={voice.inputTranscript}
            outputTranscript={voice.outputTranscript}
            error={voice.error}
            muted={voice.muted}
            onToggleMute={voice.toggleMute}
            onClose={() => void voice.close()}
            onRetry={() => void voice.retry()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
