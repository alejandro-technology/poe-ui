export interface ConnectionBadgeProps {
  online: boolean | null;
}

export function ConnectionBadge({ online }: ConnectionBadgeProps) {
  const state = online === true ? "online" : online === false ? "offline" : "unknown";
  const label =
    online === true ? "Conectado" : online === false ? "Desconectado" : "Conectando…";

  return (
    <span className={`connection-badge connection-badge--${state}`}>
      <span className="connection-dot" />
      {label}
    </span>
  );
}
