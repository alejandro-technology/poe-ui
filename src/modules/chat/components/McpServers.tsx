import type { McpServerStatusDto } from "../../core";

export interface McpServersProps {
  servers: McpServerStatusDto[];
  loading: boolean;
  error: string | null;
}

export function McpServers({ servers, loading, error }: McpServersProps) {
  let body;
  if (loading && servers.length === 0) {
    body = <p className="mcp-state">Conectando…</p>;
  } else if (error && servers.length === 0) {
    body = (
      <p className="mcp-state mcp-state--error">
        No se pudo cargar el estado
      </p>
    );
  } else if (servers.length === 0 && !loading && !error) {
    body = <p className="mcp-state">Sin servidores configurados</p>;
  } else {
    body = servers.map((server) => (
      <div className="mcp-item" key={server.name}>
        <span
          className={
            "mcp-dot " +
            (server.connected
              ? "mcp-dot--connected"
              : "mcp-dot--disconnected")
          }
        />
        <span className="mcp-item-name">{server.name}</span>
        <span className="mcp-item-detail">
          {server.connected
            ? `${server.tools.length} ${
                server.tools.length === 1 ? "tool" : "tools"
              }`
            : "sin conexión"}
        </span>
      </div>
    ));
  }

  return (
    <div className="mcp-section">
      <span className="mcp-section-title">Servidores MCP</span>
      {body}
    </div>
  );
}
