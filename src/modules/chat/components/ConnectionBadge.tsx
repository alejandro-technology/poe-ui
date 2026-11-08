import { cn } from "cn";
import { Badge } from "@/components/ui/badge";

export interface ConnectionBadgeProps {
  online: boolean | null;
}

const STATE_CLASSES = {
  online: "bg-success/15 text-success/90",
  offline: "bg-destructive/10 text-destructive",
  unknown: "bg-muted text-muted-foreground",
} as const;

export function ConnectionBadge({ online }: ConnectionBadgeProps) {
  const state =
    online === true ? "online" : online === false ? "offline" : "unknown";

  return (
    <Badge
      variant="ghost"
      className={cn(
        "border-zinc-50/10",
        STATE_CLASSES[state],
        state === "unknown" && "animate-pulse",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {online === true
        ? "Conectado"
        : online === false
          ? "Desconectado"
          : "Conectando…"}
    </Badge>
  );
}
