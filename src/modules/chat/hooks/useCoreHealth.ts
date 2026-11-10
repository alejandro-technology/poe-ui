import { useCallback, useEffect, useRef, useState } from "react";
import { CoreApiError, getHealth } from "../../core";

export interface CoreHealthState {
  online: boolean | null;
  checking: boolean;
  voiceAvailable: boolean;
}

export function useCoreHealth(): CoreHealthState {
  const [online, setOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState<boolean>(true);
  const [voiceAvailable, setVoiceAvailable] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  const check = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return;
    setChecking(true);
    try {
      const health = await getHealth();
      if (mountedRef.current) {
        setOnline(true);
        const voice = (health as { voice?: { available?: unknown } }).voice;
        setVoiceAvailable(voice?.available === true);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof CoreApiError) {
        setOnline(err.status !== null);
      } else {
        setOnline(false);
      }
      setVoiceAvailable(false);
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void check();
    const timer = window.setInterval(() => {
      void check();
    }, 15000);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [check]);

  return { online, checking, voiceAvailable };
}
