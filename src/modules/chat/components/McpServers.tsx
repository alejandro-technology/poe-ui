import { useState } from "react";
import type { McpServerStatusDto } from "../../core";
import { formatTokens } from "../../core";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TokenMeter } from "./TokenMeter";
import { Gauge } from "lucide-react";

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

function dotClassName(
  server: McpServerStatusDto,
  toggling: boolean,
): string | undefined {
  const pulseClass = toggling ? "animate-pulse" : undefined;
  if (!server.enabled) return cn("bg-muted-foreground/50 opacity-50", pulseClass);
  return server.connected
    ? cn("bg-success shadow-[0_0_6px_oklch(0.78_0.16_152/0.6)]", pulseClass)
    : cn("bg-destructive shadow-[0_0_6px_oklch(0.62_0.19_22/0.6)]", pulseClass);
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
    body = <p className="text-xs text-muted-foreground">Conectando…</p>;
  } else if (error && servers.length === 0) {
    body = (
      <p className="text-xs text-destructive">No se pudo cargar el estado</p>
    );
  } else if (servers.length === 0 && !loading && !error) {
    body = <p className="text-xs text-muted-foreground">Sin servidores configurados</p>;
  } else {
    body = (
      <>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {servers.map((server) => {
          const toggling = mcpToggling === server.name;
          const actionLabel = server.enabled
            ? `Deshabilitar ${server.name}`
            : `Habilitar ${server.name}`;
          return (
            <div
              className="flex items-center gap-2 rounded-md bg-sidebar-accent/50 px-2.5 py-1.5 transition-colors hover:bg-sidebar-accent"
              key={server.name}
            >
              <span
                className={cn("size-2 shrink-0 rounded-full", dotClassName(server, toggling))}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                {server.name}
              </span>
              <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                {detailFor(server)}
              </span>
              <Switch
                size="sm"
                checked={server.enabled}
                disabled={toggling}
                aria-label={actionLabel}
                onCheckedChange={(checked) => onToggleMcp(server.name, checked)}
              />
            </div>
          );
        })}
        {activeServers.length > 0 && (
          <p className="text-[11px] font-semibold text-muted-foreground">
            ≈ {formatTokens(totalTokens)} tok totales
          </p>
        )}
      </>
    );
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 border-sidebar-border border-t px-3 pt-3 pb-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
          Servidores MCP
        </p>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-muted-foreground hover:text-primary"
          title="Medir tokens de un texto"
          onClick={() => setMeterOpen(true)}
        >
          <Gauge data-icon="inline-start" />
          Medidor de tokens
        </Button>
      </div>
      {body}
      <TokenMeter
        open={meterOpen}
        onOpenChange={setMeterOpen}
        text={meterText}
        onTextChange={setMeterText}
      />
    </div>
  );
}
