import { useState } from "react";
import type { McpServerStatusDto } from "../../core";
import { formatTokens } from "../../core";
import { TokenMeter } from "./TokenMeter";

export interface McpServersProps {
  servers: McpServerStatusDto[];
  loading: boolean;
  error: string | null;
  mcpToggling: string | null;
  onToggleMcp: (name: string, enabled: boolean) => void;
}

function toolsLabel(count: number): string {
  return `${count} ${count === 1 ? "tool" : "tools"}`;
}

function detailFor(server: McpServerStatusDto): string {
  if (!server.enabled) return "deshabilitado";
  if (!server.connected) return "sin conexión";
  const tools = toolsLabel(server.tools.length);
  if (server.estimatedTokens === null) return tools;
  return `${tools} · ≈ ${formatTokens(server.estimatedTokens)} tok`;
}

function dotClass(server: McpServerStatusDto): string {
  if (!server.enabled) return "mcp-dot mcp-dot--disabled";
  return server.connected
    ? "mcp-dot mcp-dot--connected"
    : "mcp-dot mcp-dot--disconnected";
}

export function McpServers({
  servers,
  loading,
  error,
  mcpToggling,
  onToggleMcp,
}: McpServersProps) {
  const [meterOpen, setMeterOpen] = useState<boolean>(false);
  const [meterText, setMeterText] = useState<string>("");

  const activeServers = servers.filter(
    (server) => server.enabled && server.connected,
  );
  const totalTokens = activeServers.reduce(
    (sum, server) => sum + (server.estimatedTokens ?? 0),
    0,
  );

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
    body = (
      <>
        {error && <p className="mcp-state mcp-state--error">{error}</p>}
        {servers.map((server) => {
          const toggling = mcpToggling === server.name;
          const actionLabel = server.enabled
            ? `Deshabilitar ${server.name}`
            : `Habilitar ${server.name}`;
          return (
            <div className="mcp-item" key={server.name}>
              <span className={dotClass(server)} />
              <span className="mcp-item-name">{server.name}</span>
              <span className="mcp-item-detail">{detailFor(server)}</span>
              <input
                type="checkbox"
                className="mcp-toggle"
                checked={server.enabled}
                disabled={toggling}
                title={actionLabel}
                aria-label={actionLabel}
                onChange={() => onToggleMcp(server.name, !server.enabled)}
              />
            </div>
          );
        })}
        {activeServers.length > 0 && (
          <p className="mcp-item-total">
            ≈ {formatTokens(totalTokens)} tok totales
          </p>
        )}
      </>
    );
  }

  return (
    <div className="mcp-section">
      <div className="mcp-section-header">
        <span className="mcp-section-title">Servidores MCP</span>
        <button
          type="button"
          className="mcp-meter-button"
          title="Medir tokens de un texto"
          onClick={() => setMeterOpen(true)}
        >
          + Medidor de tokens
        </button>
      </div>
      {body}
      {meterOpen && (
        <TokenMeter
          text={meterText}
          onTextChange={setMeterText}
          onClose={() => setMeterOpen(false)}
        />
      )}
    </div>
  );
}
