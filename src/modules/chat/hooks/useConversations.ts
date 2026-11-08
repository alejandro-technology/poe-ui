import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationDto } from "../../core";
import { listConversations } from "../../core";

export interface UseConversationsResult {
  conversations: ConversationDto[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConversations(): UseConversationsResult {
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef<boolean>(true);

  const refresh = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const data = await listConversations();
      if (!mountedRef.current) return;
      setConversations(data);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      const detail = err instanceof Error ? err.message : String(err);
      setError(`No se pudo cargar las conversaciones. ${detail}`);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return { conversations, loading, error, refresh };
}
