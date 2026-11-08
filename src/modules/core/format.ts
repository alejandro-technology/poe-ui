export function totalTokens(conversation: {
  inputTokens: number;
  outputTokens: number;
}): number {
  return conversation.inputTokens + conversation.outputTokens;
}

export function formatTokens(count: number): string {
  return count.toLocaleString("es-AR");
}
