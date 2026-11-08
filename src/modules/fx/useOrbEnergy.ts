import { useCallback, useEffect, useRef, useState } from "react";

export type OrbEnergyState = "idle" | "thinking" | "streaming" | "error";

const TARGET_ENERGY: Record<OrbEnergyState, number> = {
  idle: 0.15,
  thinking: 0.5,
  streaming: 0.9,
  error: 0.65,
};

export interface OrbEnergyApi {
  state: OrbEnergyState;
  intensity: number;
  setEnergy: (state: OrbEnergyState) => void;
}

export function useOrbEnergy(initial: OrbEnergyState = "idle"): OrbEnergyApi {
  const [state, setState] = useState<OrbEnergyState>(initial);
  const [intensity, setIntensity] = useState(TARGET_ENERGY[initial]);
  const currentRef = useRef(TARGET_ENERGY[initial]);
  const rafRef = useRef(0);

  const setEnergy = useCallback((next: OrbEnergyState) => {
    setState(next);
  }, []);

  useEffect(() => {
    const target = TARGET_ENERGY[state];
    let last = 0;

    const tick = (now: number) => {
      if (last === 0) last = now;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const current = currentRef.current;
      const next = current + (target - current) * Math.min(1, dt * 6);
      const settled = Math.abs(target - next) < 0.001;
      currentRef.current = settled ? target : next;
      setIntensity(currentRef.current);
      if (!settled) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    window.cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(rafRef.current);
  }, [state]);

  return { state, intensity, setEnergy };
}
