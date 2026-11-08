export function ErrorBanner({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3.5 py-2.5 text-sm leading-relaxed ${className ?? ""}`}
    >
      {message}
    </div>
  );
}
