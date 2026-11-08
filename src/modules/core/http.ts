import { CORE_BASE_URL } from "../../config";

export class CoreApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "CoreApiError";
    this.status = status;
  }
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${CORE_BASE_URL}${path}`;
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body != null) {
    headers.set("Content-Type", "application/json");
  }

  const timeoutSignal = AbortSignal.timeout(15000);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, signal });
  } catch {
    throw new CoreApiError("Core inaccesible", null);
  }

  if (!res.ok) {
    let bodyText = "";
    try {
      bodyText = (await res.text()).trim();
    } catch {
      bodyText = "";
    }
    const detail = bodyText.length > 0 ? `: ${bodyText}` : "";
    throw new CoreApiError(`Core devolvió ${res.status}${detail}`, res.status);
  }

  return (await res.json()) as T;
}
