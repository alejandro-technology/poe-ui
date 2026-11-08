import { useCallback, useEffect, useRef, useState } from "react";
import type { McpServerStatusDto } from "../../core";
import { getMcpServers } from "../../core";

export interface UseMcpServersResult {
  servers: McpServerStatusDto[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMcpServers(): UseMcpServersResult {
  const [servers, setServers] = useState<McpServerStatusDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef<boolean>(true);

  const load = useCallback(async (showLoading: boolean): Promise<void> => {
    if (!mountedRef.current) return;
    if (showLoading) setLoading(true);
    try {
      const data = await getMcpServers();
      if (!mountedRef.current) return;
      setServers(data);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      const detail = err instanceof Error ? err.message : String(err);
      setError(`No se pudo cargar el estado de los servidores MCP. ${detail}`);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    await load(true);
  }, [load]);

  useEffect(() => {
    mountedRef.current = true;
    void load(true);
    const timer = window.setInterval(() => {
      void load(false);
    }, 30000);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [load]);

  return { servers, loading, error, refresh };
}
