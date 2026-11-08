import { useCallback, useEffect, useRef, useState } from "react";
import type { McpServerStatusDto } from "../../core";
import { getMcpServers, setMcpServerEnabled } from "../../core";

export interface UseMcpServersResult {
  servers: McpServerStatusDto[];
  loading: boolean;
  error: string | null;
  toggling: string | null;
  refresh: () => Promise<void>;
  toggleServer: (name: string, enabled: boolean) => Promise<void>;
}

function replaceServer(
  list: McpServerStatusDto[],
  next: McpServerStatusDto,
): McpServerStatusDto[] {
  return list.map((server) => (server.name === next.name ? next : server));
}

export function useMcpServers(): UseMcpServersResult {
  const [servers, setServers] = useState<McpServerStatusDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
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

  const toggleServer = useCallback(
    async (name: string, enabled: boolean): Promise<void> => {
      const previous = servers.find((server) => server.name === name);
      if (!previous) return;

      setToggling(name);
      setError(null);
      setServers((list) =>
        list.map((server) =>
          server.name === name ? { ...server, enabled } : server,
        ),
      );
      try {
        const updated = await setMcpServerEnabled(name, enabled);
        if (!mountedRef.current) return;
        setServers((list) => replaceServer(list, updated));
      } catch {
        if (!mountedRef.current) return;
        setServers((list) => replaceServer(list, previous));
        setError("No se pudo cambiar el estado del servidor MCP.");
      } finally {
        if (mountedRef.current) setToggling(null);
      }
    },
    [servers],
  );

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

  return { servers, loading, error, toggling, refresh, toggleServer };
}
